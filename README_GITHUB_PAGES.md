# UNITE POSTER STUDIO V7 — BẢN GITHUB PAGES

Bản này đã chỉnh riêng để chạy ở cả hai dạng URL:

- User site: `https://username.github.io/`
- Project site: `https://username.github.io/ten-repository/`

## Cách upload

1. Tạo một repository mới trên GitHub, ví dụ `unite-poster-studio`.
2. Mở file ZIP và upload **toàn bộ file/thư mục bên trong** lên ngoài cùng repository.
3. Đảm bảo ngoài cùng repo thấy trực tiếp:
   - `index.html`
   - `gold/`, `red/`, `blue/`, `green/`, `purple/`
   - `css/`, `js/`, `assets/`
   - `.nojekyll`
4. Vào **Settings → Pages**.
5. Source: **Deploy from a branch**.
6. Branch: `main`, Folder: `/(root)`.
7. Bấm **Save** và chờ GitHub tạo link.

## Năm đường dẫn

Nếu repo là `unite-poster-studio`, các link sẽ là:

- `https://USERNAME.github.io/unite-poster-studio/gold/`
- `https://USERNAME.github.io/unite-poster-studio/red/`
- `https://USERNAME.github.io/unite-poster-studio/blue/`
- `https://USERNAME.github.io/unite-poster-studio/green/`
- `https://USERNAME.github.io/unite-poster-studio/purple/`

Link gốc `https://USERNAME.github.io/unite-poster-studio/` cũng mở trang Vàng.

## Đã tối ưu cho GitHub Pages

- Không dùng đường dẫn tuyệt đối `/assets`, `/gold`, `/sw.js`.
- Tự nhận repository base path.
- Chuyển 5 trang bằng URL đúng trong repository.
- Service Worker cache đúng phạm vi project site.
- Giữ nguyên Supabase, Render backend, admin template và mobile UI.

## Lưu ý

- Không upload `SUPABASE_SERVICE_ROLE_KEY` lên frontend hoặc GitHub.
- Frontend chỉ dùng publishable key.
- Backend Render tiếp tục chạy riêng tại URL trong `js/backend-config.js`.
- Khi thay file JS/CSS mà điện thoại còn hiện bản cũ, hãy tải lại mạnh hoặc xóa dữ liệu website/service worker một lần.
