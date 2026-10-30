# HUE Research

[![CI](https://github.com/HOAHCE/HUE-Research/actions/workflows/ci.yml/badge.svg)](https://github.com/HOAHCE/HUE-Research/actions/workflows/ci.yml)

Hệ thống hỗ trợ nghiên cứu khoa học dựa trên AI cho **Trường Đại học Kinh tế, Đại học Huế**: Trợ lý chính, Dự án theo 6 giai đoạn nghiên cứu, tra cứu bài báo/chuyên gia/đề tài của Trường, biểu mẫu KH&CN, tạp chí (SJR, danh mục QĐ 2244, DOAJ), quỹ tài trợ quốc tế (EU Funding & Tenders), thiết kế khảo sát và tính Cronbach alpha. Đăng nhập bằng email, GitHub hoặc ORCID.

> Trạng thái: bản thử nghiệm. Hội thảo và quỹ trong nước vẫn là **dữ liệu mẫu** (ghi rõ trên giao diện). Xem mục "Giới hạn".

## Chạy web app

GitHub chỉ lưu mã nguồn, **không chạy được** ứng dụng này (cần máy chủ Node.js và CSDL SQLite). Chọn một cách:

| Cách | Cần gì | Liên kết / lệnh |
|---|---|---|
| **GitHub Codespaces** (nhanh nhất, chạy trên đám mây của GitHub) | Tài khoản GitHub | [Mở Codespace](https://codespaces.new/HOAHCE/HUE-Research?quickstart=1) → đợi cài đặt → cổng `3100` tự mở. Dữ liệu thật nạp nền vài phút (`tail -f hce-research/data/seed.log`). Liên kết chạy ở chế độ riêng tư; muốn chia sẻ, đổi cổng 3100 sang *Public* |
| **Render** (có địa chỉ công khai lâu dài) | Tài khoản Render; hướng dẫn từng bước và cấu hình đăng nhập: [`docs/TRIEN-KHAI-RENDER.md`](docs/TRIEN-KHAI-RENDER.md) | [Deploy to Render](https://render.com/deploy?repo=https://github.com/HOAHCE/HUE-Research) dùng `render.yaml`. Gói free không giữ dữ liệu khi khởi động lại và chặn cổng SMTP; bản dùng thật có Disk + Cron tự cập nhật dữ liệu dùng `render.production.yaml` (xem hướng dẫn) |
| **Docker** | Docker | `docker build -t hue-research .` rồi `docker run -p 3100:3100 -v hue-data:/data hue-research` → http://localhost:3100 |
| **Máy cục bộ** | Node.js 22.19+ / 24 | `cd hce-research && npm install && cp .env.example .env.local && npm run dev` → http://localhost:3100 |

Lần chạy đầu trong Docker/Render tự nạp dữ liệu thật ở chế độ nền (vài phút; nhật ký `/data/seed.log`). Tắt bằng `SEED_ON_START=0`.

### Đăng nhập khi triển khai
Khách dùng được ngay (hạn mức thấp). Để người dùng đăng nhập cần cấu hình biến môi trường (xem `hce-research/.env.example` và `HUONG-DAN-BUILD.md` mục 1.2):
- **Email**: cần SMTP (`SMTP_HOST`…); bản production từ chối gửi nếu thiếu SMTP.
- **GitHub / ORCID**: tạo ứng dụng OAuth, callback `https://<địa-chỉ-của-bạn>/api/auth/callback/github` và `/orcid`.
- **Trợ lý AI thật**: `ANTHROPIC_API_KEY` (không có thì Trợ lý chạy chế độ cục bộ dựa trên từ khoá và dữ liệu).

## Cấu trúc
```
hce-research/   ứng dụng web (Next.js 16, Better Auth, SQLite) + bộ đồng bộ dữ liệu (scripts/)
desktop/        ứng dụng cài đặt cho máy tính (Electron, vỏ mở bản web)
docs/           phân tích hệ thống tham chiếu, nguồn dữ liệu tạp chí/hội thảo/quỹ
Dockerfile, render.yaml, .devcontainer/, .github/   triển khai và CI
HUONG-DAN-BUILD.md   hướng dẫn build web + desktop, cấu hình, nguồn dữ liệu chi tiết
```

## Dữ liệu
Dữ liệu **không** nằm trong repo; được đồng bộ từ nguồn công khai vào SQLite khi chạy (`npm run sync:all`, `npm run journals:vn`, `npm run journals:doaj`, `npm run journals:sjr -- --file …`). Nguồn, giấy phép, giới hạn từng nguồn: `HUONG-DAN-BUILD.md` mục 1.5–1.8 và `docs/NGUON-DU-LIEU-TAP-CHI-HOI-THAO-QUY.md`. Hãy tôn trọng điều khoản của từng nguồn (SJR: phi thương mại, phải trích dẫn; EU: ghi nguồn, CC BY 4.0), và nên xin kênh dữ liệu chính thức từ Ban KH, CN & QHQT Đại học Huế.

## Ứng dụng máy tính
`desktop/` là vỏ Electron mở bản web đã triển khai. Sửa `desktop/app.config.json` trỏ tới địa chỉ web của bạn rồi `npm run dist:win` (xem `HUONG-DAN-BUILD.md` mục 2).

## Giới hạn
- Hội thảo và quỹ trong nước là dữ liệu mẫu; bài báo/chuyên gia/đề tài lấy từ trang HTML công khai của CSDL Khoa học Đại học Huế (cần xin kênh chính thức).
- Chưa có SJR đầy đủ (cần tải CSV bằng trình duyệt), chưa có danh mục HĐGSNN (PDF quét, cần OCR).
- Chưa có trang quản trị, chia sẻ dự án, đa ngôn ngữ; logo "H" là tạm.
- Chưa chọn giấy phép mã nguồn (chưa có tệp `LICENSE`).
