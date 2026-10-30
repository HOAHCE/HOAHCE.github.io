#!/usr/bin/env node
// Đồng bộ danh mục BIỂU MẪU quản lý hoạt động KH&CN từ website Phòng KHCN & HTQT của Trường
// (https://khdn.hce.edu.vn/#/detail/contents/bieu-mau/31477/1447).
//
// Trang đó là ứng dụng Angular lấy nội dung từ API công khai của website Trường:
//   POST https://hce.edu.vn/api/Controller/SelectAllByWhatFE.php  {"siteid":22,"lang":"vn","id":"31477","what":"91"}
// Script gọi đúng API đó (một yêu cầu), tách các nhóm và liên kết tải trong nội dung, rồi **thay thế
// toàn bộ** danh mục trong SQLite (phản ánh đúng nguồn, kể cả mục bị gỡ). Không tải về tệp biểu mẫu:
// chỉ lưu tên, nhóm và liên kết; tệp vẫn nằm ở nơi lưu gốc (hueuni.edu.vn, Google Docs, hce.edu.vn).
//
// Dùng: node scripts/sync-hce-forms.mjs [--id 31477]   (HCE_DB_PATH để đổi tệp CSDL)
import Database from "better-sqlite3";
import * as cheerio from "cheerio";
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { SOURCE_DDL } from "../lib/source-ddl.mjs";

const API = "https://hce.edu.vn/api/Controller/SelectAllByWhatFE.php";
const UA = "HCE-Research-Sync/0.1 (public data aggregation for Hue University of Economics)";
const args = process.argv.slice(2);
const RECORD_ID = String(args.includes("--id") ? args[args.indexOf("--id") + 1] : "31477");
const SOURCE_PAGE = `https://khdn.hce.edu.vn/#/detail/contents/bieu-mau/${RECORD_ID}/1447`;
const DB_FILE = process.env.HCE_DB_PATH || path.join(process.cwd(), "data", "hce.db");

const norm = (s) => s.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/đ/g, "d");
const clean = (s) => (s ?? "").replace(/ /g, " ").replace(/\s+/g, " ").trim();

function kindOf(u) {
  const x = new URL(u);
  const ext = (x.pathname.match(/\.([a-z0-9]{2,5})$/i) || [])[1]?.toLowerCase();
  if (x.hostname === "docs.google.com" && x.pathname.startsWith("/document/")) return "gdoc";
  if (x.hostname === "docs.google.com" && x.pathname.startsWith("/spreadsheets/")) return "gsheet";
  if (x.hostname === "drive.google.com") return "drive";
  if (["doc", "docx"].includes(ext)) return "word";
  if (["xls", "xlsx"].includes(ext)) return "excel";
  if (ext === "pdf") return "pdf";
  if (["rar", "zip", "7z"].includes(ext)) return "archive";
  return "link";
}

/** Với Google Docs, Google cho xuất .docx qua đường dẫn chuẩn (nếu tệp chia sẻ cho phép). */
function downloadUrl(u, kind) {
  if (kind === "gdoc") {
    const id = (u.match(/\/document\/d\/([^/]+)/) || [])[1];
    return id ? `https://docs.google.com/document/d/${id}/export?format=docx` : null;
  }
  if (kind === "gsheet") {
    const id = (u.match(/\/spreadsheets\/d\/([^/]+)/) || [])[1];
    return id ? `https://docs.google.com/spreadsheets/d/${id}/export?format=xlsx` : null;
  }
  return ["word", "excel", "pdf", "archive"].includes(kind) ? u : null;
}

const SECTION = /^(\d+)\.\s*\S/; // "1. Chương trình…"
const SUB = /^(\d+\.\d+)\.?\s*\S/; // "3.1. Biểu mẫu…", "4.1 Nhóm…"

async function fetchRecord() {
  const res = await fetch(API, {
    method: "POST",
    headers: { "content-type": "application/json", "user-agent": UA },
    body: JSON.stringify({ siteid: 22, lang: "vn", id: RECORD_ID, what: "91" }),
    signal: AbortSignal.timeout(45000),
  });
  if (!res.ok) throw new Error(`API trả về HTTP ${res.status}`);
  const text = (await res.text()).trim(); // API có thể trả khoảng trắng trước JSON
  const json = JSON.parse(text);
  const rec = Array.isArray(json) ? json[0] : json;
  if (!rec?.content) throw new Error("Bản ghi không có nội dung (mã bản ghi sai hoặc API đổi định dạng)");
  return rec;
}

function parseForms(html) {
  const $ = cheerio.load(`<div id="r">${html}</div>`);
  const rows = [];
  let section = "";
  let subsection = "";
  let pos = 0;
  $("#r p, #r li").each((_, el) => {
    const text = clean($(el).text());
    if (!text) return;
    const a = $(el).find("a[href]").first();
    const href = a.attr("href");
    const isSec = SECTION.test(text) && !SUB.test(text);
    const isSub = SUB.test(text);
    if (isSec) {
      section = text;
      subsection = "";
    } else if (isSub) {
      // Nguồn có nhóm 4.1, 4.2 nhưng không có dòng tiêu đề "4.": tự tạo nhóm cha để không lẫn vào nhóm 3.
      const major = text.match(SUB)[1].split(".")[0];
      if (!section.startsWith(`${major}.`)) section = `${major}. Nhóm nghiên cứu`;
      subsection = text;
    }
    if (!href) return; // tiêu đề thuần
    let url;
    try {
      url = new URL(href, "https://khdn.hce.edu.vn/").toString();
    } catch {
      return;
    }
    if (!/^https?:/.test(url)) return;
    const title = text.replace(/^[*•\-–]\s*/, "");
    const kind = kindOf(url);
    // Tiêu đề mục có kèm liên kết (ví dụ quyết định ban hành) được ghi là "văn bản", không phải biểu mẫu.
    rows.push({
      id: crypto.createHash("sha1").update(`${title}|${url}`).digest("hex").slice(0, 16),
      position: pos++,
      section: section || "Khác",
      subsection: isSec ? "" : subsection,
      title,
      kind,
      url,
      download_url: downloadUrl(url, kind),
      is_document: isSec || isSub ? 1 : 0,
      search: norm([section, subsection, title].join(" ")),
    });
  });
  // Bỏ trùng (cùng tên và liên kết) nhưng giữ thứ tự.
  const seen = new Set();
  return rows.filter((r) => (seen.has(r.id) ? false : seen.add(r.id)));
}

fs.mkdirSync(path.dirname(DB_FILE), { recursive: true });
const db = new Database(DB_FILE);
db.pragma("journal_mode = WAL");
db.exec(SOURCE_DDL);
const runId = db.prepare("INSERT INTO sync_runs (source, unit_id, started_at, status) VALUES ('hce-forms', ?, ?, 'running')").run(RECORD_ID, Date.now()).lastInsertRowid;

try {
  const rec = await fetchRecord();
  const rows = parseForms(rec.content);
  if (rows.length < 5) throw new Error(`Chỉ đọc được ${rows.length} biểu mẫu: có thể nguồn đã đổi cấu trúc, không ghi đè dữ liệu cũ`);
  const now = Date.now();
  const ins = db.prepare(
    "INSERT INTO src_form (id, position, section, subsection, title, kind, url, download_url, is_document, search, synced_at) VALUES (@id,@position,@section,@subsection,@title,@kind,@url,@download_url,@is_document,@search,@synced_at)",
  );
  db.transaction(() => {
    db.prepare("DELETE FROM src_form").run();
    rows.forEach((r) => ins.run({ ...r, synced_at: now }));
  })();
  const sections = new Set(rows.map((r) => r.section)).size;
  const counts = { forms: { imported: rows.length, sections, sourceChanged: rec.changedate ?? null, sourcePosted: rec.postdate ?? null, page: SOURCE_PAGE } };
  db.prepare("UPDATE sync_runs SET finished_at=?, status='ok', counts=? WHERE id=?").run(Date.now(), JSON.stringify(counts), runId);
  console.log(`Xong: ${rows.length} biểu mẫu/văn bản trong ${sections} nhóm (nguồn sửa lần cuối ${rec.changedate ?? "?"}).`);
} catch (e) {
  db.prepare("UPDATE sync_runs SET finished_at=?, status='failed', note=? WHERE id=?").run(Date.now(), String(e.message ?? e).slice(0, 500), runId);
  console.error("Đồng bộ biểu mẫu thất bại:", e.message ?? e);
  process.exitCode = 1;
}
