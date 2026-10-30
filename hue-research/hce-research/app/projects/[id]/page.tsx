"use client";
import Link from "next/link";
import { use, useState } from "react";
import { ArrowLeft, Plus, X } from "lucide-react";
import { STAGES, TOOLS } from "@/lib/registry";
import { newId, useProjects, type Project, type StageStatus } from "@/lib/store";
import { Icon } from "@/components/Icon";

const STATUS: { v: StageStatus; label: string }[] = [
  { v: "todo", label: "Chưa bắt đầu" },
  { v: "doing", label: "Đang làm" },
  { v: "done", label: "Hoàn thành" },
];

export default function ProjectPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const [projects, setProjects, ready] = useProjects();
  const [todo, setTodo] = useState("");
  const p = projects.find((x) => x.id === id);

  if (!ready) return null;
  if (!p) return <div className="p-8 text-sm">Không tìm thấy dự án. <Link href="/projects" className="text-primary underline">Quay lại</Link></div>;

  const update = (fn: (q: Project) => Project) =>
    setProjects(projects.map((x) => (x.id === id ? fn(x) : x)));

  return (
    <div className="mx-auto max-w-3xl space-y-6 px-4 py-8">
      <Link href="/projects" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"><ArrowLeft size={14} /> Dự án</Link>
      <div>
        <h1 className="text-xl font-bold">{p.title}</h1>
        <p className="text-sm text-muted-foreground">{p.field || "Chưa nhập lĩnh vực"}</p>
      </div>

      <section className="space-y-3">
        <h2 className="font-semibold">Vòng đời nghiên cứu</h2>
        {STAGES.map((s) => {
          const st = p.stages[s.id];
          const tools = TOOLS.filter((t) => t.stage === s.id);
          return (
            <div key={s.id} className="rounded-xl border border-border bg-card p-4">
              <div className="flex flex-wrap items-center gap-2">
                <span className="grid size-6 place-items-center rounded-full bg-muted text-xs font-semibold">{s.id}</span>
                <span className="font-medium">{s.name}</span>
                <select value={st.status} onChange={(e) => update((q) => ({ ...q, stages: { ...q.stages, [s.id]: { ...st, status: e.target.value as StageStatus } } }))} className="ml-auto rounded-md border border-border bg-background px-2 py-1 text-sm">
                  {STATUS.map((o) => <option key={o.v} value={o.v}>{o.label}</option>)}
                </select>
                <input type="date" value={st.due} onChange={(e) => update((q) => ({ ...q, stages: { ...q.stages, [s.id]: { ...st, due: e.target.value } } }))} aria-label="Ngày dự kiến" className="rounded-md border border-border bg-background px-2 py-1 text-sm" />
              </div>
              <div className="mt-3 flex flex-wrap gap-2">
                {tools.map((t) => (
                  <Link key={t.alias} href={`/tools/${t.alias}`} className="flex items-center gap-1.5 rounded-md bg-muted px-2.5 py-1 text-xs hover:text-primary">
                    <Icon name={t.icon} size={13} /> {t.name}
                  </Link>
                ))}
              </div>
            </div>
          );
        })}
      </section>

      <section className="space-y-2">
        <h2 className="font-semibold">Việc cần làm</h2>
        <div className="flex gap-2">
          <input value={todo} onChange={(e) => setTodo(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter" && todo.trim()) { update((q) => ({ ...q, todos: [...q.todos, { id: newId(), text: todo.trim(), done: false }] })); setTodo(""); } }} placeholder="Thêm việc…" className="flex-1 rounded-md border border-border bg-background px-3 py-2 text-sm outline-none focus:border-primary" />
          <button aria-label="Thêm" className="grid size-10 place-items-center rounded-md bg-primary text-primary-foreground" onClick={() => { if (todo.trim()) { update((q) => ({ ...q, todos: [...q.todos, { id: newId(), text: todo.trim(), done: false }] })); setTodo(""); } }}><Plus size={16} /></button>
        </div>
        <ul className="space-y-1">
          {p.todos.map((t) => (
            <li key={t.id} className="flex items-center gap-2 text-sm">
              <input type="checkbox" checked={t.done} onChange={() => update((q) => ({ ...q, todos: q.todos.map((x) => (x.id === t.id ? { ...x, done: !x.done } : x)) }))} />
              <span className={t.done ? "text-muted-foreground line-through" : ""}>{t.text}</span>
              <button aria-label="Xoá việc" className="ml-auto text-muted-foreground hover:text-red-600" onClick={() => update((q) => ({ ...q, todos: q.todos.filter((x) => x.id !== t.id) }))}><X size={14} /></button>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
