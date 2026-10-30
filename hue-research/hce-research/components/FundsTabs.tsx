"use client";
import { useState } from "react";
import { EuFundsLookup } from "./EuFundsLookup";
import { Lookup } from "./Lookup";

export function FundsTabs() {
  const [tab, setTab] = useState<"eu" | "vn">("eu");
  const btn = (active: boolean) => `rounded-md px-3 py-1.5 text-sm ${active ? "bg-primary text-primary-foreground" : "border border-border hover:bg-muted"}`;
  return (
    <div className="space-y-4">
      <div className="flex gap-2">
        <button className={btn(tab === "eu")} onClick={() => setTab("eu")}>Quốc tế (EU)</button>
        <button className={btn(tab === "vn")} onClick={() => setTab("vn")}>Trong nước</button>
      </div>
      {tab === "eu" ? (
        <EuFundsLookup />
      ) : (
        <div className="space-y-3">
          <p className="rounded-md border border-dashed border-border px-3 py-2 text-sm text-muted-foreground">
            Mục này hiện <strong>chỉ là dữ liệu mẫu</strong>, chưa có nguồn chính thức. Quỹ trong nước (NAFOSTED, Bộ GD&ĐT, Đại học Huế, cấp cơ sở) sẽ được nạp có kiểm duyệt ở bước sau.
          </p>
          <Lookup alias="funds" />
        </div>
      )}
    </div>
  );
}
