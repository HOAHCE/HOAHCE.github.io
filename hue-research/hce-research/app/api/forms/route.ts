import { NextResponse } from "next/server";
import { formsStatus, searchForms } from "@/lib/source";

// Danh mục biểu mẫu đã đồng bộ từ website Phòng KHCN & HTQT (chỉ tên, nhóm và liên kết; không lưu tệp).
export function GET(req: Request) {
  const u = new URL(req.url).searchParams;
  const res = searchForms({ q: (u.get("q") ?? "").slice(0, 200), kind: u.get("kind") ?? undefined });
  return NextResponse.json({ ...res, status: formsStatus() });
}
