# HCE Research

Hệ thống hỗ trợ nghiên cứu khoa học dựa trên AI cho Trường Đại học Kinh tế, Đại học Huế.
Thiết kế theo mô hình chức năng (Trợ lý chính, Dự án 6 giai đoạn, bộ công cụ theo giai đoạn) được quan sát từ một hệ thống công khai tương tự; **không** dùng mã nguồn, logo, văn bản hay dữ liệu của hệ thống đó.

- Hướng dẫn build web + ứng dụng máy tính: [`../HUONG-DAN-BUILD.md`](../HUONG-DAN-BUILD.md)
- Phân tích hệ thống tham chiếu: [`../docs/PHAN-TICH-NEU-RESEARCH.md`](../docs/PHAN-TICH-NEU-RESEARCH.md), [`../docs/BO-SUNG-TU-TAI-LIEU.md`](../docs/BO-SUNG-TU-TAI-LIEU.md)

## Chạy nhanh
```bash
npm install
cp .env.example .env.local
npm run dev      # http://localhost:3100
```

## Đã có
- Đăng nhập: **email (liên kết một lần), GitHub, ORCID** (Better Auth + SQLite). Khách vẫn dùng được với hạn mức thấp.
- Hồ sơ cá nhân; dự án 6 giai đoạn + việc cần làm, đồng bộ theo tài khoản (khách: lưu trong trình duyệt).
- Trợ lý chính: định tuyến công cụ, tra dữ liệu, gọi Claude khi có `ANTHROPIC_API_KEY`; hạn mức ngày tính ở máy chủ; nhật ký hoạt động (`audit_log`).
- **Dữ liệu thật của Trường** từ CSDL Khoa học Đại học Huế (`npm run sync:hueuni`): Tra cứu bài báo (~2.300), Tìm chuyên gia (236), Đề tài khoa học (618); Trợ lý cũng tra các nguồn này
- **Biểu mẫu thật của Trường** từ website Phòng KHCN & HTQT (`npm run sync:forms`): 65 biểu mẫu/văn bản, 7 nhóm, lọc theo loại tệp, tải Word từ Google Docs
- **Quỹ quốc tế thật** từ EU Funding & Tenders (`npm run sync:eu`): lời kêu gọi đang mở còn hạn (247 vào 21/10/2026), lọc chương trình/hạn nộp/ngân sách, liên kết cổng nộp hồ sơ
- **Tạp chí thật**: danh mục QĐ 2244/2026 (341), DOAJ (23,5 nghìn) và SJR/quartile (nhập từ tệp CSV bạn tải: `npm run journals:sjr -- --file …`), gộp theo ISSN
- Công cụ dùng được: Hội thảo (tab hội thảo còn mẫu), Tra cứu quỹ (tab trong nước còn là dữ liệu mẫu), Thiết kế khảo sát (xuất CSV, tính Cronbach alpha).
- Trang "Dùng AI có trách nhiệm" (khung 3 mức, soạn lời khai báo).
- Công cụ "sắp có": trắc lượng thư mục, phân tích định lượng/định tính, viết nghiên cứu, đạo văn, phản biện.

## Chưa có / cần làm trước khi dùng thật
1. **Dữ liệu mẫu còn lại**: hội thảo và quỹ trong nước (`lib/data.ts`) vẫn là dữ liệu MẪU (xem `docs/NGUON-DU-LIEU-TAP-CHI-HOI-THAO-QUY.md`). Bài báo/chuyên gia/đề tài đã dùng dữ liệu thật nhưng lấy từ trang HTML công khai; nên xin kênh dữ liệu chính thức từ Ban KH, CN & QHQT Đại học Huế.
2. **Cấu hình đăng nhập thật**: SMTP, ứng dụng OAuth GitHub/ORCID (xem hướng dẫn build). Chưa có trang quản trị xem nhật ký/người dùng (`ADMIN_EMAILS` mới chỉ đánh dấu quản trị trong phiên).
3. **Thương hiệu**: logo "H" là tạm; thay bằng logo chính thức.
4. Chia sẻ dự án cho thành viên, tệp đính kèm, đa ngôn ngữ.
5. Giới hạn tốc độ chi tiết cho `/api/chat` và đăng nhập khi mở công khai; chính sách dữ liệu cá nhân.
6. Các công cụ nặng cần engine riêng (xem `docs/BO-SUNG-TU-TAI-LIEU.md`).
