---
trigger: always_on
description: Quy tắc chữ trên giao diện web/app — không tooltip, chú thích, subtitle thừa.
---

# Giao diện

- **Không tự ý thêm chữ phụ lên giao diện**: tooltip, dòng giải thích dưới tiêu đề, subtitle, placeholder dài, badge "mới", chú thích "Bằng chữ: …", ngày lập, câu hướng dẫn. Chỉ thêm khi người dùng yêu cầu hoặc quy định pháp quy bắt buộc.
- Nhãn phải tự đủ nghĩa. Cần tooltip mới hiểu được → sửa nhãn, đừng thêm tooltip.
- Mỗi chữ trên màn hình làm đúng một việc. Nút ghi đúng việc nó làm ("Lưu thay đổi", không "Xác nhận"), và giữ cùng tên suốt luồng.
- **Trạng thái rỗng không được trùng hình với trạng thái lỗi.** Lỗi phải hiện nguyên thông điệp của server; nuốt lỗi thành "chưa có dữ liệu" làm chẩn đoán sai.
- Dựng, sửa hay review giao diện: theo skill `ui-design`. Luật repo (phong cách, quy ước KPI, bảng màu thương hiệu) thắng skill khi mâu thuẫn.
- Script của `ui-design` ghi vào `.tmp/ui-design/`; xoá khi xong. Repo cố ý giữ một mẫu mà script cấm thì chạy với `--allow <id>` và nói lý do.
