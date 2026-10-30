#!/usr/bin/env node
// Chạy trong Render Cron Job: gọi API đồng bộ của web service rồi chờ kết quả, thoát khác 0 nếu thất bại
// (để Render báo lỗi). Không phụ thuộc thư viện nào.
//
// Vì sao không tự đồng bộ trong Cron Job: Render Cron Job không truy cập được Disk của dịch vụ khác, mà CSDL SQLite
// nằm trên Disk của web service. Cron chỉ "bấm nút", web service tự chạy bộ đồng bộ ở bên trong.
//
// Dùng:  node cron-trigger.mjs [auto|eu|weekly|hueuni|forms|vn2244|doaj]
//   auto (mặc định): luôn chạy "eu" (quỹ EU, hằng ngày); thêm "weekly" vào ngày WEEKLY_DAY (UTC, mặc định 0 = Chủ nhật).
// Biến môi trường: SYNC_URL (địa chỉ gốc của web, ví dụ https://hue-research.onrender.com), SYNC_TOKEN.
// Token KHÔNG được gửi đi: mỗi yêu cầu kèm chữ ký HMAC theo thời gian, nên gõ nhầm SYNC_URL sang dịch vụ lạ cũng không lộ token.
import crypto from "node:crypto";
import http from "node:http";
import https from "node:https";

const BASE = (process.env.SYNC_URL ?? "").replace(/\/+$/, "");
const TOKEN = process.env.SYNC_TOKEN ?? "";
const PATH = "/api/admin/sync";
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const log = (m) => console.log(`[${new Date().toISOString()}] ${m}`);

if (!/^https?:\/\//.test(BASE) || TOKEN.length < 16) {
  console.error("Thiếu hoặc sai SYNC_URL (cần bắt đầu bằng http:// hoặc https://) hoặc SYNC_TOKEN (>= 16 ký tự).");
  process.exit(1);
}

const sign = (ts, method, subject) => crypto.createHmac("sha256", TOKEN).update(`${ts}\n${method}\n${PATH}\n${subject}`).digest("hex");

function request(method, query, subject, body) {
  return new Promise((resolve, reject) => {
    const ts = String(Math.floor(Date.now() / 1000));
    const payload = body ? Buffer.from(JSON.stringify(body)) : null;
    const url = new URL(BASE + PATH + query);
    const lib = url.protocol === "https:" ? https : http;
    const req = lib.request(
      url,
      {
        method,
        timeout: 120000, // web gói Free có thể đang ngủ và mất ~1 phút để dậy
        headers: {
          "x-sync-timestamp": ts,
          "x-sync-signature": sign(ts, method, subject),
          "user-agent": "hue-research-cron/1",
          ...(payload ? { "content-type": "application/json", "content-length": String(payload.length) } : {}),
        },
      },
      (res) => {
        const chunks = [];
        res.on("data", (c) => chunks.push(c));
        res.on("end", () => {
          const text = Buffer.concat(chunks).toString("utf8");
          let json = null;
          try { json = JSON.parse(text); } catch {}
          resolve({ status: res.statusCode ?? 0, json, text: text.slice(0, 300) });
        });
        res.on("error", reject);
      },
    );
    req.on("timeout", () => req.destroy(new Error("hết thời gian chờ")));
    req.on("error", reject);
    if (payload) req.write(payload);
    req.end();
  });
}

/** Thử lại khi mạng lỗi hoặc máy chủ đang khởi động (502/503/504); mỗi lần ký lại để chữ ký còn mới. */
async function call(...args) {
  let last;
  for (let i = 1; i <= 6; i++) {
    try {
      const r = await request(...args);
      if (![502, 503, 504].includes(r.status)) return r;
      last = new Error(`HTTP ${r.status}`);
    } catch (e) {
      last = e;
    }
    log(`Chưa kết nối được (${last.message}); thử lại sau ${20 * i}s…`);
    await sleep(20000 * i);
  }
  throw last;
}

async function runJob(job) {
  log(`Kích hoạt tác vụ "${job}"…`);
  const r = await call("POST", "", job, { job });
  if (r.status === 429) {
    log(`Tác vụ "${job}" vừa chạy gần đây (chờ ${r.json?.retryAfterSec ?? "?"}s); bỏ qua lần này.`);
    return true;
  }
  if (r.status === 404) {
    throw new Error(r.json?.error ? `404: ${r.json.error}` : "404: web chưa bật điểm đồng bộ (thiếu SYNC_TOKEN trên web) hoặc SYNC_URL trỏ sai dịch vụ.");
  }
  if (r.status === 401) throw new Error("401: chữ ký bị từ chối. SYNC_TOKEN khác với web, hoặc đồng hồ lệch quá 5 phút.");
  if (r.status === 409) throw new Error(`409: đang có tác vụ khác chạy trên web (id ${r.json?.id ?? "?"}); thử lại ở lần lịch sau.`);
  if (r.status !== 202 || !r.json?.id) throw new Error(`Phản hồi bất ngờ HTTP ${r.status}: ${r.text}`);
  const id = String(r.json.id);
  log(`Đã nhận (id ${id}); chờ hoàn tất…`);

  const deadline = Date.now() + 2.5 * 3600 * 1000;
  let lastSteps = -1;
  while (Date.now() < deadline) {
    await sleep(15000);
    const s = await call("GET", `?id=${encodeURIComponent(id)}`, id);
    if (s.status !== 200 || !s.json) throw new Error(`Không đọc được trạng thái (HTTP ${s.status}): ${s.text}`);
    const done = s.json.steps?.length ?? 0;
    if (done !== lastSteps) {
      lastSteps = done;
      for (const st of s.json.steps ?? []) log(`  bước "${st.name}": mã thoát ${st.code} (${Math.round(st.ms / 1000)}s)`);
    }
    if (s.json.status !== "running") {
      log(`Tác vụ "${job}" kết thúc: ${s.json.status}${s.json.note ? ` (${s.json.note})` : ""}`);
      return s.json.status === "ok";
    }
  }
  throw new Error(`Quá thời gian chờ tác vụ "${job}" (2,5 giờ).`);
}

const arg = process.argv[2] ?? "auto";
const weeklyDay = Number(process.env.WEEKLY_DAY ?? 0);
const jobs = arg === "auto" ? ["eu", ...(new Date().getUTCDay() === weeklyDay ? ["weekly"] : [])] : [arg];

let ok = true;
for (const job of jobs) {
  try {
    if (!(await runJob(job))) ok = false;
  } catch (e) {
    console.error(`Tác vụ "${job}" lỗi: ${e.message}`);
    ok = false;
    if (/^40[149]/.test(e.message)) break; // lỗi cấu hình/đang bận: không thử tác vụ kế tiếp
  }
}
process.exit(ok ? 0 : 1);
