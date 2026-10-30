import { db } from "./db";
import { norm } from "./text";

// Tạp chí gộp theo ISSN từ ba nguồn: SJR (quartile), danh mục QĐ 2244/QĐ-BKHCN, DOAJ. Xem scripts/journals.mjs.

const like = (s: string) => `%${s.replace(/[\\%_]/g, (c) => "\\" + c)}%`;
const likePrefix = (s: string) => `${s.replace(/[\\%_]/g, (c) => "\\" + c)}%`;
const ESCAPE = " ESCAPE '\\'";

type Row = {
  id: number; title: string; title_key: string; publisher: string | null; country: string | null; issns: string; homepage: string | null;
  sjr_year: number | null; sjr: number | null; sjr_quartile: string | null; sjr_h_index: number | null; sjr_categories: string | null;
  sjr_areas: string | null; sjr_sourceid: string | null; sjr_type: string | null; sjr_open_access: number | null;
  vn2244: number; vn2244_group: string | null; vn2244_no: number | null; vn2244_agency: string | null; vn2244_alt: string | null;
  doaj: number; doaj_url: string | null; doaj_license: string | null; doaj_apc: string | null;
};

export type Journal = {
  id: number;
  title: string;
  publisher: string | null;
  country: string | null;
  issns: string[];
  homepage: string | null;
  sjr: null | { year: number; value: number | null; quartile: string | null; hIndex: number | null; categories: { name: string; q: string | null }[]; type: string | null; openAccess: boolean | null; profileUrl: string | null };
  vn2244: null | { group: string | null; no: number | null; agency: string | null; alt: string[] };
  doaj: null | { url: string | null; license: string | null; apc: string | null };
};

export type JournalQuery = { q?: string; quartile?: string; vn?: boolean; doaj?: boolean; country?: string; type?: string; sort?: string; page?: number; pageSize?: number };

function toJournal(r: Row): Journal {
  return {
    id: r.id,
    title: r.title,
    publisher: r.publisher,
    country: r.country,
    issns: JSON.parse(r.issns) as string[],
    homepage: r.homepage,
    sjr: r.sjr_year
      ? {
          year: r.sjr_year,
          value: r.sjr,
          quartile: r.sjr_quartile,
          hIndex: r.sjr_h_index,
          categories: r.sjr_categories ? (JSON.parse(r.sjr_categories) as { name: string; q: string | null }[]) : [],
          type: r.sjr_type,
          openAccess: r.sjr_open_access === null ? null : r.sjr_open_access === 1,
          profileUrl: r.sjr_sourceid ? `https://www.scimagojr.com/journalsearch.php?q=${encodeURIComponent(r.sjr_sourceid)}&tip=sid` : null,
        }
      : null,
    vn2244: r.vn2244 ? { group: r.vn2244_group, no: r.vn2244_no, agency: r.vn2244_agency, alt: r.vn2244_alt ? (JSON.parse(r.vn2244_alt) as string[]) : [] } : null,
    doaj: r.doaj ? { url: r.doaj_url, license: r.doaj_license, apc: r.doaj_apc } : null,
  };
}

export function searchJournals(qy: JournalQuery) {
  const where: string[] = [];
  const args: (string | number)[] = [];
  const raw = (qy.q ?? "").trim();
  for (const tok of norm(raw).split(/\s+/).filter(Boolean).slice(0, 8)) {
    where.push(`search LIKE ?${ESCAPE}`);
    args.push(like(tok));
  }
  if (qy.quartile && /^Q[1-4]$/.test(qy.quartile)) { where.push("sjr_quartile = ?"); args.push(qy.quartile); }
  if (qy.vn) where.push("vn2244 = 1");
  if (qy.doaj) where.push("doaj = 1");
  if (qy.country) { where.push("country = ?"); args.push(qy.country); }
  if (qy.type) { where.push("sjr_type = ?"); args.push(qy.type); }
  const w = where.length ? `WHERE ${where.join(" AND ")}` : "";

  const orderParts: string[] = [];
  const orderArgs: (string | number)[] = [];
  if (qy.sort === "title") orderParts.push("title COLLATE NOCASE ASC");
  else {
    if (raw) { orderParts.push(`CASE WHEN title_key LIKE ?${ESCAPE} THEN 0 ELSE 1 END`); orderArgs.push(likePrefix(norm(raw).replace(/[^a-z0-9]+/g, " ").trim())); }
    orderParts.push("sjr IS NULL", "sjr DESC", "vn2244 DESC", "title COLLATE NOCASE ASC");
  }
  const pageSize = Math.min(Math.max(qy.pageSize ?? 12, 1), 50);
  const page = Math.max(qy.page ?? 1, 1);

  const total = (db.prepare(`SELECT COUNT(*) n FROM journal ${w}`).get(...args) as { n: number }).n;
  const rows = db.prepare(`SELECT * FROM journal ${w} ORDER BY ${orderParts.join(", ")} LIMIT ? OFFSET ?`).all(...args, ...orderArgs, pageSize, (page - 1) * pageSize) as Row[];
  return { items: rows.map(toJournal), total, page, pageSize };
}

export function journalFacets() {
  const col = (sql: string) => db.prepare(sql).all() as { v: string; n: number }[];
  return {
    quartiles: col("SELECT sjr_quartile v, COUNT(*) n FROM journal WHERE sjr_quartile IS NOT NULL GROUP BY sjr_quartile ORDER BY v"),
    countries: col("SELECT country v, COUNT(*) n FROM journal WHERE country IS NOT NULL GROUP BY country ORDER BY n DESC LIMIT 25"),
    types: col("SELECT sjr_type v, COUNT(*) n FROM journal WHERE sjr_type IS NOT NULL GROUP BY sjr_type ORDER BY n DESC"),
  };
}

export type JournalSource = { source: string; label: string; version: string | null; sourceUrl: string | null; licenseNote: string | null; note: string | null; recordCount: number | null; importedAt: number };

export function journalStatus() {
  const total = (db.prepare("SELECT COUNT(*) n FROM journal").get() as { n: number }).n;
  const sources = (
    db.prepare("SELECT source, label, version, source_url sourceUrl, license_note licenseNote, note, record_count recordCount, imported_at importedAt FROM journal_source ORDER BY CASE source WHEN 'vn2244' THEN 0 WHEN 'sjr' THEN 1 ELSE 2 END").all() as JournalSource[]
  );
  return { hasData: total > 0, total, hasSjr: sources.some((s) => s.source === "sjr"), sources };
}
