---
trigger: always_on
description: Sự thật về máy dev này — đường dẫn repo, công cụ, và các bẫy môi trường đã cắn.
---

# Máy này

Windows cài lại ngày 29/10/2026; tên máy cũ là `YING`.

## Repo (đo 30/10/2026)
| Repo | Đường dẫn | Remote | Deploy |
|---|---|---|---|
| Felix Web | `D:\felix-platform\felix-web` | `zinyan91/felix-platform` | Vercel |
| Felix Admin | `D:\felix-platform\felix-admin` | `zinyan91/felix-admin` | Vercel |
| Felix API (app client gọi) | `D:\felix-platform\felix-api` | `zinyan91/felix-api` | Vercel |
| Felix Desktop (.NET) | `D:\felix-platform\felix-desktop` | `zinyan91/felix-desktop` | R2, qua script của felix-admin |
| Felix Partition | `D:\felix-platform\felix-partition` | `zinyan91/felix-partition` | — |
| Felix PDF | `D:\felix-platform\pdf-toolkit` | `zinyan91/Felix-pdf` | Cloudflare Pages |
| Felix Office | `D:\felix-platform\felix-office` | **chưa có remote** | Cloudflare Pages |
| Felix PE | `D:\FelixPE` | `zinyan91/felix-pe` | — |
| CustomerManager | `D:\CustomerManager` | `zinyan91/CustomerManager` | Vercel |
| Bộ skill/hook/luật dùng chung | `D:\agent-kit` | `zinyan91/agent-kit` | — |
| Epic Sea-Horses | `D:\Projects\Epic Sea-Horses` | chưa có remote | — |

`D:\Felix Platform\` (có dấu cách) là chỗ cũ, chỉ còn bản trùng của `pdf-toolkit` và `felix-partition`: không sửa ở đó.
Sửa luật chung ở `D:\agent-kit\rules`, rồi chạy `node D:\agent-kit\install.mjs` để Codex nhận bản mới.

## Bẫy môi trường
- **Chủ sở hữu cũ sau khi cài lại Windows**: thư mục chép từ bản cũ mang SID cũ, git báo `dubious ownership` (gặp ở `D:\Felix Platform\felix-partition`). Dùng bản ở `D:\felix-platform`; không đặt `safe.directory '*'`.
- **ACL Codex sandbox**: tệp do Codex tạo có thể không xoá/đổi tên được ("Permission denied", "unable to unlink"). Không phải tiến trình khoá — đừng tắt tiến trình. Ghi đè tại chỗ, `git rm --cached`; cần xoá thật thì nhờ người dùng.
- **Kiểm nhánh trước khi tách nhánh riêng**: repo có thể đang đứng ở nhánh feature dở dang, không phải `main`. Tách từ đó rồi gộp vào `main` là đẩy luôn việc dở của người dùng. Tách từ `origin/main`, và tránh `git checkout` qua lại giữa hai nhánh khác xa nhau: tệp mang ACL Codex không gỡ được làm checkout hỏng giữa chừng (cắn 29/09/2026 ở pdf-toolkit; gỡ bằng `git symbolic-ref HEAD` + `git reset` + `git checkout -- .`).
- **Git Bash đổi `/ten` thành đường dẫn** (`C:/Program Files/Git/ten`) khi làm đối số: gọi CLI có đối số `/…` qua PowerShell.
- **Không có danh tính git toàn cục**: mỗi repo tự đặt `user.name`/`user.email` cục bộ.
- **Claude Code — subagent gần như không dùng được** khi phiên nạp MCP Supabase + Vercel + Cloudflare: khởi động đã gần đầy ngữ cảnh, chết "Autocompact is thrashing". Tự làm; subagent chỉ để review đúng một diff, yêu cầu viết thẳng trong prompt.
- **Khung xem trước (Browser pane)**: không chạy CSS animation / IntersectionObserver / cuộn mượt; tab bị ẩn thì Next không hydrate và kích thước trả 0; `left_click` có thể trúng nút mà React không nhận — thử `element.click()` trước khi kết luận mã hỏng.
- `TaskStop` chỉ giết lớp `npm`, tiến trình node con còn giữ cổng: kiểm `netstat -ano | grep LISTENING | grep :<cổng>` rồi `taskkill //PID <pid> //F`.
