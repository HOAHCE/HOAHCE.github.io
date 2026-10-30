import { TOOLS, type Tool, BRAND } from "./registry";
import { CONFERENCES, FUNDS } from "./data";
import { journalStatus, searchJournals } from "./journals";
import { norm } from "./text";
import { searchForms, formsStatus, searchEuCalls, euStatus, searchSource, sourceStatus, type Person } from "./source";

export { norm };

const tokens = (s: string) => norm(s).split(/[^a-z0-9]+/).filter((t) => t.length > 1);

export function pickTool(query: string): Tool | undefined {
  const q = norm(query);
  let best: { tool: Tool; score: number } | undefined;
  for (const tool of TOOLS) {
    let score = 0;
    for (const k of tool.keywords) if (q.includes(norm(k))) score += k.length > 4 ? 2 : 1;
    if (score > 0 && (!best || score > best.score)) best = { tool, score };
  }
  return best?.tool;
}

const hit = (hay: string[], q: string[]) => q.some((t) => hay.some((h) => norm(h).includes(t)));

// Dữ liệu quỹ EU bằng tiếng Anh: dịch một số từ khoá tiếng Việt thường gặp để tìm được (không phải dịch máy toàn văn).
const VI_EN: [string, string][] = [
  ["giao duc", "education"], ["dao tao", "training"], ["kinh te", "economic"], ["doanh nghiep", "SME"], ["khoi nghiep", "startup"],
  ["chuyen doi so", "digital"], ["so hoa", "digital"], ["tri tue nhan tao", "artificial intelligence"], ["khi hau", "climate"],
  ["moi truong", "environment"], ["du lich", "tourism"], ["nong nghiep", "agriculture"], ["y te", "health"], ["suc khoe", "health"],
  ["nang luong", "energy"], ["van hoa", "culture"], ["thanh nien", "youth"], ["doi moi sang tao", "innovation"], ["nghien cuu", "research"],
  ["xa hoi", "social"], ["phat trien ben vung", "sustainable"], ["tai chinh", "finance"], ["giao thong", "transport"], ["an ninh mang", "cybersecurity"],
];
const viKeywords = (query: string) => {
  const q = norm(query);
  return VI_EN.filter(([vi]) => q.includes(vi)).map(([, en]) => en);
};

export type Retrieved = { tool: string; lines: string[]; sample?: boolean };

/** Tìm trong dữ liệu của trường những bản ghi khớp từ khoá của câu hỏi. */
export function retrieve(query: string, toolAlias?: string): Retrieved[] {
  const q = tokens(query).filter((t) => !STOP.has(t));
  if (!q.length) return [];
  const out: Retrieved[] = [];
  const want = (a: string) => !toolAlias || toolAlias === a;

  const meta = sourceStatus();
  const who = (v: unknown) => (Array.isArray(v) ? (v as Person[]).slice(0, 4).map((p) => p.name).join(", ") : "");
  const text = q.join(" ");
  if (meta.hasData && want("papers")) {
    const r = searchSource("articles", { q: text, pageSize: 3 }).items;
    if (r.length) out.push({ tool: "papers", lines: r.map((p) => `${p.title} (${who(p.authors)}; ${p.venue ?? ""}, ${p.year ?? ""}) ${p.url}`) });
  }
  if (meta.hasData && want("experts")) {
    const r = searchSource("scientists", { q: text, pageSize: 3 }).items;
    if (r.length) out.push({ tool: "experts", lines: r.map((e) => `${e.degree ?? ""} ${e.name} — ${e.unit ?? ""} — ${e.major ?? ""} ${e.url}`.replace(/\s+/g, " ")) });
  }
  if (meta.hasData && want("topics")) {
    const r = searchSource("topics", { q: text, pageSize: 3 }).items;
    if (r.length) out.push({ tool: "topics", lines: r.map((t) => `${t.title} (chủ nhiệm/thành viên: ${who(t.members)}) ${t.url}`) });
  }
  if (want("journals")) {
    if (journalStatus().hasData) {
      const r = searchJournals({ q: text, pageSize: 3 }).items;
      if (r.length) {
        out.push({
          tool: "journals",
          lines: r.map((j) => {
            const flags = [j.sjr?.quartile && `SJR ${j.sjr.quartile} (${j.sjr.year})`, j.vn2244 && "trong danh mục QĐ 2244/2026", j.doaj && "có trong DOAJ"].filter(Boolean).join(", ");
            return `${j.title}${j.issns.length ? ` (ISSN ${j.issns[0]})` : ""}${flags ? ` — ${flags}` : ""}`;
          }),
        });
      }
    }
    const c = CONFERENCES.filter((x) => hit([x.name, ...x.topics], q)).slice(0, 3);
    if (c.length) out.push({ tool: "journals", lines: c.map((x) => `${x.name} — ${x.location} — hạn nộp ${x.deadline}`), sample: true });
  }
  if (want("funds")) {
    if (euStatus().hasData) {
      let r = searchEuCalls({ q: text, pageSize: 3 }).items;
      if (!r.length) {
        const seen = new Map<string, (typeof r)[number]>();
        for (const kw of viKeywords(query)) for (const c of searchEuCalls({ q: kw, pageSize: 3 }).items) seen.set(c.id, c);
        r = [...seen.values()].sort((a, b) => (a.next_deadline ?? "9").localeCompare(b.next_deadline ?? "9")).slice(0, 3);
      }
      if (r.length) {
        out.push({
          tool: "funds",
          lines: r.map((c) => `${c.title} (${c.programme_abbr ?? "EU"}; hạn nộp ${c.next_deadline ? c.next_deadline.slice(0, 10) : "liên tục"}) ${c.portal_url}`),
        });
      }
    }
    const r = FUNDS.filter((f) => hit([f.name, f.agency, ...f.fields], q)).slice(0, 3);
    if (r.length) out.push({ tool: "funds", lines: r.map((f) => `${f.name} — ${f.agency} — hạn nộp ${f.deadline}`), sample: true });
  }
  if (want("regulations") && formsStatus().hasData) {
    const r = searchForms({ q: text }).items.slice(0, 3);
    if (r.length) out.push({ tool: "regulations", lines: r.map((x) => `${x.title} (${x.section.replace(/^\d+\.\s*/, "").replace(/\s*\(.*$/, "")}) ${x.url}`) });
  }
  return out;
}

const STOP = new Set(["toi", "muon", "co", "nhung", "nao", "the", "nao", "la", "va", "cho", "cua", "ve", "gi", "mot", "can", "xin", "hay", "giup", "cac", "bao", "nhieu", "thi", "dung", "duoc", "khong", "sap", "dien", "ra"]);

const FAQ: { test: RegExp; answer: string }[] = [
  {
    test: /cronbach/i,
    answer:
      "**Cronbach's alpha** thường được đọc như sau: ≥ 0,7 là chấp nhận được; 0,8–0,9 là tốt; ≥ 0,6 có thể chấp nhận với khái niệm mới/nghiên cứu khám phá; trên khoảng 0,95 có thể cho thấy các biến quan sát trùng lặp. Nên xem thêm hệ số tương quan biến–tổng (≥ 0,3) và alpha nếu loại biến. Đây là quy ước phổ biến, hãy đối chiếu với chuẩn của tạp chí/lĩnh vực bạn nhắm tới.",
  },
];

/** Trả lời cục bộ khi không có khoá API: định tuyến + dữ liệu của trường. */
export function localAnswer(query: string): { reply: string; tool?: string } {
  const faq = FAQ.find((f) => f.test.test(query));
  const tool = pickTool(query);
  const found = retrieve(query, tool?.alias);
  const parts: string[] = [];

  if (faq) parts.push(faq.answer);
  if (tool) {
    parts.push(
      `Công cụ phù hợp: **${tool.name}** — ${tool.desc}` +
        (tool.status === "soon" ? " _(đang phát triển)_" : ""),
    );
  }
  if (found.length) {
    parts.push(
      "Kết quả từ dữ liệu của hệ thống (bài báo, chuyên gia, đề tài: CSDL Khoa học Đại học Huế; biểu mẫu: website Phòng KHCN & HTQT của Trường; quỹ quốc tế: EU Funding & Tenders; tạp chí: SJR, danh mục QĐ 2244/2026, DOAJ; mục ghi _mẫu_ là dữ liệu thử nghiệm):\n" +
        found.flatMap((f) => f.lines.map((l) => `- ${l}${f.sample ? " _(mẫu)_" : ""}`)).join("\n"),
    );
  }
  if (!parts.length) {
    parts.push(
      `Tôi là Trợ lý chính của ${BRAND.name}. Bạn có thể hỏi về khảo sát, tạp chí/hội thảo, quỹ tài trợ, quy trình–biểu mẫu, bài báo hoặc chuyên gia của Trường. ` +
        "(Chế độ cục bộ chưa có mô hình AI nên chỉ định tuyến công cụ và tra dữ liệu.)",
    );
  } else if (!faq) {
    parts.push("_Chế độ cục bộ: chưa kết nối mô hình AI, câu trả lời dựa trên từ khoá và dữ liệu có sẵn._");
  }
  return { reply: parts.join("\n\n"), tool: tool?.alias };
}

export function systemPrompt(context: Retrieved[], toolName?: string, profile?: string): string {
  const ctx = context.length
    ? context.map((c) => `[${c.tool}${c.sample ? " — DỮ LIỆU MẪU" : ""}]\n${c.lines.join("\n")}`).join("\n\n")
    : "(không có bản ghi khớp)";
  return [
    `Bạn là Trợ lý chính của ${BRAND.name}, hệ thống hỗ trợ nghiên cứu khoa học của ${BRAND.org}.`,
    "Trả lời bằng tiếng Việt, ngắn gọn, đúng trọng tâm; dùng Markdown nhẹ.",
    "Chỉ khẳng định thông tin về bài báo, chuyên gia, quỹ, quy trình của Trường dựa trên DỮ LIỆU HỆ THỐNG bên dưới; nếu thiếu, nói rõ là chưa có dữ liệu thay vì bịa.",
    "Bài báo, chuyên gia, đề tài lấy từ CSDL Khoa học Đại học Huế, biểu mẫu từ website Phòng KHCN & HTQT của Trường, tạp chí từ SJR/danh mục QĐ 2244/DOAJ (quartile là của SJR-Scopus, không phải WoS), quỹ quốc tế từ EU Funding & Tenders (nội dung tiếng Anh, điều kiện đủ tư cách với tổ chức Việt Nam khác nhau theo từng lời kêu gọi) (có thể chưa đầy đủ/cập nhật, người dùng cần kiểm tra phiên bản mới nhất); nguồn gắn nhãn DỮ LIỆU MẪU chỉ để thử nghiệm, hãy nói rõ khi trích dẫn. Khi nêu một bản ghi, kèm đường dẫn nguồn nếu có.",
    profile ? `Hồ sơ người dùng (dùng để xưng hô và gợi ý phù hợp, không nhắc lại nguyên văn): ${profile}.` : "",
    "Khung dùng AI có trách nhiệm: không bịa trích dẫn, bài báo hay tác giả; nhắc người dùng tự kiểm chứng và khai báo việc dùng AI.",
    toolName ? `Công cụ gợi ý trong hệ thống: ${toolName}. Hãy hướng người dùng mở công cụ đó khi phù hợp.` : "",
    "",
    "DỮ LIỆU HỆ THỐNG:",
    ctx,
  ].join("\n");
}
