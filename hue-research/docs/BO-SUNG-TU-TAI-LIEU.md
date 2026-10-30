# Bổ sung từ hai tài liệu của hệ thống

Nguồn: `Giới thiệu hệ thống.pdf` (20 trang, tài liệu đi kèm buổi ra mắt 13/10/2026) và `Hướng dẫn sử dụng hệ thống.pdf` (57 slide ảnh). Tài liệu thứ hai chỉ đọc được qua hình, chủ yếu lặp lại tài liệu thứ nhất và cho thấy giao diện từng công cụ. Tôi chưa xem hết từng slide; nội dung dưới đây lấy từ văn bản tài liệu thứ nhất và các slide đã mở (bối cảnh, bản đồ hệ thống, trang từng công cụ đầu, giá trị người dùng, an toàn dữ liệu, trang cảm ơn).

## 1. Kiến trúc ghi nhận được
- Mỗi công cụ là ứng dụng nhúng tại `/embed/<tên>` (expertfinder, paperfinder, bibliomap, surveylab, quantis…), mở trong khung của cổng chính.
- An toàn 5 lớp: tài khoản & phân quyền (Microsoft 365), nhật ký hoạt động, cấu hình mô hình AI (**mô hình chạy trên máy chủ nội bộ của Trường**), nguyên tắc dùng AI (3 mức), kiểm soát nội dung. Máy chủ đặt tại Trường; một trung tâm công nghệ thông tin phụ trách vận hành.
- Bốn nhóm người dùng: lãnh đạo/quản lý khoa học; nhà khoa học & nhóm nghiên cứu; giảng viên hướng dẫn; sinh viên/học viên/NCS.
- Có khoá đào tạo 8 buổi × 180 phút, thực hành trên chính 12 công cụ.

## 2. Chức năng chi tiết từng công cụ và hiện trạng bản HCE

| Công cụ | Chức năng sâu theo tài liệu | Bản HCE hiện có |
|---|---|---|
| Tìm chuyên gia | Thẻ/bảng so sánh; lọc học vị, chức danh, đơn vị; trợ lý AI trả về chuyên gia kèm số công trình; email chỉ hiện khi đăng nhập | **Dữ liệu thật** 236 nhà khoa học của Trường (CSDL KH Đại học Huế); tìm không dấu, lọc học vị, liên kết bản ghi gốc. Chưa có chế độ bảng, số công trình từng người |
| Tra cứu bài báo | Lọc tiêu đề/tác giả/năm, sắp xếp; hộp chi tiết; hỏi AI trên từng bài (đọc nội dung); tìm không phân biệt dấu | **Dữ liệu thật** ~2.300 bài báo của Trường; tìm không dấu, lọc năm/danh mục (SCOPUS, SCIE, ESCI, HĐCDGS…), sắp xếp, liên kết bản ghi gốc. Chưa có hỏi AI theo từng bài |
| Trắc lượng thư mục | Nhập RIS/CSV (Scopus, WoS); bản đồ từ khoá kiểu VOSviewer, cụm, màu theo năm; xu hướng; 5 loại bản đồ; AI giải thích | Chưa làm (trang "sắp có") |
| Thiết kế khảo sát | 6 loại câu hỏi; xem trước; AI dựng/chỉnh bảng hỏi; link chia sẻ và thu phản hồi; biểu đồ; Cronbach alpha, tương quan biến–tổng; xuất CSV | Soạn 3 loại câu, xuất khung CSV, **tính Cronbach alpha, tương quan biến–tổng, alpha nếu loại câu** (đã kiểm tra bằng ví dụ tính tay). Chưa có chia sẻ, thu phản hồi, AI dựng |
| Phân tích định lượng | 12 bộ dữ liệu mẫu; thống kê mô tả; tương quan, kiểm định (t, ANOVA, Mann-Whitney…), hồi quy, phân tích nhân tố, SEM; AI giải thích; dịch vụ Python phía sau | Chưa làm |
| Phân tích định tính | Cây mã, thư mục nguồn, AI mã hoá theo chủ đề, truy vấn trích dẫn, ma trận, đám mây từ | Chưa làm |
| Viết nghiên cứu | 35 công cụ AI, 41 mẫu bài (IMRaD), trích dẫn APA/IEEE, xuất Word/PDF/BibTeX; không bịa tài liệu | Chưa làm |
| Phản biện bài báo | 3 bước tải lên → cấu hình → kết quả; gửi email khi xong; nhận xét đánh dấu trên PDF | Chưa làm |
| Kiểm tra đạo văn | Dán văn bản/tệp; báo cáo mục tương đồng, nguồn nội bộ và Internet; hỏi tiếp cách giảm | Chưa làm |
| Hội thảo – tạp chí | ~32 nghìn tạp chí (quartile, nhà xuất bản, quốc gia, ISSN); tab hội thảo + hạn nộp; AI đọc website tạp chí; gợi ý tạp chí từ bản thảo PDF/Word | Tra cứu mẫu. Chưa có gợi ý từ bản thảo |
| Tra cứu quỹ | ~2,4 nghìn cơ hội (NAFOSTED, NATIF, VinIF, quốc tế); lọc cơ quan/lĩnh vực/hạn; hỏi AI từng chương trình | Tra cứu mẫu |
| Quy trình, biểu mẫu | 96 tệp theo 11 phụ lục; Word/Excel có AI điền biểu mẫu tự động (đánh dấu mục do AI điền) | **Dữ liệu thật** 65 biểu mẫu/văn bản của Trường và ĐH Huế (khdn.hce.edu.vn), nhóm theo loại nhiệm vụ, lọc theo loại tệp, liên kết mở/tải. Chưa có AI điền; chưa có "quy trình" từng bước |
| Trợ lý Central, Dự án | Hiểu hồ sơ cá nhân; dự án nhận PDF/Word/Excel/ảnh; 6 giai đoạn có trạng thái, kế hoạch, công cụ gợi ý; thành viên được chia sẻ chỉ xem | Trợ lý dùng hồ sơ; dự án 6 giai đoạn đồng bộ theo tài khoản. Chưa có tệp đính kèm, chưa chia sẻ thành viên |

Quy tắc xuyên suốt: khung 3 mức dùng AI, không bịa trích dẫn, khai báo công cụ AI, kết quả AI chỉ là gợi ý. Đã đưa vào trang "Dùng AI có trách nhiệm" kèm công cụ soạn lời khai báo.

## 3. Khác biệt có chủ ý của bản HCE
- Đăng nhập bằng email (liên kết một lần), GitHub, ORCID, thay cho tài khoản Microsoft 365 của hệ thống gốc. Có tuỳ chọn giới hạn tên miền email và danh sách quản trị.
- Mô hình AI: gọi API Claude khi có khoá. Nếu Trường muốn chạy mô hình nội bộ như hệ thống gốc, thay phần gọi trong `hce-research/app/api/chat/route.ts` bằng máy chủ mô hình nội bộ.
- Dữ liệu mẫu thay cho dữ liệu của Trường (cần Phòng KH&CN cung cấp).

## 4. Việc nên làm tiếp (theo giá trị / độ khó)
1. Bộ lọc, sắp xếp, hộp chi tiết cho chuyên gia, bài báo, quỹ, tạp chí (dễ, giá trị cao).
2. Nhập dữ liệu thật vào CSDL (thay `lib/data.ts`) và API tìm kiếm có phân trang.
3. Khảo sát: chia sẻ bằng link và thu phản hồi (cần bảng phản hồi trong CSDL và trang điền công khai).
4. Hỏi AI theo từng bài báo/tạp chí (cần lưu văn bản bài).
5. Quy trình–biểu mẫu: tải tệp thật, AI điền Word/Excel.
6. Công cụ nặng: định lượng (dịch vụ Python), định tính, trắc lượng thư mục, đạo văn, phản biện.
