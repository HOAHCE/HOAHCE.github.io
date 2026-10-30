#!/usr/bin/env node
// Nhập dữ liệu TẠP CHÍ từ ba nguồn vào một bảng gộp theo ISSN (bảng `journal`):
//
//   sjr     SCImago Journal & Country Rank: quartile Q1-Q4, SJR, H-index, danh mục, quốc gia, nhà xuất bản.
//           Nguồn tự động bị Cloudflare chặn (HTTP 403 với chương trình), nên NHẬP TỪ TỆP CSV bạn tải bằng trình duyệt.
//   vn2244  Danh mục tạp chí đạt tiêu chuẩn khoa học Việt Nam 2026 (QĐ 2244/QĐ-BKHCN, 28/4/2026), 341 tạp chí.
//           Đọc từ tệp PDF danh mục (không có ISSN: ghép với tạp chí khác theo tên khi khớp duy nhất).
//   doaj    Directory of Open Access Journals: cờ "có trong DOAJ", giấy phép, APC. Dữ liệu CC0, tải tự động.
//
// Dùng:
//   node scripts/journals.mjs sjr    --file duong/dan/scimagojr-2025.csv [--year 2025] [--merge]
//   node scripts/journals.mjs vn2244 [--file danh-muc.pdf | --url https://...] [--extra bo-sung.csv]
//   node scripts/journals.mjs doaj   [--file doaj.csv]
//
// Mỗi lần nhập THAY THẾ dữ liệu của chính nguồn đó (trừ khi --merge), không động tới dữ liệu nguồn khác;
// việc thay thế nằm trong một giao dịch nên lỗi giữa chừng không làm mất dữ liệu cũ.
import Database from "better-sqlite3";
import fs from "node:fs";
import https from "node:https";
import os from "node:os";
import path from "node:path";
import { SOURCE_DDL } from "../lib/source-ddl.mjs";

const UA = "HCE-Research-Sync/0.1 (public data aggregation for Hue University of Economics)";
const DB_FILE = process.env.HCE_DB_PATH || path.join(process.cwd(), "data", "hce.db");

const [cmd, ...rest] = process.argv.slice(2);
const opt = (n, d) => (rest.includes(`--${n}`) ? rest[rest.indexOf(`--${n}`) + 1] : d);
const flag = (n) => rest.includes(`--${n}`);

// ---------- tiện ích chung ----------
const norm = (s) => String(s ?? "").toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/đ/g, "d");
const clean = (s) => String(s ?? "").replace(/\s+/g, " ").trim();
/** Khoá so khớp tên: không dấu, không dấu câu, "&" = "and", bỏ "the" đầu. */
const titleKey = (s) => norm(s).replace(/&/g, " and ").replace(/[^a-z0-9]+/g, " ").trim().replace(/^the /, "");
const countryKey = (s) => {
  const k = norm(s).replace(/[^a-z]/g, "");
  return k === "vietnam" ? "vietnam" : k;
};
const issnOf = (raw) => {
  const d = String(raw ?? "").replace(/[^0-9xX]/g, "").toUpperCase();
  return d.length === 8 ? `${d.slice(0, 4)}-${d.slice(4)}` : null;
};
const issnsOf = (raw) => [...new Set(String(raw ?? "").split(/[,;/\s]+/).map(issnOf).filter(Boolean))];
const num = (s) => {
  const n = Number(String(s ?? "").replace(/\./g, (m, o, str) => (str.includes(",") ? "" : m)).replace(",", "."));
  return Number.isFinite(n) ? n : null;
};

/** Đọc CSV (hỗ trợ ngoặc kép, dấu phân cách tuỳ chọn, xuống dòng trong ô). */
function parseCsv(text, delim) {
  const rows = [];
  let row = [];
  let f = "";
  let q = false;
  const t = text.replace(/^﻿/, "");
  for (let i = 0; i < t.length; i++) {
    const c = t[i];
    if (q) {
      if (c === '"') {
        if (t[i + 1] === '"') { f += '"'; i++; } else q = false;
      } else f += c;
    } else if (c === '"') q = true;
    else if (c === delim) { row.push(f); f = ""; }
    else if (c === "\n") { row.push(f); rows.push(row); row = []; f = ""; }
    else if (c !== "\r") f += c;
  }
  if (f.length || row.length) { row.push(f); rows.push(row); }
  return rows;
}

function download(url, dest, redirects = 5) {
  return new Promise((resolve, reject) => {
    https
      .get(url, { headers: { "user-agent": UA } }, (res) => {
        if (res.statusCode && res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
          res.resume();
          if (redirects <= 0) return reject(new Error("quá nhiều chuyển hướng"));
          return resolve(download(new URL(res.headers.location, url).toString(), dest, redirects - 1));
        }
        if (res.statusCode !== 200) {
          res.resume();
          return reject(new Error(`HTTP ${res.statusCode} khi tải ${new URL(url).hostname}`));
        }
        const out = fs.createWriteStream(dest);
        res.pipe(out);
        out.on("finish", () => out.close(() => resolve({ headers: res.headers, url })));
        out.on("error", reject);
      })
      .on("error", reject);
  });
}

fs.mkdirSync(path.dirname(DB_FILE), { recursive: true });
const db = new Database(DB_FILE);
db.pragma("journal_mode = WAL");
db.exec(SOURCE_DDL);

const q = {
  byIssn: db.prepare("SELECT journal_id FROM journal_issn WHERE issn = ?"),
  byTitle: db.prepare("SELECT id, country, issns, vn2244_group FROM journal WHERE title_key = ?"),
  get: db.prepare("SELECT * FROM journal WHERE id = ?"),
  insIssn: db.prepare("INSERT OR IGNORE INTO journal_issn (issn, journal_id) VALUES (?, ?)"),
  insert: db.prepare("INSERT INTO journal (title, title_key, publisher, country, issns, search, updated_at) VALUES (?,?,?,?,?,?,?)"),
};

const INTL_GROUP = "Tạp chí được chỉ mục quốc tế (Scopus, WoS)";
const isIntlGroup = (g) => g === INTL_GROUP;
const stats = { created: 0, matchedIssn: 0, matchedTitle: 0, ambiguous: 0 };

function findId(rec) {
  for (const i of rec.issns) {
    const r = q.byIssn.get(i);
    if (r) { stats.matchedIssn++; return r.journal_id; }
  }
  // Ghép theo tên chỉ khi chắc chắn: đúng một ứng viên, cùng quốc gia (hoặc chưa rõ), và nếu bản ghi có ISSN
  // thì ứng viên phải chưa có ISSN (tức được tạo từ danh mục không có ISSN).
  const cands = q.byTitle.all(rec.titleKey).filter((c) => {
    if (rec.issns.length && JSON.parse(c.issns).length) return false;
    if (rec.anyCountry || isIntlGroup(c.vn2244_group)) return true; // tạp chí VN xuất bản qua nhà xuất bản nước ngoài: quốc gia nhà xuất bản khác Việt Nam
    const a = rec.country ? countryKey(rec.country) : "";
    const b = c.country ? countryKey(c.country) : "";
    return !a || !b || a === b;
  });
  if (cands.length === 1) { stats.matchedTitle++; return cands[0].id; }
  if (cands.length > 1) stats.ambiguous++;
  return null;
}

/**
 * Danh mục QĐ 2244 không có ISSN nên tạo dòng riêng. Khi một nguồn có ISSN xác định đúng tạp chí đó
 * (và tên trùng khớp, quốc gia tương thích), gộp dòng không-ISSN vào dòng có ISSN để không bị trùng lặp.
 */
function mergeTwin(id, rec) {
  if (!rec.issns.length) return;
  const twins = db
    .prepare("SELECT * FROM journal WHERE title_key = ? AND id <> ? AND issns = '[]'")
    .all(rec.titleKey, id)
    .filter((t) => {
      if (isIntlGroup(t.vn2244_group)) return true;
      const a = rec.country ? countryKey(rec.country) : "";
      const b = t.country ? countryKey(t.country) : "";
      return !a || !b || a === b;
    });
  if (twins.length !== 1) return;
  const t = twins[0];
  const row = q.get.get(id);
  const groups = [
    ["vn2244", ["vn2244", "vn2244_group", "vn2244_no", "vn2244_agency", "vn2244_alt"]],
    ["sjr_year", ["sjr_year", "sjr", "sjr_quartile", "sjr_h_index", "sjr_categories", "sjr_areas", "sjr_sourceid", "sjr_type", "sjr_open_access"]],
    ["doaj", ["doaj", "doaj_url", "doaj_license", "doaj_apc"]],
  ];
  const patch = {};
  for (const [lead, cols] of groups) {
    if (t[lead] && !row[lead]) for (const c of cols) patch[c] = t[c];
  }
  if (Object.keys(patch).length) {
    db.prepare(`UPDATE journal SET ${Object.keys(patch).map((c) => `${c}=@${c}`).join(",")} WHERE id=@id`).run({ ...patch, id });
  }
  db.prepare("DELETE FROM journal WHERE id = ?").run(t.id);
  stats.merged = (stats.merged ?? 0) + 1;
}

/** Tạo hoặc cập nhật một tạp chí; `fields` là các cột riêng của nguồn. */
function upsert(rec, fields, { preferTitle = false } = {}) {
  if (rec.country && countryKey(rec.country) === "vietnam") rec = { ...rec, country: "Vietnam" }; // nguồn ghi "Viet Nam"/"Vietnam"
  let id = findId(rec);
  if (id !== null) mergeTwin(id, rec);
  const now = Date.now();
  if (id === null) {
    const r = q.insert.run(rec.title, rec.titleKey, rec.publisher || null, rec.country || null, JSON.stringify(rec.issns), "", now);
    id = Number(r.lastInsertRowid);
    stats.created++;
  }
  const row = q.get.get(id);
  const issns = [...new Set([...JSON.parse(row.issns), ...rec.issns])];
  for (const i of rec.issns) q.insIssn.run(i, id);
  const next = {
    ...row,
    title: preferTitle || !row.title ? rec.title : row.title,
    title_key: preferTitle || !row.title ? rec.titleKey : row.title_key,
    publisher: row.publisher || rec.publisher || null,
    country: row.country || rec.country || null,
    homepage: rec.homepage || row.homepage || null,
    issns: JSON.stringify(issns),
    ...fields,
    updated_at: now,
  };
  const cats = next.sjr_categories ? JSON.parse(next.sjr_categories).map((c) => c.name).join(" ") : "";
  next.search = norm([next.title, issns.join(" "), next.publisher, next.country, cats, next.vn2244_alt, next.vn2244_agency].filter(Boolean).join(" "));
  const cols = Object.keys(next).filter((k) => k !== "id");
  db.prepare(`UPDATE journal SET ${cols.map((c) => `${c}=@${c}`).join(",")} WHERE id=@id`).run({ ...next, id });
}

const SOURCE_COLS = {
  sjr: { sjr_year: null, sjr: null, sjr_quartile: null, sjr_h_index: null, sjr_categories: null, sjr_areas: null, sjr_sourceid: null, sjr_type: null, sjr_open_access: null },
  vn2244: { vn2244: 0, vn2244_group: null, vn2244_no: null, vn2244_agency: null, vn2244_alt: null },
  doaj: { doaj: 0, doaj_url: null, doaj_license: null, doaj_apc: null },
};

function clearSource(src) {
  const set = Object.entries(SOURCE_COLS[src]).map(([k, v]) => `${k} = ${v === null ? "NULL" : v}`).join(", ");
  db.prepare(`UPDATE journal SET ${set}`).run();
}

function pruneOrphans() {
  const ids = db.prepare("SELECT id FROM journal WHERE sjr_year IS NULL AND vn2244 = 0 AND doaj = 0").all().map((r) => r.id);
  const delIssn = db.prepare("DELETE FROM journal_issn WHERE journal_id = ?");
  const delJ = db.prepare("DELETE FROM journal WHERE id = ?");
  for (const id of ids) { delIssn.run(id); delJ.run(id); }
  return ids.length;
}

function recordSource(source, info, count) {
  db.prepare(
    "INSERT INTO journal_source (source,label,version,source_url,license_note,note,record_count,imported_at) VALUES (?,?,?,?,?,?,?,?) " +
      "ON CONFLICT(source) DO UPDATE SET label=excluded.label, version=excluded.version, source_url=excluded.source_url, license_note=excluded.license_note, note=excluded.note, record_count=excluded.record_count, imported_at=excluded.imported_at",
  ).run(source, info.label, info.version ?? null, info.url ?? null, info.license ?? null, info.note ?? null, count, Date.now());
}

// ---------- SJR ----------
function importSjr() {
  const file = opt("file");
  if (!file) {
    throw new Error(
      "Thiếu --file. Tải CSV bằng trình duyệt: scimagojr.com/journalrank.php → chọn năm → KHÔNG lọc lĩnh vực/quốc gia → nút \"Download data\". " +
        "(Tải bằng chương trình bị Cloudflare chặn.)",
    );
  }
  const text = fs.readFileSync(file, "utf8");
  const delim = text.split("\n", 1)[0].split(";").length > text.split("\n", 1)[0].split(",").length ? ";" : ",";
  const rows = parseCsv(text, delim);
  const header = rows[0].map((h) => clean(h));
  const col = (name) => header.findIndex((h) => h.toLowerCase() === name.toLowerCase());
  const colAll = (name) => header.map((h, i) => (h.toLowerCase() === name.toLowerCase() ? i : -1)).filter((i) => i >= 0);
  const I = { sid: col("Sourceid"), title: col("Title"), type: col("Type"), issn: col("Issn"), sjr: col("SJR"), q: col("SJR Best Quartile"), h: col("H index"), country: col("Country"), cats: col("Categories"), areas: col("Areas"), oa: col("Open Access"), pub: colAll("Publisher") };
  if (I.title < 0 || I.sjr < 0 || I.q < 0) throw new Error("Không nhận ra định dạng: thiếu cột Title/SJR/SJR Best Quartile. Đây có phải tệp CSV của SJR không?");
  const ycol = header.find((h) => /^Total Docs\. \((\d{4})\)$/.test(h));
  const year = Number(opt("year", ycol ? ycol.match(/\((\d{4})\)/)[1] : NaN));
  if (!Number.isFinite(year)) throw new Error("Không xác định được năm dữ liệu; thêm --year 2025.");

  const body = rows.slice(1).filter((r) => r.length > I.title && clean(r[I.title]));
  if (body.length < 5000 && !flag("merge") && !flag("force")) {
    throw new Error(
      `Tệp chỉ có ${body.length} dòng (bản đầy đủ ~30.000). Có thể bạn tải theo một lĩnh vực/quốc gia. ` +
        "Dùng --merge để bổ sung vào dữ liệu hiện có (không xoá), hoặc --force để thay thế toàn bộ bằng tệp này.",
    );
  }
  db.transaction(() => {
    if (!flag("merge")) clearSource("sjr");
    for (const r of body) {
      const title = clean(r[I.title]);
      const quartile = /^Q[1-4]$/.test(clean(r[I.q])) ? clean(r[I.q]) : null;
      const cats = clean(r[I.cats] ?? "").split(";").map((c) => clean(c)).filter(Boolean).map((c) => {
        const m = c.match(/^(.*)\s\((Q[1-4])\)$/);
        return m ? { name: m[1], q: m[2] } : { name: c, q: null };
      });
      upsert(
        { title, titleKey: titleKey(title), issns: issnsOf(r[I.issn]), publisher: I.pub.map((i) => clean(r[i])).find(Boolean) ?? "", country: clean(r[I.country] ?? "") },
        {
          sjr_year: year,
          sjr: num(r[I.sjr]),
          sjr_quartile: quartile,
          sjr_h_index: I.h >= 0 ? Math.round(num(r[I.h]) ?? 0) || null : null,
          sjr_categories: JSON.stringify(cats),
          sjr_areas: clean(r[I.areas] ?? "") || null,
          sjr_sourceid: I.sid >= 0 ? clean(r[I.sid]) || null : null,
          sjr_type: I.type >= 0 ? clean(r[I.type]) || null : null,
          sjr_open_access: I.oa >= 0 ? (/^yes$/i.test(clean(r[I.oa])) ? 1 : 0) : null,
        },
        { preferTitle: true },
      );
    }
    stats.pruned = pruneOrphans();
    recordSource(
      "sjr",
      {
        label: "SCImago Journal & Country Rank (SJR)",
        version: `SJR ${year}`,
        url: "https://www.scimagojr.com/journalrank.php",
        license: "Dùng cho mục đích phi thương mại, phải trích dẫn: SCImago, (n.d.). SJR — SCImago Journal & Country Rank [Portal]. https://www.scimagojr.com. Dữ liệu dựa trên Scopus.",
        note: flag("merge") ? "nhập bổ sung (--merge)" : null,
      },
      body.length,
    );
  })();
  return { source: "sjr", records: body.length, detail: `năm ${year}` };
}

// ---------- DOAJ ----------
async function importDoaj() {
  let file = opt("file");
  let version = null;
  if (!file) {
    file = path.join(os.tmpdir(), `doaj-${Date.now()}.csv`);
    console.log("Tải tệp CSV công khai của DOAJ (CC0)…");
    const dl = await download("https://doaj.org/csv", file);
    version = (new URL(dl.url).pathname.match(/(20\d{6})/) || [])[1] ?? null; // tên tệp có dạng doaj_journalcsv_YYYYMMDD_…
  }
  const text = fs.readFileSync(file, "utf8");
  const rows = parseCsv(text, ",");
  const header = rows[0].map((h) => clean(h));
  const col = (name) => header.findIndex((h) => h.toLowerCase() === name.toLowerCase());
  const I = { title: col("Journal title"), url: col("Journal URL"), doaj: col("URL in DOAJ"), pissn: col("Journal ISSN (print version)"), eissn: col("Journal EISSN (online version)"), pub: col("Publisher"), country: col("Country of publisher"), lic: col("Journal license"), apc: col("APC"), apcAmount: col("APC amount") };
  if (I.title < 0 || I.pissn < 0 || I.eissn < 0) throw new Error("Không nhận ra định dạng CSV của DOAJ (thiếu cột Journal title/ISSN).");
  const body = rows.slice(1).filter((r) => r.length > I.eissn && clean(r[I.title]));
  if (body.length < 5000 && !flag("force")) throw new Error(`Chỉ có ${body.length} dòng (DOAJ có ~20.000 tạp chí); dùng --force nếu chắc chắn.`);
  const m = (version ?? path.basename(opt("file", ""))).match(/(20\d{2})(\d{2})(\d{2})/);
  version = m ? `${m[1]}-${m[2]}-${m[3]}` : new Date().toISOString().slice(0, 10);
  db.transaction(() => {
    clearSource("doaj");
    for (const r of body) {
      const title = clean(r[I.title]);
      upsert(
        { title, titleKey: titleKey(title), issns: issnsOf(`${r[I.pissn]},${r[I.eissn]}`), publisher: clean(r[I.pub] ?? ""), country: clean(r[I.country] ?? ""), homepage: clean(r[I.url] ?? "") || null },
        {
          doaj: 1,
          doaj_url: clean(r[I.doaj] ?? "") || null,
          doaj_license: clean(r[I.lic] ?? "") || null,
          doaj_apc: /^yes$/i.test(clean(r[I.apc] ?? "")) ? `Có APC${clean(r[I.apcAmount] ?? "") ? ": " + clean(r[I.apcAmount]) : ""}` : /^no$/i.test(clean(r[I.apc] ?? "")) ? "Không thu APC" : null,
        },
      );
    }
    stats.pruned = pruneOrphans();
    recordSource(
      "doaj",
      { label: "DOAJ — Directory of Open Access Journals", version, url: "https://doaj.org/", license: "Siêu dữ liệu tạp chí theo CC0 (doaj.org/terms)." },
      body.length,
    );
  })();
  return { source: "doaj", records: body.length, detail: version };
}

// ---------- QĐ 2244/QĐ-BKHCN ----------
const QD_URL = "https://danchuphapluat.vn/stores/customer_file/huyennt/042026/30/Danh-m%E1%BB%A5c-TC-chuan-khoa-hoc-VN.pdf";

/**
 * Dựng lại bảng từ vị trí chữ trong PDF (bản PDF đổi từ Excel nên ô nhiều dòng căn giữa hoặc căn trên):
 *  - dòng STT + tên: x < 75, bắt đầu bằng số thứ tự;
 *  - tên xuống dòng và các dòng con ("- Kỳ …", "- Tạp chí …: chuyên san …"): x ≈ 70;
 *  - cơ quan chủ quản: x ≥ 400, căn giữa theo chiều dọc của cả khối.
 * Dòng con bắt đầu bằng "-" (và các dòng nối tiếp sau nó) thuộc về STT đứng trước; dòng thường thuộc STT gần nhất.
 */
async function readQdPdf(file) {
  const { getDocument } = await import("pdfjs-dist/legacy/build/pdf.mjs");
  const doc = await getDocument({ data: new Uint8Array(fs.readFileSync(file)), verbosity: 0 }).promise;
  const recs = [];
  let group = "";
  let cur = null;
  for (let p = 1; p <= doc.numPages; p++) {
    const tc = await (await doc.getPage(p)).getTextContent();
    const items = tc.items
      .map((i) => ({ s: clean(i.str), x: i.transform[4], y: i.transform[5] }))
      .filter((i) => i.s && !/^Evaluation Only/i.test(i.s))
      .sort((a, b) => b.y - a.y);
    const anchors = items
      .filter((i) => i.x < 75 && /^\d{1,3}(\s|$)/.test(i.s))
      .map((i) => ({ no: Number(i.s.match(/^\d+/)[0]), y: i.y, first: clean(i.s.replace(/^\d+/, "")), title: [], alt: [], agency: [], group: "", ys: [i.y] }));
    const nextAnchor = (y) => anchors.find((a) => a.y < y - 0.5);
    let lastAlt = null; // mục con đang mở (để nối dòng tiếp theo)
    for (const it of items) {
      if (it.x < 75 && /^\d{1,3}(\s|$)/.test(it.s)) {
        cur = anchors.find((a) => a.y === it.y && a.no === Number(it.s.match(/^\d+/)[0]));
        cur.group = group;
        recs.push(cur);
        lastAlt = null;
      } else if (/CHỈ MỤC QUỐC TẾ/i.test(it.s)) group = INTL_GROUP;
      else if (/^TẠP CHÍ TRONG NƯỚC$/i.test(it.s)) group = "Tạp chí trong nước";
      else if (it.x >= 400) agencyItems.push({ ...it, page: p });
      else if (!cur || /^(STT|TÊN TẠP CHÍ|DANH MỤC)/i.test(it.s)) continue;
      else if (/^[-–•]/.test(it.s)) {
        lastAlt = { text: clean(it.s.replace(/^[-–•]\s*/, "")) };
        cur.alt.push(lastAlt);
        cur.ys.push(it.y);
      } else if (lastAlt) {
        lastAlt.text = clean(`${lastAlt.text} ${it.s}`);
        cur.ys.push(it.y);
      } else {
        // Dòng thường: thuộc STT gần nhất (ô tên căn giữa có thể nằm ngay phía trên STT của chính nó).
        const nx = nextAnchor(it.y);
        const owner = nx && Math.abs(nx.y - it.y) < Math.abs(cur.y - it.y) ? nx : cur;
        owner.title.push(it);
        owner.ys.push(it.y);
      }
    }
    // Gán cơ quan chủ quản vào khối chứa nó (gần tâm khối nhất).
    const live = recs.filter((r) => r.page === undefined);
    for (const r of live) r.page = p;
    for (const ag of agencyItems.splice(0)) {
      let best = null;
      let bestD = Infinity;
      for (const r of recs.filter((x) => x.page === p)) {
        const hi = Math.max(...r.ys) + 9;
        const lo = Math.min(...r.ys) - 9;
        if (ag.y > hi || ag.y < lo) continue;
        const d = Math.abs((hi + lo) / 2 - ag.y);
        if (d < bestD) { best = r; bestD = d; }
      }
      if (best) best.agency.push(ag);
    }
  }
  const join = (arr) => clean(arr.sort((m, n) => n.y - m.y).map((i) => i.s).join(" "));
  return recs
    .map((r) => ({ no: r.no, group: r.group, title: clean([r.first, join(r.title)].filter(Boolean).join(" ")), alt: r.alt.map((a) => a.text), agency: join(r.agency) }))
    .sort((a, b) => a.no - b.no);
}
const agencyItems = [];

async function importVn2244() {
  let file = opt("file");
  const url = opt("url", QD_URL);
  if (!file) {
    file = path.join(os.tmpdir(), `qd2244-${Date.now()}.pdf`);
    console.log("Tải tệp PDF danh mục…");
    await download(url, file);
  }
  const recs = await readQdPdf(file);
  const nos = recs.map((r) => r.no);
  const missing = [];
  for (let n = 1; n <= Math.max(...nos, 0); n++) if (!nos.includes(n)) missing.push(n);
  if (recs.length < 300) throw new Error(`Chỉ đọc được ${recs.length} mục (kỳ vọng ~341); nguồn có thể đã đổi định dạng. Không ghi đè dữ liệu cũ.`);

  const extras = [];
  if (opt("extra")) {
    // CSV bổ sung theo quyết định sửa đổi (QĐ 2823/QĐ-BKHCN): cột title, agency, group (không bắt buộc), issn (không bắt buộc).
    const rows = parseCsv(fs.readFileSync(opt("extra"), "utf8"), ",");
    const h = rows[0].map((x) => clean(x).toLowerCase());
    const ci = (n) => h.indexOf(n);
    for (const r of rows.slice(1)) {
      if (!clean(r[ci("title")])) continue;
      extras.push({ title: clean(r[ci("title")]), agency: ci("agency") >= 0 ? clean(r[ci("agency")]) : "", group: ci("group") >= 0 && clean(r[ci("group")]) ? clean(r[ci("group")]) : "Tạp chí trong nước (bổ sung)", issn: ci("issn") >= 0 ? clean(r[ci("issn")]) : "" });
    }
  }
  const version = "QĐ 2244/QĐ-BKHCN ngày 28/4/2026";
  db.transaction(() => {
    clearSource("vn2244");
    for (const r of recs) {
      upsert(
        { title: r.title, titleKey: titleKey(r.title), issns: [], publisher: "", country: "Vietnam", anyCountry: isIntlGroup(r.group) },
        { vn2244: 1, vn2244_group: r.group || null, vn2244_no: r.no, vn2244_agency: r.agency || null, vn2244_alt: r.alt.length ? JSON.stringify(r.alt) : null },
      );
    }
    extras.forEach((e, i) => {
      upsert(
        { title: e.title, titleKey: titleKey(e.title), issns: issnsOf(e.issn), publisher: "", country: "Vietnam" },
        { vn2244: 1, vn2244_group: e.group, vn2244_no: 1000 + i, vn2244_agency: e.agency || null, vn2244_alt: null },
      );
    });
    stats.pruned = pruneOrphans();
    recordSource(
      "vn2244",
      {
        label: "Danh mục tạp chí đạt tiêu chuẩn khoa học Việt Nam 2026 (Bộ KH&CN)",
        version,
        url: opt("file") ? undefined : url,
        license: "Văn bản công khai của Bộ Khoa học và Công nghệ.",
        note:
          "Đọc từ bản sao PDF của danh mục (không có ISSN); đối chiếu với văn bản gốc của Bộ. " +
          (extras.length ? `Có ${extras.length} mục bổ sung từ tệp --extra (QĐ sửa đổi 2823/QĐ-BKHCN).` : "CHƯA áp dụng Quyết định sửa đổi, bổ sung (QĐ 2823/QĐ-BKHCN); dùng --extra để nhập mục thay đổi."),
      },
      recs.length + extras.length,
    );
  })();
  return { source: "vn2244", records: recs.length + extras.length, detail: `${recs.length} từ PDF${extras.length ? `, ${extras.length} bổ sung` : ""}${missing.length ? `; thiếu STT ${missing.join(",")}` : ""}` };
}

// ---------- chạy ----------
const COMMANDS = { sjr: importSjr, vn2244: importVn2244, doaj: importDoaj };
if (!COMMANDS[cmd]) {
  console.error("Cú pháp: node scripts/journals.mjs <sjr|vn2244|doaj> [tuỳ chọn]  (xem phần đầu tệp để biết chi tiết)");
  process.exit(2);
}
const runId = db.prepare("INSERT INTO sync_runs (source, unit_id, started_at, status) VALUES (?, 'journals', ?, 'running')").run(`journals-${cmd}`, Date.now()).lastInsertRowid;
try {
  const res = await COMMANDS[cmd]();
  const total = db.prepare("SELECT COUNT(*) n FROM journal").get().n;
  db.prepare("UPDATE sync_runs SET finished_at=?, status='ok', counts=? WHERE id=?").run(Date.now(), JSON.stringify({ ...res, stats, totalJournals: total }), runId);
  console.log(`Xong ${cmd}: ${res.records} bản ghi nguồn (${res.detail}). Tạo mới ${stats.created}, ghép theo ISSN ${stats.matchedIssn}, ghép theo tên ${stats.matchedTitle}, gộp bản trùng ${stats.merged ?? 0}, mơ hồ ${stats.ambiguous}${stats.pruned ? `, xoá mồ côi ${stats.pruned}` : ""}. Tổng số tạp chí: ${total}.`);
} catch (e) {
  db.prepare("UPDATE sync_runs SET finished_at=?, status='failed', note=? WHERE id=?").run(Date.now(), String(e.message ?? e).slice(0, 500), runId);
  console.error(`Nhập ${cmd} thất bại:`, e.message ?? e);
  process.exitCode = 1;
}
