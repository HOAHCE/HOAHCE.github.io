# Hướng dẫn build HCE Research (web + ứng dụng máy tính)

Cấu trúc:
```
HUE Research/
├─ hce-research/   ứng dụng web (Next.js 16) — máy chủ + giao diện
├─ desktop/        ứng dụng cài đặt (Electron) — vỏ mở ứng dụng web
└─ docs/           tài liệu phân tích
```
Yêu cầu: **Node.js 22.19+ / 24.11+ / 26** và npm. Máy build Windows cần công cụ biên dịch C++ nếu không tải được bản dựng sẵn của `better-sqlite3` (hiếm gặp).

---

## 1. Ứng dụng web

### 1.1 Chạy thử (phát triển)
```bash
cd hce-research
npm install
cp .env.example .env.local        # Windows: copy .env.example .env.local
npm run dev                       # http://localhost:3100
```
Không cấu hình gì thêm, bạn vẫn dùng được: Trợ lý chạy chế độ cục bộ, đăng nhập email ghi thư vào `data/dev-mail.log` (mở tệp, bấm liên kết trong đó).

### 1.2 Cấu hình đăng nhập (`.env.local`)

| Biến | Ý nghĩa |
|---|---|
| `BETTER_AUTH_URL` | Địa chỉ công khai của web, ví dụ `https://research.hce.edu.vn` (bắt buộc khi triển khai) |
| `BETTER_AUTH_SECRET` | Chuỗi ngẫu nhiên ≥ 32 ký tự (bắt buộc ở chế độ production). Tạo: `openssl rand -base64 32` |
| `SMTP_HOST` `SMTP_PORT` `SMTP_USER` `SMTP_PASS` `SMTP_FROM` `SMTP_SECURE` | Máy chủ thư gửi liên kết đăng nhập. **Production bắt buộc có**, nếu không đăng nhập email báo lỗi |
| `GITHUB_CLIENT_ID` `GITHUB_CLIENT_SECRET` | Đăng nhập GitHub |
| `ORCID_CLIENT_ID` `ORCID_CLIENT_SECRET` `ORCID_ENV` | Đăng nhập ORCID (`ORCID_ENV=sandbox` để thử) |
| `ALLOWED_EMAIL_DOMAINS` | (tuỳ chọn) chỉ cho email các tên miền này, ví dụ `hce.edu.vn,hueuni.edu.vn`. Để trống = ai cũng đăng nhập được |
| `ADMIN_EMAILS` | (tuỳ chọn) email quản trị, ngăn cách bằng dấu phẩy |
| `ANTHROPIC_API_KEY` `HCE_MODEL` | (tuỳ chọn) bật trợ lý AI thật |
| `HCE_DB_PATH` | (tuỳ chọn) đường dẫn tệp SQLite, mặc định `data/hce.db` |

Nhà cung cấp nào thiếu khoá thì nút tương ứng trên trang `/login` bị khoá, các nhà cung cấp khác vẫn hoạt động.

**Tạo ứng dụng GitHub OAuth:** GitHub → Settings → Developer settings → OAuth Apps → New.
- Homepage URL: `https://<tên-miền-của-bạn>`
- Authorization callback URL: `https://<tên-miền-của-bạn>/api/auth/callback/github`

**Tạo ứng dụng ORCID:** đăng ký "public API client" tại https://orcid.org/developer-tools (thử trước ở https://sandbox.orcid.org/developer-tools).
- Redirect URI: `https://<tên-miền-của-bạn>/api/auth/callback/orcid`
- ORCID có thể không trả email (người dùng ẩn). Khi đó tài khoản chỉ gắn với ORCID iD; hệ thống tạo email nội bộ dạng `<orcid>@orcid.invalid` và **không bao giờ tự liên kết** với tài khoản email thật.

Khi chạy local, thay `https://<tên-miền-của-bạn>` bằng `http://localhost:3100`.

### 1.3 Build và chạy production
```bash
cd hce-research
npm ci
npm run build
npm start                         # http://localhost:3100
```
Để tạo gói tự chứa (dùng cho máy chủ riêng/Docker) build với `HCE_STANDALONE=1` (`npm start` không dùng được với gói này, chạy trực tiếp `server.js`):
```bash
HCE_STANDALONE=1 npm run build
cp -r .next/static .next/standalone/.next/static
cp -r public .next/standalone/public 2>/dev/null || true
NODE_ENV=production PORT=3100 node .next/standalone/server.js
```
Dữ liệu (tài khoản, dự án, nhật ký) nằm trong `data/hce.db` — **sao lưu tệp này**.

### 1.4 Triển khai trên máy chủ riêng của Trường
- Chạy sau reverse proxy HTTPS (Nginx/Caddy), truyền `X-Forwarded-For` (hệ thống dùng nó để giới hạn khách theo IP) và đặt `BETTER_AUTH_URL` đúng địa chỉ HTTPS.
- Chạy nền bằng `pm2`, `systemd` hoặc Docker. Ví dụ Dockerfile tối thiểu (**chưa chạy thử** trong phiên làm việc này):
```dockerfile
FROM node:24-bookworm-slim AS build
WORKDIR /app
COPY hce-research/package*.json ./
RUN npm ci
COPY hce-research/ ./
RUN HCE_STANDALONE=1 npm run build

FROM node:24-bookworm-slim
WORKDIR /app
ENV NODE_ENV=production PORT=3100 HCE_DB_PATH=/data/hce.db
COPY --from=build /app/.next/standalone ./
COPY --from=build /app/.next/static ./.next/static
VOLUME /data
EXPOSE 3100
CMD ["node", "server.js"]
```
Chạy: `docker run -p 3100:3100 -v hce-data:/data --env-file .env.production hce-research`.
- Dữ liệu bài báo/chuyên gia/đề tài nằm trong cùng tệp SQLite: chạy `npm run sync:hueuni` (xem 1.5) trước hoặc định kỳ; trong Docker, chạy lệnh đó trên máy build/cron rồi gắn volume `/data`.
- Một bản sao duy nhất dùng SQLite là đủ cho hàng nghìn người dùng. Nếu cần nhiều bản sao/cân bằng tải, chuyển CSDL sang PostgreSQL.

### 1.5 Dữ liệu thật từ CSDL Khoa học Đại học Huế
Ba công cụ **Tra cứu bài báo, Tìm kiếm chuyên gia, Đề tài khoa học** đọc dữ liệu của Trường từ https://csdlkhoahoc.hueuni.edu.vn/ (CSDL do Ban KH, CN & QHQT Đại học Huế quản lý). Dữ liệu được đồng bộ vào SQLite cục bộ:
```bash
cd hce-research
npm run sync:hueuni                                  # mặc định đơn vị 7 = Trường Đại học Kinh tế
npm run sync:hueuni -- --only article --max-pages 3  # thử nhanh
npm run sync:hueuni -- --unit 7 --delay 1500         # đổi đơn vị / đọc chậm hơn
```
- Đọc các trang danh sách **công khai** (không đăng nhập), chậm 1,2 giây/trang, khai báo User-Agent. Chức năng "Xuất Excel" của nguồn cần tài khoản nên **không dùng**. Chỉ lấy thông tin chuyên môn (không ảnh, email, điện thoại).
- Chạy lại bất cứ lúc nào: bản ghi được cập nhật tại chỗ (theo mã bản ghi của nguồn). Lịch sử và cảnh báo nằm trong bảng `sync_runs`. Bản ghi bị xoá ở nguồn **chưa** bị xoá ở đây.
- Mã đơn vị khác: xem danh sách đơn vị trong bộ lọc của trang nguồn (ví dụ `7` = Trường Đại học Kinh tế).
- Đặt lịch cập nhật hằng tuần: Linux `0 3 * * 0 cd /đường/dẫn/hce-research && npm run sync:hueuni`; Windows dùng Task Scheduler chạy cùng lệnh.
- Nếu nguồn đổi giao diện HTML, bộ đọc có thể không đọc được bản ghi: script ghi cảnh báo ("không đọc được bản ghi nào", hoặc số lượng không khớp tổng nguồn báo) và đánh dấu lần chạy là `partial`.
- **Giới hạn đã gặp:** nguồn phân trang không đảm bảo thứ tự ổn định nên một lần chạy có thể lệch ±1 bản ghi (lần đầu: 2.308/2.309 bài báo, script ghi cảnh báo); chạy lại để bổ sung. Khoảng chục bài báo có danh sách tác giả nguồn ghi dạng chuỗi tự do nên tên bị gộp vào một ô. Dữ liệu có thể chưa đầy đủ so với thực tế vì phụ thuộc nhà khoa học tự cập nhật trên nguồn.
- **Khuyến nghị:** liên hệ Ban Khoa học, Công nghệ và Quan hệ quốc tế – Đại học Huế (thông tin liên hệ có ở chân trang của nguồn) để xin một kênh dữ liệu chính thức/được phép đồng bộ định kỳ; đọc trang HTML chỉ là giải pháp tạm thời.

### 1.6 Biểu mẫu từ website Phòng KHCN & HTQT của Trường
Công cụ **Quy trình, biểu mẫu** đọc danh mục biểu mẫu tại https://khdn.hce.edu.vn/#/detail/contents/bieu-mau/31477/1447:
```bash
cd hce-research
npm run sync:forms      # chỉ biểu mẫu (1 yêu cầu)
npm run sync:all        # dữ liệu khoa học (mục 1.5) + biểu mẫu
```
- Trang trên là ứng dụng Angular; nội dung do API công khai của website Trường (`hce.edu.vn/api/Controller/SelectAllByWhatFE.php`, bản ghi 31477) trả về. Script gọi đúng API đó một lần, tách 7 nhóm và liên kết (65 mục: 50 Google Docs, 8 Word, 2 PDF, 2 tệp nén, 1 Excel, 1 Google Drive, 1 liên kết ngoài) và **thay thế toàn bộ** danh mục cũ, nên mục bị gỡ ở nguồn cũng biến mất ở đây.
- Chỉ lưu tên, nhóm và liên kết, **không tải tệp**. Tệp vẫn nằm ở nơi gốc (`hueuni.edu.vn`, Google Docs, `hce.edu.vn`). Với Google Docs, hệ thống thêm nút tải `.docx` qua đường dẫn xuất chuẩn của Google (đã thử một liên kết, trả về tệp Word; phụ thuộc thiết lập chia sẻ của chủ tệp).
- Nếu nguồn đổi cấu trúc và đọc được dưới 5 mục, script từ chối ghi đè và giữ dữ liệu cũ.
- Mã bản ghi khác (trang biểu mẫu khác): `node scripts/sync-hce-forms.mjs --id <mã>`.
- Nguồn hiện sửa lần cuối 14/03/2024 nên có thể đã cũ; mục "Mẫu I-23" bị lặp và thiếu "Mẫu I-24" là do nguồn ghi như vậy.
- Mục "Quy trình" (các bước thực hiện) chưa có nguồn dữ liệu riêng; hiện chỉ có biểu mẫu và văn bản kèm liên kết (ví dụ Quyết định 862/QĐ-ĐHH).

### 1.7 Quỹ quốc tế từ EU Funding & Tenders
Tab **Quốc tế (EU)** của công cụ **Tra cứu quỹ** đọc các lời kêu gọi đề xuất đang mở của Ủy ban châu Âu (Horizon Europe, Digital Europe, CERV, Creative Europe, Erasmus+…):
```bash
cd hce-research
npm run sync:eu                       # chỉ quỹ EU (~1 phút)
npm run sync:eu -- --include-forthcoming   # kèm các lời kêu gọi "sắp mở"
npm run sync:all                      # dữ liệu khoa học + biểu mẫu + quỹ EU
```
- Nguồn: Search API công khai của cổng EU Funding & Tenders (khoá công khai `SEDIA`, truy vấn dạng multipart). Chỉ lấy `type` 1 (topic của lời kêu gọi đề xuất) và 8 (lời kêu gọi cạnh tranh/tài trợ lại), trạng thái **Open**; bỏ `type` 2 (mua sắm).
- **Lọc "đang mở" thật sự:** gần 55% bản ghi vẫn mang trạng thái Open nhưng mọi hạn nộp đã qua (nhiều lời kêu gọi từ 2023). Script bỏ các bản ghi đó (lần chạy ngày 21/10/2026: 555 bản ghi, giữ 247, bỏ 308). Khi truy vấn, ứng dụng còn lọc lại theo giờ hiện tại nên lời kêu gọi quá hạn tự biến mất giữa hai lần đồng bộ. Hạn chỉ có ngày được chừa 12 giờ.
- **Phân trang của API không ổn định:** với sắp xếp mặc định, 6 trang chỉ cho 475/555 bản ghi khác nhau (trang trùng, thiếu). Script truy vấn riêng từng loại, sắp theo `identifier` và đạt đủ 555/555; nếu nhận ít hơn tổng báo hơn 3 bản ghi, lần chạy được đánh dấu `partial`.
- Dùng `node:https` thay `fetch`: trên Node 26, `fetch` tới máy chủ này đôi lúc làm sập tiến trình (lỗi nội bộ của undici).
- Mỗi lần chạy **thay toàn bộ** bảng `src_eu_call` (chỉ khi lấy được ≥ 20 bản ghi). Lưu: tiêu đề, chương trình, loại hình, các hạn, ngân sách chỉ định, mô tả (đã chuyển HTML thành văn bản), liên kết cổng EU và cổng nộp hồ sơ.
- Giấy phép: chính sách tái sử dụng chung của Ủy ban (Quyết định 2011/833/EU) cho phép dùng lại theo CC BY 4.0 nếu ghi nguồn và nêu thay đổi; giao diện ghi nguồn và "đã tóm lược và chuyển định dạng". Chưa đọc thông báo pháp lý riêng của cổng Funding & Tenders.
- Đặt lịch chạy hằng ngày (danh sách đang mở thay đổi nhanh): Linux `0 6 * * * cd /đường/dẫn/hce-research && npm run sync:eu`.
- Nội dung gốc tiếng Anh, **không dịch**. Tìm kiếm là so khớp từ khoá (không ngữ nghĩa); Trợ lý tự dịch một số từ khoá tiếng Việt thường gặp (giáo dục, kinh tế, chuyển đổi số, doanh nghiệp…) sang tiếng Anh để tra.
- Điều kiện đủ tư cách của tổ chức Việt Nam khác nhau theo từng lời kêu gọi; ứng dụng **không** kết luận ai đủ điều kiện, chỉ nhắc đọc mục Conditions trên cổng EU.
- Tab **Trong nước** vẫn là dữ liệu mẫu (có ghi rõ trên giao diện).

### 1.8 Tạp chí: SJR (CSV), danh mục QĐ 2244, cờ DOAJ
Tab **Tạp chí** của công cụ **Hội thảo – tạp chí** đọc một bảng tạp chí **gộp theo ISSN** từ ba nguồn. Mỗi nguồn nhập bằng một lệnh, nhập lại bất cứ lúc nào:
```bash
cd hce-research
npm run journals:vn                                   # danh mục QĐ 2244/QĐ-BKHCN: tự tải PDF (≈10 giây)
npm run journals:doaj                                 # DOAJ (CC0): tự tải CSV (≈2 phút, ~23.500 tạp chí)
npm run journals:sjr -- --file "duong-dan/scimagojr 2025.csv"   # SJR: NHẬP TỪ TỆP BẠN TẢI
```
**SJR (quartile Q1–Q4)** — tải bằng trình duyệt, vì tải tự động bị Cloudflare chặn (HTTP 403):
1. Mở https://www.scimagojr.com/journalrank.php, chọn năm (ví dụ 2025).
2. **Không lọc** lĩnh vực/quốc gia (để có đủ ~30.000 tạp chí), bấm **Download data**; được tệp CSV dấu `;`.
3. Chạy lệnh `journals:sjr` ở trên. Lệnh nhận ra năm từ tiêu đề cột `Total Docs. (2025)` (hoặc dùng `--year`).
- Định dạng đã đối chiếu với tệp thật của SJR (cột `Rank;Sourceid;Title;Type;Issn;Publisher;…;SJR;SJR Best Quartile;H index;…;Country;Region;Publisher;Coverage;Categories;Areas`, số dạng `33,069`, ISSN `00335533, 15314650`). Chưa chạy với tệp SJR đầy đủ trong phiên làm việc: bộ nhập được thử bằng tệp 5 dòng đúng định dạng.
- Nếu tệp có ít hơn 5.000 dòng (ví dụ tải theo một lĩnh vực), lệnh **từ chối** để tránh xoá nhầm dữ liệu; dùng `--merge` để bổ sung, hoặc `--force` để thay toàn bộ.
- Điều khoản SJR: dùng cho mục đích phi thương mại, phải trích dẫn (giao diện ghi sẵn trong phần "Nguồn dữ liệu và điều khoản"). "Quartile" là quartile tốt nhất theo SJR/Scopus, không phải JCR/WoS.

**Danh mục QĐ 2244/QĐ-BKHCN (28/4/2026)**
- Đọc từ bản PDF danh mục do tạp chí Dân chủ và Pháp luật (Bộ Tư pháp) đăng kèm quyết định; bản này đổi từ Excel (có dòng "Evaluation Only" của công cụ chuyển đổi) và **không phải tệp gốc của Bộ**. Bộ nhập dựng lại bảng từ vị trí chữ và đọc đủ **341 tạp chí** (16 chỉ mục quốc tế + 325 trong nước), khớp số lượng mà trang tổng hợp bên thứ ba nêu. Hãy đối chiếu với văn bản gốc của Bộ.
- Danh mục chỉ có STT, tên và cơ quan chủ quản, **không có ISSN**. Tạp chí được ghép với dữ liệu khác theo tên khi khớp duy nhất (tạp chí Việt Nam in qua nhà xuất bản nước ngoài như Journal of Economics and Development vẫn được ghép dù quốc gia nhà xuất bản khác). Kết quả hiện tại: 12/341 tạp chí khớp với DOAJ.
- Các tạp chí nhiều chuyên san (ví dụ Tạp chí Khoa học Đại học Huế) được lưu thành một mục kèm danh sách các chuyên san.
- Nguồn có lỗi đánh số: STT 339 lặp hai lần và thiếu 340 (hệ thống giữ nguyên). Một số dòng con có tiền tố "KỲ" lấy đúng như nguồn.
- **Chưa áp dụng quyết định sửa đổi, bổ sung (QĐ 2823/QĐ-BKHCN, 6/2026).** Phụ lục sửa đổi nằm trên Google Drive nên không tải tự động được. Cách bổ sung: lập tệp CSV có cột `title,agency,group,issn` rồi chạy `npm run journals:vn -- --extra bo-sung.csv`.
- Tệp PDF khác/bản chính thức: `npm run journals:vn -- --file danh-muc.pdf` hoặc `--url https://…`.

**DOAJ**: cờ "Truy cập mở", giấy phép, APC; siêu dữ liệu CC0. Lệnh tự theo liên kết tải của https://doaj.org/csv.

**Cách ghép và an toàn dữ liệu**
- Khoá ghép là ISSN (in và điện tử). Ghép theo tên chỉ khi đúng một ứng viên, cùng quốc gia hoặc chưa rõ quốc gia; không đoán khi mơ hồ.
- Mỗi lần nhập thay thế dữ liệu **của chính nguồn đó** trong một giao dịch (lỗi giữa chừng không mất dữ liệu cũ); không động tới nguồn khác. Tạp chí không còn nguồn nào chứa sẽ bị xoá.
- Trợ lý cũng tra bảng này (trả kèm cờ SJR/QĐ 2244/DOAJ).
- Tab **Hội thảo** vẫn là dữ liệu mẫu (ghi rõ trên giao diện).

---

## 2. Ứng dụng cài đặt (desktop, Electron)

Ứng dụng máy tính là **vỏ Electron mở bản web đã triển khai** (giống nút "Tải ứng dụng cho máy tính" của hệ thống gốc). Nó không chứa máy chủ, nên cần bản web chạy ở một địa chỉ mà máy người dùng truy cập được (internet hoặc mạng nội bộ của Trường).

### 2.1 Cấu hình địa chỉ
Sửa `desktop/app.config.json`:
```json
{ "url": "https://research.hce.edu.vn", "authHosts": ["github.com", "orcid.org", "sandbox.orcid.org"] }
```
(Có thể ghi đè khi chạy bằng biến môi trường `HCE_APP_URL`.)

### 2.2 Chạy thử
```bash
cd desktop
npm install
npm start                          # cần bản web đang chạy ở địa chỉ trên
```
> npm 11 có thể chặn script cài đặt nên `npm install` không tải bản chạy của Electron (lỗi "Electron failed to install correctly"). Khắc phục: `node node_modules/electron/install.js` (tải ~100 MB một lần), hoặc `npm install-scripts approve electron`.

### 2.3 Đóng gói bộ cài
```bash
npm run dist:win      # → desktop/dist/HCE Research Setup x.y.z.exe   (build trên Windows)
npm run dist:mac      # → .dmg                                        (build trên macOS)
npm run dist:linux    # → .AppImage                                   (build trên Linux)
npm run pack          # chỉ đóng gói thư mục chạy được, không tạo bộ cài (kiểm tra nhanh)
```
Mỗi hệ điều hành nên build trên chính hệ điều hành đó. Thay biểu tượng bằng logo chính thức của Trường tại `desktop/build/icon.png` (PNG 512×512 trở lên).

### 2.4 Đăng nhập trong ứng dụng desktop
- **GitHub, ORCID:** chạy ngay trong cửa sổ ứng dụng (các miền này nằm trong danh sách cho phép).
- **Email:** liên kết trong thư mở bằng trình duyệt hệ thống nên phiên đăng nhập sẽ nằm ở trình duyệt. Để đăng nhập trong ứng dụng: chuột phải vào liên kết trong thư → *Sao chép địa chỉ liên kết* → trong ứng dụng chọn **Tệp → Dán liên kết đăng nhập từ email** (Ctrl+Shift+L). Ứng dụng chỉ chấp nhận đúng miền của hệ thống và đường dẫn xác thực.

### 2.5 Ký số và phát hành (khi phát hành chính thức)
Bộ cài chưa ký sẽ bị Windows SmartScreen/macOS Gatekeeper cảnh báo. Cần chứng chỉ ký mã (Windows) và Apple Developer ID + notarization (macOS); cấu hình trong khối `build` của `desktop/package.json` (xem tài liệu electron-builder). Muốn tự cập nhật, thêm `electron-updater` và máy chủ phát hành.

---

## 3. Đã kiểm tra những gì
Trên Windows 11, Node 26 (tháng 10/2026):
- Web: `npm run build` sạch; chạy `output: standalone`; đăng nhập email hoạt động đầu-cuối (gửi liên kết → đăng nhập → dùng lại liên kết bị từ chối); GitHub và ORCID sinh đúng địa chỉ uỷ quyền tới github.com / orcid.org (chưa hoàn tất đăng nhập thật vì cần khoá ứng dụng của Trường); production không có SMTP thì từ chối gửi và không ghi liên kết ra log.
- Desktop: chạy `electron .` và bản `win-unpacked` tải đúng trang web; tạo được bộ cài `HCE Research Setup 0.1.0.exe` (~107 MB, **chưa ký số**, chưa chạy thử bộ cài). Chưa build macOS/Linux.
- Đồng bộ dữ liệu thật: đã chạy toàn bộ cho đơn vị 7 (Trường Đại học Kinh tế): 2.308/2.309 bài báo, 618/618 đề tài, 236/236 nhà khoa học (xem lưu ý dưới 1.5).
- Biểu mẫu: đã chạy `sync:forms` (65 mục, 7 nhóm), kiểm tra API, giao diện tìm/lọc và Trợ lý trả đúng liên kết.
- Quỹ EU: đã chạy `sync:eu` (247 lời kêu gọi đang mở, 17 chương trình), kiểm tra API (tìm kiếm, lọc chương trình/hạn, sắp xếp, đầu vào lạ), giao diện và Trợ lý.
- Tạp chí: đã nhập thật QĐ 2244 (341 mục) và DOAJ (23.488 bản ghi → 23.815 tạp chí gộp); SJR mới thử bằng tệp 5 dòng đúng định dạng (chưa có tệp SJR đầy đủ); thử API, giao diện lọc/tìm, ghép theo ISSN/tên, nhập lại nhiều lần cho kết quả ổn định.
- Chưa kiểm tra: đăng nhập GitHub/ORCID với khoá thật, gửi email qua SMTP thật, Docker, tự cập nhật.
- Lưu ý khi chạy `server.js` standalone trên Windows: máy chủ lắng nghe IPv4 (0.0.0.0); nếu `localhost` không vào được, dùng `127.0.0.1`.

## 4. Kiểm tra nhanh sau khi triển khai
1. Mở `/login`: ba lựa chọn hiển thị; nút GitHub/ORCID sáng khi đã cấu hình.
2. Đăng nhập bằng email: nhận thư, bấm liên kết (dùng lại lần hai phải báo `INVALID_TOKEN`).
3. Vào **Hồ sơ**, nhập thông tin, tải lại trang: dữ liệu còn nguyên (đã lưu theo tài khoản).
4. Hỏi Trợ lý khi chưa đăng nhập: thấy hạn mức khách; đăng nhập: hạn mức cao hơn.
5. Đặt `NODE_ENV=production` mà chưa có SMTP: đăng nhập email phải báo lỗi (không ghi liên kết ra log).
