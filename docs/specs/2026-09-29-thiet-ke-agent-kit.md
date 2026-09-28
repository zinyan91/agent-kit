# Thiết kế `agent-kit` — bộ Skill / Hook / Luật dùng chung

*Ngày 29/09/2026. Trạng thái: **đủ quyết định, chờ duyệt bản viết**. Chưa có dòng code nào được viết.*

---

## 1. Mục tiêu

Một thư mục duy nhất, có git, là **nguồn sự thật** cho ba thứ — skill, hook, luật — dùng chung cho
ba dự án (`D:\AdminWinHelper`, `D:\CustomerManager`, `D:\pdf-toolkit`) trên **ba công cụ**
(Claude Code, Codex, Antigravity).

Thành công nghĩa là:

1. Gõ `/tin-dung` (tên trần, không tiền tố) ở **bất kỳ** repo nào, trên cả ba công cụ, là skill chạy.
2. Sửa một luật hoặc một hook **ở đúng một chỗ**, không phải chép tay sang repo khác.
3. Không phải dặn lại những điều đã dặn — chúng nằm trong luật chung, tự nạp mỗi phiên.

## 2. Hiện trạng (đo 28–29/09/2026)

| | AdminWinHelper | CustomerManager | pdf-toolkit |
|---|---|---|---|
| Skill | — | `tin-dung`, `brand`, `design`, `design-system`, `banner-design` ở `.claude/skills` **và** bản sao ở `.agents/skills` (+ `document-formatting`, `nodejs-best-practices`, `postgres-best-practices`…) | — |
| Hook | `pre-push-check`, `block-destructive-sql` | **không có** | chép tay từ Admin; `pre-push-check` **đã trôi** (có thêm quét key Google/Stitch, Admin thì không) |
| Luật | `CLAUDE.md` (525 dòng) + `AGENTS.md` | chỉ `AGENTS.md` + `.agents/rules/*.md` | `CLAUDE.md` |
| `.agents/rules` | `architecture-principles.md` + `production-data-safety.md` | 4 tệp riêng | **y hệt** hai tệp của Admin |

Cấp người dùng:

- `~/.claude`: không có `skills/`, không có `CLAUDE.md`, không hook; chỉ có lệnh `/fp`.
- `~/.codex`: `skills/codex-with-chatgpt`, `skills/nha-anh-chatgpt`, `prompts/fp.md`; `AGENTS.md` **rỗng**;
  MCP Supabase `read_only=true`.
- `~/.gemini` (Antigravity): MCP Supabase **không** `read_only`, và Antigravity không có hook.

Phát hiện ngoài lề, sẽ sửa trong luật:

- `D:\WinHelper` đã dời sang **`E:\WinHelper`** — vẫn có git, **vẫn không có remote**.
- `D:\winhelper-hub` và `D:\winhelper-api` **không còn trên máy** (có trên GitHub + Vercel nên không mất,
  chỉ chưa clone lại). `CLAUDE.md` của Admin đang ghi sai cả ba đường dẫn.
- `CustomerManager/AGENTS.md` mục 5 (chuẩn hoá danh mục ISO Windows) thuộc WinHelper, đặt nhầm repo.

## 3. Các quyết định đã chốt

| # | Quyết định | Lý do |
|---|---|---|
| Q1 | Phục vụ **cả ba** công cụ | Người dùng chạy song song Claude Code, Codex, Antigravity |
| Q2 | Đặt ở `D:\agent-kit`, repo **`zinyan91/agent-kit` private** | Có bản sao ngoài máy — tránh lặp lại rủi ro `E:\WinHelper` |
| Q3 | Hướng **lai: plugin + junction** | Plugin giữ hook và luật cho Claude; skill nối bằng junction để gọi tên trần |
| Q4 | Skill gom: `tin-dung`, `/fp`, 5 skill tiện ích, 2 skill từ aitmpl.com | Bộ thiết kế (`brand`, `design`, `design-system`, `banner-design`) **ở lại** CustomerManager |
| Q5 | Gom cả `postgres-best-practices` dù trùng plugin Supabase | Codex và Antigravity không có plugin Supabase |
| Q6 | `nha-anh-chatgpt`, `codex-with-chatgpt` **chỉ** junction vào Codex | Chúng là cầu nối ChatGPT ↔ Codex; hiện ở công cụ khác chỉ gây nhiễu |
| Q7 | Ngôn ngữ trả lời: theo ngôn ngữ người dùng đang dùng | Người dùng chưa chọn "ép tiếng Việt" — đây là mặc định, sửa được |
| Q8 | Dọn gốc **cả ba** repo nằm trong dự án này (mục 8.2), không tách riêng | Người dùng lấy gốc Admin làm ví dụ cho vấn đề chung |
| Q9 | Tài liệu Admin gộp về **một** `docs/` có commit: `docs/specs/` + `docs/plans/`. Dump DB và báo cáo nháp → `.tmp/` | Hết cảnh hai nơi cho một loại tài liệu; spec/plan đi cùng repo. Đảo ngược luật cũ "`docs/` bị gitignore" trong `CLAUDE.md` |

Vì sao không plugin thuần: tài liệu chính thức của Claude Code nói *"Every component is namespaced under
it"* — skill trong plugin bắt buộc gọi `/agent-kit:tin-dung`. Và plugin chạy từ bản **chép vào bộ đệm theo
phiên bản** (`~/.claude/plugins/cache/…`), nên sửa xong phải tăng version + `/plugin update`.

---

## 4. Kiến trúc

### 4.1 Cấu trúc thư mục

```
D:\agent-kit\
├─ skills\                         nguồn thật của mọi skill — KHÔNG nằm trong plugin
│   ├─ tin-dung\                   (+ references\, 14 tệp)
│   ├─ fp\
│   ├─ document-formatting\  nodejs-best-practices\  postgres-best-practices\
│   ├─ nha-anh-chatgpt\  codex-with-chatgpt\
│   └─ pdf-processing-pro\  frontend-design\          chép cố định từ bên thứ ba
├─ rules\                          luật chung, tệp .md đánh số theo thứ tự nạp
├─ plugin\                         plugin Claude Code tên "agent-kit"
│   ├─ .claude-plugin\plugin.json
│   └─ hooks\
│       ├─ hooks.json              SessionStart + PreToolUse
│       ├─ tiem-luat.mjs           nạp luật vào đầu phiên
│       ├─ chan-sql-huy.mjs        chặn DROP/TRUNCATE/DELETE-không-WHERE qua MCP
│       └─ chan-no-verify.mjs      chặn `git push --no-verify`
├─ git-hooks\
│   ├─ pre-push                    vỏ sh, gọi pre-push.mjs
│   └─ pre-push.mjs                quét bí mật + build
├─ .claude-plugin\marketplace.json marketplace cục bộ, trỏ "./plugin"
├─ install.mjs                     nối mọi thứ; `--kiem` chỉ đọc và báo chỗ đứt/lệch
├─ NGUON.md                        nguồn, commit gốc, giấy phép của skill bên thứ ba
├─ README.md                       cách cài lên máy mới, cách thêm skill/luật
└─ docs\                           tài liệu thiết kế (tệp này)
```

**Vì sao plugin nằm trong `plugin\` chứ không ở gốc:** Claude Code tự nạp thư mục `skills\` ở gốc plugin.
Để ở gốc thì mỗi skill xuất hiện hai lần — `/tin-dung` (junction) và `/agent-kit:tin-dung` (plugin).

### 4.2 Mỗi công cụ nhận gì, bằng cách nào

| | Skill | Luật | Hook |
|---|---|---|---|
| **Claude Code** | junction `~/.claude/skills/<tên>` → `D:\agent-kit\skills\<tên>` | plugin tiêm lúc mở phiên | plugin (SQL, `--no-verify`) + git hook |
| **Codex** | junction `~/.codex/skills/<tên>` | `install.mjs` ghi vào `~/.codex/AGENTS.md` | git hook |
| **Antigravity** | junction vào thư mục skill toàn cục (đường dẫn đo ở bước 0) | `install.mjs` ghi vào tệp luật toàn cục | git hook + MCP chỉ đọc |

*Junction* là liên kết thư mục của Windows (`mklink /J`), không cần quyền admin, hoạt động xuyên ổ C↔D.
Sửa tệp trong `D:\agent-kit\skills` là cả ba công cụ thấy ngay — không chạy lại gì.

### 4.3 Luật: "sửa là ăn ngay" tới đâu

- **Claude Code:** `tiem-luat.mjs` đọc thẳng `D:\agent-kit\rules\*.md` nếu thư mục đó tồn tại, nếu không thì
  đọc bản đi kèm trong plugin. Nên trên máy này, sửa luật là phiên sau có hiệu lực, không cần update plugin.
- **Codex / Antigravity:** không có cơ chế import, nên `install.mjs` ghép luật thành tệp. **Sửa luật xong phải
  chạy lại `node install.mjs`.** `--kiem` so hash và báo nếu tệp đã ghép bị cũ.
- Khi ghi `~/.codex/AGENTS.md` và tệp luật của Antigravity, script chỉ thay phần nằm **giữa hai dấu mốc**
  `<!-- agent-kit:bat-dau -->` / `<!-- agent-kit:ket-thuc -->`; nội dung người dùng tự viết ngoài mốc được giữ.

---

## 5. Luật: cái gì chung, cái gì ở lại từng repo

**Nguyên tắc chia:** đúng ở mọi repo trên máy này → chung. Chỉ đúng với một codebase → ở lại repo đó.
Luật chung được nạp vào **mọi** phiên của cả ba công cụ, nên có **ngân sách: tổng ≤ 200 dòng**. Vượt thì
phải cắt, không nới.

### 5.1 Luật chung (`D:\agent-kit\rules\`)

| Tệp | Nội dung | Lấy từ |
|---|---|---|
| `00-cach-lam-viec.md` | Trả lời tiếng Việt; phản biện khách quan, đo trước khi kết luận; không nói "xong" khi chưa có bằng chứng | memory `user-wants-objective-pushback` |
| `10-an-toan-du-lieu.md` | Nhánh backup trước thay đổi lớn; migration không phá huỷ; push xong phải xác nhận deploy `● Ready`; quy tắc bí mật (cấm `process.env.X \|\| '...'`, thiếu biến thì ném lỗi, đối chiếu 3 nơi); cấm `--no-verify` | `AGENTS.md` Admin §1–5, `production-data-safety.md` (bản giống nhau ở Admin + pdf) |
| `20-kien-truc-va-ma.md` | **SRP / SoC / tách UI khỏi nghiệp vụ**; logic phải test được không cần DOM. **Chú thích trong code: mặc định không viết.** Chỉ giữ chú thích khi xoá nó thì người sau sẽ làm vỡ một điều không nhìn ra từ code (nói *vì sao*, không nói *làm gì*). Kiến thức nền tảng, lịch sử sự cố, lý do thiết kế → `CLAUDE.md` / tài liệu, không nhét vào code | `architecture-principles.md` (giống hệt ở cả 3 repo), memory `comments-belong-by-scope` |
| `30-giao-dien.md` | **Không tự ý thêm chữ phụ lên giao diện web/app**: tooltip, dòng giải thích, subtitle, placeholder dài, chú thích "Bằng chữ", ngày lập… chỉ thêm khi người dùng yêu cầu hoặc quy định pháp quy bắt buộc. Nhãn phải tự đủ nghĩa; nếu cần tooltip để hiểu thì sửa nhãn. Trạng thái rỗng không được trùng hình với trạng thái lỗi | `CustomerManager/AGENTS.md` §1, `CLAUDE.md` Admin (bẫy "giao diện nuốt lỗi") |
| `40-cay-thu-muc-va-don-dep.md` | **Đồ tạm của agent** (script thử, ảnh chụp, log, bản nháp, cache như `.superpowers/`) chỉ được nằm trong **một** thư mục tạm đã gitignore của repo (mặc định `.tmp/`; repo có quy ước riêng thì theo repo, ví dụ pdf-toolkit dùng `.tmp-preview`) và **phải xoá khi xong việc**, trước khi báo hoàn thành. **Cấu hình riêng của IDE/máy** (`.idea/`, `.vs/`, `*.iml`, log dev) không bao giờ commit. **Gốc repo** chỉ chứa tệp mà công cụ bắt buộc đặt ở gốc (`package.json`, cấu hình build/lint/test, `README`, `CLAUDE.md`/`AGENTS.md`) cùng các thư mục chuẩn; không tệp ghi chú, log hay thư mục rời. Tạo thư mục mới phải có lý do không đặt được vào thư mục sẵn có | Yêu cầu người dùng 29/09/2026; `CLAUDE.md` pdf-toolkit mục "Scratch files" |
| `90-may-nay.md` | Bản đồ repo **đúng đường dẫn hiện tại**; Kaspersky → `NODE_OPTIONS=--use-system-ca`; ACL Codex sandbox; subagent chết vì khối schema MCP; khung xem trước không chạy animation / không hydrate khi ẩn | `CLAUDE.md` Admin mục "Bẫy", memory `kaspersky-…`, `codex-sandbox-acl-…`, `preview-pane-…` |

### 5.2 Ở lại từng repo (không đụng nội dung, chỉ gỡ phần trùng)

- **AdminWinHelper:** bản đồ hệ thống WinHelper, live chat, R2/release, mọi bẫy riêng Supabase/HF/Vercel.
  Nhận thêm mục "chuẩn hoá danh mục ISO" chuyển từ CustomerManager. Sửa đường dẫn `E:\WinHelper`.
- **CustomerManager:** phong cách in ấn, `truoc-khi-code.md`, `document-formatting-and-printing.md`,
  `dual-storage-supabase-r2.md`, nhật ký `docs/progress`.
- **pdf-toolkit:** toàn bộ `CLAUDE.md` hiện có (lệnh, kiến trúc, registry công cụ) — đều riêng repo.

---

## 6. Hook

### 6.1 `git-hooks/pre-push` — chặn cả ba agent lẫn push tay

Cài bằng `git config --global core.hooksPath D:/agent-kit/git-hooks`. Đây là **viết lại**, không phải chép:
hook cũ là hook Claude đọc JSON lời gọi công cụ; git hook nhận `<remote> <url>` qua tham số và danh sách ref
qua stdin — phạm vi quét lấy từ chính các ref đó.

1. **Quét bí mật** trên phần sắp push: hợp nhất hai bản đang trôi (bản pdf-toolkit là tập lớn hơn — có
   `AIza…` và `AQ.…`), cộng mẫu `process.env.X || '<chuỗi cứng>'`. Thoát hiểm giữ nguyên: comment
   `secret-scan-ok` cuối dòng.
2. **Build**: chạy `npm run build` chỉ khi `package.json` ở gốc repo có script `build`. Repo không phải Node
   (ví dụ `E:\WinHelper`) chỉ được quét bí mật.
3. **Gọi tiếp** `.git/hooks/pre-push` cục bộ nếu repo có — vì `core.hooksPath` toàn cục làm hook cục bộ
   bị bỏ qua. Hiện không repo nào có, nhưng phải xử lý để không âm thầm vô hiệu hoá sau này.

Cái giá chấp nhận: hook này chạy ở **mọi** repo git trên máy, kể cả repo không liên quan.

### 6.2 Hook trong plugin Claude

| Hook | Khi nào | Làm gì |
|---|---|---|
| `tiem-luat.mjs` | `SessionStart` | Nạp `rules/*.md` vào ngữ cảnh |
| `chan-sql-huy.mjs` | `PreToolUse` `mcp__.*__execute_sql\|mcp__.*__apply_migration` | Chuyển nguyên `block-destructive-sql.mjs` (hai bản đang giống hệt). Cố ý không có cờ bỏ qua |
| `chan-no-verify.mjs` | `PreToolUse` `Bash` | Chặn `git push … --no-verify` — không có nó thì agent vượt git hook bằng một cờ |

### 6.3 Codex và Antigravity

Không có hook tương đương → bảo vệ bằng cấu hình:

- **Đổi MCP Supabase của Antigravity sang `read_only=true`** (Codex đã vậy). Rẻ nhất và chặn được thật.
- Cấm `--no-verify` bằng lời trong luật chung — chỉ là lời dặn, không phải hàng rào.

---

## 7. Skill

| Skill | Từ | Ghi chú |
|---|---|---|
| `tin-dung` | `CustomerManager/.claude/skills` (bản `.agents` giống hệt) | Chuyển nguyên + `references/` |
| `fp` | `~/.claude/commands/fp.md`, `~/.codex/prompts/fp.md` | Hai bản đang khác nhau. Gộp thành **một** `SKILL.md` dạng chỉ dẫn "chạy đúng lệnh này rồi in nguyên văn" — chạy được ở cả ba công cụ. `disable-model-invocation` để chỉ chạy khi gõ `/fp`. **`C:\Users\Zinya\.fp\xem.ps1` không vào kit** — nó quản lý khoá/tài khoản |
| `document-formatting` | `CustomerManager/.agents/skills` | |
| `nodejs-best-practices` | nt | |
| `postgres-best-practices` | nt | Trùng chức năng với `supabase-postgres-best-practices` của plugin Supabase — xem câu hỏi mở |
| `nha-anh-chatgpt`, `codex-with-chatgpt` | `~/.codex/skills` | Chuyển vào kit, junction **chỉ** vào `~/.codex/skills` (Q6). `install.mjs` đọc danh sách công cụ đích của từng skill từ một tệp khai báo, mặc định là cả ba |
| `pdf-processing-pro` | `davila7/claude-code-templates` (MIT) | Chép cố định, ghi commit trong `NGUON.md`. Cần `pip install pdfplumber pypdf pillow pytesseract pandas` (máy có Python 3.13.15); OCR cần thêm Tesseract |
| `frontend-design` | nt (MIT) | Chỉ văn bản. Bản cộng đồng, **không phải** bản chính thức của Anthropic |

Skill bên thứ ba được **đọc hết trước khi đưa vào** và không tự cập nhật; muốn lên bản mới thì cập nhật tay
và ghi commit mới vào `NGUON.md`.

---

## 8. Dọn các repo sau khi kit chạy

Mỗi repo làm trên nhánh `chore/agent-kit`, build pass trước khi push (git hook mới sẽ tự kiểm).

### 8.1 Gỡ phần đã chuyển vào kit

| Repo | Gỡ | Thêm / sửa |
|---|---|---|
| AdminWinHelper | `.claude/hooks/*.mjs`; khối `hooks` trong `.claude/settings.json`; `.agents/rules` (2 tệp trùng); phần trong `AGENTS.md`/`CLAUDE.md` đã chuyển lên luật chung (thay bằng một dòng trỏ); **`.idea/` khỏi git** (`git rm -r --cached`, tệp trên máy giữ nguyên để Android Studio vẫn chạy) | Mục ISO từ CM; sửa đường dẫn `E:\WinHelper`, ghi chú hub/api chưa clone; `.gitignore` thêm `.idea/`, `.tmp/`, `.superpowers/`, `.next-dev*.log` |
| CustomerManager | `tin-dung`, `document-formatting`, `nodejs-best-practices`, `postgres-best-practices` ở cả `.claude/skills` lẫn `.agents/skills`; `AGENTS.md` §5 | Nếu bước 0 cho thấy Claude Code không đọc `AGENTS.md`: thêm `CLAUDE.md` chứa `@AGENTS.md` như Admin đang làm |
| pdf-toolkit | `.claude/hooks/*.mjs`; khối `hooks` trong `.claude/settings.json`; `.agents/rules` (2 tệp trùng) | — |

### 8.2 Dọn gốc repo theo luật `40-…`

Đo 29/09/2026. Ba mức, từ rẻ tới đắt; mức sau chỉ làm khi mức trước xong:

- **Xoá** — rác, không gì tham chiếu. Trước khi xoá vẫn `grep` tên trong toàn repo.
- **Gỡ khỏi git / dời chỗ** — sửa mọi tham chiếu, `npm run build` + `npm run test` phải xanh.
- **Ẩn** khỏi cây thư mục VS Code (`files.exclude` trong `.vscode/settings.json`) — thư mục máy sinh ra, bắt buộc phải tồn tại nhưng không ai cần nhìn: không xoá gì.

**AdminWinHelper** — hiện 24 mục ở gốc (không tính tệp cấu hình), mục tiêu 9:

| Mục | Hiện trạng | Làm gì |
|---|---|---|
| `scratch/` | rỗng, **không** gitignore | Xoá |
| `.superpowers/` | 2,1 MB, tàn dư phiên subagent | Xoá |
| `.next-dev.log`, `.next-dev.err.log` | không script nào tạo ra — tàn dư chạy tay | Xoá |
| `.data/admin-loading/monitor-fixture-payload.json` | 1 tệp, gitignore | Kiểm tham chiếu; không ai dùng thì xoá |
| `.idea/` | cấu hình Android Studio, **đã commit** (8 tệp) | Gỡ khỏi git, gitignore, ẩn |
| `specs/` (commit, 9 tệp) + `docs/` (gitignore, 4,5 MB) | **hai nơi cho cùng một loại tài liệu**, một có git một không | Gộp theo Q9: `specs/*` và `docs/superpowers/specs/*` → `docs/specs/` (dùng `git mv` cho tệp đã commit để giữ lịch sử); `docs/superpowers/plans/*` → `docs/plans/`; báo cáo nháp và đánh giá (`2026-09-13-danh-gia-…`, `2026-09-18-bao-cao-…`) → `.tmp/`. `kien-thuc-he-thong.md`, `quy-trinh-cao-…` ở lại `docs/`. **Trước khi bỏ `/docs/` khỏi `.gitignore`: quét toàn bộ tệp sẽ vào git bằng bộ quét bí mật của pre-push, và đọc lướt tìm dữ liệu khách** — thấy gì thì dời vào `.tmp/`. Sửa mục bẫy "`docs/` bị gitignore" trong `CLAUDE.md` |
| `docs/tbl_genuine_hashes-20260919.json` | bản dump dữ liệu production nằm lẫn trong tài liệu | Dời ra ngoài repo hoặc vào `.tmp/`, không bao giờ vào git |
| `tooling/lint/` | 73 MB (có `node_modules` riêng), bộ chạy ESLint tách khỏi dependency chính | Dời vào `scripts/lint/`; sửa 3 script trong `package.json` + 1 dòng `eslint.config.mjs` |
| `.agents/` | 7,4 MB, gitignore: bản sao superpowers + 2 luật trùng | Luật trùng: gỡ (mục 8). Bản superpowers: giữ hay bỏ tuỳ kết quả giai đoạn 0 (Antigravity có dùng nó không) |
| `.next`, `node_modules`, `.vercel`, `tsconfig.tsbuildinfo`, `next-env.d.ts` | máy sinh, bắt buộc tồn tại | Ẩn |

Còn lại ở gốc: `.claude .github .vscode docs mobile public scripts src supabase` cùng các tệp cấu hình mà
công cụ **bắt buộc** đặt ở gốc (`package.json`, `next.config.ts`, `tsconfig.json`, `eslint.config.mjs`,
`postcss.config.mjs`, `tailwind.config.ts`, `vitest.config.ts`, `vercel.json`, `.vercelignore`, `.gitignore`,
`.env.example`, `README.md`, `AGENTS.md`, `CLAUDE.md`) — những tệp này không dời được.

**CustomerManager:** xoá `.superpowers/`; ẩn `dist`, `node_modules`. `.agents/skills` và `.claude/skills` vẫn
giữ hai bản của bộ thiết kế (Antigravity đọc bản này, Claude đọc bản kia) — ghi nhận, không xử lý ở đây.
`.mcp.json` có commit nhưng **sạch**: chỉ URL MCP chỉ đọc, lịch sử không có chuỗi giống khoá (đã quét).

**pdf-toolkit:** xoá `dist_backup/`, `.superpowers/`; dời `DANH_GIA_PROJECT.md` vào `docs/` và sửa liên kết
trong `CLAUDE.md`; `_headers` giữ ở gốc nếu bước build chép nó từ gốc (kiểm trước); ẩn `dist`, `node_modules`,
`.wrangler`, `.tmp-preview`.

### 8.3 Lưu ý chung

**Phải gỡ skill trùng tên ở cấp dự án**, không chỉ để thừa: skill cấp dự án và skill toàn cục cùng tên sẽ
tranh nhau, và bản cũ trong repo sẽ lặng lẽ thắng.

Không đụng: `.agents/plugins/superpowers` trong Admin và pdf-toolkit, bộ skill thiết kế của CM, memory cấp
dự án của Claude (chỉ những memory đúng cho mọi repo mới được nâng thành luật chung ở mục 5.1).

---

## 9. Các giai đoạn thực hiện

Mỗi giai đoạn kết thúc bằng một bằng chứng đo được; chưa có bằng chứng thì không sang giai đoạn sau.

### Giai đoạn 0 — Đo những gì thiết kế đang giả định

- [ ] Claude Code có nạp skill qua junction trong `~/.claude/skills` không (tạo một skill thử, mở phiên mới, gõ `/ten-thu`).
- [ ] Codex có nạp skill qua junction trong `~/.codex/skills` không.
- [ ] Antigravity: đường dẫn **thật** của thư mục skill toàn cục và tệp luật toàn cục; có đi theo junction không.
- [ ] Skill có `disable-model-invocation` chạy đúng khi gõ `/fp` ở cả ba công cụ không.
- [ ] Claude Code có đọc `AGENTS.md` khi không có `CLAUDE.md` không (quyết định việc CM cần thêm `CLAUDE.md`).
- [ ] `SessionStart` của plugin tiêm được bao nhiêu nội dung, có bị cắt không.

Công cụ nào không đi theo junction → riêng công cụ đó dùng chế độ **chép**, và `--kiem` báo khi bản chép lệch nguồn.

### Giai đoạn 1 — Dựng repo

- [ ] `git init D:\agent-kit`, tạo repo private `zinyan91/agent-kit`, push tệp thiết kế này.
- [ ] Khung thư mục mục 4.1, `README.md`, `NGUON.md`.

### Giai đoạn 2 — Skill

- [ ] Chép 7 skill hiện có vào `skills/`, so khớp từng byte với bản gốc.
- [ ] Gộp `fp` thành một `SKILL.md`.
- [ ] Tải và đọc hết `pdf-processing-pro`, `frontend-design` ở một commit cố định; ghi `NGUON.md`.

### Giai đoạn 3 — `install.mjs`

- [ ] Tạo junction cho cả ba công cụ; **không ghi đè** thứ đang tồn tại mà không phải junction của kit (dừng và báo).
- [ ] Ghép luật vào `~/.codex/AGENTS.md` và tệp luật Antigravity, chỉ trong vùng mốc.
- [ ] Đặt `core.hooksPath`.
- [ ] `--kiem`: chỉ đọc, liệt kê junction đứt, tệp luật cũ, hook chưa đặt.
- [ ] `--go`: gỡ sạch mọi thứ script đã tạo, trả máy về trạng thái trước.
- [ ] Test (vitest hoặc `node:test`) cho phần thuần: tính vùng mốc, so hash, lập kế hoạch junction.

### Giai đoạn 4 — Luật

- [ ] Viết 6 tệp mục 5.1 trong ngân sách 200 dòng.
- [ ] Sửa các sự thật đã trôi (đường dẫn repo) ngay khi chép.

### Giai đoạn 5 — Hook

- [ ] Viết lại `pre-push` thành git hook thật; test bằng repo tạm: push có token giả → bị chặn; có `secret-scan-ok` → qua; không có `package.json` → chỉ quét.
- [ ] Plugin: `tiem-luat`, `chan-sql-huy`, `chan-no-verify`; cài qua `/plugin marketplace add D:\agent-kit`.
- [ ] Đổi MCP Supabase của Antigravity sang `read_only=true`.

### Giai đoạn 6 — Kiểm chứng kit trước khi đụng repo

Chỉ ở AdminWinHelper và pdf-toolkit: hai repo này **không** có bản `tin-dung` cấp dự án. Kiểm ở
CustomerManager lúc này sẽ xanh giả, vì bản cũ trong repo trả lời thay bản của kit.

- [ ] 2 repo × 3 công cụ: gõ `/tin-dung` → skill của kit chạy (6 ô).
- [ ] Sửa một chữ trong `rules/00-…` → phiên Claude mới thấy ngay; `--kiem` báo Codex/Antigravity cũ; chạy lại `install.mjs` → hết báo.
- [ ] Push thử có token giả vào một repo tạm → bị chặn.

### Giai đoạn 7 — Dọn ba repo (mục 8)

- [ ] Mỗi repo một nhánh `chore/agent-kit`: gỡ phần trùng (8.1), rồi dọn gốc (8.2) theo thứ tự xoá → gỡ/dời → ẩn.
- [ ] Build + test xanh, push, xác nhận deploy `● Ready` với repo có deploy.

### Giai đoạn 8 — Kiểm chứng đầu-cuối lần cuối

- [ ] Đủ 3 repo × 3 công cụ: `/tin-dung` chạy bản của kit (9 ô) — giờ CustomerManager đã hết bản cũ.
- [ ] Push thử có token giả ở cả ba repo → bị chặn.
- [ ] Gốc từng repo khớp danh sách "còn lại" ở mục 8.2.

---

## 10. Rủi ro

| Rủi ro | Giảm thiểu |
|---|---|
| Một công cụ không đi theo junction | Chế độ chép + `--kiem` (giai đoạn 0 phát hiện sớm) |
| `core.hooksPath` toàn cục vô hiệu hoá hook cục bộ của repo khác | `pre-push` gọi tiếp `.git/hooks/pre-push` |
| Git hook build chậm ở mọi lần push | Chỉ build khi có script `build`. Cố ý **không** có cờ bỏ qua build — giống hook cũ; build fail cục bộ thì Vercel cũng fail |
| Luật chung phình to, ăn ngữ cảnh mọi phiên | Ngân sách 200 dòng, `--kiem` đếm và cảnh báo |
| Skill bên thứ ba chứa chỉ dẫn độc hại | Đọc hết trước khi vào kit; cố định commit; không tự cập nhật |
| Luật Codex/Antigravity cũ vì quên chạy lại `install.mjs` | `--kiem` so hash |
| Xoá nhầm skill trong repo trước khi kit chạy | Giai đoạn 7 (dọn repo) chỉ bắt đầu sau khi giai đoạn 6 xanh |
| Kiểm `/tin-dung` xanh giả vì bản cũ cấp dự án trả lời thay | Giai đoạn 6 chỉ kiểm ở repo không có bản cũ; kiểm đủ 9 ô ở giai đoạn 8 |
| Bỏ gitignore `docs/` làm lộ bí mật hoặc dữ liệu khách | Quét bí mật + đọc lướt trước khi bỏ gitignore (mục 8.2, Q9) |

## 11. Ngoài phạm vi

- Clone lại `winhelper-hub`, `winhelper-api`; tạo remote cho `E:\WinHelper` (rủi ro lớn nhất hệ thống — nên làm, nhưng là việc riêng).
- Đóng gói plugin cho Codex (`.codex-plugin`) — Codex không cần: skill đi junction, luật đi `AGENTS.md`.
- Bộ skill thiết kế của CustomerManager.
- `.agents/plugins/superpowers` trong các repo.

## 12. Câu hỏi còn mở

Không còn. Mọi quyết định đã ghi ở mục 3 (Q1–Q9).
