# Nguồn gốc skill bên thứ ba

Skill bên thứ ba được **chép cố định** vào kit, đã đọc hết trước khi đưa vào, và **không tự cập nhật**.
Muốn lên bản mới: tải lại ở commit mới, đọc lại, cập nhật bảng dưới.

| Skill | Nguồn | Commit | Giấy phép | Đã sửa |
|---|---|---|---|---|
| `pdf-processing-pro` | [davila7/claude-code-templates](https://github.com/davila7/claude-code-templates) `cli-tool/components/skills/document-processing/pdf-processing-pro` | `c3a74d3ef9ed8076eeb1e3370cc0fc0cc398bdfa` | MIT (của repo) | `name` đổi từ `PDF Processing Pro` sang `pdf-processing-pro` (tên cũ không hợp lệ); thêm khối cảnh báo đầu `SKILL.md`: bản gốc chỉ có 1/8 script mà nó nhắc tới |
| `frontend-design` | nt, `cli-tool/components/skills/creative-design/frontend-design` | `c3a74d3ef9ed8076eeb1e3370cc0fc0cc398bdfa` | Apache 2.0 (`LICENSE.txt` đi kèm) | Không |
| `design-taste-frontend` | [Leonxlnx/taste-skill](https://github.com/Leonxlnx/taste-skill) `skills/taste-skill` (tasteskill v2, tasteskill.dev) | `6010f91a9935f1c167dfc500fb1a475681892e6b` | MIT (`LICENSE` chép từ gốc repo) | Không. Thư mục đổi từ `taste-skill` sang `design-taste-frontend` cho trùng `name`. Script cần Node 22+ và Chrome/Edge; `assets.mjs` gọi mạng (Openverse, Wikimedia, AIC, Met, NASA), không dùng key; `draw.mjs` ghi lịch sử vào `~/.taste-skill/history.json`. Thư viện cảnh cuộn (`scenes.json`, `assets/scenes/demo/`) không có ở commit này, script tự bỏ qua |
| `humanizer` | [blader/humanizer](https://github.com/blader/humanizer) gốc repo, v3.1.0 | `8c307f367c91bd974002f10f2be2965d642c13df` | MIT (`LICENSE` đi kèm) | Thêm `tieng-viet.md` (dấu hiệu AI trong văn tiếng Việt) và một dòng trỏ tới nó trong `SKILL.md`, ngay dưới "How to work" |

Bản `frontend-design` này là bản cộng đồng, **không phải** bản chính thức của Anthropic.

## Skill chuyển vào từ máy này

| Skill | Từ | Ngày |
|---|---|---|
| `tin-dung`, `document-formatting`, `nodejs-best-practices`, `postgres-best-practices` | `D:\CustomerManager\.agents\skills` (bản `.claude/skills/tin-dung` giống hệt) | 29/09/2026 |
| `nha-anh-chatgpt`, `codex-with-chatgpt` | `~/.codex/skills` | 29/09/2026 |
| `fp` | gộp `~/.claude/commands/fp.md` + `~/.codex/prompts/fp.md` | 29/09/2026 |
