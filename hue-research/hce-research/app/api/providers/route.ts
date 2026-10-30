import { NextResponse } from "next/server";
import { providers } from "@/lib/auth";

// Chỉ trả về nhà cung cấp nào đang được bật (không lộ khoá).
export function GET() {
  return NextResponse.json(providers);
}
