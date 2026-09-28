---
trigger: always_on
description: An toàn dữ liệu production, xác nhận deploy, và quy tắc bí mật / biến môi trường.
---

# An toàn dữ liệu & bí mật

## Dữ liệu production
- Trước thay đổi lớn (schema, migration, refactor tầng dữ liệu): tạo nhánh backup (`git branch backup-YYYYMMDD-HHMM`).
- Migration **không phá huỷ**: không xoá bảng/cột/dữ liệu cũ; giữ song song làm bản dự phòng. Cần huỷ thật thì sao lưu (`CREATE TABLE <ten>_backup_YYYYMMDD AS SELECT ...`) và hỏi người dùng trước.
- Đối soát sau migration: đếm bản ghi và so khớp trường, không kết luận bằng mắt.

## Sau khi push
- `npm run build` phải pass **trước** khi push. Git hook toàn cục sẽ chặn nếu không.
- Push thành công ≠ đã deploy: build fail thì Vercel giữ bản cũ trong im lặng. Xác nhận bằng `vercel ls <project>` thấy `● Ready`, hoặc curl endpoint production thấy dấu hiệu của mã mới.
- **Cấm `git push --no-verify`** và mọi cách vượt hook. Hook chặn thì sửa nguyên nhân.

## Bí mật & biến môi trường
- **Không bao giờ** đưa key, token, private key, service account JSON vào mã nguồn, test, hay commit — kể cả repo private.
- **Cấm fallback chuỗi cứng cho bí mật** (`process.env.X ||` rồi một chuỗi hoặc một hằng). Thiếu biến thì **ném lỗi** `Chưa cấu hình biến môi trường X`.
- Thêm biến mới: tên phải trùng ở **ba nơi** — mã, `.env.local`, Vercel. Đặt trên Vercel **trước** khi deploy mã đọc nó. Tên sai nguy hiểm ngang không có biến.
- Server đừng đọc `NEXT_PUBLIC_*` (Next nội tuyến lúc build; biến Sensitive thành `undefined`).
- Bảng chứa bí mật đọc bằng service-role phía server; anon/publishable key là công khai, mọi bảng phải có RLS đúng.
- `{ ...obj, masked }` không che được field gốc — destructure bí mật ra ngoài.
- `vercel env add` dán kèm dấu nháy thì lưu cả nháy: luôn chọn **Re-enter**.
