import { NextResponse } from "next/server";
import { localAnswer, pickTool, retrieve, systemPrompt } from "@/lib/assistant";
import { toolByAlias, GUEST_DAILY_LIMIT, USER_DAILY_LIMIT } from "@/lib/registry";
import { getSession } from "@/lib/auth";
import { audit, db, takeQuota } from "@/lib/db";

type Msg = { role: "user" | "assistant"; content: string };

function clientIp(req: Request) {
  // Chỉ tin X-Forwarded-For khi chạy sau reverse proxy do bạn kiểm soát.
  return req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
}

export async function POST(req: Request) {
  let messages: Msg[];
  try {
    ({ messages } = (await req.json()) as { messages: Msg[] });
  } catch {
    return NextResponse.json({ error: "Dữ liệu không hợp lệ" }, { status: 400 });
  }
  const clean = (messages ?? [])
    .filter((m) => (m.role === "user" || m.role === "assistant") && typeof m.content === "string")
    .slice(-12)
    .map((m) => ({ role: m.role, content: m.content.slice(0, 4000) }));
  const last = [...clean].reverse().find((m) => m.role === "user");
  if (!last) return NextResponse.json({ error: "Thiếu câu hỏi" }, { status: 400 });

  const session = await getSession(req.headers);
  const limit = session ? USER_DAILY_LIMIT : GUEST_DAILY_LIMIT;
  const q = takeQuota(session ? `u:${session.user.id}` : `ip:${clientIp(req)}`, limit);
  if (!q.ok) {
    return NextResponse.json(
      { error: session ? "Bạn đã dùng hết số tin nhắn hôm nay." : "Khách đã dùng hết số tin nhắn hôm nay. Hãy đăng nhập để dùng nhiều hơn.", limit, used: q.used },
      { status: 429 },
    );
  }
  const meta = { limit, used: q.used };

  let profile: string | undefined;
  if (session) {
    const row = db.prepare("SELECT json FROM user_data WHERE user_id=? AND key='profile'").get(session.user.id) as { json: string } | undefined;
    if (row) {
      try {
        const p = JSON.parse(row.json) as { level?: string; unit?: string; field?: string };
        profile = [p.level && `trình độ: ${p.level}`, p.unit && `đơn vị: ${p.unit}`, p.field && `lĩnh vực: ${p.field}`].filter(Boolean).join("; ") || undefined;
      } catch {}
    }
  }

  const tool = pickTool(last.content);
  audit(session?.user.id ?? null, "chat", tool?.alias);
  const key = process.env.ANTHROPIC_API_KEY;
  if (!key) {
    return NextResponse.json({ ...localAnswer(last.content), mode: "local", ...meta });
  }

  try {
    const res = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: { "content-type": "application/json", "x-api-key": key, "anthropic-version": "2023-06-01" },
      body: JSON.stringify({
        model: process.env.HCE_MODEL || "claude-sonnet-5-5",
        max_tokens: 1024,
        system: systemPrompt(retrieve(last.content, tool?.alias), tool && toolByAlias(tool.alias)?.name, profile),
        messages: clean,
      }),
    });
    if (!res.ok) throw new Error(`upstream ${res.status}`);
    const json = (await res.json()) as { content?: { type: string; text?: string }[] };
    const reply = json.content?.filter((c) => c.type === "text").map((c) => c.text).join("") ?? "";
    return NextResponse.json({ reply, tool: tool?.alias, mode: "ai", ...meta });
  } catch {
    // Không để lộ chi tiết lỗi nhà cung cấp; rơi về chế độ cục bộ.
    return NextResponse.json({ ...localAnswer(last.content), mode: "local-fallback", ...meta });
  }
}
