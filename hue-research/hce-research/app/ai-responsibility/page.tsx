"use client";
import { useMemo, useState } from "react";
import { Copy } from "lucide-react";

const LEVELS = [
  { id: 1, name: "Mức 1 — Tự làm", desc: "Phần tư duy cốt lõi thuộc về bạn: đặt vấn đề, lập luận, kết luận." },
  { id: 2, name: "Mức 2 — AI hỗ trợ", desc: "Được dùng AI, nhưng phải tự kiểm chứng và khai báo." },
  { id: 3, name: "Mức 3 — AI tác tử", desc: "AI tự thực hiện chuỗi việc theo định hướng. Hệ thống hiện chưa đạt mức này." },
] as const;

const PURPOSES = ["Tìm và đọc tài liệu", "Chỉnh sửa văn phong", "Dịch thuật", "Gợi ý cấu trúc bài", "Phân tích số liệu", "Mã hoá dữ liệu định tính", "Kiểm tra đạo văn", "Phản biện sơ bộ bản thảo"];

export default function AIResponsibility() {
  const [tool, setTool] = useState("HCE Research (Trợ lý chính và các công cụ)");
  const [level, setLevel] = useState<1 | 2>(2);
  const [purposes, setPurposes] = useState<string[]>(["Tìm và đọc tài liệu"]);
  const [copied, setCopied] = useState(false);

  const text = useMemo(
    () =>
      level === 1
        ? "Tác giả khẳng định không sử dụng công cụ trí tuệ nhân tạo cho nội dung khoa học của nghiên cứu này."
        : `Tác giả đã sử dụng ${tool || "[tên công cụ AI]"} với vai trò hỗ trợ cho: ${purposes.join("; ").toLowerCase() || "[mục đích]"}. Mọi kết quả do AI tạo ra đã được tác giả đối chiếu nguồn gốc, kiểm chứng và chỉnh sửa. Tác giả chịu hoàn toàn trách nhiệm về nội dung và kết luận khoa học.`,
    [tool, level, purposes],
  );

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {}
  };

  return (
    <div className="mx-auto max-w-3xl space-y-6 px-4 py-8">
      <h1 className="text-xl font-bold">Dùng AI có trách nhiệm</h1>
      <p className="text-sm">AI là công cụ hỗ trợ, không thay thế nhà khoa học. Kết quả của AI chỉ là gợi ý để bạn đối chiếu, kiểm chứng và chịu trách nhiệm.</p>

      <section className="space-y-2">
        <h2 className="font-semibold">Khung ba mức dùng AI</h2>
        {LEVELS.map((l) => (
          <div key={l.id} className="rounded-xl border border-border bg-card p-3 text-sm">
            <div className="font-medium">{l.name}</div>
            <div className="text-muted-foreground">{l.desc}</div>
          </div>
        ))}
      </section>

      <section>
        <h2 className="font-semibold">Nguyên tắc</h2>
        <ul className="mt-1 list-disc space-y-1 pl-5 text-sm">
          <li><strong>Không bịa trích dẫn:</strong> mọi nguồn phải kiểm chứng được; công cụ không tự bịa ra bài báo hay tác giả.</li>
          <li><strong>Bảo vệ dữ liệu nhạy cảm</strong> của đề tài và của người tham gia nghiên cứu.</li>
          <li><strong>Minh bạch:</strong> khai báo công cụ AI đã dùng; kết luận khoa học do người nghiên cứu chịu trách nhiệm.</li>
        </ul>
      </section>

      <section className="space-y-3 rounded-xl border border-border bg-card p-4">
        <h2 className="font-semibold">Soạn lời khai báo việc dùng AI</h2>
        <div className="flex gap-2 text-sm">
          {([1, 2] as const).map((l) => (
            <button key={l} onClick={() => setLevel(l)} className={`rounded-md border px-3 py-1.5 ${level === l ? "border-primary bg-primary/10 text-primary" : "border-border"}`}>
              {l === 1 ? "Không dùng AI" : "Có dùng AI hỗ trợ"}
            </button>
          ))}
        </div>
        {level === 2 && (
          <>
            <label className="block text-sm font-medium">Công cụ
              <input value={tool} onChange={(e) => setTool(e.target.value)} className="mt-1 w-full rounded-md border border-border bg-background px-3 py-2 text-sm" />
            </label>
            <div className="flex flex-wrap gap-2">
              {PURPOSES.map((p) => {
                const on = purposes.includes(p);
                return (
                  <button key={p} onClick={() => setPurposes(on ? purposes.filter((x) => x !== p) : [...purposes, p])} className={`rounded-full border px-3 py-1 text-xs ${on ? "border-primary bg-primary/10 text-primary" : "border-border"}`}>{p}</button>
                );
              })}
            </div>
          </>
        )}
        <p className="rounded-md bg-muted p-3 text-sm">{text}</p>
        <button onClick={copy} className="flex items-center gap-1.5 rounded-md bg-primary px-3 py-1.5 text-sm font-medium text-primary-foreground"><Copy size={14} /> {copied ? "Đã chép" : "Chép lời khai báo"}</button>
        <p className="text-xs text-muted-foreground">Mẫu tham khảo; hãy đối chiếu quy định của tạp chí/đơn vị bạn nộp bài.</p>
      </section>
    </div>
  );
}
