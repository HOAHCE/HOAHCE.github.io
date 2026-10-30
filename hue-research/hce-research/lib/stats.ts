// Độ tin cậy thang đo (Cronbach's alpha). Hàm thuần, không phụ thuộc giao diện.

const mean = (a: number[]) => a.reduce((s, x) => s + x, 0) / a.length;
const variance = (a: number[]) => {
  const m = mean(a);
  return a.reduce((s, x) => s + (x - m) ** 2, 0) / (a.length - 1); // phương sai mẫu (n-1)
};

/** rows: mỗi hàng là một người trả lời, mỗi cột là một câu Likert. */
export function cronbachAlpha(rows: number[][]): number {
  const n = rows.length;
  const k = rows[0]?.length ?? 0;
  if (n < 2 || k < 2) return NaN;
  const itemVar = Array.from({ length: k }, (_, j) => variance(rows.map((r) => r[j])));
  const totalVar = variance(rows.map((r) => r.reduce((s, x) => s + x, 0)));
  if (totalVar === 0) return NaN;
  return (k / (k - 1)) * (1 - itemVar.reduce((s, x) => s + x, 0) / totalVar);
}

export function pearson(x: number[], y: number[]): number {
  const mx = mean(x), my = mean(y);
  let sxy = 0, sxx = 0, syy = 0;
  for (let i = 0; i < x.length; i++) {
    sxy += (x[i] - mx) * (y[i] - my);
    sxx += (x[i] - mx) ** 2;
    syy += (y[i] - my) ** 2;
  }
  return sxx === 0 || syy === 0 ? NaN : sxy / Math.sqrt(sxx * syy);
}

export type ItemStat = { item: number; itemTotal: number; alphaIfDeleted: number };

/** Tương quan biến–tổng (đã loại chính biến) và alpha nếu loại biến, cho từng câu. */
export function itemStats(rows: number[][]): ItemStat[] {
  const k = rows[0]?.length ?? 0;
  return Array.from({ length: k }, (_, j) => {
    const rest = rows.map((r) => r.filter((_, c) => c !== j));
    return {
      item: j,
      itemTotal: pearson(rows.map((r) => r[j]), rest.map((r) => r.reduce((s, x) => s + x, 0))),
      alphaIfDeleted: k > 2 ? cronbachAlpha(rest) : NaN,
    };
  });
}

export function readAlpha(a: number): string {
  if (!Number.isFinite(a)) return "Không tính được";
  if (a >= 0.9) return "Rất cao (kiểm tra biến trùng lặp nếu > 0,95)";
  if (a >= 0.8) return "Tốt";
  if (a >= 0.7) return "Chấp nhận được";
  if (a >= 0.6) return "Tạm chấp nhận (khái niệm mới/khám phá)";
  return "Thấp — nên xem lại thang đo";
}

/** Đọc CSV/TSV dán vào: dòng đầu là tiêu đề; bỏ dòng có ô không phải số. */
export function parseResponses(text: string): { headers: string[]; rows: number[][]; skipped: number } {
  const lines = text.replace(/^﻿/, "").split(/\r?\n/).filter((l) => l.trim());
  if (lines.length < 2) return { headers: [], rows: [], skipped: 0 };
  const sep = lines[0].includes("\t") ? "\t" : lines[0].includes(";") ? ";" : ",";
  const split = (l: string) => l.split(sep).map((c) => c.trim().replace(/^"|"$/g, ""));
  const headers = split(lines[0]);
  const rows: number[][] = [];
  let skipped = 0;
  for (const l of lines.slice(1)) {
    const cells = split(l).slice(0, headers.length).map((c) => Number(c.replace(",", ".")));
    if (cells.length === headers.length && cells.every((x) => Number.isFinite(x))) rows.push(cells);
    else skipped++;
  }
  return { headers, rows, skipped };
}
