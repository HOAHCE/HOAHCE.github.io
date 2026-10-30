"use client";
import { useMemo, useState } from "react";
import { Search } from "lucide-react";
import { norm } from "@/lib/text";
import { CONFERENCES, DATA_IS_SAMPLE, FUNDS } from "@/lib/data";

type Row = { key: string; title: string; meta: string[]; body?: string; text: string; tag?: string };

function rows(alias: string): Row[] {
  switch (alias) {
    case "conferences":
      return CONFERENCES.map((c) => ({ key: c.id, title: c.name, meta: [c.location, `Diễn ra ${c.date}`, `Hạn nộp ${c.deadline}`, c.topics.join(", ")], tag: "Hội thảo", text: [c.name, c.location, ...c.topics].join(" ") }));
    case "funds":
      return FUNDS.map((f) => ({ key: f.id, title: f.name, meta: [f.agency, f.fields.join(", "), `Hạn nộp ${f.deadline}`, `Mức: ${f.amount}`], body: f.note, tag: f.deadline, text: [f.name, f.agency, ...f.fields].join(" ") }));
    default:
      return [];
  }
}

export function Lookup({ alias }: { alias: string }) {
  const [q, setQ] = useState("");
  const all = useMemo(() => rows(alias), [alias]);
  const list = useMemo(() => {
    const t = norm(q).split(/\s+/).filter(Boolean);
    return t.length ? all.filter((r) => t.every((x) => norm(r.text).includes(x))) : all;
  }, [q, all]);

  return (
    <div className="space-y-4">
      <div className="relative">
        <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Tìm theo từ khoá, tên, lĩnh vực…" className="w-full rounded-lg border border-border bg-background py-2.5 pl-9 pr-3 text-sm outline-none focus:border-primary" />
      </div>
      {DATA_IS_SAMPLE && (
        <p className="rounded-md bg-muted px-3 py-2 text-xs text-muted-foreground">Dữ liệu hiển thị là <strong>dữ liệu mẫu</strong> để thử giao diện; chưa phải dữ liệu chính thức của Trường.</p>
      )}
      <p className="text-xs text-muted-foreground">{list.length} kết quả</p>
      <ul className="space-y-3">
        {list.map((r) => (
          <li key={r.key} className="rounded-xl border border-border bg-card p-4">
            <div className="flex items-start gap-2">
              <h3 className="flex-1 font-medium">{r.title}</h3>
              {r.tag && <span className="shrink-0 rounded bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary">{r.tag}</span>}
            </div>
            <p className="mt-1 text-xs text-muted-foreground">{r.meta.filter(Boolean).join(" · ")}</p>
            {r.body && <p className="mt-2 text-sm">{r.body}</p>}
          </li>
        ))}
      </ul>
    </div>
  );
}
