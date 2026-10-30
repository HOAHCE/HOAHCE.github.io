# Phân tích hệ thống "Research" (research.neu.edu.vn)

Nguồn: quan sát thụ động trang công khai `/welcome`, `/huong-dan.html`, và các API GET công khai mà chính trang tải khi mở (không đăng nhập, không gửi chat, không gọi API có xác thực).

## 1. Mục đích
Nền tảng hỗ trợ nghiên cứu khoa học dựa trên AI cho giảng viên, nghiên cứu sinh, học viên, sinh viên. Gồm 4 phần:
1. **Trợ lý chính (chatbot)** – hỏi đáp bằng tiếng Việt, tự chọn và gọi đúng công cụ.
2. **Bộ công cụ nghiên cứu** – 12 ứng dụng nhúng, dùng chung đăng nhập.
3. **Dự án & vòng đời nghiên cứu** – gom hội thoại/công việc theo đề tài, theo dõi 6 giai đoạn.
4. **Cá nhân hóa** – hồ sơ (trình độ, đơn vị, lĩnh vực) để trợ lý xưng hô và gợi ý phù hợp.

## 2. Kỹ thuật quan sát được
| Hạng mục | Quan sát |
|---|---|
| Framework | Next.js 16.1.6 (App Router, Turbopack chunks), React |
| UI | Tailwind-style CSS variables (`--background`, `--primary: 209 100% 37%`, `--radius: .5rem`) kiểu shadcn/ui, font Inter, light/dark |
| PWA / desktop | `manifest.webmanifest`, nút "Tải ứng dụng cho máy tính" |
| i18n | locales `en, fr, ja, vi, zh`; public: `vi, en`; mặc định `vi` |
| Auth | `/api/auth/session` (kiểu NextAuth), đăng nhập tài khoản NEU, chế độ khách (`guest_login_enabled`) có hạn mức tin nhắn/ngày |
| Cấu hình động | `/api/setup/{status,branding,page-config,tool-names}`, `/api/site-strings` – tên hệ thống, logo, nội dung trang chào lấy từ máy chủ (admin chỉnh được) |
| Trợ lý | `/api/assistants` → 8 trợ lý (`central, regulations, experts, papers, review, publish, funds, plagiarism`), mỗi cái có `icon`, `pinned`, `daily_message_limit`, `isInternal`, `hide_from_sidebar` |
| Công cụ | `/api/tools?full=1` → registry gồm alias, tên, mô tả, version, keywords, `health`, màu, `floatingAssistantAlias`, `embedded`, `supported_languages`. Công cụ là app nhúng đặt dưới `/api/apps/<alias>` |
| Phân tích | `/api/track/pageview`, `/api/survey/active` (khảo sát phản hồi người dùng) |

Ghi chú: registry công cụ để lộ `baseUrl` nội bộ (`localhost:3001`) – đây là cấu hình lộ ra ngoài, **không nên lặp lại** trong bản của HCE.

## 3. Cấu trúc thông tin
**Màn hình chào**: tiêu đề, 4 thẻ (Dự án / Chatbot / Công cụ / Tùy chỉnh), 4 câu hỏi mẫu bấm là điền sẵn, nút Đăng nhập – Dùng thử không cần đăng nhập – Hướng dẫn.

**Thanh bên**: Trò chuyện mới → các trợ lý/công cụ theo thứ tự theo giai đoạn nghiên cứu → Dự án của tôi.

**12 công cụ + 2 mục phụ**
| # | Công cụ | Giai đoạn | Có trợ lý AI riêng |
|---|---|---|---|
| 1 | Tìm kiếm chuyên gia | ① Tìm hiểu | ✔ |
| 2 | Tra cứu bài báo (của trường) | ② Tổng quan | ✔ |
| 3 | Trắc lượng thư mục (BiblioMap) | ② Tổng quan | |
| 4 | Thiết kế khảo sát (SurveyLab) | ③ Thiết kế & thu thập | |
| 5 | Phân tích định lượng (Quantis) | ④ Phân tích | |
| 6 | Phân tích định tính (Annota, kiểu NVivo) | ④ Phân tích | |
| 7 | Viết nghiên cứu (Writium, xuất DOCX) | ⑤ Viết & phản biện | |
| 8 | Kiểm tra đạo văn | ⑤ | ✔ |
| 9 | Phản biện bài báo | ⑤ | ✔ |
| 10 | Hội thảo – tạp chí (quartile, gợi ý tạp chí) | ⑥ Công bố & tài trợ | ✔ |
| 11 | Tra cứu quỹ (lọc theo cơ quan, lĩnh vực, hạn nộp) | ⑥ | ✔ |
| 12 | Quy trình, biểu mẫu (điền biểu mẫu Word/Excel bằng AI) | ⑥ | ✔ |
| + | Học liệu (khóa 8 buổi) | Học tập | |
| + | Launching (trang ra mắt) | Khác | |

## 4. Luồng chính
1. Khách vào `/welcome` → bấm câu hỏi mẫu → chat (giới hạn tin/ngày).
2. Đăng nhập → lưu lịch sử, tạo Dự án, mời cộng sự xem.
3. Trợ lý chính **định tuyến** câu hỏi tới công cụ/dữ liệu phù hợp (tool-calling) và trả lời bằng dữ liệu thật của hệ thống.
4. Dự án theo dõi 6 giai đoạn (trạng thái, ngày dự kiến, việc cần làm) và mở đúng công cụ.

## 5. Những gì KHÔNG thể suy ra từ quan sát công khai
- Mô hình LLM, prompt hệ thống, cơ chế định tuyến cụ thể.
- Mã nguồn từng công cụ (Annota, Quantis…), thuật toán đạo văn, nguồn dữ liệu bài báo/quỹ.
- Cơ sở dữ liệu, cách phân quyền chi tiết, cơ chế mời cộng sự.
→ Bản của HCE phải **tự thiết kế và tự dựng** các phần này; không có gì để "bóc" ngoài giao diện/hành vi công khai.

## 6. Đề xuất cho Trường ĐH Kinh tế – ĐH Huế (HCE)
- **Thương hiệu riêng**: tên "HCE Research", logo/màu của Trường; không dùng logo, tên, văn bản, dữ liệu của NEU.
- **Dữ liệu riêng**: bài báo, chuyên gia, quy trình–biểu mẫu của HCE/ĐH Huế (phòng KH&CN cung cấp).
- **Đăng nhập**: SSO tài khoản ĐH Huế (Google Workspace/Microsoft) – cần Trường cấp thông tin.
- **Ưu tiên MVP** (giá trị cao, làm được ngay): Trợ lý chính, Dự án + 6 giai đoạn, Tra cứu bài báo, Tìm chuyên gia, Hội thảo–tạp chí, Tra cứu quỹ, Quy trình–biểu mẫu, Thiết kế khảo sát cơ bản.
- **Giai đoạn sau** (nặng): Quantis, Annota, BiblioMap, Kiểm tra đạo văn, Phản biện bài báo – cần engine riêng hoặc dịch vụ ngoài.
