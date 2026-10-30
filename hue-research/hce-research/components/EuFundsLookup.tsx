"use client";
import { useEffect, useState } from "react";
import { ChevronLeft, ChevronRight, ExternalLink, Search } from "lucide-react";

type Call = {
  id: string;
  type: number;
  identifier: string;
  call_id: string | null;
  call_title: string | null;
  title: string;
  programme: string | null;
  programme_abbr: string | null;
  action_type: string | null;
  deadline_model: string | null;
  opens_on: string | null;
  deadlines: string[];
  next_deadline: string | null;
  budget_eur: number | null;
  description: string;
  portal_url: string;
  submission_url: string | null;
  tags: string[];
};
type Resp = {
  items: Call[];
  total: number;
  page: number;
  pageSize: number;
  facets: { programmes: { v: string; name: string; n: number }[] };
  status: { hasData: boolean; active: number; lastSync: number | null; note: string | null; source: { name: string; url: string } };
};

const fmtDate = (iso: string) => new Date(iso).toLocaleDateString("vi-VN", { timeZone: "Europe/Brussels", day: "2-digit", month: "2-digit", year: "numeric" });
const dayKey = (t: number) => new Date(t).toLocaleDateString("en-CA", { timeZone: "Europe/Brussels" });
// Số ngày theo lịch Brussels (0 = hôm nay).
const daysLeft = (iso: string) => Math.round((Date.parse(dayKey(Date.parse(iso))) - Date.parse(dayKey(Date.now()))) / 86400000);
const fmtMoney = (n: number) =>
  n >= 1e9 ? `${(n / 1e9).toLocaleString("vi-VN", { maximumFractionDigits: 1 })} tỷ €` : n >= 1e6 ? `${(n / 1e6).toLocaleString("vi-VN", { maximumFractionDigits: 1 })} triệu €` : `${Math.round(n).toLocaleString("vi-VN")} €`;

export function EuFundsLookup() {
  const [q, setQ] = useState("");
  const [dq, setDq] = useState("");
  const [page, setPage] = useState(1);
  const [programme, setProgramme] = useState("");
  const [within, setWithin] = useState("");
  const [sort, setSort] = useState("deadline");
  const [open, setOpen] = useState<string | null>(null);
  const [data, setData] = useState<Resp | null>(null);
  const [err, setErr] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => { setDq(q); setPage(1); }, 300);
    return () => clearTimeout(t);
  }, [q]);

  useEffect(() => {
    const ctl = new AbortController();
    const p = new URLSearchParams({ q: dq, page: String(page), sort });
    if (programme) p.set("programme", programme);
    if (within) p.set("withinDays", within);
    setErr(false);
    fetch(`/api/funds/eu?${p}`, { signal: ctl.signal })
      .then((r) => (r.ok ? r.json() : Promise.reject()))
      .then(setData)
      .catch((e) => { if (e?.name !== "AbortError") setErr(true); });
    return () => ctl.abort();
  }, [dq, page, programme, within, sort]);

  const sel = "rounded-md border border-border bg-background px-2 py-1.5 text-sm";
  const pages = data ? Math.max(1, Math.ceil(data.total / data.pageSize)) : 1;

  return (
    <div className="space-y-4">
      <div className="relative">
        <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Tìm lời kêu gọi (tiếng Anh): economics, digital, SME, education, climate…" className="w-full rounded-lg border border-border bg-background py-2.5 pl-9 pr-3 text-sm outline-none focus:border-primary" />
      </div>

      {data && data.status.hasData && (
        <div className="flex flex-wrap gap-2">
          <select aria-label="Chương trình" className={sel} value={programme} onChange={(e) => { setProgramme(e.target.value); setPage(1); }}>
            <option value="">Mọi chương trình</option>
            {data.facets.programmes.map((x) => <option key={x.v} value={x.v}>{x.name ?? x.v} ({x.n})</option>)}
          </select>
          <select aria-label="Hạn nộp" className={sel} value={within} onChange={(e) => { setWithin(e.target.value); setPage(1); }}>
            <option value="">Mọi hạn nộp</option>
            <option value="30">Trong 30 ngày</option>
            <option value="90">Trong 90 ngày</option>
            <option value="180">Trong 180 ngày</option>
          </select>
          <select aria-label="Sắp xếp" className={sel} value={sort} onChange={(e) => { setSort(e.target.value); setPage(1); }}>
            <option value="deadline">Hạn nộp gần nhất</option>
            <option value="budget">Ngân sách lớn nhất</option>
            <option value="title">Tiêu đề A–Z</option>
          </select>
          {(programme || within) && <button className="text-sm text-primary hover:underline" onClick={() => { setProgramme(""); setWithin(""); setPage(1); }}>Xoá bộ lọc</button>}
        </div>
      )}

      {data && !data.status.hasData && (
        <div className="rounded-lg border border-dashed border-border p-4 text-sm">
          <p className="font-medium">Chưa có dữ liệu quỹ quốc tế.</p>
          <p className="mt-1 text-muted-foreground">Chạy đồng bộ một lần: <code className="rounded bg-muted px-1">npm run sync:eu</code></p>
        </div>
      )}
      {err && <p role="alert" className="text-sm text-red-600">Không tải được dữ liệu. Vui lòng thử lại.</p>}

      {data && data.status.hasData && (
        <>
          <p className="text-xs text-muted-foreground">
            {data.total.toLocaleString("vi-VN")} lời kêu gọi đang mở (còn hạn nộp) · Nguồn: <a className="underline" href={data.status.source.url} target="_blank" rel="noreferrer">{data.status.source.name}</a> (© Liên minh châu Âu, CC BY 4.0; đã tóm lược và chuyển định dạng)
            {data.status.lastSync && <> · đồng bộ {new Date(data.status.lastSync).toLocaleString("vi-VN")}</>}
          </p>
          <p className="rounded-md bg-muted px-3 py-2 text-xs text-muted-foreground">
            Nội dung gốc tiếng Anh. <strong>Điều kiện đủ tư cách của tổ chức/cá nhân tại Việt Nam khác nhau theo từng lời kêu gọi</strong>; hãy đọc mục Conditions/Eligibility trên cổng EU trước khi chuẩn bị hồ sơ. Hạn nộp theo giờ Brussels.
          </p>

          <ul className="space-y-3">
            {data.items.map((c) => {
              const left = c.next_deadline ? daysLeft(c.next_deadline) : null;
              const expanded = open === c.id;
              return (
                <li key={c.id} className="rounded-xl border border-border bg-card p-4">
                  <div className="flex items-start gap-2">
                    <h3 className="flex-1 font-medium">{c.title}</h3>
                    {c.programme_abbr && <span className="shrink-0 rounded bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary">{c.programme_abbr.replace(/2027$/, "")}</span>}
                  </div>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {[c.programme, c.action_type, c.budget_eur ? `Ngân sách ${fmtMoney(c.budget_eur)}` : "", c.identifier].filter(Boolean).join(" · ")}
                  </p>
                  <p className="mt-1 text-sm">
                    {c.next_deadline ? (
                      <>
                        Hạn nộp: <strong>{fmtDate(c.next_deadline)}</strong>
                        {left !== null && <span className={left <= 14 ? "ml-1 text-amber-600" : "ml-1 text-muted-foreground"}>({left <= 0 ? "hôm nay" : `còn ${left} ngày`})</span>}
                        {c.deadlines.length > 1 && <span className="text-muted-foreground"> · còn {c.deadlines.length - 1} vòng nữa</span>}
                      </>
                    ) : (
                      <span className="text-muted-foreground">Nộp liên tục / chưa có hạn cố định</span>
                    )}
                  </p>
                  {c.description && (
                    <p className={`mt-2 whitespace-pre-line text-sm text-muted-foreground ${expanded ? "" : "line-clamp-3"}`}>{c.description}</p>
                  )}
                  <div className="mt-2 flex flex-wrap items-center gap-3 text-xs">
                    {c.description.length > 180 && (
                      <button className="text-primary hover:underline" onClick={() => setOpen(expanded ? null : c.id)}>{expanded ? "Thu gọn" : "Xem thêm"}</button>
                    )}
                    <a href={c.portal_url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-primary hover:underline">Xem trên cổng EU <ExternalLink size={12} /></a>
                    {c.submission_url && c.submission_url !== c.portal_url && (
                      <a href={c.submission_url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-primary hover:underline">Cổng nộp hồ sơ <ExternalLink size={12} /></a>
                    )}
                  </div>
                </li>
              );
            })}
          </ul>
          {data.total === 0 && <p className="text-sm text-muted-foreground">Không có lời kêu gọi phù hợp.</p>}
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
