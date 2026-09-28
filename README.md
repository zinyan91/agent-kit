# agent-kit

Nguồn thật duy nhất cho **skill, hook, luật** dùng chung ở mọi repo trên máy này, cho cả Claude Code,
Codex và Antigravity. Sửa ở đây — không sửa bản trong từng repo hay từng công cụ.

## Cài lên máy (một lần)

```powershell
git clone https://github.com/zinyan91/agent-kit D:\agent-kit
node D:\agent-kit\install.mjs
claude plugin marketplace add D:\agent-kit
claude plugin install agent-kit@agent-kit
node D:\agent-kit\install.mjs --kiem
```

`install.mjs` không cần quyền admin và chạy lại bao nhiêu lần cũng được. Nó **không ghi đè** thứ gì không
do nó tạo: gặp xung đột thì dừng và báo. Bản cũ nó thay thế được lưu ở `%TEMP%\agent-kit-luu\`.

| Lệnh | Việc |
|---|---|
| `node install.mjs` | Nối mọi thứ (junction skill + luật, ghép luật cho Codex, đặt git hook) |
| `node install.mjs --kiem` | Chỉ đọc; báo chỗ đứt, luật Codex cũ, hook chưa đặt, luật vượt 200 dòng |
| `node install.mjs --go` | Gỡ mọi thứ kit đã tạo |
| `npm test` | Test toàn bộ (không đụng máy thật) |

## Mỗi công cụ nhận gì

| | Skill | Luật | Hook |
|---|---|---|---|
| Claude Code | junction `~/.claude/skills/<tên>` | plugin tiêm `rules/` lúc mở phiên | plugin + git hook |
| Codex | junction `~/.codex/skills/<tên>` | ghép vào `~/.codex/AGENTS.md` (vùng mốc) | git hook |
| Antigravity | junction `~/.gemini/config/skills/<tên>` | junction `~/.gemini/config/rules` | git hook |

## Thêm skill

Tạo `skills/<tên>/SKILL.md` (frontmatter `name` trùng tên thư mục, dạng kebab-case), rồi `node install.mjs`.
Chỉ muốn vào vài công cụ: khai trong `kit.json` → `chiVao`. Skill bên thứ ba: đọc hết trước, ghi vào `NGUON.md`.

## Sửa luật

Sửa `rules/*.md` (giữ frontmatter `trigger: always_on` — Antigravity cần nó). Claude và Antigravity thấy
ngay ở phiên sau; **Codex cần chạy lại `node install.mjs`**. Tổng luật ≤ 200 dòng.

## Hook

- `git-hooks/pre-push` — đặt bằng `git config --global core.hooksPath`, chạy ở **mọi** repo: quét bí mật
  trong các commit sắp push, rồi `npm run build` nếu repo có script `build`. Thoát hiểm cho một dòng:
  thêm `secret-scan-ok` vào cuối dòng. Hook `.git/hooks/pre-push` riêng của repo vẫn được gọi tiếp.
  Repo tự đặt `core.hooksPath` cục bộ (husky…) sẽ **không** chạy hook này.
- Plugin Claude: chặn SQL huỷ dữ liệu qua MCP; chặn `git push --no-verify` và đổi `core.hooksPath`.
- Plugin đọc luật từ `D:\agent-kit\rules` (hoặc biến `AGENT_KIT_DIR`). Sửa script trong `plugin/` thì phải
  tăng `version` ở `plugin/.claude-plugin/plugin.json` + `.claude-plugin/marketplace.json` rồi
  `claude plugin update agent-kit@agent-kit`.

Thiết kế: [`docs/specs/`](docs/specs/). Kế hoạch: [`docs/plans/`](docs/plans/).
