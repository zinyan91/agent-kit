# Nguồn gốc skill

## Viết lại từ nguồn bên thứ ba

Các skill dưới đây đã được viết lại và rút gọn cho kit, không đồng bộ với bản gốc. Muốn lấy ý mới từ
bản gốc: đọc bản mới ở commit mới, rồi sửa tay skill của kit.

| Skill | Dựa trên | Commit | Giấy phép | Ghi chú |
|---|---|---|---|---|
| `ui-design` | [Leonxlnx/taste-skill](https://github.com/Leonxlnx/taste-skill) `skills/taste-skill` (tasteskill v2) và bản cộng đồng `frontend-design` ([davila7/claude-code-templates](https://github.com/davila7/claude-code-templates) `c3a74d3`) | `6010f91a9935f1c167dfc500fb1a475681892e6b` | MIT (`LICENSE` của taste-skill đi kèm) | `scripts/` là bản rút gọn của `lint.mjs`, `inspect.mjs` và `lib/` gốc: bỏ `direction.json`, cảnh cuộn, film, chỉ tiêu chuyển động, kho ảnh; thêm `--allow` cho lint; ra `.tmp/ui-design/`. Bỏ `draw.mjs`, `assets.mjs`, `scenes.mjs`, `library/`, `evals/` |
| `writing` | [blader/humanizer](https://github.com/blader/humanizer) v3.1.0 | `8c307f367c91bd974002f10f2be2965d642c13df` | MIT (`LICENSE` đi kèm) | `references/vietnamese.md` do kit viết |
| `postgres` | `postgres-best-practices` của Supabase (bản chép vào kit 29/09/2026) | — | — | Gộp 30 tệp luật thành một tệp, thêm mục migration không phá huỷ |
| `nodejs` | `nodejs-best-practices` (bản cộng đồng chép vào kit 29/09/2026) | — | — | Rút gọn, khớp luật SRP/SoC và luật bí mật của kit |

`pdf-processing-pro` đã bỏ (bản gốc thiếu 7/8 script nó nhắc tới; Claude có sẵn skill PDF).

## Skill chuyển vào từ máy này

| Skill | Từ | Ngày |
|---|---|---|
| `tin-dung`, `document-formatting` | `D:\CustomerManager\.agents\skills` (bản `.claude/skills/tin-dung` giống hệt) | 29/09/2026 |
| `nha-anh-chatgpt`, `codex-with-chatgpt` | `~/.codex/skills` | 29/09/2026 |
| `fp` | gộp `~/.claude/commands/fp.md` + `~/.codex/prompts/fp.md` | 29/09/2026 |
