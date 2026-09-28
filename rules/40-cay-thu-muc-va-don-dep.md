---
trigger: always_on
description: Giữ cây thư mục gọn — đồ tạm vào .tmp/ và dọn khi xong, không commit cấu hình máy, gốc repo tối giản.
---

# Cây thư mục & dọn dẹp

- **Đồ tạm của agent** (script thử, ảnh chụp, log, bản nháp, dump dữ liệu, cache công cụ) chỉ được nằm trong **một** thư mục tạm đã gitignore của repo: mặc định `.tmp/` (repo có quy ước riêng thì theo repo, ví dụ pdf-toolkit dùng `.tmp-preview/`).
- **Xoá đồ tạm khi xong việc, trước khi báo hoàn thành.** Cái gì cần giữ lâu thì đưa vào đúng chỗ (`docs/`, test, memory), không để trong `.tmp/`.
- **Không commit cấu hình riêng của máy/IDE**: `.idea/`, `.vs/`, `*.iml`, log dev, `.env*` (trừ `.env.example`).
- **Gốc repo chỉ chứa** tệp mà công cụ bắt buộc đặt ở gốc (`package.json`, cấu hình build/lint/test/framework, `README.md`, `CLAUDE.md`/`AGENTS.md`, `.gitignore`) cùng các thư mục chuẩn (`src/`, `public/`, `scripts/`, `docs/`, `tests/`…). Không tệp ghi chú, log hay thư mục rời ở gốc.
- Tài liệu: **một** thư mục `docs/` — spec vào `docs/specs/`, kế hoạch vào `docs/plans/`.
- Tạo thư mục mới phải có lý do không đặt được vào thư mục sẵn có. Không tạo thư mục rỗng.
- Dữ liệu production (dump bảng, xuất CSV) không bao giờ vào git.
