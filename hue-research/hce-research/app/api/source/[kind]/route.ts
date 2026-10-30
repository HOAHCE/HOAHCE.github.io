import { NextResponse } from "next/server";
import { isKind, searchSource, sourceFacets, sourceStatus } from "@/lib/source";

// Dữ liệu công khai đã đồng bộ từ CSDL Khoa học Đại học Huế (không chứa email/điện thoại cá nhân).
export async function GET(req: Request, { params }: { params: Promise<{ kind: string }> }) {
  const { kind } = await params;
  if (!isKind(kind)) return NextResponse.json({ error: "Không có loại dữ liệu này" }, { status: 404 });
  const u = new URL(req.url).searchParams;
  const num = (k: string) => {
    const v = Number(u.get(k));
    return Number.isFinite(v) && v > 0 ? Math.floor(v) : undefined;
  };
  const res = searchSource(kind, {
    q: (u.get("q") ?? "").slice(0, 200),
    page: num("page"),
    pageSize: num("pageSize"),
    year: num("year"),
    category: u.get("category") ?? undefined,
    degree: u.get("degree") ?? undefined,
    sort: u.get("sort") ?? undefined,
  });
  return NextResponse.json({ ...res, facets: sourceFacets(), status: sourceStatus() });
}
