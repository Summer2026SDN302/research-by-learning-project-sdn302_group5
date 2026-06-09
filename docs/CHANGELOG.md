# Changelog — PreOnic Backend

Tất cả thay đổi đáng chú ý của dự án được ghi lại ở đây.
Format theo [Keep a Changelog](https://keepachangelog.com/vi/1.0.0/).

---

## [1.1.0] — 2026-06-09

### Added
- Admin CRUD endpoints: quản lý user, xem danh sách hợp đồng, theo dõi dispute
- Admin dashboard API: tổng hợp thống kê hệ thống (users, contracts, revenue) từ nhiều collection song song
- Phân quyền admin: middleware kiểm tra role trước khi vào các route admin
- Query song song bằng `Promise.all` cho dashboard — tối ưu response time

### Changed
- Chuẩn hóa response format toàn bộ admin endpoints theo `successResponse` / `paginatedResponse` utility

---

## [1.0.0] — 2026-05-20

### Added
- Khởi tạo dự án backend với Node.js + TypeScript + Express + MongoDB
- Cấu hình TypeScript strict mode, path alias, nodemon cho development
- Kết nối MongoDB qua Mongoose với retry logic
- Authentication System:
  - Đăng ký tài khoản (farmer / enterprise) với validation đầy đủ
  - Đăng nhập email/password với bcrypt
  - Google OAuth: farmer tự động login, enterprise yêu cầu verify email lần đầu
  - JWT Access Token (15 phút) + Refresh Token (30 ngày) trong httpOnly cookie
  - Rotate refresh token mỗi lần dùng
  - Logout với blacklist token
  - Verify email qua link (enterprise)
  - Quên mật khẩu / đặt lại mật khẩu
- User model với pre-save hook tự động hash password
- Auth middleware kiểm tra JWT và trạng thái tài khoản mỗi request
- Rate limiting cho các endpoint nhạy cảm (login, register)
- Error handling middleware tập trung với `AppError` class
- Logger utility (pino) cho production
- Response utility chuẩn hóa format API toàn hệ thống
- JWT utility tách biệt (sign, verify access/refresh token)

### Security
- httpOnly + sameSite cookie cho refresh token (chống XSS, CSRF)
- Helmet middleware cho HTTP security headers
- Rate limit trên auth routes
- Password không bao giờ trả về trong response
