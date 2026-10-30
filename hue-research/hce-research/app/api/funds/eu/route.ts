import { NextResponse } from "next/server";
import { euFacets, euStatus, searchEuCalls } from "@/lib/source";

// Lời kêu gọi đang mở của EU Funding & Tenders đã đồng bộ (© Liên minh châu Âu, CC BY 4.0 theo chính sách tái sử dụng của Ủy ban).
export function GET(req: Request) {
  const u = new URL(req.url).searchParams;
  const num = (k: string) => {
    const v = Number(u.get(k));
    return Number.isFinite(v) && v > 0 ? Math.floor(v) : undefined;
  };
  const within = num("withinDays");
  const res = searchEuCalls({
    q: (u.get("q") ?? "").slice(0, 200),
    programme: u.get("programme") ?? undefined,
    withinDays: within && within <= 730 ? within : undefined,
    sort: u.get("sort") ?? undefined,
    page: num("page"),
    pageSize: num("pageSize"),
  });
  return NextResponse.json({ ...res, facets: euFacets(), status: euStatus() });
}
