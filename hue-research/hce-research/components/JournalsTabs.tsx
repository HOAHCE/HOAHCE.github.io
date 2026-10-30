"use client";
import { useState } from "react";
import { JournalsLookup } from "./JournalsLookup";
import { Lookup } from "./Lookup";

export function JournalsTabs() {
  const [tab, setTab] = useState<"journals" | "conf">("journals");
  const btn = (active: boolean) => `rounded-md px-3 py-1.5 text-sm ${active ? "bg-primary text-primary-foreground" : "border border-border hover:bg-muted"}`;
  return (
    <div className="space-y-4">
      <div className="flex gap-2">
        <button className={btn(tab === "journals")} onClick={() => setTab("journals")}>Tạp chí</button>
        <button className={btn(tab === "conf")} onClick={() => setTab("conf")}>Hội thảo</button>
      </div>
      {tab === "journals" ? (
        <JournalsLookup />
      ) : (
        <div className="space-y-3">
          <p className="rounded-md border border-dashed border-border px-3 py-2 text-sm text-muted-foreground">
            Mục hội thảo hiện <strong>chỉ là dữ liệu mẫu</strong>: chưa có nguồn mở, chính thống và đầy đủ cho hội thảo kinh tế–quản trị. Danh mục sẽ do Phòng KHCN & HTQT nhập có kiểm duyệt (kèm liên kết CFP gốc).
          </p>
          <Lookup alias="conferences" />
        </div>
      )}
    </div>
  );
}
