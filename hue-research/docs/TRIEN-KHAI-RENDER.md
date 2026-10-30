# Triển khai HUE Research lên Render, cấu hình đăng nhập GitHub và email

Thông tin Render dưới đây đã đối chiếu với tài liệu của Render ngày 22/10/2026 (giao diện và giá có thể đổi). Giá hiện tại: https://render.com/pricing.

## 0. Chọn gói trước khi bắt đầu

| | Free | Trả phí (Starter trở lên) + Disk |
|---|---|---|
| Địa chỉ `*.onrender.com` | Có | Có |
| Ngủ khi không có truy cập | **Có, sau 15 phút** (lần truy cập sau chờ khởi động lại) | Không |
| Dữ liệu (tài khoản đăng nhập, dự án, dữ liệu đã nạp) | **Mất mỗi lần khởi động lại/ngủ dậy**, dữ liệu thật nạp lại từ đầu (vài phút) | Giữ nguyên trên Disk `/data` |
| Gửi email qua SMTP cổng 25/465/587 | **Bị chặn** | Cổng 25 vẫn bị chặn; 465/587 dùng được |
| RAM | 512 MB (bước nạp DOAJ có thể thiếu bộ nhớ) | Tuỳ gói |

Kết luận: gói **Free chỉ để xem thử**; đăng nhập chỉ có ý nghĩa khi dùng gói trả phí kèm Disk, vì CSDL (kể cả tài khoản) nằm trong một tệp SQLite.

## 1. Tạo dịch vụ từ GitHub

1. Vào https://render.com và đăng ký/đăng nhập (tài khoản của bạn, có thể bằng GitHub).
2. Mở https://render.com/deploy?repo=https://github.com/HOAHCE/HUE-Research (hoặc Dashboard → **New → Blueprint** → chọn repo `HOAHCE/HUE-Research`). Nếu Render xin quyền đọc repo GitHub, cấp quyền cho repo này.
3. Render đọc `render.yaml` và hiện dịch vụ `hue-research` (Docker, gói free). Bấm **Deploy Blueprint**.
4. Đợi build (vài phút đến mười mấy phút vì phải biên dịch `better-sqlite3`). Khi trạng thái là **Live**, mở địa chỉ dạng `https://hue-research.onrender.com` (xem chính xác trong trang dịch vụ; nếu tên đã bị dùng, Render thêm hậu tố ngẫu nhiên).
5. Kiểm tra: mở `https://<địa-chỉ>/api/providers`, phải thấy `{"email":true,"github":false,"orcid":false}`. Trang chủ mở được; công cụ Tra cứu bài báo/chuyên gia sẽ trống cho tới khi nạp dữ liệu xong (theo dõi tại **Logs**, dòng bắt đầu bằng `=== node scripts/...`; ghi cả vào `/data/seed.log`).

Địa chỉ web tự được dùng làm địa chỉ gốc cho đăng nhập (qua biến `RENDER_EXTERNAL_URL` của Render). Khoá bí mật đăng nhập (`BETTER_AUTH_SECRET`) do Render tự sinh. Không phải điền gì lúc tạo Blueprint.

## 2. Giữ dữ liệu (nên làm nếu dùng thật)

1. Dashboard → dịch vụ `hue-research` → **Settings → Instance Type** → chọn gói trả phí (Starter trở lên).
2. **Settings → Disks → Add Disk**: Name `hue-data`, **Mount Path `/data`**, dung lượng 1 GB. Lưu; Render khởi động lại dịch vụ.
3. Từ đó CSDL `hce.db`, khoá bí mật dự phòng và đánh dấu "đã nạp dữ liệu" nằm trên Disk; dữ liệu chỉ nạp một lần.
4. Ghi chú của Render: gắn Disk thì mỗi lần triển khai có vài giây gián đoạn và không chạy nhiều bản sao.

Container khởi động bằng root để sửa quyền thư mục `/data` rồi chạy ứng dụng bằng người dùng không đặc quyền, nên Disk (thường thuộc root) vẫn ghi được.

## 3. Đăng nhập bằng GitHub

Tạo ứng dụng OAuth trên GitHub (làm trong tài khoản/tổ chức của bạn):

1. GitHub → ảnh đại diện → **Settings → Developer settings → OAuth Apps → New OAuth App**.
2. Điền:
   - **Application name**: `HUE Research`
   - **Homepage URL**: `https://<địa-chỉ>.onrender.com`
   - **Authorization callback URL**: `https://<địa-chỉ>.onrender.com/api/auth/callback/github` (đúng từng ký tự, có `https`, không dấu `/` thừa ở cuối)
3. **Register application** → trong trang ứng dụng bấm **Generate a new client secret**. Sao chép **Client ID** và **Client secret** (secret chỉ hiện một lần).

Điền vào Render (**không dán các giá trị này vào cuộc trò chuyện hay mã nguồn**):

1. Dashboard → dịch vụ → **Environment → Add Environment Variable**:
   - `GITHUB_CLIENT_ID` = Client ID
   - `GITHUB_CLIENT_SECRET` = Client secret
2. **Save, rebuild, and deploy** (hoặc Save rồi để Render tự triển khai lại).
3. Kiểm tra `https://<địa-chỉ>/api/providers` phải có `"github":true`; mở `/login`, nút "Đăng nhập bằng GitHub" sáng lên. Bấm thử: GitHub hỏi quyền, rồi quay về web và hiện tên bạn ở góc trên.

Lỗi thường gặp: `redirect_uri_mismatch` nghĩa là callback URL trên GitHub không khớp địa chỉ thật; sửa trong **OAuth Apps → ứng dụng → Authorization callback URL**. Nếu sau này dùng tên miền riêng, tạo lại/sửa callback theo tên miền đó và đặt thêm biến `BETTER_AUTH_URL=https://tên-miền-của-bạn`.

## 4. Đăng nhập bằng email (liên kết một lần)

Ứng dụng gửi email bằng SMTP (nodemailer), **bắt buộc có SMTP ở bản production** (thiếu SMTP thì từ chối gửi, để không lộ liên kết đăng nhập trong nhật ký).

**Trên gói Free, Render chặn cổng 25/465/587**, nên cách thông thường (Gmail 587/465…) không chạy. Có hai lựa chọn:

- **A. Nâng lên gói trả phí** (cũng cần để giữ dữ liệu) rồi dùng SMTP cổng 587 hoặc 465.
- **B. Dùng nhà cung cấp SMTP có cổng khác** (thường là 2525 hoặc 2465/2587). Hãy xác nhận cổng trên trang tài liệu SMTP của nhà cung cấp bạn chọn (Brevo, Mailgun, SendGrid, Resend…; tôi chưa kiểm tra từng nhà cung cấp).

Cấu hình (Environment của dịch vụ Render):

| Biến | Giá trị |
|---|---|
| `SMTP_HOST` | máy chủ SMTP của nhà cung cấp |
| `SMTP_PORT` | ví dụ `2525` (cổng không bị chặn) hoặc `587` (gói trả phí) |
| `SMTP_SECURE` | `false` cho STARTTLS (587, 2525); `true` cho SSL trực tiếp (465, 2465) |
| `SMTP_USER`, `SMTP_PASS` | tên đăng nhập và mật khẩu/khoá SMTP của nhà cung cấp |
| `SMTP_FROM` | ví dụ `HUE Research <no-reply@tên-miền-đã-xác-thực>` (nhà cung cấp thường yêu cầu xác thực tên miền gửi) |
| `ALLOWED_EMAIL_DOMAINS` | (tuỳ chọn) giới hạn email, ví dụ `hce.edu.vn,hueuni.edu.vn`; để trống = mọi email |
| `ADMIN_EMAILS` | (tuỳ chọn) email quản trị, cách nhau bằng dấu phẩy |

Sau khi triển khai lại: `/api/providers` vẫn có `"email":true` (email luôn bật), nên hãy **thử thật**: vào `/login`, nhập email của bạn, kiểm tra hộp thư (kể cả thư rác), bấm liên kết (hiệu lực 10 phút, dùng một lần). Nếu báo "Không gửi được liên kết", xem **Logs** của Render: lỗi `SMTP chưa được cấu hình` nghĩa là thiếu `SMTP_HOST`; lỗi kết nối/timeout thường do cổng bị chặn hoặc sai thông tin.

## 5. (Tuỳ chọn) Trợ lý AI thật và ORCID

- `ANTHROPIC_API_KEY` (khoá API của bạn; không có thì Trợ lý chạy chế độ cục bộ dựa trên từ khoá).
- ORCID: đăng ký ứng dụng tại orcid.org/developer-tools với Redirect URI `https://<địa-chỉ>/api/auth/callback/orcid`, rồi đặt `ORCID_CLIENT_ID`, `ORCID_CLIENT_SECRET`.

## 6. Tự cập nhật dữ liệu bằng Cron Job

**Vì sao thiết kế như sau.** Theo tài liệu Render, Cron Job **không truy cập được Disk** của dịch vụ khác, mà CSDL SQLite nằm trên Disk của web service. Nên Cron Job không tự đồng bộ được. Cách làm: Cron Job chỉ gọi một API của web service, và web service tự chạy các bộ đồng bộ ở bên trong (nơi sở hữu Disk). Cron chờ kết quả và **thoát lỗi nếu đồng bộ thất bại**, nên Render báo lỗi cho bạn.

**Lịch (giờ UTC; Việt Nam = UTC+7):**
- Mỗi ngày 06:00 UTC (13:00 VN): quỹ EU (`eu`).
- Riêng Chủ nhật, chạy thêm `weekly`: CSDL Khoa học Đại học Huế, biểu mẫu, danh mục QĐ 2244, DOAJ.
- Đổi ngày trong tuần bằng biến `WEEKLY_DAY` (0 = Chủ nhật … 6 = Thứ bảy) của Cron Job; đổi giờ bằng `schedule` trong `render.production.yaml`.

**Chi phí và điều kiện.** Render tính tối thiểu 1 USD/tháng cho mỗi cron job service (theo tài liệu hôm nay), cộng web service trả phí và Disk. Cron chỉ có ý nghĩa khi web dùng Disk (gói Free mất dữ liệu mỗi lần khởi động lại).

**Cách bật.** Dùng Blueprint dành cho môi trường thật (web + Disk + Cron):
1. Dashboard → **New → Blueprint** → chọn repo `HOAHCE/HUE-Research`.
2. Ở ô **Blueprint Path** nhập `render.production.yaml` (nút "Deploy to Render" mặc định dùng `render.yaml`, bản thử Free không có Cron).
3. Deploy Blueprint. Sau khi web Live, mở dịch vụ **hue-sync** → **Environment**: kiểm tra `SYNC_URL` đúng địa chỉ thật của web (mặc định `https://hue-research.onrender.com`; **sửa nếu Render đặt tên khác**). `SYNC_TOKEN` được nối tự động từ web service.
4. Thử ngay: trang **hue-sync** → **Trigger Run**. Trong **Logs** phải thấy `Kích hoạt tác vụ "eu"…`, rồi `Tác vụ "eu" kết thúc: ok`. Nếu hôm đó là Chủ nhật (UTC) sẽ chạy thêm `weekly` (vài phút, DOAJ nặng nhất).
5. Đã dùng `render.yaml` rồi và muốn thêm Cron: nâng web lên gói trả phí + Disk như mục 2, rồi tạo thêm dịch vụ **New → Cron Job** từ cùng repo với Dockerfile Path `./Dockerfile.cron`, Schedule `0 6 * * *`, và đặt hai biến `SYNC_URL`, `SYNC_TOKEN` (giá trị lấy từ biến `SYNC_TOKEN` của web).

**Lỗi thường gặp (xem Logs của hue-sync):**
- `404: web chưa bật điểm đồng bộ…` — web chưa có `SYNC_TOKEN` hoặc `SYNC_URL` trỏ sai dịch vụ.
- `401: chữ ký bị từ chối` — `SYNC_TOKEN` của Cron khác của web (đặt lại cho khớp), hoặc đồng hồ lệch hơn 5 phút.
- `409: đang có tác vụ khác chạy` — bước nạp ban đầu hoặc lần chạy trước chưa xong; lần lịch sau sẽ chạy lại.
- Một bước báo mã thoát khác 0 — xem tệp nhật ký trên web: `/data/sync-eu.log`, `/data/sync-weekly.log` (Shell của web service).

**Bảo mật.** Điểm đồng bộ (`/api/admin/sync`) **tắt hẳn (404)** nếu web chưa có `SYNC_TOKEN` từ 16 ký tự trở lên. Token không bao giờ được gửi đi: mỗi yêu cầu mang chữ ký HMAC-SHA256 theo thời gian (hiệu lực 5 phút, mỗi chữ ký dùng một lần), nên gõ nhầm `SYNC_URL` sang dịch vụ lạ cũng không lộ token. Chỉ chạy các tác vụ có sẵn trong danh sách cố định (không nhận lệnh tuỳ ý), một tác vụ tại một thời điểm, cùng tác vụ cách nhau tối thiểu 10 phút.

**Chưa tự cập nhật:** SJR (cần tệp CSV tải bằng trình duyệt, tải lên Disk rồi chạy `node scripts/journals.mjs sjr --file …` trong Shell của web); danh mục HĐGSNN chưa tích hợp.

## 7. Vận hành khác

- Mỗi lần đẩy mã lên nhánh `main`, Render tự build và triển khai lại (`autoDeploy`).
- Chạy tay một bộ đồng bộ: Dashboard → web service → **Shell** (gói trả phí), ví dụ `node scripts/sync-eu-funding.mjs`.
- Sao lưu: tải tệp `/data/hce.db` (SQLite) định kỳ nếu dùng Disk.
