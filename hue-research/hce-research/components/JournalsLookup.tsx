"use client";
import { useEffect, useState } from "react";
import { ChevronLeft, ChevronRight, ExternalLink, Search } from "lucide-react";

type Cat = { name: string; q: string | null };
type Journal = {
  id: number;
  title: string;
  publisher: string | null;
  country: string | null;
  issns: string[];
  homepage: string | null;
  sjr: null | { year: number; value: number | null; quartile: string | null; hIndex: number | null; categories: Cat[]; type: string | null; openAccess: boolean | null; profileUrl: string | null };
  vn2244: null | { group: string | null; no: number | null; agency: string | null; alt: string[] };
  doaj: null | { url: string | null; license: string | null; apc: string | null };
};
type Src = { source: string; label: string; version: string | null; sourceUrl: string | null; licenseNote: string | null; note: string | null; recordCount: number | null; importedAt: number };
type Resp = {
  items: Journal[];
  total: number;
  page: number;
  pageSize: number;
  facets: { quartiles: { v: string; n: number }[]; countries: { v: string; n: number }[]; types: { v: string; n: number }[] };
  status: { hasData: boolean; total: number; hasSjr: boolean; sources: Src[] };
};

const TYPE_LABEL: Record<string, string> = { journal: "Tạp chí", "book series": "Tùng thư", "conference and proceedings": "Kỷ yếu hội nghị", "trade journal": "Tạp chí ngành" };
const nf = (n: number, d = 2) => n.toLocaleString("vi-VN", { maximumFractionDigits: d });

function Badge({ children, tone }: { children: React.ReactNode; tone: "q1" | "q2" | "q3" | "q4" | "vn" | "oa" }) {
  const cls = { q1: "bg-emerald-600/15 text-emerald-700 dark:text-emerald-300", q2: "bg-sky-600/15 text-sky-700 dark:text-sky-300", q3: "bg-amber-600/15 text-amber-700 dark:text-amber-300", q4: "bg-muted text-muted-foreground", vn: "bg-primary/10 text-primary", oa: "bg-orange-600/15 text-orange-700 dark:text-orange-300" }[tone];
  return <span className={`rounded px-2 py-0.5 text-xs font-medium ${cls}`}>{children}</span>;
}

export function JournalsLookup() {
  const [q, setQ] = useState("");
  const [dq, setDq] = useState("");
  const [page, setPage] = useState(1);
  const [quartile, setQuartile] = useState("");
  const [country, setCountry] = useState("");
  const [type, setType] = useState("");
  const [vn, setVn] = useState(false);
  const [doaj, setDoaj] = useState(false);
  const [sort, setSort] = useState("rank");
  const [data, setData] = useState<Resp | null>(null);
  const [err, setErr] = useState(false);
  const [showSrc, setShowSrc] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => { setDq(q); setPage(1); }, 300);
    return () => clearTimeout(t);
  }, [q]);

  useEffect(() => {
    const ctl = new AbortController();
    const p = new URLSearchParams({ q: dq, page: String(page), sort });
    if (quartile) p.set("quartile", quartile);
    if (country) p.set("country", country);
    if (type) p.set("type", type);
    if (vn) p.set("vn", "1");
    if (doaj) p.set("doaj", "1");
    setErr(false);
    fetch(`/api/journals?${p}`, { signal: ctl.signal })
      .then((r) => (r.ok ? r.json() : Promise.reject()))
      .then(setData)
      .catch((e) => { if (e?.name !== "AbortError") setErr(true); });
    return () => ctl.abort();
  }, [dq, page, quartile, country, type, vn, doaj, sort]);

  const sel = "rounded-md border border-border bg-background px-2 py-1.5 text-sm";
  const pages = data ? Math.max(1, Math.ceil(data.total / data.pageSize)) : 1;
  const chk = (on: boolean, set: (v: boolean) => void, label: string) => (
    <label className="flex items-center gap-1.5 rounded-md border border-border px-2 py-1.5 text-sm">
      <input type="checkbox" checked={on} onChange={(e) => { set(e.target.checked); setPage(1); }} /> {label}
    </label>
  );
  const anyFilter = quartile || country || type || vn || doaj;

  return (
    <div className="space-y-4">
      <div className="relative">
        <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Tìm theo tên tạp chí, ISSN, nhà xuất bản, lĩnh vực (ví dụ: economics, 0033-5533)…" className="w-full rounded-lg border border-border bg-background py-2.5 pl-9 pr-3 text-sm outline-none focus:border-primary" />
      </div>

      {data && data.status.hasData && (
        <div className="flex flex-wrap items-center gap-2">
          <select aria-label="Quartile SJR" className={sel} value={quartile} onChange={(e) => { setQuartile(e.target.value); setPage(1); }} disabled={!data.status.hasSjr}>
            <option value="">{data.status.hasSjr ? "Mọi quartile (SJR)" : "Quartile: chưa nhập SJR"}</option>
            {data.facets.quartiles.map((x) => <option key={x.v} value={x.v}>{x.v} ({x.n.toLocaleString("vi-VN")})</option>)}
          </select>
          <select aria-label="Quốc gia" className={sel} value={country} onChange={(e) => { setCountry(e.target.value); setPage(1); }}>
            <option value="">Mọi quốc gia</option>
            {data.facets.countries.map((x) => <option key={x.v} value={x.v}>{x.v} ({x.n.toLocaleString("vi-VN")})</option>)}
          </select>
          {data.facets.types.length > 0 && (
            <select aria-label="Loại" className={sel} value={type} onChange={(e) => { setType(e.target.value); setPage(1); }}>
              <option value="">Mọi loại</option>
              {data.facets.types.map((x) => <option key={x.v} value={x.v}>{TYPE_LABEL[x.v] ?? x.v} ({x.n.toLocaleString("vi-VN")})</option>)}
            </select>
          )}
          {chk(vn, setVn, "Trong danh mục QĐ 2244")}
          {chk(doaj, setDoaj, "Có trong DOAJ")}
          <select aria-label="Sắp xếp" className={sel} value={sort} onChange={(e) => { setSort(e.target.value); setPage(1); }}>
            <option value="rank">Xếp hạng SJR cao trước</option>
            <option value="title">Tên A–Z</option>
          </select>
          {anyFilter && <button className="text-sm text-primary hover:underline" onClick={() => { setQuartile(""); setCountry(""); setType(""); setVn(false); setDoaj(false); setPage(1); }}>Xoá bộ lọc</button>}
        </div>
      )}

      {data && !data.status.hasData && (
        <div className="rounded-lg border border-dashed border-border p-4 text-sm">
          <p className="font-medium">Chưa có dữ liệu tạp chí.</p>
          <p className="mt-1 text-muted-foreground">Nhập dữ liệu: <code className="rounded bg-muted px-1">npm run journals:vn</code>, <code className="rounded bg-muted px-1">npm run journals:doaj</code>, <code className="rounded bg-muted px-1">npm run journals:sjr -- --file scimagojr.csv</code></p>
        </div>
      )}
      {data && data.status.hasData && !data.status.hasSjr && (
        <p className="rounded-md border border-dashed border-border px-3 py-2 text-xs text-muted-foreground">
          Chưa nhập dữ liệu SJR nên <strong>chưa có quartile (Q1–Q4)</strong>. Tải tệp CSV từ scimagojr.com bằng trình duyệt rồi chạy <code className="rounded bg-muted px-1">npm run journals:sjr -- --file tệp.csv</code>.
        </p>
      )}
      {err && <p role="alert" className="text-sm text-red-600">Không tải được dữ liệu. Vui lòng thử lại.</p>}

      {data && data.status.hasData && (
        <>
          <p className="text-xs text-muted-foreground">
            {data.total.toLocaleString("vi-VN")} tạp chí ·{" "}
            <button className="underline" onClick={() => setShowSrc((s) => !s)}>{showSrc ? "Ẩn nguồn dữ liệu" : "Nguồn dữ liệu và điều khoản"}</button>
          </p>
          {showSrc && (
            <ul className="space-y-2 rounded-md bg-muted px-3 py-2 text-xs text-muted-foreground">
              {data.status.sources.map((s) => (
                <li key={s.source}>
                  <strong className="text-foreground">{s.label}</strong>
                  {s.version && <> — {s.version}</>}
                  {s.recordCount !== null && <> · {s.recordCount.toLocaleString("vi-VN")} bản ghi</>} · nhập {new Date(s.importedAt).toLocaleDateString("vi-VN")}
                  {s.licenseNote && <div>{s.licenseNote}</div>}
                  {s.note && <div>{s.note}</div>}
                  {s.sourceUrl && <a href={s.sourceUrl} target="_blank" rel="noreferrer" className="underline">{s.sourceUrl}</a>}
                </li>
              ))}
              <li>Quartile là <strong>quartile tốt nhất theo SJR (Scopus)</strong>, không phải phân hạng Web of Science/JCR. Hãy kiểm tra lại trên trang chính thức của tạp chí và của cơ sở dữ liệu trước khi quyết định.</li>
            </ul>
          )}

          <ul className="space-y-3">
            {data.items.map((j) => (
              <li key={j.id} className="rounded-xl border border-border bg-card p-4">
                <div className="flex flex-wrap items-start gap-2">
                  <h3 className="min-w-0 flex-1 font-medium">{j.title}</h3>
                  <span className="flex flex-wrap gap-1.5">
                    {j.sjr?.quartile && <Badge tone={(j.sjr.quartile.toLowerCase() as "q1")}>SJR {j.sjr.quartile}</Badge>}
                    {j.vn2244 && <Badge tone="vn">QĐ 2244</Badge>}
                    {j.doaj && <Badge tone="oa">DOAJ</Badge>}
                  </span>
                </div>
                <p className="mt-1 text-xs text-muted-foreground">
                  {[j.publisher, j.country, j.issns.length ? `ISSN ${j.issns.join(", ")}` : "", j.sjr?.type && j.sjr.type !== "journal" ? TYPE_LABEL[j.sjr.type] ?? j.sjr.type : ""].filter(Boolean).join(" · ")}
                </p>
                {j.sjr && (
                  <p className="mt-1.5 text-sm">
                    SJR {j.sjr.year}: {j.sjr.value !== null ? <strong>{nf(j.sjr.value, 3)}</strong> : "—"}
                    {j.sjr.hIndex ? <> · H-index {j.sjr.hIndex}</> : null}
                    {j.sjr.categories.length > 0 && (
                      <span className="text-muted-foreground"> · {j.sjr.categories.slice(0, 3).map((c) => (c.q ? `${c.name} (${c.q})` : c.name)).join("; ")}{j.sjr.categories.length > 3 ? "…" : ""}</span>
                    )}
                  </p>
                )}
                {j.vn2244 && (
                  <p className="mt-1.5 text-sm">
                    Danh mục tạp chí đạt tiêu chuẩn khoa học Việt Nam 2026{j.vn2244.group ? ` — ${j.vn2244.group}` : ""}
                    {j.vn2244.agency && <span className="text-muted-foreground"> · {j.vn2244.agency}</span>}
                    {j.vn2244.alt.length > 0 && <span className="block text-xs text-muted-foreground">Gồm cả: {j.vn2244.alt.join("; ")}</span>}
                  </p>
                )}
                {j.doaj && (
                  <p className="mt-1.5 text-sm text-muted-foreground">
                    Truy cập mở (DOAJ){j.doaj.license ? ` · ${j.doaj.license}` : ""}{j.doaj.apc ? ` · ${j.doaj.apc}` : ""}
                  </p>
                )}
                <div className="mt-2 flex flex-wrap gap-3 text-xs">
                  {j.sjr?.profileUrl && <a href={j.sjr.profileUrl} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-primary hover:underline">Hồ sơ SJR <ExternalLink size={12} /></a>}
                  {j.doaj?.url && <a href={j.doaj.url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-primary hover:underline">Trang DOAJ <ExternalLink size={12} /></a>}
                  {j.homepage && <a href={j.homepage} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-primary hover:underline">Website tạp chí <ExternalLink size={12} /></a>}
                </div>
              </li>
            ))}
          </ul>
          {data.total === 0 && <p className="text-sm text-muted-foreground">Không có tạp chí phù hợp.</p>}
          {pages > 1 && (
            <div className="flex items-center justify-center gap-3 text-sm">
              <button disabled={page <= 1} onClick={() => setPage(page - 1)} aria-label="Trang trước" className="grid size-8 place-items-center rounded-md border border-border disabled:opacity-40"><ChevronLeft size={16} /></button>
              <span>Trang {page.toLocaleString("vi-VN")}/{pages.toLocaleString("vi-VN")}</span>
              <button disabled={page >= pages} onClick={() => setPage(page + 1)} aria-label="Trang sau" className="grid size-8 place-items-center rounded-md border border-border disabled:opacity-40"><ChevronRight size={16} /></button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
