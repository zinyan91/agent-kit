---
name: fp
description: Xem mọi khoá Family Photos / tài khoản thật trên máy; /fp <số> để đổi, /fp g để gỡ ra. Chỉ chạy khi người dùng gõ /fp.
disable-model-invocation: true
allowed-tools: Bash(powershell:*), PowerShell
---

Chạy ĐÚNG một lệnh này, không sửa, không thêm (ARGUMENTS là phần người dùng gõ sau `/fp`, có thể rỗng):

    powershell -NoProfile -ExecutionPolicy Bypass -File "C:/Users/Zinya/.fp/xem.ps1" $ARGUMENTS

Rồi in lại NGUYÊN VĂN kết quả, giữ nguyên bảng Markdown.
Không gọi thêm lệnh nào khác, không sửa tệp nào, không đoán giá trị nào không có trong kết quả.
Muốn đổi sang khoá hoặc tài khoản khác thì bảo họ gõ: `/fp <số>`
Muốn gỡ khoá ra khỏi máy thì bảo họ gõ: `/fp g`
