"use client";
import Link from "next/link";
import { Suspense, useEffect, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Send } from "lucide-react";
import { Md } from "@/components/Md";
import { GUEST_DAILY_LIMIT, toolByAlias } from "@/lib/registry";
import { authClient } from "@/lib/auth-client";
import { useLocal } from "@/lib/store";

type Msg = { role: "user" | "assistant"; content: string; tool?: string };

function Chat() {
  const params = useSearchParams();
  const [msgs, setMsgs] = useLocal<Msg[]>("hce.chat", []);
  const { data: session } = authClient.useSession();
  const [quota, setQuota] = useState<{ used: number; limit: number } | null>(null);
  const [input, setInput] = useState(params.get("q") ?? "");
  const [busy, setBusy] = useState(false);
  const end = useRef<HTMLDivElement>(null);

  useEffect(() => {
    end.current?.scrollIntoView({ behavior: "smooth" });
  }, [msgs, busy]);

  // Hạn mức do máy chủ tính (theo tài khoản hoặc theo IP với khách); ở đây chỉ hiển thị.
  const left = quota ? Math.max(0, quota.limit - quota.used) : null;

  async function send() {
    const text = input.trim();
    if (!text || busy || left === 0) return;
    const next: Msg[] = [...msgs, { role: "user", content: text }];
    setMsgs(next);
    setInput("");
    setBusy(true);
    try {
      const r = await fetch("/api/chat", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ messages: next.map(({ role, content }) => ({ role, content })) }),
      });
      const j = (await r.json()) as { reply?: string; tool?: string; error?: string; used?: number; limit?: number };
      if (j.used !== undefined && j.limit !== undefined) setQuota({ used: j.used, limit: j.limit });
      setMsgs([...next, { role: "assistant", content: j.reply ?? j.error ?? "Có lỗi xảy ra.", tool: j.tool }]);
    } catch {
      setMsgs([...next, { role: "assistant", content: "Không kết nối được máy chủ. Vui lòng thử lại." }]);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mx-auto flex h-full max-w-3xl flex-col">
      <div className="flex-1 space-y-4 overflow-y-auto px-4 py-6">
        {msgs.length === 0 && (
          <div className="mt-16 text-center text-muted-foreground">
            <p className="text-lg font-semibold text-foreground">Trợ lý chính</p>
            <p className="mt-1 text-sm">Hỏi về khảo sát, tạp chí, hội thảo, quỹ tài trợ, quy trình – biểu mẫu, bài báo hoặc chuyên gia của Trường.</p>
          </div>
        )}
        {msgs.map((m, i) => {
          const t = m.tool ? toolByAlias(m.tool) : undefined;
          return (
            <div key={i} className={m.role === "user" ? "flex justify-end" : "flex justify-start"}>
              <div className={`max-w-[85%] rounded-2xl px-4 py-2.5 ${m.role === "user" ? "bg-primary text-primary-foreground" : "border border-border bg-card"}`}>
                {m.role === "user" ? <p className="whitespace-pre-wrap text-sm">{m.content}</p> : <Md text={m.content} />}
                {t && (
                  <Link href={`/tools/${t.alias}`} className="mt-2 inline-block rounded-md bg-muted px-2.5 py-1 text-xs font-medium text-primary hover:underline">
                    Mở {t.name} →
                  </Link>
                )}
              </div>
            </div>
          );
        })}
        {busy && <div className="text-sm text-muted-foreground">Đang trả lời…</div>}
        <div ref={end} />
      </div>

      <div className="border-t border-border p-3">
        <div className="flex items-end gap-2">
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                void send();
              }
            }}
            rows={2}
            placeholder="Nhập câu hỏi… (Enter để gửi)"
            className="min-h-[44px] flex-1 resize-none rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:border-primary"
          />
          <button onClick={() => void send()} disabled={busy || !input.trim() || left === 0} aria-label="Gửi" className="grid size-11 place-items-center rounded-lg bg-primary text-primary-foreground disabled:opacity-40">
            <Send size={18} />
          </button>
        </div>
        <div className="mt-1.5 flex justify-between text-xs text-muted-foreground">
          <span>
            {left === null
              ? session ? "Đã đăng nhập: hạn mức cao hơn khách." : `Khách được ${GUEST_DAILY_LIMIT} tin nhắn mỗi ngày; đăng nhập để dùng nhiều hơn.`
              : `Còn ${left}/${quota!.limit} tin nhắn hôm nay.`}
          </span>
          {msgs.length > 0 && <button className="hover:underline" onClick={() => setMsgs([])}>Xoá hội thoại</button>}
        </div>
      </div>
    </div>
  );
}

export default function ChatPage() {
  return (
    <Suspense>
      <Chat />
    </Suspense>
  );
}
