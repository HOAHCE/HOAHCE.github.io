"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { BookOpen, FolderKanban, LogOut, Menu, MessageSquarePlus, Moon, ShieldCheck, Sun, UserRound, X } from "lucide-react";
import { BRAND, STAGES, TOOLS } from "@/lib/registry";
import { useProjects } from "@/lib/store";
import { authClient } from "@/lib/auth-client";
import { Icon } from "./Icon";

function Logo() {
  // Biểu tượng tạm; thay bằng logo chính thức của Trường tại public/logo.svg khi được cấp phép.
  return (
    <span className="grid size-8 place-items-center rounded-lg bg-primary text-sm font-bold text-primary-foreground">H</span>
  );
}

export function Shell({ children }: { children: React.ReactNode }) {
  const path = usePathname();
  const [open, setOpen] = useState(false);
  const [dark, setDark] = useState(false);
  const [projects] = useProjects();
  const { data: session } = authClient.useSession();

  useEffect(() => {
    try {
      const t = localStorage.getItem("hce.theme");
      const d = t ? t === "dark" : window.matchMedia("(prefers-color-scheme: dark)").matches;
      setDark(d);
      document.documentElement.classList.toggle("dark", d);
    } catch {}
  }, []);
  useEffect(() => {
    setOpen(false);
  }, [path]);

  const toggle = () => {
    const d = !dark;
    setDark(d);
    document.documentElement.classList.toggle("dark", d);
    try {
      localStorage.setItem("hce.theme", d ? "dark" : "light");
    } catch {}
  };

  const link = (href: string) =>
    `flex items-center gap-2 rounded-md px-2.5 py-1.5 text-sm transition-colors hover:bg-muted ${
      path === href || path.startsWith(href + "/") ? "bg-muted font-medium text-primary" : "text-foreground/80"
    }`;

  const nav = (
    <nav className="flex h-full flex-col gap-1 overflow-y-auto p-3">
      <Link href="/chat" className="mb-2 flex items-center gap-2 rounded-md bg-primary px-3 py-2 text-sm font-medium text-primary-foreground">
        <MessageSquarePlus size={16} /> Trò chuyện mới
      </Link>

      {STAGES.map((s) => {
        const tools = TOOLS.filter((t) => t.stage === s.id);
        return (
          <div key={s.id} className="mt-2">
            <div className="px-2.5 pb-1 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
              {s.id}. {s.name}
            </div>
            {tools.map((t) => (
              <Link key={t.alias} href={`/tools/${t.alias}`} className={link(`/tools/${t.alias}`)}>
                <Icon name={t.icon} size={16} />
                <span className="flex-1 truncate">{t.name}</span>
                {t.status === "soon" && <span className="rounded bg-muted px-1.5 text-[10px] text-muted-foreground">sắp có</span>}
              </Link>
            ))}
          </div>
        );
      })}

      <div className="mt-4 border-t border-border pt-3">
        <Link href="/projects" className={link("/projects")}>
          <FolderKanban size={16} /> Dự án của tôi
          {projects.length > 0 && <span className="ml-auto text-xs text-muted-foreground">{projects.length}</span>}
        </Link>
        <Link href="/huong-dan" className={link("/huong-dan")}>
          <BookOpen size={16} /> Hướng dẫn sử dụng
        </Link>
        <Link href="/ai-responsibility" className={link("/ai-responsibility")}>
          <ShieldCheck size={16} /> Dùng AI có trách nhiệm
        </Link>
      </div>
    </nav>
  );

  return (
    <div className="flex h-dvh">
      <aside className="hidden w-64 shrink-0 border-r border-border bg-sidebar md:block">{nav}</aside>

      {open && (
        <div className="fixed inset-0 z-40 md:hidden">
          <div className="absolute inset-0 bg-black/40" onClick={() => setOpen(false)} />
          <aside className="absolute inset-y-0 left-0 w-72 border-r border-border bg-sidebar">{nav}</aside>
        </div>
      )}

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex h-14 shrink-0 items-center gap-3 border-b border-border px-4">
          <button className="md:hidden" aria-label="Mở menu" onClick={() => setOpen((o) => !o)}>
            {open ? <X size={20} /> : <Menu size={20} />}
          </button>
          <Link href="/" className="flex items-center gap-2">
            <Logo />
            <div className="leading-tight">
              <div className="text-sm font-semibold">{BRAND.name}</div>
              <div className="hidden text-[11px] text-muted-foreground sm:block">{BRAND.org}</div>
            </div>
          </Link>
          <div className="ml-auto flex items-center gap-2">
            <button onClick={toggle} aria-label="Chuyển giao diện sáng/tối" className="grid size-9 place-items-center rounded-md hover:bg-muted">
              {dark ? <Sun size={18} /> : <Moon size={18} />}
            </button>
            {session ? (
              <>
                <Link href="/profile" className="flex items-center gap-1.5 rounded-md border border-border px-3 py-1.5 text-sm hover:bg-muted" title="Hồ sơ của tôi">
                  <UserRound size={15} />
                  <span className="hidden max-w-[140px] truncate sm:inline">{session.user.name || session.user.email}</span>
                </Link>
                <button onClick={() => authClient.signOut().then(() => location.assign("/"))} aria-label="Đăng xuất" title="Đăng xuất" className="grid size-9 place-items-center rounded-md hover:bg-muted">
                  <LogOut size={18} />
                </button>
              </>
            ) : (
              <Link href="/login" className="rounded-md bg-primary px-3 py-1.5 text-sm font-medium text-primary-foreground">Đăng nhập</Link>
            )}
          </div>
        </header>
        <main className="min-h-0 flex-1 overflow-y-auto">{children}</main>
      </div>
    </div>
  );
}
