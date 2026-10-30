"use client";
import Link from "next/link";
import { useState } from "react";
import { Plus, Trash2 } from "lucide-react";
import { STAGES } from "@/lib/registry";
import { newProject, useProjects } from "@/lib/store";

export default function Projects() {
  const [projects, setProjects, ready] = useProjects();
  const [title, setTitle] = useState("");
  const [field, setField] = useState("");

  const add = () => {
    if (!title.trim()) return;
    setProjects([newProject(title.trim(), field.trim()), ...projects]);
    setTitle("");
    setField("");
  };

  return (
    <div className="mx-auto max-w-3xl space-y-6 px-4 py-8">
      <div>
        <h1 className="text-xl font-bold">Dự án của tôi</h1>
        <p className="text-sm text-muted-foreground">Mỗi dự án theo dõi 6 giai đoạn của vòng đời nghiên cứu. Dữ liệu lưu trên trình duyệt này.</p>
      </div>

      <div className="grid gap-2 rounded-xl border border-border bg-card p-4 sm:grid-cols-[1fr_200px_auto]">
        <input value={title} onChange={(e) => setTitle(e.target.value)} onKeyDown={(e) => e.key === "Enter" && add()} placeholder="Tên đề tài" className="rounded-md border border-border bg-background px-3 py-2 text-sm outline-none focus:border-primary" />
        <input value={field} onChange={(e) => setField(e.target.value)} onKeyDown={(e) => e.key === "Enter" && add()} placeholder="Lĩnh vực" className="rounded-md border border-border bg-background px-3 py-2 text-sm outline-none focus:border-primary" />
        <button onClick={add} className="flex items-center justify-center gap-1 rounded-md bg-primary px-3 py-2 text-sm font-medium text-primary-foreground"><Plus size={16} /> Tạo</button>
      </div>

      {ready && projects.length === 0 && <p className="text-sm text-muted-foreground">Chưa có dự án nào.</p>}

      <ul className="space-y-3">
        {projects.map((p) => {
          const done = STAGES.filter((s) => p.stages[s.id].status === "done").length;
          return (
            <li key={p.id} className="flex items-center gap-3 rounded-xl border border-border bg-card p-4">
              <Link href={`/projects/${p.id}`} className="min-w-0 flex-1">
                <div className="truncate font-semibold">{p.title}</div>
                <div className="text-xs text-muted-foreground">{p.field || "Chưa nhập lĩnh vực"} · {done}/6 giai đoạn hoàn thành</div>
                <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-muted"><div className="h-full bg-primary" style={{ width: `${(done / 6) * 100}%` }} /></div>
              </Link>
              <button aria-label="Xoá dự án" className="text-muted-foreground hover:text-red-600" onClick={() => confirm(`Xoá dự án "${p.title}"?`) && setProjects(projects.filter((x) => x.id !== p.id))}>
                <Trash2 size={16} />
              </button>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
