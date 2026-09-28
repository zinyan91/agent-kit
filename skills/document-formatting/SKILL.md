---
name: document-formatting
description: Hướng dẫn chuyên sâu về căn lề, format, định dạng văn bản hành chính, bảng tính Excel, bản in PDF theo Nghị định 30/2020/NĐ-CP và Thông tư 133/2016/TT-BTC trong hệ thống CustomerManager. Kích hoạt khi làm việc với xuất file, in ấn, PDF, bảng kê, báo cáo tài chính, hợp đồng và biểu mẫu.
---

# Kỹ Năng Định Dạng Văn Bản, Bảng Biểu & Xuất Bản In (Document Formatting & Printing)

Skill này cung cấp các tiêu chuẩn kỹ thuật, công thức phân trang, mẫu CSS in ấn và cấu trúc bảng biểu chuẩn của hệ thống CustomerManager.

---

## 1. Mẫu HTML/CSS Chuẩn Bản In A4 Dọc (Standard Portrait Print Template)

```html
<!DOCTYPE html>
<html lang="vi">
<head>
  <meta charset="utf-8">
  <title></title>
  <style>
    @page {
      size: A4 portrait;
      margin: 12mm 15mm 12mm 15mm;
    }
    @media print {
      @page {
        size: A4 portrait;
        margin: 12mm 15mm 12mm 15mm;
      }
      html, body {
        margin: 0 !important;
        padding: 0 !important;
        -webkit-print-color-adjust: exact !important;
        print-color-adjust: exact !important;
      }
    }
    body {
      font-family: "Times New Roman", Times, serif;
      font-size: 8.5pt;
      color: #000;
      margin: 0;
      padding: 0;
      line-height: 1.25;
      background: #fff;
    }
    /* Header thông tin hai bên */
    .header-grid {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      margin-bottom: 12px;
    }
    .header-left {
      font-size: 9pt;
      line-height: 1.35;
      width: 58%;
    }
    .header-right {
      text-align: right;
      font-size: 8.5pt;
      line-height: 1.35;
      width: 42%;
    }
    /* Tiêu đề văn bản */
    .doc-title {
      text-align: center;
      margin: 10px 0 14px 0;
    }
    .doc-title h1 {
      font-size: 13pt;
      font-weight: bold;
      text-transform: uppercase;
      margin: 0;
    }
    .doc-title .sub-title {
      font-size: 9pt;
      font-style: italic;
      margin-top: 3px;
    }
    /* Bảng chuẩn */
    table.data-table {
      width: 100%;
      border-collapse: collapse;
      font-size: 8pt;
      table-layout: fixed;
    }
    table.data-table th, table.data-table td {
      border: 1px solid #000;
      padding: 3.5px 4px;
      vertical-align: middle;
    }
    table.data-table th {
      background: #f1f5f9;
      font-weight: bold;
      text-align: center;
    }
    /* Khối ký tên chống ngắt trang */
    .sig-container {
      margin-top: 20px;
      page-break-inside: avoid;
    }
    .sig-date {
      text-align: right;
      font-style: italic;
      font-size: 9pt;
      margin-bottom: 8px;
      padding-right: 20px;
    }
    .sig-grid {
      display: flex;
      justify-content: space-between;
      text-align: center;
    }
    .sig-box {
      width: 31%;
      font-size: 9pt;
    }
    .sig-space {
      height: 60px;
    }
  </style>
</head>
<body>
  ...
</body>
</html>
```

---

## 2. Quy Tắc Bảng Tính: Dòng TỔNG CỘNG

Luôn render dòng tổng cộng bên trong thẻ `<tfoot>` hoặc là hàng `<tr>` cuối cùng của `<tbody>`:

```html
<tr style="font-weight: bold; background: #e2e8f0;">
  <td colspan="4" style="text-align: right; padding-right: 8px;">TỔNG CỘNG:</td>
  <td style="text-align: right; padding-right: 6px; font-variant-numeric: tabular-nums;">
    12.300.000.000 đ
  </td>
</tr>
```

- Không dùng div nổi hoặc bảng rời để hiển thị dòng Tổng cộng.
- Cột số tiền phải thẳng hàng dọc 100% với cột số tiền của bảng.

---

## 3. Thuật Toán Phân Trang Chống Trang Trắng (Pagination Heuristic)

Khi một danh sách có nhiều trang (như Bảng kê vật dụng, Bảng kê mua bán):
- Trang 1 (có tiêu đề và thông tin): Sức chứa tối đa thường là `28 - 32` dòng.
- Các trang sau (không có tiêu đề): Sức chứa `38 - 44` dòng.
- Khi chia cột (ví dụ bảng kê 2 cột song song trên 1 trang):
  - Mỗi cột chứa `26 - 30` dòng.
  - Phải kiểm tra dòng cuối: nếu số dòng còn lại ít hơn 5 dòng, nên gom dòng vào các trang trước thay vì tạo thêm 1 trang mới chỉ chứa chữ ký.

---

## 4. Định Dạng Số Chuẩn Kế Toán (Number Formatting Rules)

```typescript
export function formatAccountingVnd(val: number): string {
  if (val === 0) return '-';
  if (val < 0) return `(${Math.abs(val).toLocaleString('vi-VN')})`;
  return val.toLocaleString('vi-VN');
}
```

- Excel `numFmt`: `'#,##0;(#,##0);"-"'`
- Trình duyệt HTML: Sử dụng `font-variant-numeric: tabular-nums;` trên các cột số tiền để các chữ số có cùng bề ngang và thẳng hàng dọc tuyệt đối.
