# agent-kit: gọn nhóm skill chung và cài lên máy khác bằng một lệnh

Hai phần: **A** viết lại nhóm skill chung cho gọn, **B** cài lên máy khác. Làm A trước, vì B chép những gì A để lại.

## A. Viết lại nhóm skill chung

### A.1 Vì sao

Nhóm chung hiện phần lớn là repo người khác chép nguyên vào: `design-taste-frontend` 39 tệp ~8.800 dòng (phần lớn cho trang marketing, kèm thư viện 247 trang mẫu), `postgres-best-practices` 37 tệp ~3.400 dòng, `pdf-processing-pro` ~2.000 dòng (bản gốc thiếu 7/8 script nó nhắc tới), `humanizer` ~470 dòng, `nodejs-best-practices` ~340 dòng, `frontend-design` trùng mục đích với taste-skill. Nặng, rời rạc, khó biết skill nào nói gì. Người dùng muốn các skill này được viết lại thành của mình, gom gọn.

### A.2 Kết quả

Skill viết bằng **tiếng Anh**, mỗi `SKILL.md` khoảng 250 dòng trở xuống; chi tiết dài đặt trong `references/` cùng thư mục và chỉ đọc khi cần.

| Skill mới | Thay cho | Nội dung |
|---|---|---|
| `ui-design` | `frontend-design`, `design-taste-frontend` | Hai chế độ, agent chọn ở bước đầu: **màn hình nghiệp vụ** (dashboard, bảng, form, cài đặt; lấy từ `app-screens.md` của taste-skill) và **trang công khai** (landing, giới thiệu sản phẩm; lấy quy trình brief → ý tưởng từ chính chủ thể → chữ → dựng → soát, cùng danh sách dấu hiệu "trang do AI làm"). Bỏ thư viện hướng thiết kế, kho ảnh mở, cảnh cuộn. |
| `ui-design/scripts` | script của taste-skill | **Bản rút gọn**: `lint.mjs` (quét mã nguồn, Node ≥ 18) và `inspect.mjs` (mở trang trong Chrome/Edge thật ở 1440/768/390, đo và chụp ảnh, Node ≥ 22) cùng đúng các `lib/` hai script này cần. Bỏ `draw.mjs`, `assets.mjs`, `scenes.mjs`, `library/`, `evals/`. Mặc định ghi ra `.tmp/ui-design/` thay vì `.taste-skill/`. Có cờ hoặc tệp cấu hình để repo tắt một luật đo cụ thể (ví dụ bóng đổ trên thẻ KPI ở CustomerManager). |
| `writing` | `humanizer` + `tieng-viet.md` | Quy trình soát văn và các dấu hiệu AI (tiếng Anh), cộng `references/vietnamese.md` cho các dấu hiệu riêng của tiếng Việt (giữ nội dung `tieng-viet.md` hiện có, phần này vẫn viết tiếng Việt). |
| `postgres` | `postgres-best-practices` | Một tệp: những gì repo Supabase của người dùng hay gặp (RLS và hiệu năng RLS, index cho khoá ngoại và điều kiện lọc, phân trang, upsert, migration không phá huỷ, giao dịch ngắn, đọc `EXPLAIN`). |
| `nodejs` | `nodejs-best-practices` | Rút gọn, giữ phần quyết định (async, lỗi, bảo mật, cấu trúc) và khớp luật SRP/SoC. |
| (bỏ) | `pdf-processing-pro` | Claude có sẵn skill PDF; bản này hỏng một phần. |

Giữ nguyên, không viết lại: `document-formatting`, `codex-with-chatgpt`, `nha-anh-chatgpt`, và nhóm riêng (`tin-dung`, `fp`).

Script rút gọn và nội dung viết lại dựa trên mã MIT của Leonxlnx/taste-skill và blader/humanizer: giữ tệp `LICENSE` gốc trong thư mục skill tương ứng, ghi nguồn tham khảo trong `NGUON.md`. `NGUON.md` sau đó chỉ còn ghi "dựa trên" chứ không còn bảng skill chép nguyên.

### A.3 Luật đi kèm

- Câu "Đơn giản, thực dụng; không màu mè, không hiệu ứng trang trí" **bỏ khỏi luật chung** (`rules/30-giao-dien.md`). Đó là yêu cầu của một số web (CustomerManager đã ghi trong `AGENTS.md` riêng), không phải của mọi web.
- Hai dòng trỏ skill trong luật chung đổi tên: `humanizer` → `writing`, `design-taste-frontend` → `ui-design`. Dòng về thư mục tạm đổi theo đường dẫn mới `.tmp/ui-design/`.
- Các luật chữ trên giao diện còn lại (không tooltip thừa, nhãn tự đủ nghĩa, rỗng khác lỗi) giữ nguyên.

### A.4 Gỡ skill cũ

`install.mjs` hiện không gỡ junction của skill đã bị xoá khỏi kit. Thêm: junction nào trong thư mục skill của một công cụ mà trỏ vào `<kit>/skills/<tên>` không còn tồn tại thì gỡ. Junction trỏ chỗ khác và thư mục thật không đụng tới.

### A.5 Kiểm chứng phần A

- Mỗi skill mới: frontmatter hợp lệ, `name` trùng thư mục, `SKILL.md` ≤ ~250 dòng.
- `lint.mjs` chạy trên `D:\CustomerManager\src` (chỉ đọc) và trên một trang HTML mẫu có cài sẵn lỗi (gradient, chữ in hoa giãn cách, 01/02/03): bắt đủ các lỗi cài sẵn.
- `inspect.mjs` chạy trên trang mẫu đó bằng Chrome/Edge của máy này, ra ảnh chụp ở ba độ rộng và báo FAIL đúng chỗ.
- Sau `install.mjs`: không còn junction của skill cũ ở cả ba công cụ, `--kiem` sạch.

## B. Cài lên máy khác

### B.1 Vì sao

agent-kit hiện chỉ chạy trên máy dev này: plugin Claude đọc luật ở `D:\agent-kit\rules`, junction trỏ về `D:\agent-kit`, luật `90-may-nay.md` chứa đường dẫn và bẫy của riêng máy này. Người dùng có thêm máy Windows khác và muốn ở đó có đủ skill, luật, hook cho Claude, Codex, Antigravity mà chỉ gõ một lệnh.

### B.2 Mục tiêu, không làm, không được xảy ra

**Mục tiêu**
- Máy Windows mới, đã có Node, git và quyền đọc repo private `zinyan91/agent-kit`: `npx -y github:zinyan91/agent-kit` cài xong skill, luật, plugin Claude và git hook cho cả ba công cụ.
- Máy dùng tự lấy bản mới khi người dùng push từ máy này, không cần chạy lại lệnh.
- Chọn được nhóm skill: **chung** (mọi skill trừ nhóm riêng) và **riêng** (`tin-dung`, `fp`).
- Luật theo máy: mỗi máy chỉ nhận phần "Máy này" của chính nó.

**Không làm**
- Mac, Linux.
- Đưa lên npm. Repo giữ private vì `tin-dung` chứa kiến thức nghiệp vụ và `fp` gọi máy chủ riêng.
- Chia sẻ cho người khác.
- Sửa kit trên máy dùng. Máy dùng chỉ nhận; mọi sửa đổi làm ở máy nguồn (máy này) rồi push.

**Không được xảy ra**
- Mở phiên Claude chậm đi vì kiểm tra cập nhật.
- Máy này (máy nguồn) mất cách làm hiện tại: sửa `D:\agent-kit` là có hiệu lực ngay, không qua push/pull.
- Cập nhật tự động xoá hay ghi đè thứ không do kit tạo (giữ nguyên nguyên tắc hiện có của `install.mjs`).

### B.3 Hai vai của một máy

| | Máy nguồn (máy này) | Máy dùng |
|---|---|---|
| Kit nằm ở | `D:\agent-kit` (repo đang sửa) | `%USERPROFILE%\.agent-kit` (bản clone, chỉ đọc) |
| `%USERPROFILE%\.agent-kit` | junction trỏ về `D:\agent-kit` | chính là bản clone |
| Cài lần đầu | `node D:\agent-kit\install.mjs` (như hiện nay) | `npx -y github:zinyan91/agent-kit` |
| Cập nhật | sửa là ăn ngay | tự `git pull` khi mở phiên Claude |

Nhờ junction ở máy nguồn, mọi thành phần chỉ cần biết một đường dẫn: `~/.agent-kit`. Plugin, hook và luật không còn chuỗi `D:\agent-kit` nào.

Cách nhận vai: `install.mjs` chạy từ thư mục khác `~/.agent-kit` là máy nguồn. Nó tạo junction `~/.agent-kit` trỏ về thư mục của mình nếu chưa có. Đã có một thư mục thật ở đó thì báo xung đột, không đụng vào.

### B.4 Lệnh `npx`

`package.json` thêm `"bin": { "agent-kit": "bin/agent-kit.mjs" }`. `bin/agent-kit.mjs` chỉ làm khởi động:

1. Kiểm tra Node ≥ 18 và có `git`. Thiếu thì báo rõ thiếu gì rồi dừng.
2. Chưa có `~/.agent-kit`: `git clone --depth 1 https://github.com/zinyan91/agent-kit ~/.agent-kit`. Có rồi và là bản clone: `git -C ~/.agent-kit pull --ff-only`. Là junction (máy nguồn): bỏ qua bước git.
3. Gọi `node ~/.agent-kit/install.mjs` với các đối số người dùng truyền vào.

npx chạy bản tải về trong cache của nó. Phần cài thật luôn chạy từ `~/.agent-kit`, nên xoá cache npx không làm hỏng gì.

Đối số chuyển tiếp cho `install.mjs`:

| Đối số | Việc |
|---|---|
| (không có) | cài cả hai nhóm |
| `--chi-chung` | chỉ nhóm chung; gỡ skill nhóm riêng nếu trước đó đã cài |
| `--kiem` | chỉ đọc, như hiện nay |
| `--go` | gỡ mọi thứ kit đã tạo, như hiện nay; không xoá `~/.agent-kit` |

Lựa chọn nhóm được ghi vào `~/.agent-kit-may.json` (ngoài repo) để lần cập nhật tự động sau giữ đúng lựa chọn.

### B.5 Nhóm skill

`kit.json` thêm `"nhomRieng": ["tin-dung", "fp"]`. Skill không có trong danh sách thuộc nhóm chung. `chiVao` (giới hạn theo công cụ) giữ nguyên và áp dụng sau khi lọc nhóm.

### B.6 Luật theo máy

- `rules/90-may-nay.md` chuyển thành `rules/may/<TEN-MAY>.md`, với `<TEN-MAY>` = `os.hostname()` viết hoa (trên Windows là `COMPUTERNAME`). Máy nguồn tên `YING`, nên tệp đầu tiên là `rules/may/YING.md`. Máy chưa có tệp riêng thì chỉ nhận luật chung.
- Luật nạp cho một máy = `rules/*.md` + `rules/may/<TEN-MAY>.md` nếu có. Thư mục `rules/may/` không bao giờ được nạp nguyên.
- Cả ba nơi nạp luật dùng chung một hàm chọn tệp: plugin Claude (`tiem-luat.mjs`), vùng mốc trong `~/.codex/AGENTS.md`, và thư mục luật Antigravity.
- Antigravity: `~/.gemini/config/rules` đổi từ junction thành **thư mục thật do kit sinh ra**, gồm bản chép các tệp luật đã chọn cùng một tệp đánh dấu `.agent-kit`. Lý do: junction trỏ vào `rules/` sẽ kéo theo luật của mọi máy. Lần cài sau chỉ ghi đè thư mục có tệp đánh dấu; thư mục không có tệp đánh dấu thì báo xung đột.
- Ngân sách 200 dòng tính trên tập luật nạp cho máy đang chạy.

### B.7 Plugin Claude

- `tiem-luat.mjs`: thứ tự tìm kit là `AGENT_KIT_DIR` → `~/.agent-kit`. Bỏ mặc định `D:\agent-kit`.
- Marketplace `agent-kit` đăng ký từ `~/.agent-kit` (kiểu thư mục). `install.mjs` tự chạy `claude plugin marketplace add` và `claude plugin install agent-kit@agent-kit` nếu máy có lệnh `claude`; không có thì ghi vào danh sách việc còn thiếu ở cuối, không coi là lỗi chặn.
- Máy nguồn đang đăng ký marketplace từ `D:\agent-kit`. Giữ nguyên, không ép đổi; cả hai đường dẫn đều trỏ về cùng tệp.

### B.8 Tự cập nhật

Hook `SessionStart` mới trong plugin: `cap-nhat.mjs`.

- Máy nguồn (`~/.agent-kit` là junction): thoát ngay.
- Lần kiểm tra trước chưa quá 6 giờ (mốc thời gian ghi ở `~/.agent-kit-may.json`): thoát ngay.
- Còn lại: **tách tiến trình chạy nền** rồi thoát ngay, để không làm chậm lúc mở phiên. Tiến trình nền chạy `git pull --ff-only`. Có commit mới thì chạy `install.mjs` với lựa chọn nhóm đã lưu.
- Plugin đổi `version` thì tiến trình nền chạy thêm `claude plugin marketplace update agent-kit` và `claude plugin update agent-kit@agent-kit`.
- Kết quả lần chạy gần nhất (thành công, hoặc lỗi kèm thông điệp nguyên văn) ghi vào `~/.agent-kit-may.json`. Lần mở phiên sau, nếu lần trước lỗi, hook in một dòng cảnh báo vào ngữ cảnh để agent báo cho người dùng.
- `pull --ff-only` thất bại (ai đó sửa tay trong `~/.agent-kit`, hay lịch sử bị viết lại) thì dừng và báo, không reset, không xoá.

Hệ quả: phiên Claude mở ngay sau khi push vẫn dùng bản cũ, phiên sau mới có bản mới. Codex và Antigravity nhận bản mới mỗi khi Claude được mở; máy chỉ dùng Codex thì chạy lại lệnh `npx`.

### B.9 Git hook

`core.hooksPath` toàn cục = `~/.agent-kit/git-hooks` trên máy dùng. Máy nguồn giữ `D:/agent-kit/git-hooks` như hiện nay (`install.mjs` so với thư mục của chính nó).

### B.10 Điều kiện trên máy dùng

Ghi trong README, mục "Cài lên máy khác":
- Node ≥ 18 (script của `design-taste-frontend` cần ≥ 22 và Chrome/Edge; thiếu thì skill vẫn đọc được, chỉ script không chạy).
- git, đã đăng nhập GitHub có quyền đọc repo (`gh auth login` hoặc Git Credential Manager).
- Máy có phần mềm quét HTTPS (như Kaspersky ở máy này) thì đặt `NODE_OPTIONS=--use-system-ca` trước khi chạy.

### B.11 Kiểm chứng

- Test đơn vị (không dựng máy thật): chọn tệp luật theo tên máy; lọc nhóm; nhận vai nguồn/dùng; quyết định của `cap-nhat.mjs` (junction → thoát, chưa đủ 6 giờ → thoát, lỗi lần trước → in cảnh báo); thư mục luật Antigravity có/không có tệp đánh dấu.
- Giả lập máy mới trên máy này: đặt `AGENT_KIT_NHA` sang một thư mục tạm rồi chạy `bin/agent-kit.mjs`. Kỳ vọng: clone về `<tạm>/.agent-kit`, skill nối đủ cho ba công cụ, luật chỉ có phần của máy giả lập, `--kiem` báo sạch. Bước plugin Claude và `core.hooksPath` toàn cục phải bỏ qua khi giả lập, để không động vào cấu hình thật của máy này.
- Chạy thật `npx -y github:zinyan91/agent-kit` trên máy này với `AGENT_KIT_NHA` tạm, để chứng minh npx lấy được repo private.
- Máy nguồn sau thay đổi: `node install.mjs --kiem` sạch, phiên Claude mới vẫn nhận luật.
- **Không kiểm được từ đây:** chạy trên một máy Windows thật thứ hai. Báo người dùng chạy thử ở đó.

### B.12 Quyết định do người thiết kế chọn (người dùng chưa xác nhận)

- Tên skill mới: `ui-design`, `writing`, `postgres`, `nodejs`.
- Bỏ `pdf-processing-pro` thay vì viết lại.
- `writing` vẫn tự gọi được khi soát văn tiếng Việt nhờ `references/vietnamese.md`; phần đó viết tiếng Việt.
- `nha-anh-chatgpt` và `codex-with-chatgpt` thuộc nhóm chung, vì người dùng chỉ nêu `tin-dung` và `fp` là nhóm riêng. Hai skill này vẫn chỉ vào Codex nhờ `chiVao`.
- Kiểm tra cập nhật cách nhau tối thiểu 6 giờ.
- Mặc định cài cả hai nhóm; nhóm riêng bỏ được bằng `--chi-chung`.
- Giữ repo private, lấy qua `npx github:`, không đưa lên npm.

### B.13 Để người làm tự quyết

Tên tệp và hàm (theo kiểu tiếng Việt không dấu của repo), cách tách tiến trình nền trên Windows, định dạng `~/.agent-kit-may.json`, câu chữ thông báo.
