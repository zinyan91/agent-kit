# Viết lại nhóm skill chung — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Thay sáu skill chép nguyên của bên thứ ba bằng bốn skill tiếng Anh gọn của kit (`ui-design`, `writing`, `postgres`, `nodejs`), sửa luật chung theo đó, và để `install.mjs` tự gỡ junction của skill đã xoá.

**Architecture:** Mỗi skill là một thư mục `skills/<tên>/` với `SKILL.md` ≤ 250 dòng và `references/` cho phần dài. `ui-design` mang theo bản rút gọn của hai script đo (`lint.mjs`, `inspect.mjs`) lấy từ taste-skill. `install.mjs` thêm một bước dò junction mồ côi bằng hàm thuần trong `lib/ke-hoach.mjs`.

**Tech Stack:** Node ESM (`.mjs`), `node:test`, không thêm phụ thuộc.

**Spec:** `docs/specs/2026-10-23-cai-tren-may-khac.md`, phần A.

## Global Constraints

- Skill viết bằng **tiếng Anh**; riêng `skills/writing/references/vietnamese.md` giữ tiếng Việt.
- Mỗi `SKILL.md` mới ≤ 250 dòng; frontmatter có `name` trùng tên thư mục (kebab-case) và `description`.
- Script `ui-design`: `lint.mjs` chạy được với Node ≥ 18; `inspect.mjs` cần Node ≥ 22 và Chrome/Edge/Chromium. Không thêm phụ thuộc npm.
- Thư mục ra mặc định của script: `.tmp/ui-design/` (inspect: `.tmp/ui-design/inspect`). Không còn đọc hay ghi `.taste-skill/`.
- Giữ `LICENSE` MIT gốc trong `skills/ui-design/` (taste-skill) và `skills/writing/` (humanizer).
- Không đụng: `document-formatting`, `codex-with-chatgpt`, `nha-anh-chatgpt`, `tin-dung`, `fp` (bốn tệp tin-dung/nha-anh-chatgpt đang có thay đổi chưa commit của người dùng — không `git add` chúng).
- Commit message theo kiểu repo: tiếng Việt không dấu, tiền tố `feat(...)`/`fix(...)`/`docs(...)`, kết thúc bằng dòng `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`.

## Review Focus

- Skill đã bị xoá nhưng junction còn ở `~/.claude/skills` → `install.mjs` gỡ; `--kiem` báo trước khi gỡ. (Task 1)
- Junction trỏ ra ngoài kit, hoặc thư mục thật do người dùng tự tạo, trùng tên skill cũ → không bao giờ bị gỡ. (Task 1)
- Repo cần giữ một mẫu mà luật đo cấm (bóng đổ trên thẻ KPI) → `--allow shadow` ở cả `lint.mjs` và `inspect.mjs` tắt đúng luật đó. (Task 3)
- Chạy `lint.mjs` trên thư mục có `node_modules`, `.next`, `.tmp` → bỏ qua, không treo. (Task 3)
- Máy không có Chrome → `inspect.mjs` thoát với thông điệp nói rõ thiếu trình duyệt, không ném stack trace. (Task 3)

---

### Task 1: `install.mjs` gỡ junction của skill đã xoá

**Files:**
- Modify: `lib/ke-hoach.mjs`, `install.mjs` (hàm `kiem`, `cai`)
- Test: `tests/ke-hoach.test.mjs`, `tests/install.test.mjs`

**Interfaces:**
- Produces: `timJunctionMoCoi({ thuMucSkillKit: string, skills: string[], congCu: Record<string,{skills?:string}>, lietKe: (dir:string)=>string[], hienTrang: (dich:string,nguon:string)=>{loai:string,dichJunction?:string} }) => Array<{ congCu: string, dich: string, skill: string }>` — junction trong `congCu[x].skills` trỏ vào `<thuMucSkillKit>/<tên>` mà `<tên>` không có trong `skills`.

- [ ] **Step 1: Viết test hỏng** trong `tests/ke-hoach.test.mjs`:
  - `'junction trỏ vào skill đã xoá khỏi kit là mồ côi'`: `lietKe` trả `['cu', 'a']`, `hienTrang` trả junction tới `path.join(KIT,'cu')` cho `cu` và tới `path.join(KIT,'a')` cho `a`; `skills: ['a']` → kết quả đúng một mục `{ skill: 'cu' }` cho mỗi công cụ.
  - `'junction trỏ ra ngoài kit hoặc thư mục thật thì không phải mồ côi'`: `hienTrang` trả `{loai:'junction', dichJunction:'E:\\khac\\cu'}` và `{loai:'thu-muc'}` → `[]`.
- [ ] **Step 2: Chạy** `node --test tests/ke-hoach.test.mjs` → FAIL (`timJunctionMoCoi` không tồn tại).
- [ ] **Step 3: Viết `timJunctionMoCoi`** trong `lib/ke-hoach.mjs`; so đường dẫn bằng `cungCho` sẵn có (không phân biệt hoa thường). `lietKe` trả `[]` khi thư mục không tồn tại.
- [ ] **Step 4: Nối vào `install.mjs`**: `kiem()` thêm lỗi `skill <tên> → <công cụ>: junction mồ côi, skill đã xoá khỏi kit (<dich>)`; `cai()` gọi `goJunction(dich)` và in `- skill <tên> → <công cụ> (đã xoá khỏi kit)`.
- [ ] **Step 5: Test đầu-cuối** trong `tests/install.test.mjs`: `'junction của skill đã xoá bị gỡ, thư mục tự tạo thì giữ'` — trước khi chạy, tạo junction `trongNha('.claude','skills','da-xoa')` → `path.join(KIT,'skills','da-xoa')` (đích không tồn tại) và thư mục thật `trongNha('.claude','skills','tu-tao')`; sau `chay()`: `da-xoa` không còn, `tu-tao` còn.
- [ ] **Step 6: Chạy** `npm test` → toàn bộ PASS.
- [ ] **Step 7: Commit** `feat(install): go junction cua skill da xoa khoi kit`.

### Task 2: Skill `writing`

**Files:**
- Create: `skills/writing/SKILL.md`, `skills/writing/references/vietnamese.md` (chuyển từ `skills/humanizer/tieng-viet.md`, đọc bản hiện tại trên đĩa), `skills/writing/LICENSE` (chép từ `skills/humanizer/LICENSE`)
- Delete: `skills/humanizer/`
- Test: `tests/skills.test.mjs` (mới)

**Interfaces:**
- Produces: `tests/skills.test.mjs` với hằng `VIET_LAI = ['writing', 'ui-design', 'postgres', 'nodejs']`; các task sau chỉ cần thư mục tồn tại là test của chúng chạy.

- [ ] **Step 1: Viết `tests/skills.test.mjs`**: với mọi `skills/*/SKILL.md`: có frontmatter, `name` === tên thư mục. Với mỗi tên trong `VIET_LAI` mà thư mục tồn tại: `SKILL.md` ≤ 250 dòng, và mọi đường dẫn `references/…` hay `scripts/…` được nhắc trong `SKILL.md` đều tồn tại. Thêm assert: `skills/humanizer`, `skills/frontend-design`, `skills/design-taste-frontend`, `skills/postgres-best-practices`, `skills/nodejs-best-practices`, `skills/pdf-processing-pro` — mỗi tên chỉ được assert vắng mặt khi thư mục thay thế của nó đã tồn tại (để test xanh qua từng task).
- [ ] **Step 2: Viết `skills/writing/SKILL.md`** (tiếng Anh, ≤ 250 dòng): `description` nêu khi nào dùng (soát hay viết lại văn người khác sẽ đọc: tài liệu, README, commit, PR, chữ trên giao diện; tiếng Việt hoặc tiếng Anh). Nội dung giữ ý của humanizer v3.1.0: lý do văn AI nghe như vậy; quy trình 4 bước (đánh dấu → nháp → soát lại, không thêm/bớt dữ kiện → bản cuối); giọng văn theo mẫu người dùng; ba chế độ trả về (dán văn, tệp, nhúng vào việc khác); danh mục dấu hiệu gom theo nhóm, mỗi dấu hiệu một dòng kèm cách sửa, giữ thứ tự mạnh trước yếu sau. Một dòng: văn tiếng Việt thì đọc `references/vietnamese.md`.
- [ ] **Step 3: Chuyển** `tieng-viet.md` → `references/vietnamese.md`; câu đầu đổi "Bổ sung cho `SKILL.md`" thành trỏ về `../SKILL.md`; giữ nguyên phần còn lại. Xoá `skills/humanizer/`.
- [ ] **Step 4: Chạy** `node --test tests/skills.test.mjs` → PASS.
- [ ] **Step 5: Commit** `feat(skills): writing thay humanizer, viet lai gon`.

### Task 3: Script đo của `ui-design`

**Files:**
- Create: `skills/ui-design/scripts/lint.mjs`, `skills/ui-design/scripts/inspect.mjs`, `skills/ui-design/scripts/lib/{cdp,probe,rules}.mjs` (từ `skills/design-taste-frontend/scripts/`), `skills/ui-design/LICENSE` (từ `skills/design-taste-frontend/LICENSE`)
- Create: `tests/fixtures/ui-tells.html`
- Test: `tests/ui-design-lint.test.mjs`

**Interfaces:**
- Produces (CLI, Task 4 dẫn lại nguyên văn):
  - `node <skill>/scripts/lint.mjs [paths…] [--app] [--allow rule,rule] [--json]` — thoát 1 khi có FAIL.
  - `node <skill>/scripts/inspect.mjs <url|file.html> [--app] [--allow rule,rule] [--out DIR] [--widths 1440,768,390] [--json]` — mặc định `--out .tmp/ui-design/inspect`.

- [ ] **Step 1: Tạo fixture** `tests/fixtures/ui-tells.html`: một nút `background: linear-gradient(...)`, một nhãn `text-transform: uppercase; letter-spacing: .2em; font-size: 11px`, ba khối đánh số `01` `02` `03`, một thẻ `box-shadow: 0 10px 30px rgba(0,0,0,.2)`.
- [ ] **Step 2: Viết test hỏng** `tests/ui-design-lint.test.mjs` (chạy script bằng `spawnSync(process.execPath, …, { encoding: 'utf8' })` với `--json`):
  - `'lint bắt đủ dấu hiệu cài sẵn'`: exit 1; tập `id` trong kết quả chứa id gradient, id tracked-caps, `numbering`, `shadow` (dùng đúng id mà `lib/rules`/`lint.mjs` hiện đặt — đọc từ mã trước khi viết test).
  - `'--allow shadow tắt đúng luật bóng đổ'`: không còn `shadow`, các id khác vẫn còn.
  - `'bỏ qua node_modules, .next, .tmp'`: thư mục tạm chứa fixture trong `node_modules/`, `.next/`, `.tmp/` → không có phát hiện nào.
- [ ] **Step 3: Chạy** → FAIL (script chưa có).
- [ ] **Step 4: Chép và rút gọn**:
  - Bỏ mọi chỗ đọc `.taste-skill/direction.json` (chế độ app chỉ bật bằng `--app`); bỏ `dealtFonts`, `--film`, toàn bộ nhánh scene (`sceneFindings`, `scene-*`, `scenes.mjs`).
  - `lint.mjs`: thêm `--allow rule,rule` (lọc phát hiện theo id); thêm `.tmp` vào `SKIP`; bỏ `.taste-skill` khỏi `SKIP`; giữ chú thích bỏ qua dòng nhưng đổi chữ `taste-skill-ignore` thành `ui-design-ignore`.
  - `inspect.mjs`: mặc định `--out .tmp/ui-design/inspect`. Không tìm được trình duyệt → in `No Chrome, Edge or Chromium found. Set CHROME_PATH or install one.` và thoát 2.
  - Mọi thông điệp `fix:` đang trỏ tới `references/motion.md`, `scenes.md`, `imagery.md` hay các tệp sẽ không tồn tại: viết lại thành lời khuyên tự đủ nghĩa, hoặc trỏ tới tệp mà Task 4 tạo (`references/app-screens.md`, `references/public-page.md`, `references/tells.md`).
- [ ] **Step 5: Chạy** `node --test tests/ui-design-lint.test.mjs` → PASS.
- [ ] **Step 6: Kiểm tay `inspect.mjs`**: `node skills/ui-design/scripts/inspect.mjs tests/fixtures/ui-tells.html --out .tmp/ui-design/inspect` → có ảnh `desktop-*`, `tablet-*`, `mobile-*` trong `.tmp/ui-design/inspect`, báo FAIL gradient. Xoá `.tmp/ui-design` sau khi kiểm.
- [ ] **Step 7: Commit** `feat(ui-design): script lint va inspect rut gon tu taste-skill`.

### Task 4: `SKILL.md` và tài liệu của `ui-design`, bỏ hai skill giao diện cũ

**Files:**
- Create: `skills/ui-design/SKILL.md`, `skills/ui-design/references/app-screens.md`, `skills/ui-design/references/public-page.md`, `skills/ui-design/references/tells.md`
- Delete: `skills/frontend-design/`, `skills/design-taste-frontend/`

- [ ] **Step 1: Viết `SKILL.md`** (tiếng Anh, ≤ 250 dòng). `description`: dựng, sửa, restyle hay review giao diện web/app ở mọi stack; cả màn hình nghiệp vụ lẫn trang công khai; khi người dùng nói giao diện trông chung chung, như template, như AI làm. Thân:
  1. Bước đầu: chọn **app screen** hay **public page**, và đọc luật của repo trước — repo quy định phong cách (ví dụ "đơn giản, không màu mè", quy ước KPI) thì repo thắng skill.
  2. Luật nền chung cho cả hai (lấy từ house rules taste-skill, gọn): không eyebrow, không 01/02/03 trừ khi là thứ tự thật, không gradient trang trí, không glass/blur, không icon trong ô màu lặp lại, tối đa hai typeface, không chữ in hoa giãn cách nhỏ, không chữ nhấn một từ trong tiêu đề, không bảng màu "assistant" (kem + đất nung, tím/chàm), chữ thân ở màu mực đầy đủ.
  3. Trang công khai: tóm quy trình (đọc brief và kê 8–12 thứ chỉ chủ thể này có → câu ý tưởng + phép thử đối thủ → viết chữ trước, tiêu đề ≤ 2 dòng → dựng → đo → nhìn ảnh chụp, sửa 3 lỗi lớn nhất, tối đa 3 vòng). Chi tiết → `references/public-page.md`.
  4. Màn hình nghiệp vụ: tóm tám điều trong app-screens (màu trên dữ liệu không trên khung; KPI là chữ không phải ô; bề mặt phẳng; không hero header; chart ít chrome; nav lùi lại; bảng là đường kẻ và căn lề, số căn phải; trạng thái dữ liệu trung thực). Chi tiết → `references/app-screens.md`.
  5. Đo: lệnh `lint.mjs` / `inspect.mjs` đúng như Interfaces của Task 3; sửa mọi FAIL; WARN phải bảo vệ được bằng một câu; luật repo cho phép thì `--allow <id>` và ghi lý do trong báo cáo; không có Chrome thì nói thẳng là chưa đo.
  6. Báo cáo: đã đo gì, còn FAIL/WARN nào và vì sao giữ, nội dung mẫu nào phải thay.
- [ ] **Step 2: Viết `references/app-screens.md`**: rút từ `design-taste-frontend/references/app-screens.md` (1.199 dòng) xuống ≤ 400 dòng: giữ quy trình §2, shell §3, title §4, KPI §5, chart §6, bảng §7, form §8, type/màu §9 kèm default tokens, density §10, trạng thái §11, phone §12, house rules §13 (hai bảng được phép / bị cấm), tells §14. Bỏ số liệu nghiên cứu dài, giữ con số luật.
- [ ] **Step 3: Viết `references/public-page.md`** (≤ 300 dòng): quy trình trang từ `design-taste-frontend/SKILL.md` bỏ mọi bước phụ thuộc `draw.mjs`, `assets.mjs`, scene; giữ inventory, argument, idea + competitor test, "one live thing", copy (headline ≤ 2 dòng, ~32 ký tự), build order (tokens → hero → sections → imagery → fullness → frame → states), laws of the craft (type, space, colour, imagery, components), motion tối giản (transform/opacity, `prefers-reduced-motion`, không chỉ tiêu số phần tử chuyển động). Ảnh: dùng ảnh của dự án hoặc vẽ bằng mã; không bịa khách hàng, trích dẫn, số liệu.
- [ ] **Step 4: Viết `references/tells.md`** (≤ 120 dòng): gộp `design-taste-frontend/references/tells.md` và danh sách dấu hiệu của `frontend-design/SKILL.md`, bỏ trùng.
- [ ] **Step 5: Xoá** `skills/frontend-design/`, `skills/design-taste-frontend/`.
- [ ] **Step 6: Chạy** `npm test` → PASS (`tests/skills.test.mjs` kiểm tham chiếu `references/…`, `scripts/…`).
- [ ] **Step 7: Commit** `feat(skills): ui-design thay frontend-design va design-taste-frontend`.

### Task 5: `postgres` và `nodejs`, bỏ `pdf-processing-pro`

**Files:**
- Create: `skills/postgres/SKILL.md`, `skills/nodejs/SKILL.md`
- Delete: `skills/postgres-best-practices/`, `skills/nodejs-best-practices/`, `skills/pdf-processing-pro/`

- [ ] **Step 1: Viết `skills/postgres/SKILL.md`** (≤ 250 dòng, tiếng Anh) từ 30 tệp `rules/` của postgres-best-practices, giữ dạng "rule → sai/đúng SQL ngắn": RLS cơ bản và hiệu năng RLS (`(select auth.uid())`, index cột lọc trong policy), index thiếu / composite / partial / covering, index cho khoá ngoại, phân trang keyset, upsert, batch insert, N+1, giao dịch ngắn và `SKIP LOCKED`, `EXPLAIN (ANALYZE, BUFFERS)` và `pg_stat_statements`, kiểu dữ liệu và khoá chính, connection pooling. Thêm một mục: migration không phá huỷ (khớp `rules/10-an-toan-du-lieu.md`). `description` nhắc Supabase.
- [ ] **Step 2: Viết `skills/nodejs/SKILL.md`** (≤ 200 dòng) rút từ `nodejs-best-practices`: chọn framework/runtime, async và xử lý lỗi, bảo mật (input, bí mật — khớp luật cấm fallback chuỗi cứng), cấu trúc tầng khớp SRP/SoC trong `rules/20-kien-truc-va-ma.md`, test bằng `node:test`/Vitest.
- [ ] **Step 3: Xoá** ba thư mục cũ.
- [ ] **Step 4: Chạy** `npm test` → PASS.
- [ ] **Step 5: Commit** `feat(skills): postgres va nodejs viet lai gon, bo pdf-processing-pro`.

### Task 6: Luật, `NGUON.md`, README, cài lên máy

**Files:**
- Modify: `rules/30-giao-dien.md`, `rules/00-cach-lam-viec.md`, `NGUON.md`, `README.md`

- [ ] **Step 1: `rules/30-giao-dien.md`**: xoá dòng "Đơn giản, thực dụng; không màu mè…"; dòng trỏ skill đổi thành `ui-design`, bỏ phần "không thêm chuyển động trang trí để đủ chỉ tiêu"; dòng thư mục tạm đổi thành: script của `ui-design` ghi vào `.tmp/ui-design/`, luật repo cần giữ một mẫu bị cấm thì `--allow <id>`.
- [ ] **Step 2: `rules/00-cach-lam-viec.md`**: `humanizer` → `writing`, `tieng-viet.md` → `references/vietnamese.md`.
- [ ] **Step 3: `NGUON.md`**: bỏ các dòng `pdf-processing-pro`, `frontend-design`, `design-taste-frontend`, `humanizer` khỏi bảng chép nguyên; thêm mục "Dựa trên" ghi: `ui-design` (Leonxlnx/taste-skill@6010f91, MIT, script rút gọn), `writing` (blader/humanizer@8c307f3, MIT), `postgres` (supabase postgres-best-practices), `nodejs` (bản cộng đồng cũ), cùng câu "đã viết lại, không đồng bộ với bản gốc". Bảng "chuyển vào từ máy này" sửa tên skill đã đổi.
- [ ] **Step 4: Kiểm tra không còn tên cũ**: `grep -rnE "humanizer|design-taste-frontend|frontend-design|pdf-processing-pro|postgres-best-practices|nodejs-best-practices|taste-skill-ignore|\.taste-skill" rules README.md skills plugin lib install.mjs` → chỉ còn trong `NGUON.md` và `LICENSE`.
- [ ] **Step 5: Cài và kiểm**: `node install.mjs` → in dòng gỡ cho các skill cũ ở cả ba công cụ; `node install.mjs --kiem` → `Sạch.`; `ls ~/.claude/skills ~/.codex/skills ~/.gemini/config/skills` có `ui-design writing postgres nodejs`, không còn tên cũ; `npm test` PASS; `node skills/ui-design/scripts/lint.mjs D:/CustomerManager/src --app` chạy hết không lỗi script (chỉ đọc, kết quả FAIL/WARN không phải điều kiện).
- [ ] **Step 6: Commit** `docs(rules): tro toi ui-design va writing, bo luat khong mau me khoi luat chung`.
