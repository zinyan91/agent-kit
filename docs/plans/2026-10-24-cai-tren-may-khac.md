# Cài agent-kit lên máy khác — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: superpowers:executing-plans. Steps use checkbox (`- [ ]`) syntax.

**Goal:** `npx -y github:zinyan91/agent-kit` cài đủ skill, luật, plugin và git hook trên một máy Windows khác; máy đó tự cập nhật khi mở Claude; luật "Máy này" tách theo tên máy; chọn được bỏ nhóm skill riêng.

**Architecture:** Mọi thành phần tìm kit ở `~/.agent-kit` (máy nguồn: junction về `D:\agent-kit`; máy dùng: bản clone). Quyết định nằm trong hàm thuần ở `lib/` và `plugin/hooks/lib/`; `install.mjs`, `bin/agent-kit.mjs` và hook chỉ nối I/O. Trạng thái máy (nhóm đã chọn, lần cập nhật gần nhất) ở `~/.agent-kit-may.json`.

**Tech Stack:** Node ESM, `node:test`, git CLI, không phụ thuộc npm.

**Spec:** `docs/specs/2026-10-23-cai-tren-may-khac.md`, phần B.

## Global Constraints

- Chỉ Windows. Node ≥ 18 cho bin và install. Không thêm phụ thuộc npm.
- `~/` nghĩa là `nhaNguoiDung()` (tôn trọng `AGENT_KIT_NHA`). Không còn chuỗi `D:\agent-kit` trong `plugin/`.
- Tên máy: `os.hostname().toUpperCase()`, ghi đè được bằng `AGENT_KIT_TEN_MAY` (cho test). Máy nguồn: `YING`.
- `kit.json`: `"nhomRieng": ["tin-dung", "fp"]`.
- Tệp trạng thái: `~/.agent-kit-may.json` = `{ "chiChung": boolean, "lanKiemCuoi": ISO string | null, "ketQuaCuoi": { "luc": ISO, "ok": boolean, "loi"?: string } | null }`.
- Chu kỳ tự cập nhật: 6 giờ.
- Biến cho test: `AGENT_KIT_GIT_URL` (nguồn clone, mặc định `https://github.com/zinyan91/agent-kit`), `AGENT_KIT_BO_PLUGIN=1` (bỏ bước `claude plugin`).
- Không ghi đè thứ không do kit tạo; xung đột thì báo và dừng như hiện nay.
- Bump plugin `version` 1.0.0 → 1.1.0 ở `plugin/.claude-plugin/plugin.json` và `.claude-plugin/marketplace.json`.
- Commit: tiếng Việt không dấu, kết thúc bằng `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`. Không commit 4 tệp tin-dung/nha-anh-chatgpt của người dùng.

## Review Focus

- `~/.agent-kit` đã là một thư mục thật khi chạy từ `D:\agent-kit` → báo xung đột, không xoá. (Task 2)
- Thư mục `~/.gemini/config/rules` do người dùng tự tạo (không có tệp đánh dấu) → không ghi đè. (Task 1)
- Máy dùng bị sửa tay trong `~/.agent-kit` → `pull --ff-only` lỗi, ghi lỗi vào trạng thái, lần mở phiên sau cảnh báo; không reset. (Task 4)
- Tệp trạng thái hỏng (JSON sai) → coi như chưa có, không làm hook văng lỗi. (Task 4)
- `--chi-chung` sau khi đã cài đủ → gỡ junction `tin-dung`, `fp`; chạy lại không cờ → nối lại. (Task 1)

---

### Task 1: Luật theo máy, thư mục luật Antigravity, nhóm skill

**Files:** Modify `plugin/hooks/lib/luat.mjs`, `lib/ke-hoach.mjs`, `lib/he-thong.mjs`, `install.mjs`, `kit.json`, `plugin/hooks/tiem-luat.mjs`; move `rules/90-may-nay.md` → `rules/may/YING.md`. Test: `tests/luat.test.mjs`, `tests/ke-hoach.test.mjs`, `tests/install.test.mjs`.

**Interfaces (produces):**
- `docLuatChoMay(thuMucLuat: string, tenMay: string) => Array<{ten, noiDung}>` — `rules/*.md` cộng `rules/may/<tenMay>.md` nếu có; không đọc tệp máy khác.
- `tenMay() => string` trong `lib/he-thong.mjs`.
- `quyetDinhThuMucLuat(trang) => { loai: 'tao' | 'ghi-de' | 'thay-junction' | 'xung-dot', lyDo? }` với `trang` = `hienTrang(dich)` mở rộng thêm `coDanhDau: boolean` cho thư mục thật.
- `chonSkill(skills: string[], nhomRieng: string[], chiChung: boolean) => string[]`.
- Hằng tệp đánh dấu: `.agent-kit`.

- [ ] Test hỏng: `docLuatChoMay` với thư mục tạm có `00-a.md`, `may/YING.md`, `may/KHAC.md` → tên `YING` nhận `00-a.md` + `YING.md`, không có `KHAC.md`; tên không có tệp → chỉ `00-a.md`.
- [ ] Test hỏng: `quyetDinhThuMucLuat` — không có → `tao`; thư mục có đánh dấu → `ghi-de`; thư mục không đánh dấu → `xung-dot`; junction (bản cũ trỏ `rules/`) → `thay-junction`; tệp → `xung-dot`. `chonSkill(['a','fp','tin-dung'], ['tin-dung','fp'], true)` → `['a']`; `false` → nguyên.
- [ ] Viết các hàm; `git mv rules/90-may-nay.md rules/may/YING.md`.
- [ ] `install.mjs`: luật = `docLuatChoMay(THU_MUC_LUAT, tenMay())` cho Codex, Antigravity và ngân sách; Antigravity ghi thư mục thật (chép tệp đã chọn, tệp `.agent-kit`, xoá `.md` thừa trong thư mục có đánh dấu); `--kiem` so nội dung; `--go` xoá thư mục có đánh dấu. Skill cài = `chonSkill(...)` theo cờ `--chi-chung`; `timJunctionMoCoi` nhận danh sách đã chọn nên gỡ được nhóm riêng. Thông điệp gỡ: `(không còn trong bộ cài)`.
- [ ] `tiem-luat.mjs`: kit = `AGENT_KIT_DIR` → `~/.agent-kit`; dùng `docLuatChoMay`.
- [ ] Test đầu-cuối trong `tests/install.test.mjs` (đặt `AGENT_KIT_TEN_MAY` trong `chay`): luật Antigravity là thư mục thật có `.agent-kit` và có luật máy đúng tên; thư mục luật tự tạo → xung đột, không đụng; `--chi-chung` gỡ `tin-dung`, chạy lại không cờ thì nối lại. Sửa test cũ đang kỳ vọng junction luật.
- [ ] `npm test` xanh; commit `feat(luat): luat theo ten may, thu muc luat Antigravity that, nhom skill rieng`.

### Task 2: Vai nguồn/dùng, `~/.agent-kit`, trạng thái máy, plugin

**Files:** Create `lib/vai.mjs`, `lib/trang-thai.mjs`. Modify `install.mjs`, `kit.json` (không), plugin version (2 tệp). Test: `tests/vai.test.mjs`, `tests/trang-thai.test.mjs`, `tests/install.test.mjs`.

**Interfaces (produces):**
- `nhanVai(kit: string, nhaKit: string) => 'nguon' | 'dung'` — `dung` khi cùng chỗ (không phân biệt hoa thường).
- `quyetDinhNhaKit(trang, kit) => { loai: 'tao' | 'giu' | 'xung-dot', lyDo? }` (chỉ dùng ở vai nguồn).
- `docTrangThai(): TrangThai` (JSON hỏng hoặc không có → mặc định), `ghiTrangThai(patch: Partial<TrangThai>): void`, `TEP_TRANG_THAI` = `~/.agent-kit-may.json`.

- [ ] Test hỏng cho `nhanVai`, `quyetDinhNhaKit` (không có → tạo; junction về kit → giữ; thư mục thật/junction khác → xung đột), `docTrangThai` với tệp hỏng.
- [ ] Viết; `install.mjs` vai nguồn tạo junction `~/.agent-kit`; mọi lần cài ghi `chiChung`. Vai dùng và `--kiem`: plugin chưa bật thì, nếu có lệnh `claude` và không có `AGENT_KIT_BO_PLUGIN`, chạy `claude plugin marketplace add <KIT>` và `claude plugin install agent-kit@agent-kit`; không có `claude` thì in việc còn thiếu, không lỗi.
- [ ] Test đầu-cuối: sau `chay()`, `<nha>/.agent-kit` là junction về KIT và `<nha>/.agent-kit-may.json` có `chiChung: false`; tạo sẵn thư mục thật `<nha>/.agent-kit` → xung đột, không xoá.
- [ ] Bump version plugin; `npm test`; commit `feat(install): vai nguon/dung, ~/.agent-kit va trang thai may`.

### Task 3: `bin/agent-kit.mjs` cho `npx`

**Files:** Create `bin/agent-kit.mjs`. Modify `package.json` (`"bin": { "agent-kit": "bin/agent-kit.mjs" }`). Test: `tests/bin.test.mjs`.

- [ ] Test hỏng: dựng repo git tạm có `install.mjs` giả (ghi `process.argv.slice(2)` vào `<nha>/da-chay.json`); chạy bin với `AGENT_KIT_NHA=<nha2>`, `AGENT_KIT_GIT_URL=<repo tạm>`, đối số `--chi-chung` → `<nha2>/.agent-kit` là bản clone, `da-chay.json` = `["--chi-chung"]`. Commit thêm vào repo tạm rồi chạy lại → bản clone có commit mới (pull). `<nha>/.agent-kit` là junction → không gọi git, vẫn chạy install.
- [ ] Viết bin: chỉ import module có sẵn của Node (npx chạy từ cache); kiểm Node ≥ 18 và `git --version`, thiếu thì in đúng thứ thiếu và thoát 1; clone `--depth 1` / `pull --ff-only` / bỏ qua nếu junction; chạy `node <nha>/.agent-kit/install.mjs ...args` kế thừa stdio, thoát theo mã của nó.
- [ ] `npm test`; commit `feat(bin): lenh npx cai agent-kit len may khac`.

### Task 4: Tự cập nhật khi mở Claude

**Files:** Create `plugin/hooks/lib/cap-nhat.mjs`, `plugin/hooks/cap-nhat.mjs`, `plugin/hooks/cap-nhat-nen.mjs`. Modify `plugin/hooks/hooks.json`. Test: `tests/cap-nhat.test.mjs`.

**Interfaces (produces):**
- `quyetDinhCapNhat({ laJunction: boolean, trangThai, bayGio: number, chuKyMs: number }) => { chay: boolean, canhBao: string | null }` — junction → không chạy, không cảnh báo; `ketQuaCuoi.ok === false` → `canhBao` chứa nguyên `loi`; `lanKiemCuoi` trong vòng chu kỳ → không chạy.

- [ ] Test hỏng cho các nhánh của `quyetDinhCapNhat`; test chạy `cap-nhat-nen.mjs` trên một bản clone tạm (repo git tạm làm origin): có commit mới → pull và gọi install giả với `--chi-chung` khi trạng thái lưu `chiChung: true`, ghi `ok: true`; bản clone bị sửa tay khiến pull lỗi → ghi `ok: false` kèm lỗi, không reset.
- [ ] Viết: hook đọc trạng thái, in cảnh báo nếu có, ghi `lanKiemCuoi` rồi tách tiến trình `node <nha>/.agent-kit/plugin/hooks/cap-nhat-nen.mjs` (`detached`, `stdio: 'ignore'`, `windowsHide`, `unref`) và thoát ngay. Nền: `git pull --ff-only`; HEAD đổi → `install.mjs` (+`--chi-chung` theo trạng thái); version plugin đổi → `claude plugin marketplace update agent-kit` và `claude plugin update agent-kit@agent-kit` (bỏ khi `AGENT_KIT_BO_PLUGIN`); ghi `ketQuaCuoi`.
- [ ] Đăng ký hook trong `hooks.json` (SessionStart, `startup|resume`, timeout 10).
- [ ] `npm test`; commit `feat(plugin): tu cap nhat kit khi mo phien Claude`.

### Task 5: README, giả lập máy mới, cài lại máy nguồn

- [ ] README: mục "Cài lên máy khác" (điều kiện B.10, lệnh npx, `--chi-chung`, cập nhật tự động, tên máy và `rules/may/`), sửa bảng "Mỗi công cụ nhận gì" (Antigravity nhận thư mục luật thật), soát văn bằng skill `writing`.
- [ ] Giả lập máy mới: `AGENT_KIT_NHA=<tạm>`, `GIT_CONFIG_GLOBAL=<tạm>/.gitconfig`, `AGENT_KIT_BO_PLUGIN=1`, `AGENT_KIT_TEN_MAY=MAYTHU`, `AGENT_KIT_GIT_URL=D:/agent-kit` → `node bin/agent-kit.mjs` → clone, skill đủ ba công cụ, luật không có `YING.md`, `--kiem` chỉ còn báo plugin chưa bật. Xoá thư mục tạm.
- [ ] Máy nguồn: `node install.mjs` rồi `--kiem` sạch; `claude plugin marketplace update agent-kit` + `claude plugin update agent-kit@agent-kit` để nhận hook mới; chạy `node plugin/hooks/tiem-luat.mjs` thấy luật có phần `YING`.
- [ ] Commit `docs: huong dan cai len may khac`.
- [ ] Chưa kiểm được: `npx` lấy repo private từ GitHub (cần push trước) và máy Windows thứ hai — báo người dùng.
