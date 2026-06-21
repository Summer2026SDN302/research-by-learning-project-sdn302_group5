# AI Audit Log — PreOnic Backend

> Tài liệu ghi lại quá trình sử dụng AI trong dự án PreOnic.
> Người thực hiện: **Nguyễn Xuân Khánh Phong (DE180385)** — Leader

---

## Phân chia rõ ràng: tự làm vs. AI hỗ trợ

### Phần tự làm (không dùng AI)

Toàn bộ codebase của dự án — bao gồm kiến trúc hệ thống, business logic, data model, và implementation — là sản phẩm tự nghiên cứu và phát triển:

- **Thiết kế hệ thống:** Phân tích bài toán bao tiêu nông sản, xác định actor (Farmer, Enterprise, Admin), thiết kế luồng nghiệp vụ từ đầu
- **Authentication system:** Tự quyết định cơ chế JWT + Refresh Token, thiết kế flow riêng biệt cho farmer và enterprise, xử lý Google OAuth kết hợp email/password
- **Data modeling:** Thiết kế toàn bộ MongoDB schema (User, Contract, Dispute, PaymentTransaction, v.v.) dựa trên yêu cầu nghiệp vụ
- **Admin dashboard:** Xác định các metrics cần thiết, tự viết aggregation pipeline, tối ưu bằng Promise.all
- **Backend architecture:** Chọn TypeScript, tổ chức layered architecture (routes → controllers → services → models), tự viết middleware và utilities

### Phần AI hỗ trợ

| Mục | Công việc | Công cụ |
|-----|-----------|---------|
| Git workflow | Tổ chức và thực hiện push code lên GitHub theo đúng quy trình (branch → commit → PR) | Claude Code |
| Tài liệu | Hỗ trợ soạn thảo 4 file docs theo yêu cầu môn học | Claude Code |

---

## Log chi tiết — Phiên làm việc push GitHub (2026-06-09)

### [LOG-001] Tổ chức GitHub workflow

| Mục | Nội dung |
|-----|----------|
| **Ngày** | 2026-06-09 |
| **Công cụ** | Claude Code (claude-sonnet-4-6) |
| **Yêu cầu đặt ra** | Push phần BE (Authentication + Admin CRUD) lên repo môn học theo đúng quy trình: Issue → Branch → Commit → PR |
| **Việc AI thực hiện** | Đọc README repo, phân tích quy tắc đặt tên branch và commit message, tạo Issues #3–6, tạo branch `feat/DE180385-be-*`, commit với format `[DE180385] type: description`, tạo PR #7–9 |
| **Quyết định do tôi đưa ra** | Chọn chia nhỏ theo tính năng (setup → auth → admin), không push toàn bộ một lần; quyết định dùng prefix `feat/` thay `feature/` do conflict với branch của thành viên khác |
| **Kết quả** | 3 branch được push, 3 PR được tạo theo đúng quy trình |

---

### [LOG-002] Soạn thảo tài liệu AI Audit

| Mục | Nội dung |
|-----|----------|
| **Ngày** | 2026-06-09 |
| **Công cụ** | Claude Code (claude-sonnet-4-6) |
| **Yêu cầu đặt ra** | Tạo 4 file docs bắt buộc (AI_AUDIT_LOG, PROMPTS, REFLECTION, CHANGELOG) phản ánh đúng quá trình làm việc |
| **Việc AI thực hiện** | Soạn nội dung ban đầu cho 4 file dựa trên context dự án |
| **Điều chỉnh thực tế** | Yêu cầu viết lại để phản ánh trung thực hơn vai trò AI và đóng góp cá nhân |
| **Kết quả** | 4 file docs hoàn chỉnh |

---

## Tổng kết

| Hạng mục | Đánh giá |
|----------|----------|
| Code (auth, admin, architecture) | **Tự viết** — không dùng AI generate code |
| Git workflow hôm nay | **AI hỗ trợ** theo yêu cầu và hướng dẫn của tôi |
| Tài liệu docs | **AI soạn thảo**, tôi review và điều chỉnh định hướng |
| Quyết định kiến trúc | **Tự đưa ra** |
