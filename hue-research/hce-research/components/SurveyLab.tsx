"use client";
import { useMemo, useState } from "react";
import { Download, Plus, Trash2 } from "lucide-react";
import { cronbachAlpha, itemStats, parseResponses, readAlpha } from "@/lib/stats";
import { newId, useLocal, type Question } from "@/lib/store";

const LIKERT = ["Hoàn toàn không đồng ý", "Không đồng ý", "Trung lập", "Đồng ý", "Hoàn toàn đồng ý"];
const TYPE_LABEL: Record<Question["type"], string> = { likert: "Thang Likert 5 mức", choice: "Đa lựa chọn", open: "Câu hỏi mở" };

// CSV an toàn: nhân đôi dấu nháy và chặn công thức (=, +, -, @) khi mở bằng Excel.
const cell = (v: string) => `"${(/^[=+\-@]/.test(v) ? "'" + v : v).replace(/"/g, '""')}"`;

function Reliability() {
  const [text, setText] = useState("");
  const res = useMemo(() => {
    const { headers, rows, skipped } = parseResponses(text);
    if (rows.length < 2 || headers.length < 2) return null;
    return { headers, n: rows.length, skipped, alpha: cronbachAlpha(rows), items: itemStats(rows) };
  }, [text]);

  return (
    <section className="space-y-3 rounded-xl border border-border bg-card p-4">
      <h2 className="font-semibold">Độ tin cậy thang đo (Cronbach's alpha)</h2>
      <p className="text-xs text-muted-foreground">Dán dữ liệu phản hồi (CSV/TSV): dòng đầu là tên câu, mỗi dòng sau là một người trả lời, các ô là điểm Likert. Chỉ chọn các câu cùng một thang đo. Tính hoàn toàn trên trình duyệt của bạn.</p>
      <textarea value={text} onChange={(e) => setText(e.target.value)} rows={5} placeholder={"Q1,Q2,Q3\n4,5,4\n3,3,2\n5,5,5"} className="w-full rounded-md border border-border bg-background p-2 font-mono text-xs outline-none focus:border-primary" />
      {text.trim() && !res && <p className="text-sm text-muted-foreground">Cần ít nhất 2 câu và 2 người trả lời hợp lệ.</p>}
      {res && (
        <div className="space-y-2 text-sm">
          <p>
            <strong>Cronbach's alpha = {Number.isFinite(res.alpha) ? res.alpha.toFixed(3) : "—"}</strong> — {readAlpha(res.alpha)}. {res.n} người trả lời, {res.headers.length} câu
            {res.skipped > 0 && ` (bỏ ${res.skipped} dòng có ô không phải số)`}.
          </p>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="text-muted-foreground"><tr><th className="py-1 pr-3">Câu</th><th className="pr-3">Tương quan biến–tổng</th><th>Alpha nếu loại câu</th></tr></thead>
              <tbody>
                {res.items.map((it) => (
                  <tr key={it.item} className="border-t border-border">
                    <td className="py-1 pr-3">{res.headers[it.item]}</td>
                    <td className={`pr-3 ${it.itemTotal < 0.3 ? "text-amber-600" : ""}`}>{Number.isFinite(it.itemTotal) ? it.itemTotal.toFixed(3) : "—"}{it.itemTotal < 0.3 ? " (thấp)" : ""}</td>
                    <td className={Number.isFinite(it.alphaIfDeleted) && it.alphaIfDeleted > res.alpha ? "text-amber-600" : ""}>{Number.isFinite(it.alphaIfDeleted) ? it.alphaIfDeleted.toFixed(3) : "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="text-xs text-muted-foreground">Quy ước thường dùng: alpha ≥ 0,7; tương quan biến–tổng ≥ 0,3. Câu có "alpha nếu loại" cao hơn alpha hiện tại là ứng viên cần xem lại. Hãy đối chiếu chuẩn của lĩnh vực/tạp chí.</p>
        </div>
      )}
    </section>
  );
}

export function SurveyLab() {
  const [title, setTitle] = useLocal("hce.survey.title", "Phiếu khảo sát mới");
  const [qs, setQs] = useLocal<Question[]>("hce.survey.qs", []);

  const add = (type: Question["type"]) =>
    setQs([...qs, { id: newId(), type, text: "", options: type === "likert" ? LIKERT : type === "choice" ? ["Lựa chọn 1", "Lựa chọn 2"] : [] }]);
  const patch = (id: string, p: Partial<Question>) => setQs(qs.map((q) => (q.id === id ? { ...q, ...p } : q)));

  const exportCsv = () => {
    // Tệp mẫu để nhập kết quả: mỗi câu hỏi một cột, mã Q1, Q2… dùng cho phần mềm phân tích.
    const head = qs.map((_, i) => `Q${i + 1}`);
    const lines = [head.map(cell).join(","), qs.map((q) => cell(q.text)).join(",")];
    const blob = new Blob(["﻿" + lines.join("\r\n")], { type: "text/csv;charset=utf-8" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `${title.replace(/[^\p{L}\p{N}]+/gu, "_") || "khao_sat"}.csv`;
    a.click();
    URL.revokeObjectURL(a.href);
  };

  return (
    <div className="space-y-4">
      <input value={title} onChange={(e) => setTitle(e.target.value)} aria-label="Tên phiếu khảo sát" className="w-full rounded-lg border border-border bg-background px-3 py-2 text-lg font-semibold outline-none focus:border-primary" />

      <ol className="space-y-3">
        {qs.map((q, i) => (
          <li key={q.id} className="rounded-xl border border-border bg-card p-4">
            <div className="mb-2 flex items-center gap-2 text-xs text-muted-foreground">
              <span className="font-semibold">Q{i + 1}</span> · {TYPE_LABEL[q.type]}
              <button aria-label="Xoá câu hỏi" className="ml-auto hover:text-red-600" onClick={() => setQs(qs.filter((x) => x.id !== q.id))}><Trash2 size={14} /></button>
            </div>
            <input value={q.text} onChange={(e) => patch(q.id, { text: e.target.value })} placeholder="Nội dung câu hỏi" className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm outline-none focus:border-primary" />
            {q.type === "choice" && (
              <div className="mt-2 space-y-1.5">
                {q.options.map((o, j) => (
                  <input key={j} value={o} onChange={(e) => patch(q.id, { options: q.options.map((x, k) => (k === j ? e.target.value : x)) })} className="block w-full rounded-md border border-border bg-background px-3 py-1.5 text-sm" />
                ))}
                <button className="text-xs text-primary hover:underline" onClick={() => patch(q.id, { options: [...q.options, `Lựa chọn ${q.options.length + 1}`] })}>+ Thêm lựa chọn</button>
              </div>
            )}
            {q.type === "likert" && <div className="mt-2 flex flex-wrap gap-1.5 text-[11px] text-muted-foreground">{q.options.map((o, j) => <span key={j} className="rounded bg-muted px-2 py-0.5">{j + 1} = {o}</span>)}</div>}
          </li>
        ))}
      </ol>

      <div className="flex flex-wrap gap-2">
        {(Object.keys(TYPE_LABEL) as Question["type"][]).map((t) => (
          <button key={t} onClick={() => add(t)} className="flex items-center gap-1 rounded-md border border-border px-3 py-1.5 text-sm hover:bg-muted"><Plus size={14} /> {TYPE_LABEL[t]}</button>
        ))}
        <button onClick={exportCsv} disabled={!qs.length} className="ml-auto flex items-center gap-1 rounded-md bg-primary px-3 py-1.5 text-sm font-medium text-primary-foreground disabled:opacity-40"><Download size={14} /> Xuất CSV</button>
      </div>
      <Reliability />
      <p className="text-xs text-muted-foreground">Bản hiện tại: soạn bảng hỏi và xuất khung CSV. Thu thập phản hồi trực tuyến cần máy chủ lưu trữ (giai đoạn sau).</p>
    </div>
  );
}
