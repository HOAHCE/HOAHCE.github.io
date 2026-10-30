import { spawn } from "node:child_process";
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { audit, db } from "./db";

// Chạy các bộ đồng bộ dữ liệu NGAY TRONG máy chủ web (nơi sở hữu CSDL SQLite / Disk), do lịch Cron của Render kích hoạt.
// Render Cron Job không truy cập được Disk của dịch vụ khác nên không thể tự ghi vào CSDL; nó chỉ gọi API này.

type Step = string[]; // đối số của `node`, ví dụ ["scripts/journals.mjs", "doaj"]

const BASE_JOBS: Record<string, Step[]> = {
  eu: [["scripts/sync-eu-funding.mjs"]],
  hueuni: [["scripts/sync-hueuni.mjs"]],
  forms: [["scripts/sync-hce-forms.mjs"]],
  vn2244: [["scripts/journals.mjs", "vn2244"]],
  doaj: [["scripts/journals.mjs", "doaj"]],
  weekly: [["scripts/sync-hueuni.mjs"], ["scripts/sync-hce-forms.mjs"], ["scripts/journals.mjs", "vn2244"], ["scripts/journals.mjs", "doaj"]],
};

/** Tác vụ giả để kiểm thử (chỉ bật khi SYNC_ALLOW_NOOP=1): ngủ vài giây rồi thoát thành công, hoặc thoát lỗi. */
function jobSteps(job: string): Step[] | null {
  if (job in BASE_JOBS) return BASE_JOBS[job];
  if (process.env.SYNC_ALLOW_NOOP === "1") {
    if (job === "noop") return [["-e", "setTimeout(() => {}, 2500)"]];
    if (job === "noop-fail") return [["-e", "process.exit(3)"]];
  }
  return null;
}

export const isKnownJob = (job: string) => jobSteps(job) !== null;

const COOLDOWN_MS = 10 * 60 * 1000; // không chạy lại cùng một tác vụ trong 10 phút (chặn lạm dụng)
const STALE_MS = 3 * 60 * 60 * 1000; // dòng "running" cũ hơn 3 giờ coi như bị bỏ dở
const STEP_TIMEOUT_MS = 2 * 60 * 60 * 1000;

const dataDir = () => path.dirname(process.env.HCE_DB_PATH || path.join(process.cwd(), "data", "hce.db"));

/** Khi máy chủ khởi động lại, mọi tác vụ đang "running" thực ra đã bị dừng. */
export function abortStaleJobs() {
  db.prepare("UPDATE job_runs SET status='aborted', finished_at=?, note='máy chủ khởi động lại' WHERE status='running'").run(Date.now());
}

export type JobRun = { id: number; job: string; status: string; started_at: number; finished_at: number | null; steps: { name: string; code: number | null; ms: number }[]; note: string | null };

export function getJob(id: number): JobRun | null {
  const r = db.prepare("SELECT * FROM job_runs WHERE id = ?").get(id) as (Omit<JobRun, "steps"> & { steps: string }) | undefined;
  return r ? { ...r, steps: JSON.parse(r.steps) } : null;
}

export type StartResult = { ok: true; id: number } | { ok: false; reason: "unknown" | "busy" | "cooldown"; id?: number; retryAfterSec?: number };

export function startJob(job: string): StartResult {
  const steps = jobSteps(job);
  if (!steps) return { ok: false, reason: "unknown" };
  const now = Date.now();
  const running = db.prepare("SELECT id, started_at FROM job_runs WHERE status='running' ORDER BY id DESC LIMIT 1").get() as { id: number; started_at: number } | undefined;
  if (running && now - running.started_at < STALE_MS) return { ok: false, reason: "busy", id: running.id };
  if (running) db.prepare("UPDATE job_runs SET status='aborted', finished_at=?, note='quá hạn, coi như bị bỏ dở' WHERE id=?").run(now, running.id);
  const last = db.prepare("SELECT started_at FROM job_runs WHERE job=? AND status IN ('ok','running') ORDER BY id DESC LIMIT 1").get(job) as { started_at: number } | undefined;
  if (last && now - last.started_at < COOLDOWN_MS) return { ok: false, reason: "cooldown", retryAfterSec: Math.ceil((COOLDOWN_MS - (now - last.started_at)) / 1000) };

  const id = Number(db.prepare("INSERT INTO job_runs (job, started_at, status) VALUES (?,?,'running')").run(job, now).lastInsertRowid);
  audit(null, "job.start", job);
  void runSteps(id, job, steps); // chạy nền, không chặn phản hồi HTTP
  return { ok: true, id };
}

async function runSteps(id: number, job: string, steps: Step[]) {
  const logFile = path.join(dataDir(), `sync-${job}.log`);
  try {
    if (fs.existsSync(logFile) && fs.statSync(logFile).size > 1_000_000) fs.truncateSync(logFile, 0);
  } catch {}
  const results: JobRun["steps"] = [];
  let failed = false;
  for (const step of steps) {
    const t0 = Date.now();
    const code = await new Promise<number | null>((resolve) => {
      let fd: number | "ignore" = "ignore";
      try {
        fd = fs.openSync(logFile, "a");
        fs.writeSync(fd, `\n=== ${new Date().toISOString()} node ${step.join(" ")}\n`);
      } catch {}
      const child = spawn(process.execPath, step, { cwd: process.cwd(), env: process.env, stdio: ["ignore", fd, fd] });
      const timer = setTimeout(() => child.kill("SIGKILL"), STEP_TIMEOUT_MS);
      child.on("close", (c) => { clearTimeout(timer); if (typeof fd === "number") try { fs.closeSync(fd); } catch {} resolve(c); });
      child.on("error", () => { clearTimeout(timer); resolve(null); });
    });
    if (code !== 0) failed = true;
    results.push({ name: step.join(" "), code, ms: Date.now() - t0 });
    db.prepare("UPDATE job_runs SET steps=? WHERE id=?").run(JSON.stringify(results), id);
  }
  db.prepare("UPDATE job_runs SET status=?, finished_at=? WHERE id=?").run(failed ? "failed" : "ok", Date.now(), id);
  audit(null, failed ? "job.failed" : "job.ok", job);
}

// ---- Xác thực yêu cầu từ Cron: chữ ký HMAC, không gửi token đi qua mạng ----
const seen = new Map<string, number>(); // chữ ký đã dùng → thời điểm (chặn phát lại)
const WINDOW_SEC = 300;

export const syncEnabled = () => (process.env.SYNC_TOKEN ?? "").length >= 16;

/** Chữ ký = HMAC-SHA256(SYNC_TOKEN, `${ts}\n${METHOD}\n${pathname}\n${đối-tượng}`). Đối tượng: tên tác vụ (POST) hoặc id (GET). */
export function signature(token: string, ts: string, method: string, pathname: string, subject: string) {
  return crypto.createHmac("sha256", token).update(`${ts}\n${method}\n${pathname}\n${subject}`).digest("hex");
}

export function verifyRequest(headers: Headers, method: string, pathname: string, subject: string): boolean {
  const token = process.env.SYNC_TOKEN ?? "";
  const ts = headers.get("x-sync-timestamp") ?? "";
  const sig = headers.get("x-sync-signature") ?? "";
  if (!syncEnabled() || !/^\d{9,12}$/.test(ts) || !/^[0-9a-f]{64}$/.test(sig)) return false;
  if (Math.abs(Date.now() / 1000 - Number(ts)) > WINDOW_SEC) return false;
  const expect = Buffer.from(signature(token, ts, method, pathname, subject), "hex");
  const got = Buffer.from(sig, "hex");
  if (expect.length !== got.length || !crypto.timingSafeEqual(expect, got)) return false;
  const now = Date.now();
  for (const [k, t] of seen) if (now - t > WINDOW_SEC * 2000) seen.delete(k);
  if (seen.has(sig)) return false;
  seen.set(sig, now);
  return true;
}
