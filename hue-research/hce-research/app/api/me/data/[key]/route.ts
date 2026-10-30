import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { db } from "@/lib/db";

const KEYS = new Set(["projects", "profile", "survey"]);
const MAX = 1_000_000;

async function guard(req: Request, params: Promise<{ key: string }>) {
  const { key } = await params;
  if (!KEYS.has(key)) return { err: NextResponse.json({ error: "Khoá không hợp lệ" }, { status: 400 }) };
  const s = await getSession(req.headers);
  if (!s) return { err: NextResponse.json({ error: "Cần đăng nhập" }, { status: 401 }) };
  return { key, userId: s.user.id };
}

export async function GET(req: Request, { params }: { params: Promise<{ key: string }> }) {
  const g = await guard(req, params);
  if (g.err) return g.err;
  const row = db.prepare("SELECT json, updated_at FROM user_data WHERE user_id=? AND key=?").get(g.userId, g.key) as { json: string; updated_at: number } | undefined;
  return NextResponse.json({ value: row ? JSON.parse(row.json) : null, updatedAt: row?.updated_at ?? 0 });
}

export async function PUT(req: Request, { params }: { params: Promise<{ key: string }> }) {
  const g = await guard(req, params);
  if (g.err) return g.err;
  const text = await req.text();
  if (text.length > MAX) return NextResponse.json({ error: "Dữ liệu quá lớn" }, { status: 413 });
  let body: { value?: unknown };
  try {
    body = JSON.parse(text);
  } catch {
    return NextResponse.json({ error: "JSON không hợp lệ" }, { status: 400 });
  }
  db.prepare(
    "INSERT INTO user_data (user_id, key, json, updated_at) VALUES (?,?,?,?) ON CONFLICT(user_id, key) DO UPDATE SET json=excluded.json, updated_at=excluded.updated_at",
  ).run(g.userId, g.key, JSON.stringify(body.value ?? null), Date.now());
  return NextResponse.json({ ok: true });
}
