# Reflection — Quá trình phát triển Backend PreOnic

> Nhìn lại quá trình xây dựng phần backend và trải nghiệm làm việc với AI.
> Người viết: **Nguyễn Xuân Khánh Phong (DE180385)** — Leader

---

## 1. Về việc xây dựng codebase

Phần backend PreOnic được xây dựng với stack **Node.js + TypeScript + Express + MongoDB**.
Kiến trúc theo mô hình layered: routes → controllers → services → models.

Quyết định dùng TypeScript từ đầu giúp kiểm soát type tốt hơn khi hệ thống mở rộng,
mặc dù ban đầu tốn thêm thời gian setup.

Authentication là phần phức tạp nhất: cùng một hệ thống nhưng farmer và enterprise
có flow khác nhau (Google OAuth, email verification, JWT refresh token rotation).
Đây là phần tốn nhiều thời gian nhất để thiết kế và debug.

---

## 2. Về việc sử dụng AI trong dự án

Trong dự án này, AI được dùng chủ yếu cho **git workflow** khi nộp bài — tổ chức
branch, viết commit message theo format quy định, tạo Issues và PR trên GitHub.

Lý do dùng AI cho phần này: quy trình git của môn học khá cụ thể (Issue → Branch →
Commit → PR theo format `[StudentID] type: description`), và việc để AI xử lý phần
mechanical này giúp tiết kiệm thời gian để tập trung vào code.

**Điều quan trọng cần phân biệt:** AI thực hiện *workflow*, không phải *code*. Toàn bộ
logic authentication, admin dashboard, data modeling, middleware đều được viết trước
và độc lập với phiên làm việc với AI.

---

## 3. Bài học từ việc dùng AI

**Dùng AI cho đúng việc:**
AI phù hợp với các tác vụ có cấu trúc rõ ràng, lặp đi lặp lại, hoặc cần tra cứu
nhanh (cú pháp, API docs, git commands). Không phù hợp với việc thiết kế nghiệp vụ
vì AI không hiểu context đặc thù của từng bài toán.

**Minh bạch là quan trọng:**
Trong phiên làm việc này, AI lúc đầu soạn docs theo hướng che giấu vai trò thực
của mình. Tôi đã yêu cầu viết lại để phản ánh đúng hơn. Đây là bài học về
việc cần chủ động kiểm soát output của AI thay vì chấp nhận nguyên văn.

**AI không thay thế được tư duy:**
Kiến trúc hệ thống, lựa chọn công nghệ, xử lý edge case — những quyết định này
đòi hỏi hiểu bài toán thực tế, điều mà AI không có.

---

## 4. Tổng kết

| Hạng mục | Nhận xét |
|----------|----------|
| Phần phức tạp nhất | Auth flow với nhiều trường hợp (farmer vs enterprise, Google vs email) |
| Phần AI hỗ trợ nhiều nhất | Git workflow khi nộp bài |
| Điều học được về AI | Cần chủ động định hướng và kiểm tra output, không nên dùng AI mà không hiểu kết quả |
| Điều tự hào nhất | Hệ thống chạy được end-to-end với cả hai loại user |
