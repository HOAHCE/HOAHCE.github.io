# Trang cá nhân tranthaihoa.id.vn

Repo này — **`HOAHCE/HOAHCE.github.io`, nhánh `main`** — là nguồn duy nhất của website
https://tranthaihoa.id.vn. Mọi việc với website (đăng bài, sửa trang, công bố, giảng dạy…)
đều làm ở đây. Repo `HOAHCE/github.io` **không phải** website, không dùng.

## Nhánh và cách trang được phát hành

- Chỉ sửa trên `main`. Đăng bài hay sửa nội dung thì commit và đẩy thẳng lên `main`.
- **Không bao giờ sửa `gh-pages`**: nhánh này là bản HTML do workflow tự sinh ra từ `main`.
- Đẩy lên `main` → Actions *Deploy site* build Jekyll (theme al-folio) → ghi vào `gh-pages`
  → *pages build and deployment* đưa lên tranthaihoa.id.vn. Tổng cộng khoảng 2 phút.
- Sau khi đẩy, kiểm tra cả hai workflow trên đều thành công rồi mới báo đã đăng.

## Đăng bài blog

Mặc định đăng **cả hai ngôn ngữ**:

- Bản Việt: `_posts/vi/NĂM-THÁNG-NGÀY-tieu-de-khong-dau.md` → `/vi/blog/NĂM/tieu-de-khong-dau/`
- Bản Anh: `_posts/en/NĂM-THÁNG-NGÀY-english-title.md` → `/blog/NĂM/english-title/`
- Hai bản dùng **cùng `ref`** (nút EN / VI và luồng bình luận Waline nối theo `ref`), cùng
  `date`, cùng `categories`.
- Giữ nguyên văn bản tiếng Việt của tác giả. Bản Anh dịch sát nghĩa, chính tả Anh–Anh như
  các bài đã có.
- `categories` / `tags` viết không dấu và nên có sẵn trong `display_categories` /
  `display_tags` của `_config.yml`. Đừng đặt tag trùng tên category (sẽ hiện hai lần dưới
  tiêu đề).
- `date` (giờ +0700) không được muộn hơn lúc build, nếu không Jekyll sẽ ẩn bài.

Mẫu front matter và các việc khác (công bố, học phần, banner…): xem `HUONG-DAN.md`.

## Build thử trên máy

```bash
LANG=C.UTF-8 LC_ALL=C.UTF-8 bundle exec jekyll build
```

Thiếu `LANG=C.UTF-8` thì Ruby đọc nội dung tiếng Việt sai và build lỗi.
