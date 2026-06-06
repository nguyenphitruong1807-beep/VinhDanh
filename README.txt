UNITE POSTER GENERATOR V4 - ĐÃ GẮN SUPABASE
===========================================

TÍNH NĂNG CHÍNH
- Leader mở tool là tự thử load template active từ Supabase.
- Admin đăng nhập bằng Supabase Auth.
- Admin upload background / foreground / font riêng.
- Admin kéo thả text, chỉnh font, size, màu đơn / gradient, vị trí, snap giữa.
- Admin lưu template lên Supabase dạng draft hoặc active.
- Export poster PNG.
- Không cần server riêng. Chạy tốt trên Netlify / GitHub Pages.

FILE QUAN TRỌNG
- index.html
- css/styles.css
- js/app.js
- js/supabase-config.js
- js/supabase-templates.js
- assets/unite-bg-clean.png
- assets/unite-foreground.png
- templates/best-seller.json

CÁCH CHẠY NHANH
1) Giải nén thư mục.
2) Khuyến nghị đưa cả thư mục lên Netlify để chạy ổn định.
3) Nếu chỉ test nhanh, có thể mở index.html trực tiếp.

SUPABASE ĐÃ GẮN SẴN
- URL project đã điền sẵn trong js/supabase-config.js
- Publishable key đã điền sẵn trong js/supabase-config.js
- Bucket dùng: poster-assets

LƯU Ý QUAN TRỌNG
- Publishable key dùng được ở frontend.
- Không đưa service_role key vào code web.
- Tài khoản admin phải được tạo trong Authentication và có role=admin trong bảng profiles.

LUỒNG SỬ DỤNG
LEADER:
- Mở tool
- Upload ảnh nhân sự
- Nhập tên / team / giải / tháng
- Căn ảnh và tải poster PNG

ADMIN:
- Mở tab Admin template
- Đăng nhập admin
- Upload nền / foreground / font
- Chỉnh text, vị trí, gradient, person slot
- Lưu Draft hoặc Active lên Supabase
- Leader ngoài link sẽ load template active mới nhất

GỢI Ý HOST FREE
- Netlify: dễ nhất
- GitHub Pages: phù hợp nếu muốn quản lý version bằng Git
