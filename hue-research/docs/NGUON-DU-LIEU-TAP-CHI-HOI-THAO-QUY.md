# Nguồn dữ liệu chính thống cho Tạp chí, Hội thảo và Quỹ tài trợ

Ngày khảo sát: 21/10/2026. Mục đích: thay dữ liệu mẫu (`lib/data.ts`) của ba công cụ bằng dữ liệu có nguồn uy tín, cập nhật được, dùng đúng điều khoản.

Ký hiệu: ✅ đã thử trực tiếp trong phiên này · 📄 chỉ xác nhận qua tài liệu/trang công bố của nguồn · ❌ thử nhưng bị chặn/lỗi · ❓ chưa kiểm tra.

## 1. Nguyên tắc chọn nguồn
1. **Cơ quan có thẩm quyền công bố** (Bộ, Hội đồng, tổ chức tài trợ, cơ sở dữ liệu học thuật gốc), không dùng trang tổng hợp bên thứ ba làm nguồn gốc.
2. **Giấy phép cho phép dùng lại** (CC0, hoặc cho dùng phi thương mại có trích dẫn). Nguồn không rõ giấy phép thì chỉ dẫn liên kết, không sao chép hàng loạt.
3. **Mỗi bản ghi lưu nguồn + ngày kiểm tra + liên kết gốc**, và giao diện hiển thị ba thứ đó (như đã làm cho dữ liệu khoa học và biểu mẫu).
4. Dữ liệu có hạn nộp/thời hạn phải có **ngày hết hạn tự ẩn** và nhắc "kiểm tra thông báo chính thức".
5. Không dựng "danh sách đen tạp chí săn mồi" từ nguồn tự phát: chỉ hiển thị chỉ số chỉ mục (DOAJ/Scopus/WoS/HĐGSNN) và để người dùng tự đánh giá.

## 2. TẠP CHÍ

| Nguồn | Cơ quan / độ tin cậy | Nội dung | Cách lấy | Giấy phép / điều khoản | Tình trạng kiểm tra |
|---|---|---|---|---|---|
| **Danh mục tạp chí đạt tiêu chuẩn khoa học Việt Nam 2026** (QĐ 2244/QĐ-BKHCN, 28/4/2026; có quyết định sửa đổi) | Bộ Khoa học và Công nghệ (cơ quan ban hành) | ~341 tạp chí (VOJS tổng hợp: 16 chỉ mục quốc tế + 325 trong nước) | Văn bản PDF kèm quyết định; nhiều trường đăng lại | Văn bản pháp quy công khai | 📄 Quyết định có thật (nhiều trường đăng tin). Số 341 lấy từ trang VOJS (bên thứ ba), **cần đối chiếu với PDF gốc của Bộ** |
| **Danh mục tạp chí được tính điểm của Hội đồng Giáo sư Nhà nước** (năm 2025: QĐ 26/QĐ-HĐGSNN, 11/07/2025; 28 hội đồng ngành, trong đó ngành Kinh tế) | Hội đồng Giáo sư Nhà nước, trang hdgsnn.gov.vn | Danh sách + khung điểm theo từng ngành | 28 tệp PDF trên hdgsnn.gov.vn | Văn bản công khai | ❌ Máy chủ chặn tải tự động ("Access forbidden") nên không thể đồng bộ tự động; cần tải tay bằng trình duyệt. 📄 Chưa tìm thấy danh mục năm 2026 của HĐGSNN (có thể chưa công bố) |
| **SCImago SJR** (quartile Q1–Q4, H-index, quốc gia, nhà xuất bản) | SCImago, dựa trên Scopus | ~32 nghìn tạp chí, tải CSV hằng năm | Nút "Download data" trên scimagojr.com | "Dùng cho mục đích phi thương mại, phải trích dẫn" (theo trang trợ giúp) | ✅ Điều khoản đọc được. ❌ Tải bằng chương trình bị Cloudflare chặn (403) ⇒ **nhập thủ công mỗi năm** |
| **Danh mục nguồn Scopus** (có/không được Scopus lập chỉ mục) | Elsevier | ~50 nghìn nguồn, Excel cập nhật hằng tháng, có trang tải công khai | Tệp Excel trên elsevier.com | ❓ Chưa đọc điều khoản dùng lại | 📄 Link tải công khai có thật. Chỉ nên dùng để đối chiếu cờ "Scopus: có/không" |
| **Web of Science Master Journal List** | Clarivate | Tìm tạp chí trong WoS (SCIE, SSCI, ESCI…) | Tra cứu trên mjl.clarivate.com | ❓ Không thấy giấy phép tải hàng loạt | 📄 Tra cứu miễn phí; **chỉ liên kết**, không sao chép dữ liệu |
| **DOAJ** (tạp chí truy cập mở được thẩm định) | DOAJ (tổ chức phi lợi nhuận) | Siêu dữ liệu tạp chí: ISSN, nhà xuất bản, giấy phép, APC, quốc gia | API, tệp CSV, OAI-PMH, bản dump hằng tháng | **CC0** | 📄 Điều khoản xác nhận CC0 và các cách lấy. ❌ API trả 502 lúc thử (lỗi phía họ) nên chưa kiểm tra phản hồi thật |
| **OpenAlex** (nguồn tạp chí/hội nghị, số bài, trích dẫn, OA, quốc gia) | OurResearch, dữ liệu mở | Hàng trăm nghìn nguồn, liên kết bài báo | API hoặc bản tải toàn bộ (snapshot) | **CC0**. Từ 2026 API cần khoá miễn phí (ngân sách ~1 USD/ngày); snapshot không cần khoá | 📄 Qua trang tài liệu của họ. ❓ Chưa gọi thử vì tạo tài khoản lấy khoá là việc của bạn |
| **Tạp chí ĐH Huế / CSDL KH&CN Đại học Huế** | Đại học Huế | Tên tạp chí xuất hiện trong chính bài báo của Trường (trường `venue`, `category`) | Đã có trong cơ sở dữ liệu nạp ở bước trước | Dữ liệu của ĐH Huế | ✅ Dùng được ngay để xếp "tạp chí Trường hay đăng" |

**Khuyến nghị tạp chí (gộp theo ISSN):**
1. Lõi trong nước: **Danh mục QĐ 2244/QĐ-BKHCN** + **danh mục HĐGSNN ngành Kinh tế** (nhập thủ công từ PDF gốc, ghi số quyết định và năm).
2. Chỉ số quốc tế: **SJR** (quartile; nhập CSV thủ công hằng năm, trích dẫn đúng) + cờ **Scopus/WoS/DOAJ** (DOAJ qua CC0; Scopus/WoS chỉ cờ hoặc liên kết).
3. Làm giàu: **OpenAlex** (quốc gia, nhà xuất bản, OA) khi có khoá API.
4. Hiển thị luôn "chỉ số này của năm nào, nguồn nào". Tên gọi "Q1/Q2" là của SJR/Scopus, không dùng lẫn với phân hạng WoS.

> **Cập nhật 21/10/2026:** đã tích hợp QĐ 2244 (bản PDF do tạp chí Dân chủ và Pháp luật đăng, 341 mục, không có ISSN), DOAJ (CSV công khai, tải tự động được) và bộ nhập SJR từ tệp CSV (đã xác nhận định dạng thật trên trình duyệt; tệp SJR đầy đủ cần bạn tải). HĐGSNN chưa tích hợp. Chi tiết: HUONG-DAN-BUILD mục 1.8.

## 3. HỘI THẢO

**Không có một nguồn mở, chính thống, đầy đủ cho hội thảo kinh tế–quản trị.** Kết quả khảo sát:

| Nguồn | Nhận xét | Tình trạng |
|---|---|---|
| WikiCFP | Rộng nhưng **thiên về khoa học máy tính/kỹ thuật**; do cộng đồng đăng, chất lượng không thẩm định; không thấy điều khoản dùng lại | ✅ Trang công khai có; ❓ điều khoản chưa đọc. **Không khuyến nghị sao chép**; chỉ liên kết |
| Website hội thảo của chính Trường (khdn.hce.edu.vn, API mục hội thảo) | Chính thống nhưng chỉ có 6 mục, **đều của 2024** (ICECH 2024, SR-ICYREB 2024…) ⇒ đã cũ | ✅ |
| Thông báo hội thảo của Đại học Huế, các trường thành viên và các hội nghề nghiệp (ví dụ Hội Khoa học Kinh tế Việt Nam) | Chính thống cho hội thảo trong nước | ❓ Chưa khảo sát từng nguồn |
| Nhà xuất bản/hiệp hội (Springer, Elsevier, IEEE, AIB, EMAC…) | Trang CFP chính thức của từng hội thảo, kèm chỉ mục kỷ yếu | ❓ |
| OpenAlex / Crossref / Scopus | Cho biết **kỷ yếu đã được chỉ mục chưa** (kiểm tra uy tín), nhưng không có lịch hội thảo sắp diễn ra | 📄 |

**Khuyến nghị hội thảo:** quản lý như danh mục **do người phụ trách của Phòng KHCN & HTQT nhập có kiểm duyệt** (biểu mẫu có sẵn các trường: tên, ngày, nơi, hạn nộp, chủ đề, **liên kết CFP gốc**, nhà xuất bản kỷ yếu, trạng thái chỉ mục Scopus/WoS, người nhập, ngày kiểm tra), cộng với việc nạp thông báo từ website Trường/ĐH Huế. Hội thảo hết hạn tự ẩn. Không dùng danh sách hội thảo tự động từ trang cộng đồng.

## 4. QUỸ TÀI TRỢ

| Nguồn | Cơ quan | Nội dung | Cách lấy | Tình trạng |
|---|---|---|---|---|
| **Quỹ Phát triển KH&CN Quốc gia (NAFOSTED)** | Bộ KH&CN | Thông báo kế hoạch tài trợ 2026 (nghiên cứu cơ bản: hạn nhận hồ sơ 13/8/2026, kết quả dự kiến trước 15/10/2026; nhiệm vụ giải pháp phát triển xã hội…), mức trần, điều kiện, biểu mẫu; nộp qua hệ thống STM (stm.mst.gov.vn) | Trang WordPress công khai, mục "Thông báo" (nafosted.gov.vn) | 📄 Qua kết quả tìm kiếm (nội dung đọc được); ❓ chưa viết bộ nạp. Dạng bài đăng ⇒ cần tách hạn/mức tiền bằng quy tắc hoặc nhập tay |
| **Quỹ Đổi mới sáng tạo Vingroup (VinIF)** | Tổ chức tài trợ tư nhân (phi lợi nhuận) | Chương trình 2026: nhận hồ sơ 01–15/5/2026, kinh phí tối thiểu 2 tỷ đồng, biểu mẫu | vinif.org | 📄 Trang chương trình có "cập nhật 10/04/2026". Lưu ý đây là quỹ doanh nghiệp, không phải nhà nước |
| **EU Funding & Tenders Portal** (Horizon Europe, Erasmus+…) | Ủy ban châu Âu | Toàn bộ lời kêu gọi/chủ đề, hạn, ngân sách, trạng thái | API công khai (Search API) | ✅ **Đã tích hợp** (`npm run sync:eu`, xem HUONG-DAN-BUILD 1.7). Lưu ý: phải lọc thêm theo hạn nộp vì ~55% bản ghi "Open" đã hết hạn; phân trang mặc định không ổn định |
| **Đề tài cấp Bộ GD&ĐT, cấp ĐH Huế, cấp cơ sở** | Bộ GD&ĐT, Ban KH, CN & QHQT ĐH Huế, Phòng KHCN & HTQT Trường | Thông báo đăng ký đề tài hằng năm | Trang thông báo của Ban KHCN&QHQT (ĐH Huế) và khdn.hce.edu.vn | ❓ Chưa khảo sát trang thông báo; đây là **nguồn quan trọng nhất cho giảng viên của Trường** |
| Quỹ Đổi mới công nghệ quốc gia (NATIF), DAAD, Fulbright, Erasmus+ Việt Nam, JSPS… | Các cơ quan tương ứng | | | ❓ Chưa kiểm tra tình trạng hiện tại; cần xác minh trước khi đưa vào |

**Khuyến nghị quỹ:** (1) bộ nạp **EU Funding & Tenders** (đã xác nhận truy cập); (2) **danh mục có kiểm duyệt do Phòng KHCN & HTQT nhập** cho NAFOSTED, Bộ, ĐH Huế, cấp cơ sở, VinIF: mỗi bản ghi có liên kết thông báo gốc + hạn; (3) bổ sung bộ đọc trang "Thông báo" của NAFOSTED sau khi có quyết định về mức độ tự động hoá.

## 5. Mô hình dữ liệu đề xuất (chung cho 3 loại)
`provider` (nguồn) · `source_url` (liên kết gốc) · `source_id` · `retrieved_at` · `verified_by` · `valid_until` (hạn/hiệu lực) · `license` · trường nội dung riêng của từng loại.
- Tạp chí: ISSN/eISSN (khoá gộp), tên, nhà xuất bản, quốc gia, các cờ chỉ mục (`vn_2244_2026`, `hdgsnn_2025_kinhte`, `scopus`, `wos`, `doaj`), SJR (năm, quartile, hạng mục).
- Hội thảo: tên, ngày, nơi, hạn nộp, chủ đề, kỷ yếu/chỉ mục, liên kết CFP.
- Quỹ: tên, cơ quan, lĩnh vực, hạn nộp, mức tài trợ, điều kiện, liên kết.

## 6. Lộ trình đề xuất (theo giá trị / mức rủi ro)
1. **Khung dữ liệu + giao diện nguồn/ngày/hạn** và **bộ nhập có kiểm duyệt** (CSV + biểu mẫu quản trị). Dùng cho hội thảo, quỹ trong nước. *(Làm ngay; không phụ thuộc bên ngoài.)*
2. **Quỹ quốc tế:** bộ nạp EU Funding & Tenders.
3. **Tạp chí lõi:** nhập danh mục QĐ 2244 + HĐGSNN Kinh tế từ PDF gốc (một lần/năm) + SJR CSV (một lần/năm) + cờ DOAJ (CC0).
4. **Làm giàu bằng OpenAlex** khi Trường có khoá API.
5. Khảo sát tiếp: trang thông báo của Ban KH, CN & QHQT ĐH Huế (đề tài các cấp) và NAFOSTED để quyết định mức tự động hoá.

## 7. Điều tôi chưa xác minh / rủi ro
- Điều khoản dùng lại của Scopus source list, WoS MJL, WikiCFP; điều khoản chi tiết của SJR (mới đọc dòng "phi thương mại + trích dẫn", chưa đọc Legal Notice).
- Danh mục HĐGSNN 2025: chưa tải được nên chưa biết PDF có chữ trích xuất được hay là ảnh quét (nếu ảnh quét cần OCR và kiểm tra tay).
- Số lượng 341 tạp chí của QĐ 2244 lấy từ bên thứ ba; số liệu gốc phải đối chiếu.
- Mọi hạn nộp/mức kinh phí ở mục 4 lấy từ kết quả tìm kiếm/trang công bố vào ngày 21/10/2026 và có thể đã thay đổi.
- Một số nguồn (Facebook, trang tổng hợp) xuất hiện trong kết quả tìm kiếm nhưng **không** được coi là nguồn chính thống.
