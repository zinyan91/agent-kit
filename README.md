# agent-kit

Nguồn thật duy nhất cho **skill, hook, luật** dùng chung ở mọi repo, cho cả Claude Code, Codex và
Antigravity. Sửa ở đây, không sửa bản trong từng repo hay từng công cụ.

Có hai vai máy:

| | Máy nguồn | Máy dùng |
|---|---|---|
| Kit nằm ở | `D:\agent-kit`, nơi sửa và commit | `%USERPROFILE%\.agent-kit`, bản clone chỉ đọc |
| `%USERPROFILE%\.agent-kit` | junction trỏ về `D:\agent-kit` | chính là bản clone |
| Cập nhật | sửa là có hiệu lực ở phiên sau | tự kéo bản mới khi mở Claude, tối đa 6 giờ một lần |

## Cài lên máy khác (máy dùng)

Cần: Windows, Node 18 trở lên, Git, và đã đăng nhập GitHub có quyền đọc repo này (repo private; chạy
`gh auth login` hoặc đăng nhập qua Git Credential Manager). Máy có phần mềm quét HTTPS (như Kaspersky)
thì đặt `NODE_OPTIONS=--use-system-ca` trước.

```powershell
npx -y github:zinyan91/agent-kit
```

Lệnh này tải kit về `%USERPROFILE%\.agent-kit`, nối skill cho ba công cụ, nạp luật, đặt git hook và cài
plugin Claude (nếu máy có lệnh `claude`). Không muốn nhóm skill riêng (`tin-dung`, `fp`):

```powershell
npx -y github:zinyan91/agent-kit --chi-chung
```

Lựa chọn nhóm được nhớ trong `%USERPROFILE%\.agent-kit-may.json`: tự cập nhật và các lần chạy lại lệnh
`npx` không cờ đều giữ nó. Muốn cài lại cả hai nhóm thì thêm `--ca-hai`. Máy chỉ dùng Codex hay Antigravity (không mở Claude) thì chạy lại lệnh `npx` để lấy bản mới. Lần tự cập nhật nào
lỗi thì phiên Claude sau sẽ báo kèm nguyên văn lỗi; kit không tự reset bản clone.

Script của skill `ui-design` cần thêm Node 22 và Chrome hoặc Edge; thiếu thì skill vẫn đọc được.

## Máy nguồn

```powershell
node D:\agent-kit\install.mjs
node D:\agent-kit\install.mjs --kiem
```

`install.mjs` không cần quyền admin và chạy lại bao nhiêu lần cũng được. Nó **không ghi đè** thứ gì không
do nó tạo: gặp xung đột thì dừng và báo. Bản cũ nó thay thế được lưu ở `%TEMP%\agent-kit-luu\`.

| Lệnh | Việc |
|---|---|
| `node install.mjs` | Nối mọi thứ: junction skill, luật cho Codex và Antigravity, git hook, `~/.agent-kit`, plugin Claude |
| `node install.mjs --chi-chung` / `--ca-hai` | Như trên, bỏ hoặc lấy lại nhóm skill riêng; lựa chọn được nhớ cho các lần sau |
| `node install.mjs --kiem` | Chỉ đọc; báo chỗ đứt, luật cũ, hook chưa đặt, plugin chưa bật, luật vượt 200 dòng |
| `node install.mjs --go` | Gỡ mọi thứ kit đã tạo (giữ `~/.agent-kit`) |
| `npm test` | Test toàn bộ, không đụng máy thật |

Máy dùng chỉ nhận những gì đã push. Sửa xong ở đây thì commit và `git push`.

## Mỗi công cụ nhận gì

| | Skill | Luật | Hook |
|---|---|---|---|
| Claude Code | junction `~/.claude/skills/<tên>` | plugin tiêm luật lúc mở phiên | plugin + git hook |
| Codex | junction `~/.codex/skills/<tên>` | ghép vào `~/.codex/AGENTS.md` (vùng mốc) | git hook |
| Antigravity | junction `~/.gemini/config/skills/<tên>` | thư mục `~/.gemini/config/rules` do kit sinh (có tệp `.agent-kit`) | git hook |

## Thêm skill

Tạo `skills/<tên>/SKILL.md` (frontmatter `name` trùng tên thư mục, dạng kebab-case), rồi `node install.mjs`.
Chỉ muốn vào vài công cụ: khai trong `kit.json` → `chiVao`. Skill riêng tư: thêm tên vào `kit.json` →
`nhomRieng`. Dựa trên skill bên thứ ba: đọc hết bản gốc, viết lại cho kit, ghi nguồn vào `NGUON.md`.
Xoá một skill khỏi `skills/` thì lần cài sau tự gỡ junction của nó.

## Sửa luật

- `rules/*.md`: luật chung cho mọi máy. Giữ frontmatter `trigger: always_on` (Antigravity cần nó).
- `rules/may/<TÊN-MÁY>.md`: luật riêng của một máy (đường dẫn repo, bẫy môi trường), tên tệp là tên máy
  viết hoa (`hostname`). Máy nguồn hiện là `JINGYUE`. Máy không có tệp riêng chỉ nhận luật chung.

Claude thấy luật mới ở phiên sau. Codex và Antigravity cần chạy lại `node install.mjs` (máy dùng: tự
động khi mở Claude). Tổng luật của một máy ≤ 200 dòng.

## Hook

- `git-hooks/pre-push`, đặt bằng `git config --global core.hooksPath`, chạy ở **mọi** repo: quét bí mật
  trong các commit sắp push, rồi `npm run build` nếu repo có script `build` (không có thì `npm run check`
  nếu có). Thoát hiểm cho một dòng:
  thêm `secret-scan-ok` vào cuối dòng. Hook `.git/hooks/pre-push` riêng của repo vẫn được gọi tiếp.
  Repo tự đặt `core.hooksPath` cục bộ (husky…) sẽ **không** chạy hook này.
- Plugin Claude: tiêm luật, tự cập nhật kit ở máy dùng, chặn SQL huỷ dữ liệu qua MCP, chặn
  `git push --no-verify` và đổi `core.hooksPath`.
- Plugin tìm kit ở `AGENT_KIT_DIR`, nếu không có thì `~/.agent-kit`. Sửa script trong `plugin/` thì phải
  tăng `version` ở `plugin/.claude-plugin/plugin.json` và `.claude-plugin/marketplace.json`. Máy dùng tự
  cập nhật plugin khi version đổi; máy nguồn chạy
  `claude plugin marketplace update agent-kit` rồi `claude plugin update agent-kit@agent-kit`.

Thiết kế: [`docs/specs/`](docs/specs/). Kế hoạch: [`docs/plans/`](docs/plans/).
