// Đăng ký công cụ & giai đoạn nghiên cứu. Thay đổi tại đây là đủ để thêm/bớt công cụ trên thanh bên.

export const BRAND = {
  name: "HCE Research",
  fullName: "Hệ thống hỗ trợ nghiên cứu khoa học dựa trên trí tuệ nhân tạo (AI)",
  org: "Trường Đại học Kinh tế, Đại học Huế",
  tagline: "Nền tảng AI phục vụ hoạt động nghiên cứu tại Trường Đại học Kinh tế, Đại học Huế",
};

export type StageId = 1 | 2 | 3 | 4 | 5 | 6;

export const STAGES: { id: StageId; name: string }[] = [
  { id: 1, name: "Tìm hiểu" },
  { id: 2, name: "Tổng quan tài liệu" },
  { id: 3, name: "Thiết kế & thu thập dữ liệu" },
  { id: 4, name: "Phân tích" },
  { id: 5, name: "Viết & phản biện" },
  { id: 6, name: "Công bố & tài trợ" },
];

export type ToolStatus = "ready" | "soon";

export type Tool = {
  alias: string;
  name: string;
  desc: string;
  stage: StageId;
  icon: string; // tên icon lucide-react
  status: ToolStatus;
  keywords: string[];
};

export const TOOLS: Tool[] = [
  { alias: "experts", name: "Tìm kiếm chuyên gia", desc: "Tra cứu nhà khoa học của Trường theo tên, ngành, học vị (dữ liệu CSDL Khoa học Đại học Huế).", stage: 1, icon: "Users", status: "ready", keywords: ["chuyên gia", "nhà khoa học", "giảng viên", "hướng dẫn", "cộng tác"] },
  { alias: "topics", name: "Đề tài khoa học", desc: "Đề tài, nhiệm vụ KH&CN của Trường: chủ nhiệm, thành viên, lĩnh vực.", stage: 1, icon: "FolderSearch", status: "ready", keywords: ["đề tài", "nhiệm vụ", "chủ nhiệm", "dự án khoa học", "đề tài cấp cơ sở", "đề tài cấp bộ"] },
  { alias: "papers", name: "Tra cứu bài báo", desc: "Bài báo khoa học của Trường (dữ liệu CSDL Khoa học Đại học Huế) theo từ khoá, tác giả, năm.", stage: 2, icon: "FileText", status: "ready", keywords: ["bài báo", "công trình", "paper", "công bố của trường", "tác giả"] },
  { alias: "bibliomap", name: "Trắc lượng thư mục", desc: "Bản đồ từ khoá, đồng tác giả, trích dẫn từ dữ liệu Scopus/WoS/CSV.", stage: 2, icon: "Network", status: "soon", keywords: ["trắc lượng", "bibliometric", "vosviewer", "bản đồ tri thức", "scopus", "wos"] },
  { alias: "surveylab", name: "Thiết kế khảo sát", desc: "Soạn bảng hỏi (Likert, đa lựa chọn, mở) và xuất CSV.", stage: 3, icon: "ClipboardList", status: "ready", keywords: ["khảo sát", "bảng hỏi", "phiếu", "likert", "questionnaire", "survey"] },
  { alias: "quantis", name: "Phân tích định lượng", desc: "Thống kê mô tả, kiểm định, hồi quy trên bộ dữ liệu của bạn.", stage: 4, icon: "BarChart3", status: "soon", keywords: ["định lượng", "spss", "hồi quy", "cronbach", "thống kê", "efa", "cfa", "sem"] },
  { alias: "annota", name: "Phân tích định tính", desc: "Mã hoá văn bản, phỏng vấn kiểu NVivo; truy vấn theo mã.", stage: 4, icon: "MessagesSquare", status: "soon", keywords: ["định tính", "phỏng vấn", "mã hoá", "nvivo", "thematic"] },
  { alias: "writium", name: "Viết nghiên cứu", desc: "Soạn bài báo/báo cáo có AI hỗ trợ, xuất DOCX.", stage: 5, icon: "PenLine", status: "soon", keywords: ["viết", "soạn", "báo cáo", "docx", "đề cương"] },
  { alias: "plagiarism", name: "Kiểm tra đạo văn", desc: "Kiểm tra tỷ lệ trùng lặp cho tệp hoặc đoạn văn.", stage: 5, icon: "ShieldCheck", status: "soon", keywords: ["đạo văn", "trùng lặp", "plagiarism", "turnitin"] },
  { alias: "review", name: "Phản biện bài báo", desc: "Gửi bản thảo và nhận phản biện sơ bộ.", stage: 5, icon: "ListTodo", status: "soon", keywords: ["phản biện", "review", "nhận xét bản thảo"] },
  { alias: "journals", name: "Hội thảo – tạp chí", desc: "Tra cứu tạp chí (quartile SJR, danh mục QĐ 2244, DOAJ) và hội thảo khoa học (đang bổ sung).", stage: 6, icon: "Globe", status: "ready", keywords: ["tạp chí", "hội thảo", "q1", "q2", "scopus", "isi", "journal", "conference", "công bố"] },
  { alias: "funds", name: "Tra cứu quỹ", desc: "Lời kêu gọi tài trợ quốc tế đang mở (EU Funding & Tenders) và quỹ trong nước (đang bổ sung).", stage: 6, icon: "Award", status: "ready", keywords: ["quỹ", "tài trợ", "nafosted", "đề tài", "kinh phí", "grant"] },
  { alias: "regulations", name: "Quy trình, biểu mẫu", desc: "Biểu mẫu quản lý hoạt động KH&CN của Trường và Đại học Huế (nguồn: website Phòng KHCN & HTQT).", stage: 6, icon: "ListChecks", status: "ready", keywords: ["quy trình", "biểu mẫu", "thủ tục", "thuyết minh", "nghiệm thu", "mẫu"] },
];

export const toolByAlias = (a: string) => TOOLS.find((t) => t.alias === a);

export const GUEST_DAILY_LIMIT = 10;
export const USER_DAILY_LIMIT = 100;

export const SAMPLE_PROMPTS = [
  "Tôi muốn thiết kế phiếu khảo sát thì dùng công cụ nào?",
  "Có những hội thảo nào về kinh tế số sắp diễn ra?",
  "Gợi ý tạp chí Q1 về kinh tế để công bố bài báo",
  "Cronbach's alpha bao nhiêu là đạt yêu cầu?",
];

/** Công cụ lấy dữ liệu thật từ CSDL đã đồng bộ (alias → loại dữ liệu). */
export const REMOTE_KIND: Record<string, "articles" | "topics" | "scientists"> = { papers: "articles", topics: "topics", experts: "scientists" };
