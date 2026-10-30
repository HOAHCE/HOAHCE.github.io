#!/usr/bin/env node
// Đồng bộ các lời kêu gọi đề xuất (grants) ĐANG MỞ từ cổng EU Funding & Tenders vào SQLite cục bộ.
//
// Nguồn: Search API công khai của Ủy ban châu Âu (https://api.tech.ec.europa.eu/search-api/prod/rest/search,
// apiKey công khai "SEDIA", yêu cầu dạng multipart/form-data với "query" là JSON). Xem trang
// "APIs" của Funding & Tenders Portal. Dữ liệu thuộc Liên minh châu Âu; chính sách tái sử dụng chung của
// Ủy ban (Quyết định 2011/833/EU) cho phép dùng lại theo CC BY 4.0 nếu ghi nguồn và nêu thay đổi.
//
// Lọc: type 1 (topic của lời kêu gọi đề xuất) và type 8 (lời kêu gọi cạnh tranh/tài trợ lại), trạng thái
// Open (31094502); bỏ type 2 (mua sắm/tenders). Chỉ giữ lời kêu gọi còn hạn nộp trong tương lai (hoặc không
// có hạn: nộp liên tục) vì một số bản ghi vẫn "Open" nhưng mọi hạn đã qua.
//
// Dùng: node scripts/sync-eu-funding.mjs [--include-forthcoming] [--delay 700] [--max-pages N]
import Database from "better-sqlite3";
import * as cheerio from "cheerio";
import fs from "node:fs";
import https from "node:https";
import crypto from "node:crypto";
import path from "node:path";
import { SOURCE_DDL } from "../lib/source-ddl.mjs";

const SEARCH = "https://api.tech.ec.europa.eu/search-api/prod/rest/search?apiKey=SEDIA&text=***";
const DETAILS = "https://ec.europa.eu/info/funding-tenders/opportunities/data/topicDetails/";
const UA = "HCE-Research-Sync/0.1 (public data aggregation for Hue University of Economics)";
const STATUS_OPEN = "31094502";
const STATUS_FORTHCOMING = "31094501";

const args = process.argv.slice(2);
const opt = (n, d) => (args.includes(`--${n}`) ? args[args.indexOf(`--${n}`) + 1] : d);
const FORTHCOMING = args.includes("--include-forthcoming");
const DELAY = Number(opt("delay", 700));
const MAX_PAGES = Number(opt("max-pages", Infinity));
const PAGE_SIZE = 100;
const DB_FILE = process.env.HCE_DB_PATH || path.join(process.cwd(), "data", "hce.db");

const norm = (s) => s.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/đ/g, "d");
const clean = (s) => (s ?? "").replace(/\s+/g, " ").trim();
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const first = (v) => (Array.isArray(v) ? v[0] : v);
const toText = (html) => clean(cheerio.load(`<div>${html ?? ""}</div>`)("div").text());
const httpUrl = (u) => {
  try {
    const x = new URL(u);
    return x.protocol === "https:" || x.protocol === "http:" ? x.toString() : null;
  } catch {
    return null;
  }
};

async function withRetry(fn, label, tries = 4) {
  let err;
  for (let t = 1; t <= tries; t++) {
    try {
      return await fn();
    } catch (e) {
      err = e;
      await sleep(2000 * t * t);
    }
  }
  throw new Error(`${label}: ${err?.message ?? err}`);
}

// Dùng node:https thay cho fetch: trên Node 26 + undici, fetch tới máy chủ này đôi lúc làm sập tiến trình
// (assert(!this.paused)) khi máy chủ đóng kết nối giữa chừng.
function request(url, { method = "GET", headers = {}, body } = {}) {
  return new Promise((resolve, reject) => {
    const req = https.request(url, { method, headers: { "user-agent": UA, connection: "close", ...headers }, timeout: 60000 }, (res) => {
      const chunks = [];
      res.on("data", (c) => chunks.push(c));
      res.on("end", () => resolve({ status: res.statusCode ?? 0, text: Buffer.concat(chunks).toString("utf8") }));
      res.on("error", reject);
    });
    req.on("timeout", () => req.destroy(new Error("hết thời gian chờ")));
    req.on("error", reject);
    if (body) req.write(body);
    req.end();
  });
}

const CRLF = String.fromCharCode(13, 10);
function multipart(fields) {
  const boundary = "----hce" + crypto.randomBytes(8).toString("hex");
  const out = [];
  for (const [name, value] of Object.entries(fields)) {
    out.push(`--${boundary}`, `Content-Disposition: form-data; name="${name}"; filename="${name}.json"`, "Content-Type: application/json", "", JSON.stringify(value));
  }
  out.push(`--${boundary}--`, "");
  return { body: Buffer.from(out.join(CRLF), "utf8"), contentType: `multipart/form-data; boundary=${boundary}` };
}

// Phân trang mặc định của API không ổn định (trang trùng/thiếu bản ghi: đo được 475/555 bản ghi khác nhau),
// nên truy vấn riêng từng loại và sắp theo "identifier" cho thứ tự cố định.
async function searchPage(page, statuses, type) {
  const query = { bool: { must: [{ terms: { type: [type] } }, { terms: { status: statuses } }] } };
  const { body, contentType } = multipart({ query, languages: ["en"], sort: { field: "identifier", order: "ASC" } });
  return withRetry(async () => {
    const res = await request(`${SEARCH}&pageSize=${PAGE_SIZE}&pageNumber=${page}`, { method: "POST", headers: { "content-type": contentType, "content-length": String(body.length) }, body });
    if (res.status !== 200) throw new Error(`HTTP ${res.status}`);
    return JSON.parse(res.text);
  }, `trang ${page}`);
}

const programmeCache = new Map(); // id số -> {abbr, name}
async function programmeOf(id, sampleIdentifier, type) {
  if (programmeCache.has(id)) return programmeCache.get(id);
  let info = null;
  if (type === 1 && sampleIdentifier) {
    try {
      const res = await request(`${DETAILS}${sampleIdentifier.toLowerCase()}.json`);
      if (res.status === 200) {
        const fp = JSON.parse(res.text)?.TopicDetails?.frameworkProgramme;
        if (fp) info = { abbr: fp.abbreviation, name: fp.description };
      }
    } catch {}
    await sleep(DELAY);
  }
  programmeCache.set(id, info);
  return info;
}

function budgetOf(m, type) {
  try {
    if (type === 1 && first(m.budgetOverview)) {
      const b = JSON.parse(first(m.budgetOverview));
      let total = 0;
      for (const actions of Object.values(b.budgetTopicActionMap ?? {}))
        for (const a of actions) for (const v of Object.values(a.budgetYearMap ?? {})) total += Number(v) || 0;
      return total > 0 ? total : null;
    }
    const raw = first(m.budget);
    const n = raw === undefined ? NaN : Number(String(raw).replace(/[^\d.]/g, ""));
    return Number.isFinite(n) && n > 0 ? n : null;
  } catch {
    return null;
  }
}

function toRow(r, now) {
  const m = r.metadata ?? {};
  const type = Number(first(m.type));
  const deadlines = [...new Set((m.deadlineDate ?? []).map((d) => Date.parse(d)).filter(Number.isFinite))].sort((a, b) => a - b).map((t) => new Date(t).toISOString());
  const hasFuture = deadlines.some((d) => Date.parse(d) >= now);
  const rolling = deadlines.length === 0;
  const open = first(m.status) === STATUS_OPEN;
  if (open && !hasFuture && !rolling) return { skip: "all-deadlines-past" };

  let submission = null;
  try {
    const link = JSON.parse(first(m.links) ?? "[]")[0]?.url;
    submission = link ? httpUrl(link) : null;
  } catch {}
  const further = first(m.furtherInformation);
  const title = clean(first(m.title) ?? r.summary);
  const callTitle = clean(first(m.callTitle) ?? "");
  const description = toText(first(m.descriptionByte) ?? first(m.description) ?? "").slice(0, 2500);
  let tags = [];
  try {
    tags = [...(m.tags ?? []), ...(m.keywords ?? []).filter((k) => !/^[A-Z0-9-]{8,}$/.test(k))].map(clean).filter(Boolean).slice(0, 12);
  } catch {}
  const startDate = first(m.startDate) ? new Date(Date.parse(first(m.startDate))).toISOString().slice(0, 10) : null;
  return {
    row: {
      id: r.reference,
      type,
      identifier: first(m.identifier) ?? r.reference,
      call_id: first(m.callIdentifier) ?? null,
      call_title: callTitle || null,
      title,
      programme: null,
      programme_abbr: null,
      action_type: clean(first(m.typesOfAction) ?? "") || null,
      deadline_model: first(m.deadlineModel) ?? null,
      opens_on: startDate,
      deadlines: JSON.stringify(deadlines),
      budget_eur: budgetOf(m, type),
      description,
      portal_url: httpUrl(r.url) ?? "https://ec.europa.eu/info/funding-tenders/opportunities/portal/",
      submission_url: submission ?? (further && httpUrl(further)) ?? null,
      tags: JSON.stringify(tags),
      search: norm([title, callTitle, ...tags, description.slice(0, 600)].join(" ")),
    },
    progId: first(m.frameworkProgramme),
  };
}

fs.mkdirSync(path.dirname(DB_FILE), { recursive: true });
const db = new Database(DB_FILE);
db.pragma("journal_mode = WAL");
db.exec(SOURCE_DDL);
const runId = db.prepare("INSERT INTO sync_runs (source, unit_id, started_at, status) VALUES ('eu-ft', 'open', ?, 'running')").run(Date.now()).lastInsertRowid;

const failRun = (e) => {
  db.prepare("UPDATE sync_runs SET finished_at=?, status='failed', note=? WHERE id=? AND status='running'").run(Date.now(), String(e?.message ?? e).slice(0, 500), runId);
  console.error("Đồng bộ EU F&T thất bại:", e?.message ?? e);
  process.exit(1);
};
process.on("uncaughtException", failRun);
process.on("unhandledRejection", failRun);

try {
  const now = Date.now() - 12 * 3600e3; // chừa 12 giờ cho hạn chỉ có ngày
  const statuses = FORTHCOMING ? [STATUS_OPEN, STATUS_FORTHCOMING] : [STATUS_OPEN];
  const rows = new Map();
  const progIds = new Map(); // id số -> {identifier mẫu, type}
  const rowProg = new Map(); // row id -> progId
  let skipped = 0;
  let total = 0;
  const seen = new Set(); // mã bản ghi khác nhau đã nhận (nguồn có thể báo trùng một vài bản ghi)
  for (const type of ["1", "8"]) {
    const firstPage = await searchPage(1, statuses, type);
    const typeTotal = firstPage.totalResults;
    total += typeTotal;
    const pages = Math.min(Math.ceil(typeTotal / PAGE_SIZE), MAX_PAGES);
    console.log(`EU F&T type ${type}: ${typeTotal} lời kêu gọi (${FORTHCOMING ? "Open + Forthcoming" : "Open"}), ${pages} trang`);
    for (let p = 1; p <= pages; p++) {
      const j = p === 1 ? firstPage : (await sleep(DELAY), await searchPage(p, statuses, type));
      for (const r of j.results ?? []) {
        seen.add(r.reference);
        const out = toRow(r, now);
        if (out.skip) { skipped++; continue; }
        rows.set(out.row.id, out.row);
        if (out.progId) {
          rowProg.set(out.row.id, out.progId);
          if (!progIds.has(out.progId) || out.row.type === 1) progIds.set(out.progId, { identifier: out.row.identifier, type: out.row.type });
        }
      }
      console.log(`  type ${type} trang ${p}/${pages}: tích luỹ ${rows.size} (bỏ ${skipped} vì mọi hạn đã qua)`);
    }
    await sleep(DELAY);
  }

  for (const [pid, s] of progIds) await programmeOf(pid, s.identifier, s.type);
  for (const [id, row] of rows) {
    const info = programmeCache.get(rowProg.get(id));
    const prefix = String(row.identifier).split("-")[0];
    row.programme_abbr = info?.abbr ?? prefix;
    row.programme = info?.name ?? prefix;
    row.search = norm(`${row.search} ${row.programme} ${row.programme_abbr}`);
  }

  // Phòng dữ liệu rỗng do lỗi nguồn: nếu số lượng quá thấp thì không ghi đè dữ liệu cũ.
  if (rows.size < 20) throw new Error(`Chỉ đọc được ${rows.size} lời kêu gọi: không ghi đè dữ liệu cũ`);

  const ts = Date.now();
  const ins = db.prepare(
    "INSERT INTO src_eu_call (id,type,identifier,call_id,call_title,title,programme,programme_abbr,action_type,deadline_model,opens_on,deadlines,budget_eur,description,portal_url,submission_url,tags,search,synced_at) " +
      "VALUES (@id,@type,@identifier,@call_id,@call_title,@title,@programme,@programme_abbr,@action_type,@deadline_model,@opens_on,@deadlines,@budget_eur,@description,@portal_url,@submission_url,@tags,@search,@synced_at)",
  );
  db.transaction(() => {
    db.prepare("DELETE FROM src_eu_call").run();
    for (const r of rows.values()) ins.run({ ...r, synced_at: ts });
  })();

  const unmapped = [...progIds.keys()].filter((k) => !programmeCache.get(k)).length;
  const counts = { eu: { fetched: total, distinct: seen.size, imported: rows.size, skippedPastDeadlines: skipped, programmes: new Set([...rows.values()].map((r) => r.programme_abbr)).size, programmeIdsWithoutName: unmapped } };
  const notes = [];
  if (unmapped) notes.push(`${unmapped} mã chương trình chưa tra được tên, dùng tiền tố mã lời kêu gọi`);
  if (!Number.isFinite(MAX_PAGES) && seen.size < total - 3) notes.push(`nguồn báo ${total} nhưng chỉ nhận ${seen.size} bản ghi khác nhau`);
  const note = notes.join("; ") || null;
  db.prepare("UPDATE sync_runs SET finished_at=?, status=?, counts=?, note=? WHERE id=?").run(Date.now(), note ? "partial" : "ok", JSON.stringify(counts), note, runId);
  console.log(`Xong: ${rows.size} lời kêu gọi đang mở (nguồn báo ${total}, bỏ ${skipped}).` + (note ? ` Lưu ý: ${note}.` : ""));
} catch (e) {
  db.prepare("UPDATE sync_runs SET finished_at=?, status='failed', note=? WHERE id=?").run(Date.now(), String(e.message ?? e).slice(0, 500), runId);
  console.error("Đồng bộ EU F&T thất bại:", e.message ?? e);
  process.exitCode = 1;
}
