import { NextResponse } from "next/server";
import { getJob, isKnownJob, startJob, syncEnabled, verifyRequest } from "@/lib/jobs";

// Điểm kích hoạt đồng bộ dữ liệu cho Render Cron Job. Tắt hẳn (404) nếu chưa đặt SYNC_TOKEN (>= 16 ký tự).
// Xác thực bằng chữ ký HMAC theo thời gian (xem lib/jobs.ts); token không bao giờ được gửi đi.
const PATH = "/api/admin/sync";

const off = () => new NextResponse(null, { status: 404 });
const deny = () => NextResponse.json({ error: "Chữ ký không hợp lệ" }, { status: 401 });

export async function POST(req: Request) {
  if (!syncEnabled()) return off();
  let job = "";
  try {
    const text = await req.text();
    if (text.length > 1024) return NextResponse.json({ error: "Dữ liệu quá lớn" }, { status: 413 });
    job = String((JSON.parse(text) as { job?: unknown }).job ?? "");
  } catch {
    return NextResponse.json({ error: "JSON không hợp lệ" }, { status: 400 });
  }
  if (!verifyRequest(req.headers, "POST", PATH, job)) return deny();
  if (!isKnownJob(job)) return NextResponse.json({ error: "Tác vụ không tồn tại" }, { status: 404 });
  const r = startJob(job);
  if (r.ok) return NextResponse.json({ id: r.id, job, status: "running" }, { status: 202 });
  if (r.reason === "busy") return NextResponse.json({ error: "Đang có tác vụ khác chạy", id: r.id }, { status: 409 });
  return NextResponse.json({ error: "Tác vụ này vừa chạy gần đây", retryAfterSec: r.retryAfterSec }, { status: 429, headers: { "retry-after": String(r.retryAfterSec ?? 600) } });
}

export async function GET(req: Request) {
  if (!syncEnabled()) return off();
  const id = new URL(req.url).searchParams.get("id") ?? "";
  if (!verifyRequest(req.headers, "GET", PATH, id)) return deny();
  const run = /^\d{1,9}$/.test(id) ? getJob(Number(id)) : null;
  if (!run) return NextResponse.json({ error: "Không thấy tác vụ" }, { status: 404 });
  return NextResponse.json(run);
}
