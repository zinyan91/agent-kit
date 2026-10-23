---
trigger: always_on
description: Quy tắc chữ trên giao diện web/app — không tooltip, chú thích, subtitle thừa.
---

# Giao diện

- **Không tự ý thêm chữ phụ lên giao diện**: tooltip, dòng giải thích dưới tiêu đề, subtitle, placeholder dài, badge "mới", chú thích "Bằng chữ: …", ngày lập, câu hướng dẫn. Chỉ thêm khi người dùng yêu cầu hoặc quy định pháp quy bắt buộc.
- Nhãn phải tự đủ nghĩa. Cần tooltip mới hiểu được → sửa nhãn, đừng thêm tooltip.
- Mỗi chữ trên màn hình làm đúng một việc. Nút ghi đúng việc nó làm ("Lưu thay đổi", không "Xác nhận"), và giữ cùng tên suốt luồng.
- Đơn giản, thực dụng; không màu mè, không hiệu ứng trang trí không phục vụ thao tác.
- **Trạng thái rỗng không được trùng hình với trạng thái lỗi.** Lỗi phải hiện nguyên thông điệp của server; nuốt lỗi thành "chưa có dữ liệu" làm chẩn đoán sai.
- Dựng, sửa hay review giao diện: theo skill `design-taste-frontend`. Màn hình nghiệp vụ (dashboard, bảng, form, cài đặt) đi theo `references/app-screens.md` của nó, không theo quy trình trang marketing. Luật repo và luật ở đây thắng khi mâu thuẫn: quy ước KPI riêng của repo giữ nguyên, không thêm chuyển động trang trí để đủ chỉ tiêu của skill.
- Ảnh chụp và tệp do script của skill đó sinh ra là đồ tạm: chạy `draw.mjs --out .tmp/taste-skill`, `inspect.mjs --out .tmp/taste-skill/inspect`, và `lint.mjs --app` cho màn hình nghiệp vụ (lint chỉ tự nhận chế độ app từ `.taste-skill/`); lỡ tạo `.taste-skill/` ở gốc repo thì xoá trước khi báo xong.
