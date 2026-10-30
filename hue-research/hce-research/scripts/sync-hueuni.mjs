#!/usr/bin/env node
// Đồng bộ dữ liệu của một đơn vị từ CSDL Khoa học Đại học Huế vào SQLite cục bộ.
//
// Nguồn: các trang danh sách CÔNG KHAI của https://csdlkhoahoc.hueuni.edu.vn (không đăng nhập,
// không dùng chức năng xuất Excel vì chức năng đó cần tài khoản). Dữ liệu thuộc Đại học Huế
// (Ban KH, CN & QHQT quản lý). Script đọc chậm (mặc định 1,2 giây/trang), nhận diện rõ User-Agent,
// chỉ lấy thông tin chuyên môn (không ảnh, không liên hệ cá nhân).
//
// Dùng:  node scripts/sync-hueuni.mjs [--unit 7] [--only article,topic,scientist] [--delay 1200] [--max-pages N]
// Biến môi trường: HUEUNI_UNIT_ID (mặc định 7 = Trường Đại học Kinh tế), HCE_DB_PATH.
import Database from "better-sqlite3";
import * as cheerio from "cheerio";
import fs from "node:fs";
import path from "node:path";
import { SOURCE_DDL } from "../lib/source-ddl.mjs";

const BASE = "https://csdlkhoahoc.hueuni.edu.vn/index.php";
const UA = "HCE-Research-Sync/0.1 (public data aggregation for Hue University of Economics)";

const args = process.argv.slice(2);
const opt = (name, def) => {
  const i = args.indexOf(`--${name}`);
  return i >= 0 ? args[i + 1] : def;
};
const UNIT = String(opt("unit", process.env.HUEUNI_UNIT_ID || "7"));
const ONLY = new Set(String(opt("only", "article,topic,scientist")).split(",").map((s) => s.trim()));
const DELAY = Number(opt("delay", 1200));
const MAX_PAGES = Number(opt("max-pages", Infinity));
const DB_FILE = process.env.HCE_DB_PATH || path.join(process.cwd(), "data", "hce.db");

const norm = (s) => s.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/đ/g, "d");
const clean = (s) => (s ?? "").replace(/\s+/g, " ").trim();
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function get(url, tries = 4) {
  let lastErr;
  for (let t = 1; t <= tries; t++) {
    try {
      const res = await fetch(url, { headers: { "user-agent": UA, accept: "text/html" }, signal: AbortSignal.timeout(45000) });
      if (res.ok) return await res.text();
      lastErr = new Error(`HTTP ${res.status}`);
      if (res.status === 404) break;
    } catch (e) {
      lastErr = e;
    }
    await sleep(2000 * t * t);
  }
  throw new Error(`${url}: ${lastErr?.message ?? lastErr}`);
}

/** Tách "Tác giả"/"Người tham gia": các liên kết nhà khoa học và tên thường, kèm vai trò trong ngoặc. */
function people($, el) {
  const html = $(el).html() ?? "";
  const seg = html.split(/<br\s*\/?>/i).find((s) => /Tác giả|Người tham gia/.test(s));
  if (!seg) return [];
  const $s = cheerio.load(`<div>${seg.replace(/<b>.*?<\/b>/i, "")}</div>`);
  const out = [];
  const text = [];
  $s("div").contents().each((_, n) => {
    if (n.type === "tag" && n.name === "a") {
      const id = (($s(n).attr("href") ?? "").match(/scientist\/detail\/id\/(\d+)/) || [])[1];
      text.push({ name: clean($s(n).text()), id: id ? Number(id) : undefined });
    } else if (n.type === "text") {
      text.push({ raw: $s(n).text() });
    }
  });
  // Ghép: sau mỗi tên có thể có "(Chính)" hoặc ", Tên khác, Tên khác" ở phần văn bản thường.
  for (const t of text) {
    if (t.name) out.push({ name: t.name, id: t.id });
    else if (t.raw) {
      for (const part of t.raw.split(",")) {
        const m = part.match(/^\s*\(([^)]+)\)\s*(.*)$/);
        if (m) {
          if (out.length) out[out.length - 1].role = clean(m[1]);
          if (clean(m[2])) out.push({ name: clean(m[2]) });
        } else if (clean(part)) {
          const t = clean(part).match(/^(.*?)\s*\(([^)]+)\)$/);
          out.push(t ? { name: clean(t[1]), role: clean(t[2]) } : { name: clean(part) });
        }
      }
    }
  }
  return out.filter((p) => p.name);
}

const labelValue = ($p, label) => {
  const html = $p.html() ?? "";
  const seg = html.split(/<br\s*\/?>/i).find((s) => s.includes(label));
  return seg ? clean(cheerio.load(`<i>${seg}</i>`)("i").text().replace(label, "").replace(/^\s*:/, "")) : "";
};

function parseArticles(html) {
  const $ = cheerio.load(html);
  const rows = [];
  $(".bg-white.border-1px").each((_, box) => {
    const a = $(box).find('a[href*="article/detail_full/"]').first();
    const id = ((a.attr("href") ?? "").match(/detail_full\/(\d+)/) || [])[1];
    if (!id) return;
    const p = $(box).find("p.text-gray").first();
    const firstSeg = clean(cheerio.load(`<i>${(p.html() ?? "").split(/<br\s*\/?>/i)[0]}</i>`)("i").text());
    const ym = firstSeg.match(/^(.*?),?\s*(\d{4})\s*$/);
    const title = clean(a.find("h4").text());
    const authors = people($, p);
    const field = labelValue(p, "Lĩnh vực:");
    const category = labelValue(p, "Danh mục:").replace(/<!--.*?-->/g, "");
    const venue = ym ? clean(ym[1]) : firstSeg;
    rows.push({
      id: Number(id),
      title,
      venue,
      year: ym ? Number(ym[2]) : null,
      issn: clean($(box).find("span.pull-right").first().text()),
      field,
      category,
      authors: JSON.stringify(authors),
      has_file: a.find(".fa-paperclip").length ? 1 : 0,
      search: norm([title, venue, field, category, ...authors.map((x) => x.name)].join(" ")),
    });
  });
  return rows;
}

function parseTopics(html) {
  const $ = cheerio.load(html);
  const rows = [];
  $(".bg-white.border-1px").each((_, box) => {
    const on = $(box).find("a[onclick*='topic/detail/']").first().attr("onclick") ?? "";
    const id = (on.match(/topic\/detail\/(\d+)/) || [])[1];
    if (!id) return;
    const p = $(box).find("p.text-gray").first();
    const title = clean($(box).find("h4").first().text());
    const members = people($, p);
    const field = labelValue(p, "Lĩnh vực:");
    const lead = labelValue(p, "Đơn vị chủ trì");
    const perform = labelValue(p, "Đơn vị thực hiện");
    rows.push({
      id: Number(id),
      code: clean($(box).find("span.pull-right").first().text()),
      title,
      field,
      lead_unit: lead.replace(/^:\s*/, ""),
      perform_unit: perform.replace(/^:\s*/, ""),
      members: JSON.stringify(members),
      search: norm([title, field, ...members.map((x) => x.name)].join(" ")),
    });
  });
  return rows;
}

function parseScientists(html) {
  const $ = cheerio.load(html);
  const rows = [];
  $(".content.border-1px").each((_, box) => {
    const href = $(box).find("a.btn[href*='scientist/detail/id/']").attr("href") ?? "";
    const id = (href.match(/detail\/id\/(\d+)/) || [])[1];
    if (!id) return;
    const h4 = $(box).find("h4.name").first();
    const degree = clean(h4.find("small").text());
    const name = clean(h4.clone().children().remove().end().text());
    const field = (label) => {
      const p = $(box).find("p").filter((_, e) => $(e).text().includes(label)).first();
      return clean(p.text().replace(label, ""));
    };
    const row = {
      id: Number(id),
      code: clean($(box).find("ul li").first().text()),
      name,
      degree,
      major: field("Ngành đào tạo:"),
      specialty: field("Chuyên ngành đào tạo:"),
      unit: field("Đơn vị quản lý:"),
    };
    rows.push({ ...row, search: norm([name, degree, row.major, row.specialty, row.unit].join(" ")) });
  });
  return rows;
}

const SOURCES = {
  article: { parse: parseArticles, table: "src_article", cols: ["id", "title", "venue", "year", "issn", "field", "category", "authors", "has_file", "search"] },
  topic: { parse: parseTopics, table: "src_topic", cols: ["id", "code", "title", "field", "lead_unit", "perform_unit", "members", "search"] },
  scientist: { parse: parseScientists, table: "src_scientist", cols: ["id", "code", "name", "degree", "major", "specialty", "unit", "search"] },
};

function totalOf(html) {
  const $ = cheerio.load(html);
  $("select,script,style").remove();
  const t = $("body").text().match(/([\d.]+)\s*KẾT QUẢ/i);
  const total = t ? Number(t[1].replace(/\./g, "")) : NaN;
  let last = 1;
  $(".pagination a").each((_, a) => {
    const m = ($(a).attr("href") ?? "").match(/page\/(\d+)/);
    if (m) last = Math.max(last, Number(m[1]));
  });
  return { total, last };
}

fs.mkdirSync(path.dirname(DB_FILE), { recursive: true });
const db = new Database(DB_FILE);
db.pragma("journal_mode = WAL");
db.exec(SOURCE_DDL);

const run = db.prepare("INSERT INTO sync_runs (source, unit_id, started_at, status) VALUES ('hueuni', ?, ?, 'running')").run(UNIT, Date.now());
const runId = run.lastInsertRowid;
const counts = {};
const notes = [];

try {
  for (const kind of Object.keys(SOURCES)) {
    if (!ONLY.has(kind)) continue;
    const { parse, table, cols } = SOURCES[kind];
    const upsert = db.prepare(
      `INSERT INTO ${table} (${cols.join(",")}, synced_at) VALUES (${cols.map((c) => "@" + c).join(",")}, @synced_at) ` +
        `ON CONFLICT(id) DO UPDATE SET ${[...cols.slice(1), "synced_at"].map((c) => `${c}=excluded.${c}`).join(",")}`,
    );
    const first = await get(`${BASE}/${kind}/index/unit/${UNIT}/page/1`);
    const { total, last } = totalOf(first);
    const pages = Math.min(last, MAX_PAGES);
    console.log(`[${kind}] đơn vị ${UNIT}: ${Number.isNaN(total) ? "?" : total} bản ghi, ${last} trang${pages < last ? ` (giới hạn ${pages})` : ""}`);
    const seen = new Set();
    for (let p = 1; p <= pages; p++) {
      const html = p === 1 ? first : (await sleep(DELAY), await get(`${BASE}/${kind}/index/unit/${UNIT}/page/${p}`));
      const rows = parse(html);
      if (!rows.length) notes.push(`${kind} trang ${p}: không đọc được bản ghi nào`);
      const now = Date.now();
      db.transaction(() => rows.forEach((r) => upsert.run({ ...r, synced_at: now })))();
      rows.forEach((r) => seen.add(r.id));
      if (p % 10 === 0 || p === pages) console.log(`  ${kind}: trang ${p}/${pages}, ${seen.size} bản ghi`);
    }
    counts[kind] = { expected: Number.isNaN(total) ? null : total, imported: seen.size };
    if (!Number.isNaN(total) && pages === last && seen.size !== total) notes.push(`${kind}: nguồn báo ${total} nhưng đọc được ${seen.size}`);
  }
  db.prepare("UPDATE sync_runs SET finished_at=?, status=?, counts=?, note=? WHERE id=?").run(Date.now(), notes.length ? "partial" : "ok", JSON.stringify(counts), notes.join("; ") || null, runId);
  console.log(notes.length ? `Xong, có cảnh báo: ${notes.join("; ")}` : "Xong.", JSON.stringify(counts));
} catch (e) {
  db.prepare("UPDATE sync_runs SET finished_at=?, status='failed', counts=?, note=? WHERE id=?").run(Date.now(), JSON.stringify(counts), String(e.message ?? e).slice(0, 500), runId);
  console.error("Đồng bộ thất bại:", e.message ?? e);
  process.exitCode = 1;
}
