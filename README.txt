UNITE POSTER STUDIO PRO V6 - MODERN MINIMAL UI
==============================================

BẢN NÂNG CẤP TỪ MOBILE V5
- Giữ nguyên toàn bộ logic tạo poster, Supabase, upload template, export PNG.
- Thiết kế lại giao diện theo hướng app hiện đại: tối giản, ít rối, rõ từng bước.
- Tối ưu iPhone/mobile: preview poster nằm phía trên, các nút Xuất PNG / Chia sẻ nằm dock cố định dưới màn hình.
- Chia chức năng thành từng thẻ gọn: Ảnh nhân sự, Kích thước & vị trí, Màu ảnh, Nội dung chữ, Template cloud.
- Admin vẫn có đầy đủ chức năng nhưng được gom vào các mục thu gọn.
- Kéo avatar trực tiếp bằng 1 ngón, chụm 2 ngón để zoom, chỉnh nhiệt màu/tint/làm nét nhẹ.
- Xóa nền AI mượt cho điện thoại, có fallback nếu CDN/model lỗi.

FILE QUAN TRỌNG
- index.html
- css/styles.css
- js/app.js
- js/supabase-config.js
- js/supabase-templates.js
- assets/unite-bg-clean.png
- assets/unite-foreground.png
- templates/best-seller.json
- 01_schema.sql

CÁCH DÙNG
1) Giải nén thư mục.
2) Đẩy toàn bộ thư mục lên GitHub/Netlify như bản cũ.
3) Mở index.html hoặc link deploy.
4) Leader dùng tab Tạo poster.
5) Admin dùng tab Admin để chỉnh/lưu template cloud.

LƯU Ý IPHONE
- Nút Chia sẻ sẽ dùng Web Share API nếu trình duyệt hỗ trợ.
- Nếu iPhone không hiện lưu trực tiếp vào Album, dùng Xuất PNG để mở ảnh rồi nhấn giữ và chọn Lưu vào Ảnh.

SUPABASE
- Vẫn dùng URL, publishable key và bucket poster-assets trong js/supabase-config.js.
- Không đưa service_role key vào frontend.


NÂNG CẤP V6.1
- Thay logo header bằng logo Unite Group theo mẫu cung cấp.
- Thêm tiến trình xóa nền trực quan: thanh tiến trình, % hoàn thành, từng bước xử lý.
- Hiển thị rõ chế độ AI và fallback để người dùng trên điện thoại dễ theo dõi.
