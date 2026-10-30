import { NextResponse } from "next/server";
import { journalFacets, journalStatus, searchJournals } from "@/lib/journals";

// Tạp chí gộp theo ISSN từ SJR, danh mục QĐ 2244/QĐ-BKHCN và DOAJ (xem scripts/journals.mjs).
export function GET(req: Request) {
  const u = new URL(req.url).searchParams;
  const num = (k: string) => {
    const v = Number(u.get(k));
    return Number.isFinite(v) && v > 0 ? Math.floor(v) : undefined;
  };
  const res = searchJournals({
    q: (u.get("q") ?? "").slice(0, 200),
    quartile: u.get("quartile") ?? undefined,
    vn: u.get("vn") === "1",
    doaj: u.get("doaj") === "1",
    country: u.get("country") ?? undefined,
    type: u.get("type") ?? undefined,
    sort: u.get("sort") ?? undefined,
    page: num("page"),
    pageSize: num("pageSize"),
  });
  return NextResponse.json({ ...res, facets: journalFacets(), status: journalStatus() });
}
