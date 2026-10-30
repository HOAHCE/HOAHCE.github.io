// DỮ LIỆU MẪU để chạy thử giao diện. Tên người, bài báo, hạn nộp, quartile đều là minh hoạ và
// PHẢI được thay bằng dữ liệu thật do Phòng KH&CN/Thư viện của Trường cung cấp (xem README).

export const DATA_IS_SAMPLE = true;

export type Paper = { id: string; title: string; authors: string[]; year: number; venue: string; keywords: string[]; abstract: string };
export type Expert = { id: string; name: string; unit: string; fields: string[]; title: string; highlights: string[] };
export type Journal = { id: string; name: string; publisher: string; country: string; quartile: "Q1" | "Q2" | "Q3" | "Q4"; scope: string[]; kind: "journal" };
export type Conference = { id: string; name: string; location: string; date: string; deadline: string; topics: string[]; kind: "conference" };
export type Fund = { id: string; name: string; agency: string; fields: string[]; deadline: string; amount: string; note: string };

export const PAPERS: Paper[] = [
  { id: "p1", title: "Tác động của chuyển đổi số đến hiệu quả hoạt động của doanh nghiệp nhỏ và vừa khu vực miền Trung", authors: ["Tác giả mẫu A", "Tác giả mẫu B"], year: 2024, venue: "Tạp chí mẫu về Kinh tế", keywords: ["chuyển đổi số", "DNNVV", "hiệu quả hoạt động"], abstract: "Bài báo mẫu: kiểm định mô hình hồi quy tác động của mức độ ứng dụng công nghệ số lên hiệu quả hoạt động." },
  { id: "p2", title: "Hành vi chọn điểm đến du lịch của khách nội địa: vai trò của hình ảnh điểm đến và truyền miệng điện tử", authors: ["Tác giả mẫu C"], year: 2023, venue: "Hội thảo mẫu về Du lịch", keywords: ["du lịch", "hành vi", "e-WOM"], abstract: "Bài báo mẫu: mô hình cấu trúc tuyến tính (SEM) với dữ liệu khảo sát." },
  { id: "p3", title: "Phát triển tài chính toàn diện và giảm nghèo đa chiều ở khu vực nông thôn", authors: ["Tác giả mẫu D", "Tác giả mẫu E", "Tác giả mẫu F"], year: 2025, venue: "Tạp chí mẫu về Phát triển", keywords: ["tài chính toàn diện", "nghèo đa chiều"], abstract: "Bài báo mẫu: phân tích dữ liệu bảng cấp tỉnh." },
  { id: "p4", title: "Ý định khởi nghiệp của sinh viên kinh tế: áp dụng lý thuyết hành vi có kế hoạch", authors: ["Tác giả mẫu B"], year: 2022, venue: "Tạp chí mẫu về Giáo dục", keywords: ["khởi nghiệp", "TPB", "sinh viên"], abstract: "Bài báo mẫu: khảo sát sinh viên các trường đại học." },
  { id: "p5", title: "Ứng dụng trí tuệ nhân tạo trong kế toán – kiểm toán: tổng quan hệ thống", authors: ["Tác giả mẫu G"], year: 2025, venue: "Tạp chí mẫu về Kế toán", keywords: ["AI", "kế toán", "kiểm toán", "tổng quan hệ thống"], abstract: "Bài báo mẫu: tổng quan theo PRISMA." },
];

export const EXPERTS: Expert[] = [
  { id: "e1", name: "Chuyên gia mẫu 1", unit: "Khoa Kinh tế và Phát triển", title: "PGS.TS (mẫu)", fields: ["kinh tế phát triển", "nông thôn", "giảm nghèo"], highlights: ["Hướng nghiên cứu mẫu: kinh tế nông thôn"] },
  { id: "e2", name: "Chuyên gia mẫu 2", unit: "Khoa Quản trị kinh doanh", title: "TS (mẫu)", fields: ["quản trị", "chuyển đổi số", "DNNVV"], highlights: ["Hướng nghiên cứu mẫu: đổi mới sáng tạo"] },
  { id: "e3", name: "Chuyên gia mẫu 3", unit: "Khoa Tài chính – Ngân hàng", title: "TS (mẫu)", fields: ["tài chính", "ngân hàng", "fintech"], highlights: ["Hướng nghiên cứu mẫu: tài chính toàn diện"] },
  { id: "e4", name: "Chuyên gia mẫu 4", unit: "Khoa Kế toán – Kiểm toán", title: "ThS (mẫu)", fields: ["kế toán", "kiểm toán", "AI"], highlights: ["Hướng nghiên cứu mẫu: kế toán quản trị"] },
  { id: "e5", name: "Chuyên gia mẫu 5", unit: "Khoa Du lịch", title: "TS (mẫu)", fields: ["du lịch", "marketing điểm đến"], highlights: ["Hướng nghiên cứu mẫu: hành vi du khách"] },
];

export const JOURNALS: Journal[] = [
  { id: "j1", name: "Tạp chí quốc tế mẫu về Kinh tế A", publisher: "Nhà xuất bản mẫu", country: "Anh", quartile: "Q1", scope: ["kinh tế", "kinh tế phát triển"], kind: "journal" },
  { id: "j2", name: "Tạp chí quốc tế mẫu về Quản trị B", publisher: "Nhà xuất bản mẫu", country: "Hoa Kỳ", quartile: "Q1", scope: ["quản trị", "đổi mới sáng tạo"], kind: "journal" },
  { id: "j3", name: "Tạp chí quốc tế mẫu về Tài chính C", publisher: "Nhà xuất bản mẫu", country: "Hà Lan", quartile: "Q2", scope: ["tài chính", "ngân hàng"], kind: "journal" },
  { id: "j4", name: "Tạp chí quốc tế mẫu về Du lịch D", publisher: "Nhà xuất bản mẫu", country: "Anh", quartile: "Q2", scope: ["du lịch", "khách sạn"], kind: "journal" },
  { id: "j5", name: "Tạp chí trong nước mẫu về Kinh tế & Phát triển", publisher: "Cơ quan chủ quản mẫu", country: "Việt Nam", quartile: "Q4", scope: ["kinh tế", "phát triển"], kind: "journal" },
];

export const CONFERENCES: Conference[] = [
  { id: "c1", name: "Hội thảo quốc tế mẫu về Kinh tế số", location: "Huế, Việt Nam", date: "2027-03-15", deadline: "2027-01-10", topics: ["kinh tế số", "chuyển đổi số", "ai"], kind: "conference" },
  { id: "c2", name: "Hội thảo khoa học mẫu về Phát triển bền vững miền Trung", location: "Đà Nẵng, Việt Nam", date: "2027-05-20", deadline: "2027-03-01", topics: ["phát triển bền vững", "miền trung"], kind: "conference" },
];

export const FUNDS: Fund[] = [
  { id: "f1", name: "Đề tài cấp cơ sở (mẫu)", agency: "Trường Đại học Kinh tế, ĐH Huế (mẫu)", fields: ["kinh tế", "quản trị"], deadline: "2027-01-31", amount: "theo thông báo của Trường", note: "Thông tin mẫu — xác minh với Phòng KH&CN." },
  { id: "f2", name: "Đề tài cấp Đại học Huế (mẫu)", agency: "Đại học Huế (mẫu)", fields: ["khoa học xã hội"], deadline: "2027-02-28", amount: "theo thông báo", note: "Thông tin mẫu." },
  { id: "f3", name: "Quỹ phát triển KH&CN quốc gia (mẫu)", agency: "Cơ quan tài trợ quốc gia (mẫu)", fields: ["kinh tế", "quản lý"], deadline: "2027-06-30", amount: "theo thông báo", note: "Thông tin mẫu — kiểm tra thông báo mời nộp hồ sơ hiện hành." },
];
