"use client";
import { useEffect, useMemo, useState } from "react";
import { Download, ExternalLink, Search } from "lucide-react";

type Form = {
  id: string;
  section: string;
  subsection: string | null;
  title: string;
  kind: string;
  url: string;
  download_url: string | null;
  is_document: number;
};
type Resp = {
  items: Form[];
  total: number;
  kinds: { v: string; n: number }[];
  status: { hasData: boolean; total: number; lastSync: number | null; sourceChanged: string | null; source: { name: string; url: string } };
};

const KIND_LABEL: Record<string, string> = {
  word: "Word",
  gdoc: "Google Docs",
  excel: "Excel",
  gsheet: "Google Sheets",
  pdf: "PDF",
  drive: "Google Drive",
  archive: "Tệp nén",
  link: "Liên kết",
};

export function FormsLookup() {
  const [q, setQ] = useState("");
  const [dq, setDq] = useState("");
  const [kind, setKind] = useState("");
  const [data, setData] = useState<Resp | null>(null);
  const [err, setErr] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => setDq(q), 250);
    return () => clearTimeout(t);
  }, [q]);

  useEffect(() => {
    const ctl = new AbortController();
    const p = new URLSearchParams({ q: dq });
    if (kind) p.set("kind", kind);
    setErr(false);
    fetch(`/api/forms?${p}`, { signal: ctl.signal })
      .then((r) => (r.ok ? r.json() : Promise.reject()))
      .then(setData)
      .catch((e) => { if (e?.name !== "AbortError") setErr(true); });
    return () => ctl.abort();
  }, [dq, kind]);

  // Gom theo nhóm > nhóm con, giữ thứ tự của nguồn.
  const groups = useMemo(() => {
    const out: { section: string; subs: { name: string; items: Form[] }[] }[] = [];
    for (const f of data?.items ?? []) {
      let g = out.find((x) => x.section === f.section);
      if (!g) out.push((g = { section: f.section, subs: [] }));
      const name = f.subsection ?? "";
      let s = g.subs.find((x) => x.name === name);
      if (!s) g.subs.push((s = { name, items: [] }));
      s.items.push(f);
    }
    return out;
  }, [data]);

  const sel = "rounded-md border border-border bg-background px-2 py-1.5 text-sm";

  return (
    <div className="space-y-4">
      <div className="relative">
        <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Tìm biểu mẫu: thuyết minh, nghiệm thu, hợp đồng… (không cần gõ dấu)" className="w-full rounded-lg border border-border bg-background py-2.5 pl-9 pr-3 text-sm outline-none focus:border-primary" />
      </div>

      {data && data.kinds.length > 1 && (
        <div className="flex items-center gap-2">
          <select aria-label="Loại tệp" className={sel} value={kind} onChange={(e) => setKind(e.target.value)}>
            <option value="">Mọi loại tệp</option>
            {data.kinds.map((k) => <option key={k.v} value={k.v}>{KIND_LABEL[k.v] ?? k.v} ({k.n})</option>)}
          </select>
          {kind && <button className="text-sm text-primary hover:underline" onClick={() => setKind("")}>Xoá bộ lọc</button>}
        </div>
      )}

      {data && !data.status.hasData && (
        <div className="rounded-lg border border-dashed border-border p-4 text-sm">
          <p className="font-medium">Chưa có dữ liệu biểu mẫu.</p>
          <p className="mt-1 text-muted-foreground">Chạy đồng bộ một lần: <code className="rounded bg-muted px-1">npm run sync:forms</code></p>
        </div>
      )}
      {err && <p role="alert" className="text-sm text-red-600">Không tải được dữ liệu. Vui lòng thử lại.</p>}

      {data && data.status.hasData && (
        <>
          <p className="text-xs text-muted-foreground">
            {data.total} biểu mẫu/văn bản · Nguồn: <a className="underline" href={data.status.source.url} target="_blank" rel="noreferrer">{data.status.source.name}</a>
            {data.status.sourceChanged && <> · nguồn sửa lần cuối {data.status.sourceChanged}</>}
            {data.status.lastSync && <> · đồng bộ {new Date(data.status.lastSync).toLocaleString("vi-VN")}</>}
          </p>
          <p className="rounded-md bg-muted px-3 py-2 text-xs text-muted-foreground">
            Tệp được lưu ở nơi gốc của Trường/Đại học Huế, hệ thống chỉ dẫn liên kết. Hãy kiểm tra phiên bản mới nhất theo thông báo của Phòng KHCN & HTQT trước khi nộp hồ sơ.
          </p>

          {groups.map((g) => (
            <section key={g.section} className="space-y-2">
              <h2 className="text-sm font-semibold text-primary">{g.section}</h2>
              {g.subs.map((s) => (
                <div key={s.name} className="space-y-1.5">
                  {s.name && <h3 className="pt-1 text-xs font-medium uppercase tracking-wide text-muted-foreground">{s.name}</h3>}
                  <ul className="space-y-1.5">
                    {s.items.map((f) => (
                      <li key={f.id} className="flex items-start gap-3 rounded-lg border border-border bg-card px-3 py-2.5">
                        <span className="mt-0.5 shrink-0 rounded bg-primary/10 px-1.5 py-0.5 text-[11px] font-medium text-primary">{KIND_LABEL[f.kind] ?? f.kind}</span>
                        <span className="min-w-0 flex-1 text-sm">{f.title}</span>
                        <span className="flex shrink-0 gap-2">
                          <a href={f.url} target="_blank" rel="noreferrer" aria-label={`Mở: ${f.title}`} title="Mở" className="grid size-8 place-items-center rounded-md border border-border hover:bg-muted"><ExternalLink size={14} /></a>
                          {f.download_url && f.download_url !== f.url && (
                            <a href={f.download_url} target="_blank" rel="noreferrer" aria-label={`Tải về: ${f.title}`} title="Tải về (.docx/.xlsx)" className="grid size-8 place-items-center rounded-md border border-border hover:bg-muted"><Download size={14} /></a>
                          )}
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </section>
          ))}
          {data.total === 0 && <p className="text-sm text-muted-foreground">Không có biểu mẫu phù hợp.</p>}
        </>
      )}
    </div>
  );
}
