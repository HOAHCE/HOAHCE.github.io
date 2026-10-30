# Nguồn gốc mã nguồn

Thư mục này là bản sao toàn bộ mã nguồn của hệ thống **HUE - Research**
(https://hi.hue.vn), lấy từ repo `HOAHCE/HUE-Research`, commit
`5b5b757929ed1338c6d8343343e41469b9f93d76` (22/10/2026), để lưu cùng một nơi với
website tranthaihoa.id.vn.

- Đây **chỉ là mã nguồn**. GitHub Pages chỉ phát hành được trang tĩnh, còn hệ thống này
  cần máy chủ Node.js và CSDL SQLite, nên ứng dụng vẫn chạy riêng tại hi.hue.vn
  (hướng dẫn chạy và triển khai: `README.md`, `HUONG-DAN-BUILD.md`).
- Jekyll bỏ qua thư mục này (khai báo trong `exclude:` của `_config.yml`), nên nó không
  ảnh hưởng tới việc build website.
- Các tệp quy trình trong `.github/` và `.devcontainer/` của thư mục này **không chạy**,
  vì GitHub chỉ đọc chúng ở gốc repo.
- Trang `/research-assistant/` (mục "Trợ lý NCKH") là trang giới thiệu tĩnh, nội dung
  nằm ở `_data/research_assistant.yml`; các nút trên đó mở ứng dụng đang chạy ở hi.hue.vn.
- Bản sao này không tự đồng bộ với `HOAHCE/HUE-Research`. Sửa ở đâu thì chép sang nơi
  còn lại, hoặc chọn một nơi làm bản chính.
