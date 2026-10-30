"use client";
import { useEffect, useState } from "react";
import { ChevronLeft, ChevronRight, ExternalLink, Search } from "lucide-react";

type Kind = "articles" | "topics" | "scientists";
type Person = { name: string; id?: number; role?: string };
type Item = Record<string, unknown> & { id: number; url: string };
type Facet = { v: string | number; n: number };
type Resp = {
  items: Item[];
  total: number;
  page: number;
  pageSize: number;
  facets: { years: Facet[]; categories: Facet[]; degrees: Facet[] };
  status: { hasData: boolean; lastSync: { at: number; status: string; note: string | null } | null; source: { name: string; url: string } };
};

const people = (v: unknown) => (Array.isArray(v) ? (v as Person[]) : []);
const names = (v: unknown, max = 6) => {
  const p = people(v);
  const s = p.slice(0, max).map((x) => (x.role ? `${x.name} (${x.role})` : x.name)).join(", ");
  return p.length > max ? `${s} và ${p.length - max} người khác` : s;
};
const str = (v: unknown) => (typeof v === "string" ? v : "");

export function RemoteLookup({ kind }: { kind: Kind }) {
  const [q, setQ] = useState("");
  const [dq, setDq] = useState("");
  const [page, setPage] = useState(1);
  const [year, setYear] = useState("");
  const [category, setCategory] = useState("");
  const [degree, setDegree] = useState("");
  const [sort, setSort] = useState("newest");
  const [data, setData] = useState<Resp | null>(null);
  const [err, setErr] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => { setDq(q); setPage(1); }, 300);
    return () => clearTimeout(t);
  }, [q]);

  useEffect(() => {
    const ctl = new AbortController();
    const p = new URLSearchParams({ q: dq, page: String(page) });
    if (year) p.set("year", year);
    if (category) p.set("category", category);
    if (degree) p.set("degree", degree);
    if (sort) p.set("sort", sort);
    setErr(false);
    fetch(`/api/source/${kind}?${p}`, { signal: ctl.signal })
      .then((r) => (r.ok ? r.json() : Promise.reject()))
      .then(setData)
      .catch((e) => { if (e?.name !== "AbortError") setErr(true); });
    return () => ctl.abort();
  }, [kind, dq, page, year, category, degree, sort]);

  const sel = "rounded-md border border-border bg-background px-2 py-1.5 text-sm";
  const pages = data ? Math.max(1, Math.ceil(data.total / data.pageSize)) : 1;
  const reset = (fn: () => void) => () => { fn(); setPage(1); };

  return (
    <div className="space-y-4">
      <div className="relative">
        <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Tìm theo từ khoá, tên, lĩnh vực… (không cần gõ dấu)" className="w-full rounded-lg border border-border bg-background py-2.5 pl-9 pr-3 text-sm outline-none focus:border-primary" />
      </div>

      <div className="flex flex-wrap gap-2">
        {kind === "articles" && data && (
          <>
            <select aria-label="Năm" className={sel} value={year} onChange={(e) => { setYear(e.target.value); setPage(1); }}>
              <option value="">Mọi năm</option>
              {data.facets.years.map((y) => <option key={y.v} value={y.v}>{y.v} ({y.n})</option>)}
            </select>
            <select aria-label="Danh mục" className={sel} value={category} onChange={(e) => { setCategory(e.target.value); setPage(1); }}>
              <option value="">Mọi danh mục</option>
              {data.facets.categories.map((c) => <option key={c.v} value={c.v}>{c.v} ({c.n})</option>)}
            </select>
          </>
        )}
        {kind === "scientists" && data && (
          <select aria-label="Học vị" className={sel} value={degree} onChange={(e) => { setDegree(e.target.value); setPage(1); }}>
            <option value="">Mọi học vị</option>
            {data.facets.degrees.map((d) => <option key={d.v} value={d.v}>{d.v} ({d.n})</option>)}
          </select>
        )}
        {kind !== "scientists" && (
          <select aria-label="Sắp xếp" className={sel} value={sort} onChange={(e) => { setSort(e.target.value); setPage(1); }}>
            <option value="newest">Mới nhất</option>
            {kind === "articles" && <option value="oldest">Cũ nhất</option>}
            <option value="title">Theo tiêu đề A–Z</option>
          </select>
        )}
        {(year || category || degree) && (
          <button className="text-sm text-primary hover:underline" onClick={reset(() => { setYear(""); setCategory(""); setDegree(""); })}>Xoá bộ lọc</button>
        )}
      </div>

      {data && !data.status.hasData && (
        <div className="rounded-lg border border-dashed border-border p-4 text-sm">
          <p className="font-medium">Chưa có dữ liệu.</p>
          <p className="mt-1 text-muted-foreground">Chạy đồng bộ một lần để nạp dữ liệu từ CSDL Khoa học Đại học Huế: <code className="rounded bg-muted px-1">npm run sync:hueuni</code></p>
        </div>
      )}
      {err && <p role="alert" className="text-sm text-red-600">Không tải được dữ liệu. Vui lòng thử lại.</p>}

      {data && data.status.hasData && (
        <>
          <p className="text-xs text-muted-foreground">
            {data.total.toLocaleString("vi-VN")} kết quả · Nguồn: <a className="underline" href={data.status.source.url} target="_blank" rel="noreferrer">{data.status.source.name}</a>
            {data.status.lastSync && <> · đồng bộ {new Date(data.status.lastSync.at).toLocaleString("vi-VN")}</>}
            {data.status.lastSync?.status === "partial" && <span className="text-amber-600" title={data.status.lastSync.note ?? ""}> (có cảnh báo: có thể lệch vài bản ghi)</span>}
          </p>
          <ul className="space-y-3">
            {data.items.map((it) => (
              <li key={it.id} className="rounded-xl border border-border bg-card p-4">
                <div className="flex items-start gap-2">
                  <h3 className="flex-1 font-medium">
                    {kind === "scientists" ? `${str(it.degree)} ${str(it.name)}`.trim() : str(it.title)}
                  </h3>
                  {kind === "articles" && str(it.category) && <span className="shrink-0 rounded bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary">{str(it.category)}</span>}
                  {kind === "topics" && str(it.code) && <span className="shrink-0 rounded bg-muted px-2 py-0.5 text-xs text-muted-foreground">{str(it.code)}</span>}
                </div>
                {kind === "articles" && (
                  <>
                    <p className="mt-1 text-xs text-muted-foreground">{[names(it.authors), str(it.venue), it.year ? String(it.year) : "", str(it.issn) && `ISSN ${str(it.issn)}`].filter(Boolean).join(" · ")}</p>
                    {str(it.field) && <p className="mt-1 text-xs text-muted-foreground">Lĩnh vực: {str(it.field)}</p>}
                  </>
                )}
                {kind === "topics" && (
                  <>
                    <p className="mt-1 text-xs text-muted-foreground">{[str(it.field), str(it.lead_unit) && `Chủ trì: ${str(it.lead_unit)}`].filter(Boolean).join(" · ")}</p>
                    <p className="mt-1 text-xs text-muted-foreground">{names(it.members)}</p>
                  </>
                )}
                {kind === "scientists" && (
                  <p className="mt-1 text-xs text-muted-foreground">{[str(it.major) && `Ngành: ${str(it.major)}`, str(it.specialty) && str(it.specialty) !== str(it.major) && `Chuyên ngành: ${str(it.specialty)}`, str(it.unit)].filter(Boolean).join(" · ")}</p>
                )}
                <a href={it.url} target="_blank" rel="noreferrer" className="mt-2 inline-flex items-center gap-1 text-xs text-primary hover:underline">
                  Xem bản ghi gốc <ExternalLink size={12} />
                </a>
              </li>
            ))}
          </ul>
          {data.total === 0 && <p className="text-sm text-muted-foreground">Không có kết quả phù hợp.</p>}
          {pages > 1 && (
            <div className="flex items-center justify-center gap-3 text-sm">
              <button disabled={page <= 1} onClick={() => setPage(page - 1)} aria-label="Trang trước" className="grid size-8 place-items-center rounded-md border border-border disabled:opacity-40"><ChevronLeft size={16} /></button>
              <span>Trang {page}/{pages}</span>
              <button disabled={page >= pages} onClick={() => setPage(page + 1)} aria-label="Trang sau" className="grid size-8 place-items-center rounded-md border border-border disabled:opacity-40"><ChevronRight size={16} /></button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
