# Unite Poster Studio Pro V7

Bản nâng cấp từ V6.1.7, tập trung vào tốc độ, thao tác trực tiếp và 5 link poster riêng.

## 5 link cố định

Sau khi deploy lên Netlify:

- `/gold/` — Trang Vàng
- `/red/` — Trang Đỏ
- `/blue/` — Trang Xanh
- `/green/` — Trang Lục
- `/purple/` — Trang Tím

Mỗi link dùng một template Supabase riêng:

- `unite-gold`
- `unite-red`
- `unite-blue`
- `unite-green`
- `unite-purple`

Admin có thể chọn từng trang, upload nền và bấm **Lưu Active**. Ngoài ra có khu vực **Lưu nhiều nền** để chọn 1–5 ảnh rồi cập nhật cùng lúc.

## Nâng cấp chính

- Hiện nền local ngay trước, sau đó mới đồng bộ cloud để preview mở nhanh hơn.
- Cache ảnh nền/foreground bằng Cache Storage + Service Worker.
- Background upload được tự resize đúng kích thước poster và chuyển WebP.
- Cache-Control dài hạn cho file có URL UUID.
- AI tách nền ưu tiên backend Render và gọi `auto-fit-person` trong một lần.
- Backend tự khởi động từ lúc mở trang; nếu backend lỗi sẽ tự fallback sang AI trình duyệt.
- Chạm trực tiếp chữ trên poster để sửa.
- Admin kéo chữ; chạm nhẹ sẽ mở ô sửa trực tiếp.
- Mobile có dock nhanh: Ảnh / Tách nền / Sửa chữ / Tự căn.
- Mỗi trang lưu draft chữ riêng trên thiết bị.
- Hỗ trợ phủ màu dự phòng cho 5 trang khi chưa upload nền riêng.

## Deploy frontend

1. Giải nén thư mục.
2. Upload toàn bộ nội dung lên GitHub hoặc kéo thả lên Netlify.
3. Netlify sẽ đọc `_redirects` và `netlify.toml`.
4. Link gốc tự chuyển sang `/gold/`.

## Cập nhật 5 nền

1. Nhấn logo Unite để mở Admin.
2. Đăng nhập Supabase Admin.
3. Mở **Quản lý 5 trang màu**.
4. Chọn ảnh ở từng ô Vàng / Đỏ / Xanh / Lục / Tím.
5. Bấm **Lưu các nền đã chọn thành Active**.

Hoặc chọn một trang ở đầu màn hình, upload background rồi bấm **Lưu Active**.

## Chạm chữ để sửa

- Leader: chạm tên giải, tháng, tên nhân sự, team hoặc dòng phụ.
- Admin: chạm nhẹ để sửa; kéo để đổi vị trí.
- Nút `A− / A+` thay nhanh kích thước chữ ngay trên preview.

## Backend

Mặc định frontend gọi:

```text
https://unite-poster-backend.onrender.com
```

Có thể đổi trong:

```text
js/backend-config.js
```

Nên deploy gói `unite_poster_backend_v2_optimized.zip` trước để có endpoint `/api/warmup` và trả ảnh base64 nhanh hơn.
