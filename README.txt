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


NÂNG CẤP V6.1.3
- Ẩn khung PERSON SLOT ở chế độ Leader để giao diện preview sạch hơn.
- Thêm nút bật/tắt khung chỉnh ngay tại phần preview.
- Mặc định chỉ hiện khung vàng avatar khi chỉnh, admin vẫn giữ đầy đủ guide để canh template.


NÂNG CẤP V6.1.4
- Chuyển Cloud / Chia sẻ / Xuất PNG thành cụm nút nhỏ gọn ngay trên khung preview poster.
- Ẩn tab Tạo poster / Admin trên mobile, thay bằng nút chuyển chế độ nhỏ gọn.
- Có thể chạm nút Admin nhỏ hoặc double tap logo Unite để mở/tắt chế độ Admin.
- Ẩn dòng hướng dẫn dài cạnh preview để giao diện thoáng hơn.


NÂNG CẤP V6.1.5
- Thu gọn thêm cụm nút trên preview cho mobile.
- Rút gọn text thành Preview / Ad / Khung / Share / PNG / ☁ On khi ở điện thoại.
- Giảm chiều cao và padding của toàn bộ action bar để ít chiếm chỗ hơn.
- Với màn hình rất hẹp, cụm nút chuyển sang dạng hàng ngang siêu gọn, có thể vuốt ngang nếu cần.


NÂNG CẤP V6.1.6
- Bỏ nút Admin khỏi cụm nút trên preview để không bị vướng vùng poster/người.
- Gộp chuyển mode Admin/Poster vào logo Unite: nhấn logo để đổi chế độ.
- Khi vào Admin, người dùng đăng nhập Supabase trong tab Admin như cũ.
- Giữ cụm nút còn lại gọn: Khung / Cloud / Share / PNG.


NÂNG CẤP V6.1.7
- Khi đang ở chế độ Admin, nút Chia sẻ đổi thành Lưu nháp và nút Xuất PNG đổi thành Lưu Active.
- Khi ở chế độ Poster/Leader, hai nút này trở về đúng chức năng Chia sẻ và Xuất PNG.
- Nhấn logo Unite để chuyển qua lại Poster/Admin như bản trước.
- Lưu Active sẽ lưu chỉnh sửa khung, chữ, person slot, layer và template lên Supabase để leader dùng chung.
