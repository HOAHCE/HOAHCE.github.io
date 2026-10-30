import { db } from "./db";
import { norm } from "./text";

export type SourceKind = "articles" | "topics" | "scientists";
const TABLE: Record<SourceKind, string> = { articles: "src_article", topics: "src_topic", scientists: "src_scientist" };
export const isKind = (k: string): k is SourceKind => k in TABLE;

const BASE = "https://csdlkhoahoc.hueuni.edu.vn/index.php";
const linkOf = (k: SourceKind, id: number) =>
  k === "articles" ? `${BASE}/article/detail_full/${id}` : k === "topics" ? `${BASE}/topic/detail/${id}` : `${BASE}/scientist/detail/id/${id}`;

export type Person = { name: string; id?: number; role?: string };
export type Query = { q?: string; page?: number; pageSize?: number; year?: number; category?: string; degree?: string; sort?: string };

const like = (s: string) => `%${s.replace(/[\\%_]/g, (c) => "\\" + c)}%`;

export function searchSource(kind: SourceKind, qy: Query) {
  const t = TABLE[kind];
  const where: string[] = [];
  const args: (string | number)[] = [];
  for (const tok of norm(qy.q ?? "").split(/\s+/).filter(Boolean).slice(0, 8)) {
    where.push("search LIKE ? ESCAPE '\\'");
    args.push(like(tok));
  }
  if (kind === "articles") {
    if (qy.year) { where.push("year = ?"); args.push(qy.year); }
    if (qy.category) { where.push("category = ?"); args.push(qy.category); }
  }
  if (kind === "scientists" && qy.degree) { where.push("degree = ?"); args.push(qy.degree); }
  const w = where.length ? `WHERE ${where.join(" AND ")}` : "";
  const order =
    kind === "articles" ? (qy.sort === "oldest" ? "year ASC, id ASC" : qy.sort === "title" ? "title COLLATE NOCASE ASC" : "year DESC, id DESC")
    : kind === "scientists" ? "name COLLATE NOCASE ASC"
    : qy.sort === "title" ? "title COLLATE NOCASE ASC" : "id DESC";
  const pageSize = Math.min(Math.max(qy.pageSize ?? 12, 1), 50);
  const page = Math.max(qy.page ?? 1, 1);

  const total = (db.prepare(`SELECT COUNT(*) n FROM ${t} ${w}`).get(...args) as { n: number }).n;
  const rows = db.prepare(`SELECT * FROM ${t} ${w} ORDER BY ${order} LIMIT ? OFFSET ?`).all(...args, pageSize, (page - 1) * pageSize) as Record<string, unknown>[];
  const items = rows.map((r) => {
    const { search: _s, synced_at: _t, ...rest } = r;
    void _s; void _t;
    const o: Record<string, unknown> = { ...rest, url: linkOf(kind, r.id as number) };
    if (typeof r.authors === "string") o.authors = JSON.parse(r.authors) as Person[];
    if (typeof r.members === "string") o.members = JSON.parse(r.members) as Person[];
    return o;
  });
  return { items, total, page, pageSize };
}

export function sourceFacets() {
  const col = (sql: string) => (db.prepare(sql).all() as { v: string | number; n: number }[]).filter((x) => x.v !== null && x.v !== "");
  return {
    years: col("SELECT year v, COUNT(*) n FROM src_article WHERE year IS NOT NULL GROUP BY year ORDER BY year DESC"),
    categories: col("SELECT category v, COUNT(*) n FROM src_article GROUP BY category ORDER BY n DESC LIMIT 20"),
    degrees: col("SELECT degree v, COUNT(*) n FROM src_scientist GROUP BY degree ORDER BY n DESC"),
  };
}

export function sourceStatus() {
  const run = db.prepare("SELECT started_at, finished_at, status, counts, note, unit_id FROM sync_runs WHERE source='hueuni' AND status IN ('ok','partial') ORDER BY id DESC LIMIT 1").get() as
    | { started_at: number; finished_at: number | null; status: string; counts: string | null; note: string | null; unit_id: string }
    | undefined;
  const n = (t: string) => (db.prepare(`SELECT COUNT(*) n FROM ${t}`).get() as { n: number }).n;
  return {
    hasData: n("src_article") + n("src_topic") + n("src_scientist") > 0,
    totals: { articles: n("src_article"), topics: n("src_topic"), scientists: n("src_scientist") },
    lastSync: run ? { at: run.finished_at ?? run.started_at, status: run.status, note: run.note, unit: run.unit_id } : null,
    source: { name: "CSDL Khoa học và Công nghệ Đại học Huế", url: "https://csdlkhoahoc.hueuni.edu.vn/" },
  };
}

export type FormRow = {
  id: string;
  section: string;
  subsection: string | null;
  title: string;
  kind: string;
  url: string;
  download_url: string | null;
  is_document: number;
};

/** Biểu mẫu từ website Phòng KHCN & HTQT của Trường (khdn.hce.edu.vn). Giữ thứ tự như nguồn. */
export function searchForms(qy: { q?: string; kind?: string }) {
  const where: string[] = [];
  const args: string[] = [];
  for (const tok of norm(qy.q ?? "").split(/\s+/).filter(Boolean).slice(0, 8)) {
    where.push("search LIKE ? ESCAPE '\\'");
    args.push(like(tok));
  }
  if (qy.kind) { where.push("kind = ?"); args.push(qy.kind); }
  const w = where.length ? `WHERE ${where.join(" AND ")}` : "";
  const items = db.prepare(
    `SELECT id, section, subsection, title, kind, url, download_url, is_document FROM src_form ${w} ORDER BY position`,
  ).all(...args) as FormRow[];
  const kinds = db.prepare("SELECT kind v, COUNT(*) n FROM src_form GROUP BY kind ORDER BY n DESC").all() as { v: string; n: number }[];
  return { items, total: items.length, kinds };
}

export function formsStatus() {
  const run = db.prepare("SELECT finished_at, status, counts, note FROM sync_runs WHERE source='hce-forms' AND status='ok' ORDER BY id DESC LIMIT 1").get() as
    | { finished_at: number | null; status: string; counts: string | null; note: string | null }
    | undefined;
  const total = (db.prepare("SELECT COUNT(*) n FROM src_form").get() as { n: number }).n;
  const info = run?.counts ? (JSON.parse(run.counts).forms as { sourceChanged?: string | null; page?: string } | undefined) : undefined;
  return {
    hasData: total > 0,
    total,
    lastSync: run?.finished_at ?? null,
    sourceChanged: info?.sourceChanged ?? null,
    source: { name: "Phòng Khoa học, Công nghệ và Hợp tác quốc tế – Trường ĐH Kinh tế", url: info?.page ?? "https://khdn.hce.edu.vn/" },
  };
}

// ---- Quỹ quốc tế: lời kêu gọi đang mở từ EU Funding & Tenders (scripts/sync-eu-funding.mjs) ----
// Một số hạn nộp chỉ có ngày (00:00 UTC) nên chừa 12 giờ để không ẩn lời kêu gọi vào đúng ngày cuối.
const graceNow = () => new Date(Date.now() - 12 * 3600e3).toISOString();
const ACTIVE = "(deadlines = '[]' OR EXISTS (SELECT 1 FROM json_each(src_eu_call.deadlines) WHERE value >= ?))";
const NEXT = "(SELECT MIN(value) FROM json_each(src_eu_call.deadlines) WHERE value >= ?)";

export type EuCall = {
  id: string; type: number; identifier: string; call_id: string | null; call_title: string | null; title: string;
  programme: string | null; programme_abbr: string | null; action_type: string | null; deadline_model: string | null;
  opens_on: string | null; budget_eur: number | null; portal_url: string; submission_url: string | null;
  deadlines: string[]; next_deadline: string | null; description: string; tags: string[];
};
export type EuQuery = { q?: string; programme?: string; withinDays?: number; sort?: string; page?: number; pageSize?: number };

export function searchEuCalls(qy: EuQuery) {
  // So sánh với thời điểm hiện tại lúc truy vấn: lời kêu gọi hết hạn tự biến mất dù chưa đồng bộ lại.
  const now = graceNow();
  const where = [ACTIVE];
  const args: (string | number)[] = [now];
  for (const tok of norm(qy.q ?? "").split(/\s+/).filter(Boolean).slice(0, 8)) {
    where.push("search LIKE ? ESCAPE '\\'");
    args.push(like(tok));
  }
  if (qy.programme) { where.push("programme_abbr = ?"); args.push(qy.programme); }
  if (qy.withinDays) {
    where.push(`${NEXT} <= ?`);
    args.push(now, new Date(Date.now() + qy.withinDays * 86400000).toISOString());
  }
  const w = `WHERE ${where.join(" AND ")}`;
  const order =
    qy.sort === "budget" ? "budget_eur IS NULL, budget_eur DESC"
    : qy.sort === "title" ? "title COLLATE NOCASE ASC"
    : `${NEXT} IS NULL, ${NEXT} ASC`;
  const orderArgs = qy.sort === "budget" || qy.sort === "title" ? [] : [now, now];
  const pageSize = Math.min(Math.max(qy.pageSize ?? 12, 1), 50);
  const page = Math.max(qy.page ?? 1, 1);

  const total = (db.prepare(`SELECT COUNT(*) n FROM src_eu_call ${w}`).get(...args) as { n: number }).n;
  type Raw = Omit<EuCall, "deadlines" | "next_deadline" | "tags"> & { deadlines: string; tags: string; search: string; synced_at: number };
  const rows = db.prepare(`SELECT * FROM src_eu_call ${w} ORDER BY ${order} LIMIT ? OFFSET ?`).all(...args, ...orderArgs, pageSize, (page - 1) * pageSize) as Raw[];
  const items: EuCall[] = rows.map((r) => {
    const upcoming = (JSON.parse(r.deadlines) as string[]).filter((d) => d >= now);
    const { search: _s, synced_at: _t, deadlines: _d, tags, description, ...rest } = r;
    void _s; void _t; void _d;
    const desc = String(description ?? "");
    return { ...rest, deadlines: upcoming, next_deadline: upcoming[0] ?? null, description: desc.length > 700 ? desc.slice(0, 700) + "…" : desc, tags: JSON.parse(tags) as string[] };
  });
  return { items, total, page, pageSize };
}

export function euFacets() {
  const now = graceNow();
  const programmes = db.prepare(
    `SELECT programme_abbr v, MIN(programme) name, COUNT(*) n FROM src_eu_call WHERE ${ACTIVE} GROUP BY programme_abbr ORDER BY n DESC`,
  ).all(now) as { v: string; name: string; n: number }[];
  return { programmes };
}

export function euStatus() {
  const now = graceNow();
  const run = db.prepare("SELECT finished_at, status, counts, note FROM sync_runs WHERE source='eu-ft' AND status IN ('ok','partial') ORDER BY id DESC LIMIT 1").get() as
    | { finished_at: number | null; status: string; counts: string | null; note: string | null }
    | undefined;
  const active = (db.prepare(`SELECT COUNT(*) n FROM src_eu_call WHERE ${ACTIVE}`).get(now) as { n: number }).n;
  const stored = (db.prepare("SELECT COUNT(*) n FROM src_eu_call").get() as { n: number }).n;
  return {
    hasData: stored > 0,
    active,
    lastSync: run?.finished_at ?? null,
    note: run?.note ?? null,
    source: { name: "EU Funding & Tenders Portal (Ủy ban châu Âu)", url: "https://ec.europa.eu/info/funding-tenders/opportunities/portal/screen/opportunities/calls-for-proposals" },
  };
}
