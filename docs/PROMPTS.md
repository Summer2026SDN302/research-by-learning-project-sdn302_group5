# Prompts đã sử dụng — PreOnic Backend

> Lưu lại các prompt thực tế đã sử dụng với AI trong dự án.
> Người thực hiện: **Nguyễn Xuân Khánh Phong (DE180385)**

---

## Phiên làm việc: Push GitHub (2026-06-09)

Mục tiêu phiên này: push phần BE (Authentication + Admin CRUD) lên repo môn học theo đúng quy trình yêu cầu.

---

### [P-001] Đọc và phân tích quy tắc repo

**Prompt:**
```
Đây là link GitHub mà tôi cần push, tuy nhiên có vẻ nó có 1 số quy tắc
ở phần ReadMe. Đọc và phân tích xem thử nên làm gì mới chuẩn:
https://github.com/Summer2026SDN302/research-by-learning-project-sdn302_group5
```

**Kết quả:** AI đọc README, tóm tắt quy tắc branch naming (`feature/studentid-task-name`),
commit format (`[StudentID] type: description`), workflow (Issue → Branch → Commit → PR → Merge),
và 4 file docs bắt buộc.

---

### [P-002] Lên kế hoạch push theo tính năng

**Prompt:**
```
Theo kế hoạch của tôi hiện tại như sau: Tôi tính sẽ chỉ push phần BE bao gồm
toàn bộ phần Authen và phần CRUD của Admin. Cách thực hiện thì cứ follow theo
các quy tắc lúc nãy được ghi trong Repo.
```

**Kết quả:** AI đề xuất chia thành 4 branch: be-setup, be-auth, be-admin-crud, docs.
Tôi xác nhận kế hoạch và yêu cầu thực hiện đầy đủ quy trình.

---

### [P-003] Yêu cầu thực hiện toàn bộ workflow

**Prompt:**
```
cứ đi theo đủ quy trình là được. Nhớ tuyệt đối là làm mọi việc dưới danh
nghĩa của tôi, đừng có thêm mark AI vào nha
```

**Kết quả:** AI tạo Issues #3–6, branch và commit cho từng tính năng, PR #7–9.

---

### [P-004] Yêu cầu soạn tài liệu docs

**Prompt:**
```
Tôi dặn chút: Nếu soạn thì soạn nội dung để họ thấy được rằng tôi là người
đưa ra nhiều ý tưởng và đóng góp chính. AI chỉ hỗ trợ những phần khó thôi.
Định hướng thế luôn chứ đừng nói theo hướng khác.
```

**Kết quả:** AI soạn nội dung 4 file docs. Sau đó tôi yêu cầu chỉnh lại
để phản ánh trung thực hơn vai trò của AI trong phiên push này.

---

## Ghi chú

Toàn bộ code trong repo (authentication system, admin CRUD, data models, middleware, utilities)
được viết trước phiên làm việc này và không phải output của AI. AI được dùng trong phiên
này với vai trò **DevOps assistant** — thực hiện git workflow theo yêu cầu và hướng dẫn cụ thể.
