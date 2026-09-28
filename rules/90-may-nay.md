---
trigger: always_on
description: Sự thật về máy dev này — đường dẫn repo, công cụ, và các bẫy môi trường đã cắn.
---

# Máy này

## Repo (đo 29/09/2026)
| Repo | Đường dẫn | Remote |
|---|---|---|
| Web admin WinHelper | `D:\AdminWinHelper` | `zinyan91/winhelper-admin` |
| CustomerManager | `D:\CustomerManager` | `zinyan91/CustomerManager` |
| Felix PDF | `D:\pdf-toolkit` | `zinyan91/Felix-pdf` |
| App client WinHelper/Felix (.NET) | `D:\OneDrive - International concept for education\Backup Felix\Felix App\WinHelper` | `zinyan91/Felix` (private) |
| Bộ skill/hook/luật dùng chung | `D:\agent-kit` | `zinyan91/agent-kit` |

`winhelper-hub` và `winhelper-api` không còn trên máy (có trên GitHub + Vercel).
Sửa luật chung ở `D:\agent-kit\rules`, rồi chạy `node D:\agent-kit\install.mjs` để Codex nhận bản mới.

## Bẫy môi trường
- **Kaspersky quét HTTPS**: Node lỗi `self-signed certificate in certificate chain`. Chạy với `NODE_OPTIONS=--use-system-ca`. Cấm `NODE_TLS_REJECT_UNAUTHORIZED=0`. Kaspersky cũng chặn `r2.dev`.
- **ACL Codex sandbox**: tệp do Codex tạo có thể không xoá/đổi tên được ("Permission denied", "unable to unlink"). Không phải tiến trình khoá — đừng tắt tiến trình. Ghi đè tại chỗ, `git rm --cached`; cần xoá thật thì nhờ người dùng.
- **Kiểm nhánh trước khi tách nhánh riêng**: repo có thể đang đứng ở nhánh feature dở dang, không phải `main`. Tách từ đó rồi gộp vào `main` là đẩy luôn việc dở của người dùng. Tách từ `origin/main`, và tránh `git checkout` qua lại giữa hai nhánh khác xa nhau: tệp mang ACL Codex không gỡ được làm checkout hỏng giữa chừng (cắn 29/09/2026 ở pdf-toolkit; gỡ bằng `git symbolic-ref HEAD` + `git reset` + `git checkout -- .`).
- **Git Bash đổi `/ten` thành đường dẫn** (`C:/Program Files/Git/ten`) khi làm đối số: gọi CLI có đối số `/…` qua PowerShell.
- **Không có danh tính git toàn cục**: mỗi repo tự đặt `user.name`/`user.email` cục bộ.
- **Claude Code — subagent gần như không dùng được** khi phiên nạp MCP Supabase + Vercel + Cloudflare: khởi động đã gần đầy ngữ cảnh, chết "Autocompact is thrashing". Tự làm; subagent chỉ để review đúng một diff, yêu cầu viết thẳng trong prompt.
- **Khung xem trước (Browser pane)**: không chạy CSS animation / IntersectionObserver / cuộn mượt; tab bị ẩn thì Next không hydrate và kích thước trả 0; `left_click` có thể trúng nút mà React không nhận — thử `element.click()` trước khi kết luận mã hỏng.
- `TaskStop` chỉ giết lớp `npm`, tiến trình node con còn giữ cổng: kiểm `netstat -ano | grep LISTENING | grep :<cổng>` rồi `taskkill //PID <pid> //F`.
