---
name: nha-anh-chatgpt
description: Thuc hien KE HOACH do ChatGPT web da lap qua cau noi Family Photos (URL dang https://codex.ms365.tools/mcp/<ma>/ke-hoach). Dung khi nguoi dung dua URL do hoac noi "lam theo ke hoach tu ChatGPT".
---
Khi nguoi dung dua URL dang https://codex.ms365.tools/mcp/<ma>/ke-hoach (co the kem ?id=...) hoac noi "lam theo ke hoach tu ChatGPT":

1. Doc ke hoach: `curl.exe -s "<URL>"` (van ban, khong can khoa; dung curl.exe vi trong PowerShell `curl` la Invoke-WebRequest).
2. Ke hoach da duoc ChatGPT suy nghi ky. LAM DUNG tung buoc, KHONG lap ke hoach lai, KHONG doc lan man ngoai
   cac tep ke hoach neu, giu reasoning o muc thap nhat co the. Chi hoi lai khi ke hoach thieu thong tin.
3. Xong: bao ket qua (tep da doi, ket qua kiem, viec chua lam duoc) ve
   ghi tom tat vao tep ket-qua.txt roi chay `curl.exe -s -X POST "<URL bo phan /ke-hoach...>/ket-qua" -H "Content-Type: text/plain; charset=utf-8" --data-binary "@ket-qua.txt"`
   de ChatGPT ra soat (nguoi dung se hoi ChatGPT "xem ket qua Codex").