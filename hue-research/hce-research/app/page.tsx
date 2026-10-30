import Link from "next/link";
import { ArrowRight, FolderKanban, MessageCircle, SlidersHorizontal, Wrench } from "lucide-react";
import { BRAND, SAMPLE_PROMPTS } from "@/lib/registry";

const CARDS = [
  { href: "/projects", icon: FolderKanban, title: "Dự án nghiên cứu", desc: "Tạo dự án, theo dõi 6 giai đoạn và mở đúng công cụ cho từng giai đoạn." },
  { href: "/chat", icon: MessageCircle, title: "Chatbot", desc: "Hỏi đáp trợ lý, tra cứu bài báo, hội thảo–tạp chí, quỹ và quy trình biểu mẫu của Trường." },
  { href: "/tools/surveylab", icon: Wrench, title: "Công cụ", desc: "Thiết kế khảo sát, tra cứu chuyên gia, tạp chí, quỹ và nhiều công cụ khác." },
  { href: "/huong-dan", icon: SlidersHorizontal, title: "Hướng dẫn", desc: "Cách dùng hệ thống theo từng bước của vòng đời nghiên cứu." },
];

export default function Welcome() {
  return (
    <div className="mx-auto flex max-w-4xl flex-col items-center px-4 py-10 text-center">
      <h1 className="text-balance text-2xl font-bold sm:text-3xl">{BRAND.fullName}</h1>
      <p className="mt-2 max-w-xl text-muted-foreground">{BRAND.tagline}</p>

      <div className="mt-8 grid w-full gap-3 sm:grid-cols-2">
        {CARDS.map((c) => (
          <Link key={c.title} href={c.href} className="rounded-xl border border-border bg-card p-4 text-left transition-colors hover:border-primary">
            <c.icon className="mb-2 text-primary" size={20} />
            <div className="font-semibold">{c.title}</div>
            <p className="mt-1 text-sm text-muted-foreground">{c.desc}</p>
          </Link>
        ))}
      </div>

      <h2 className="mt-10 text-sm font-semibold text-primary">Thử hỏi Trợ lý chính</h2>
      <div className="mt-3 grid w-full gap-2 sm:grid-cols-2">
        {SAMPLE_PROMPTS.map((p) => (
          <Link key={p} href={`/chat?q=${encodeURIComponent(p)}`} className="flex items-center justify-between gap-2 rounded-lg border border-border px-3 py-2.5 text-left text-sm hover:bg-muted">
            <span>{p}</span>
            <ArrowRight size={14} className="shrink-0 text-muted-foreground" />
          </Link>
        ))}
      </div>
      <p className="mt-3 text-xs text-muted-foreground">Bấm một câu để dùng thử ngay — câu hỏi được điền sẵn, bạn sửa được trước khi gửi.</p>
    </div>
  );
}
