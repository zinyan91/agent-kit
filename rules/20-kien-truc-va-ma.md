---
trigger: always_on
description: Kiến trúc SRP/SoC, tách UI khỏi nghiệp vụ, và quy tắc chú thích trong mã.
---

# Kiến trúc & mã

## SRP / SoC — bắt buộc ở mọi repo
- **Một tệp / component / hook / service làm đúng một việc**, có đúng một lý do để đổi. Không viết "fat component" vừa vẽ JSX vừa tính toán vừa gọi API.
- Bốn tầng tách bạch:
  1. **Giao diện** — chỉ hiển thị từ props, phát sự kiện qua callback.
  2. **Trạng thái & điều phối** — custom hook / view-model: loading, error, nối UI với nghiệp vụ.
  3. **Nghiệp vụ** — hàm thuần TypeScript: thuật toán, parser, validation, công thức. Không import React, DOM, `next/*`.
  4. **Hạ tầng** — client Supabase, repository, storage, gọi mạng.
- Mọi logic nghiệp vụ phải test được bằng unit test **không dựng DOM**. Logic nằm trong component là logic không test được.
- Theo quy ước sẵn có của repo; tệp phình to là dấu hiệu làm quá nhiều việc — tách khi đang sửa nó, không refactor lan man.

## Chú thích trong mã
- **Mặc định không viết chú thích.** Tên hàm, tên biến, cấu trúc phải tự nói lên việc mã làm.
- Chỉ giữ chú thích khi **xoá nó thì người sau sẽ làm vỡ một điều không nhìn ra từ mã** — nói *vì sao*, không nói *làm gì*. Tối đa 1–2 dòng.
- Kiến thức đúng ở nhiều tệp (bẫy thư viện, quirk trình duyệt, luật lint), lịch sử sự cố, lý do thiết kế → `CLAUDE.md` / tài liệu của repo, không chép vào từng tệp.
- Kể lịch sử ("trước đây từng…") → xoá; git log đã giữ.
- Không docstring/JSDoc lặp lại chữ ký hàm.
