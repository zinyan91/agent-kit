# Mã Mục Đích Sử Dụng Vốn (MĐSDV)

Tài liệu tham chiếu cho phần **Mã mục đích sử dụng vốn** theo hệ thống FBE.

- **Nguồn sự thật:** `src/lib/mdsdv.ts` (logic), `src/data/mdsdv.json` (dữ liệu), `src/hooks/useMdsdvController.ts` (trạng thái màn tra cứu).
- **Giao diện:** tab **Tra Cứu Mục Đích Sử Dụng Vốn** — `src/components/views/MdsdvLookupView.tsx`, `src/components/mdsdv/MdsdvFilterHeader.tsx`, `src/components/mdsdv/MdsdvTableView.tsx`.
- Khi code và CONVENTIONS.md (§7 cũ) lệch nhau, **theo code**.

## Mục lục

1. [Cấu trúc mã: Cấp 5 và Cấp 6](#1-cấu-trúc-mã-cấp-5-và-cấp-6)
2. [Quy ước tên FBE](#2-quy-ước-tên-fbe)
3. [Mô hình dữ liệu chuẩn hoá](#3-mô-hình-dữ-liệu-chuẩn-hoá)
4. [Tìm kiếm không dấu](#4-tìm-kiếm-không-dấu)
5. [Đặc thù Thấu chi](#5-đặc-thù-thấu-chi)
6. [Bảng hàm công khai](#6-bảng-hàm-công-khai)
7. [Ghi chú UI: màn tra cứu dạng bảng](#7-ghi-chú-ui-màn-tra-cứu-dạng-bảng)
8. [Những lỗi từng xảy ra](#8-những-lỗi-từng-xảy-ra)

---

## 1. Cấu trúc mã: Cấp 5 và Cấp 6

Danh mục có hai mức mã dùng trực tiếp trong nghiệp vụ:

| Mức | Độ dài | Thành phần | Ví dụ |
| :--- | :--- | :--- | :--- |
| **Mã Cấp 5** (`level5Code`, `c5`) | 8 ký tự | `CE` + mã ngành kinh tế (VSIC cấp 1→5) | `CEA01110` |
| **Mã Cấp 6** (`code`) | 10–11 ký tự | Mã Cấp 5 + **mã đuôi mục đích** (`detailCode`, 2–3 ký tự) | `CEA0111001` |

Mã Cấp 6 sinh ra tại chỗ trong `buildEntry` (`src/lib/mdsdv.ts`):

```
code = sector.c5 + detailCode      // "CEA01110" + "01" = "CEA0111001"
```

**Vì sao Cấp 6 dài 10–11 ký tự:** `detailCode` không cố định độ dài — có mã 2 chữ số, có mã 3 chữ số. Đừng giả định Cấp 6 luôn 10 ký tự khi cắt chuỗi.

Ngành **Tiêu dùng đời sống** dùng Cấp 5 đặc biệt `CET00000`, mã Cấp 6 là `CET00000` + đuôi.

---

## 2. Quy ước tên FBE

Tên hiển thị trên hệ thống FBE (`fbeName` trong `MdsdvEntry`) được `buildEntry` tạo theo đúng công thức:

```
fbeName = `${code.slice(-8)}-${purposeName}`
```

Nghĩa là: **8 ký tự cuối của mã Cấp 6** + dấu gạch nối `-` + **tên mục đích chi tiết**.

Ví dụ với `code = "CEA0111001"`, `purposeName = "Trồng lúa"`:

```
code.slice(-8) = "A0111001"
fbeName        = "A0111001-Trồng lúa"
```

Lưu ý quan trọng về `slice(-8)`:

- Với mã Cấp 6 **10 ký tự** → cắt bỏ 2 ký tự đầu (thường là `CE`).
- Với mã Cấp 6 **11 ký tự** → cắt bỏ 3 ký tự đầu.
- Luôn là **8 ký tự cuối**, bất kể độ dài mã — không phải "bỏ CE".

CONVENTIONS.md §7 mô tả là "8 ký tự cuối của mã cấp 6 + tên mục đích" nhưng **không nêu dấu gạch nối**; code có `-` làm ký tự ngăn cách. Theo code: có dấu `-`.

---

## 3. Mô hình dữ liệu chuẩn hoá

Bảng tra cứu đầy đủ có **9.133 mã Cấp 6**, nhưng file `mdsdv.json` **không lưu 9.133 dòng thô**. Thay vào đó lưu ba khối và sinh lại mã khi cần (`MdsdvDataset` trong `src/lib/mdsdv.ts`):

| Khối | Kiểu | Vai trò |
| :--- | :--- | :--- |
| `sectors` | `MdsdvSectorRaw[]` | Mỗi ngành Cấp 5 một dòng: `c1..c5` / `n1..n5` (mã + tên 5 cấp VSIC) và `g` = chỉ số trỏ tới bộ mục đích |
| `purposeGroups` | `string[][][]` | Các **bộ mục đích chi tiết** dùng chung; mỗi phần tử là mảng cặp `[detailCode, purposeName]` |
| `overdraftCodes` | `string[]` | Danh sách trắng các mã Cấp 6 được phép **thấu chi** |
| `version` | `string` | Phiên bản danh mục, xuất ra `MDSDV_VERSION` |

**Nguyên lý dedup:** nhiều ngành Cấp 5 dùng chung một bộ mục đích, nên chỉ lưu ngành + con trỏ `g` tới bộ, mã Cấp 6 được sinh động qua `buildEntry`. Cách này giảm dữ liệu từ ~4 MB xuống ~321 KB.

**Vì sao không gộp bộ mục đích theo ngành Cấp 1:** cùng một `detailCode` mang nghĩa khác nhau ở các ngành Cấp 5 khác nhau (ví dụ mã đuôi `06` trong cùng nhóm `CEK`). Do đó phải gộp theo **toàn bộ danh sách mục đích** (`g` trỏ đúng bộ), không suy từ mã ngành Cấp 1.

`countMdsdvEntries()` tái tạo tổng số dòng:

```
Σ (với mỗi sector) purposeGroups[sector.g].length   → phải bằng 9.133
```

Có test khẳng định con số này. **Khi cập nhật danh mục mới, chạy lại test đó trước khi tin vào dữ liệu.**

**Bộ nhớ đệm:** `mdsdv.ts` xây và giữ ba cache mức module — `sectorIndexCache`, `purposeGroupIndexCache`, `level1OptionsCache`. Chúng dựng một lần rồi tái dùng; dữ liệu là tĩnh nên không cần làm mới.

---

## 4. Tìm kiếm không dấu

Hàm chuẩn hoá `normalizeVi(value)` (`src/lib/mdsdv.ts`) là nền của mọi so khớp:

1. `NFD` tách dấu khỏi chữ, rồi xoá toàn bộ dấu kết hợp (`̀`–`ͯ`).
2. `đ→d`, `Đ→D` (ký tự này NFD không tách được).
3. Hạ chữ thường, gộp mọi khoảng trắng về một dấu cách, cắt hai đầu.

`searchMdsdv(options)` (`MdsdvSearchOptions`) khớp như sau:

| Cơ chế | Chi tiết |
| :--- | :--- |
| **Tách từ khoá** | `normalizeVi(query)` rồi tách theo dấu cách → nhiều từ |
| **Điều kiện AND** | **Mọi** từ khoá phải khớp; **không** phân biệt thứ tự |
| **So chuỗi con** | Mỗi từ khớp nếu là **substring** của `rowHaystack` (ghép: haystack ngành + mã Cấp 6 + haystack mục đích) |
| **Lọc ngành Cấp 1** | `level1Code` khớp `sector.c1` |
| **Chỉ thấu chi** | `overdraftOnly` → chỉ mã có trong `overdraftCodeSet` |
| **Giới hạn** | `limit` mặc định **200** trong hàm; controller truyền **300** (`RESULT_LIMIT`) |

Kết quả `MdsdvSearchResult` trả `items` (đã cắt theo `limit`), `total` (**tổng thật**, đếm hết) và `truncated` (`total > items.length`).

- **Vì sao vẫn báo tổng thật:** để banker biết cần thu hẹp từ khoá, không tưởng đã xem hết. Giao diện đang giới hạn 300 dòng.
- `trong lua` tìm ra `Trồng lúa` (bỏ dấu). Nhưng vì so chuỗi con, `trong lua` cũng khớp `ngựa, lừa` — đây là **đánh đổi có ý thức** để gõ nhanh không dấu.

`findMdsdvByCode(code)` tra một mã cụ thể: chuẩn hoá `trim().toUpperCase()`, tìm ngành có `c5` là tiền tố của mã, rồi khớp phần đuôi với `detailCode` trong bộ. Không khớp → `null`.

---

## 5. Đặc thù Thấu chi

- Cờ `allowsOverdraft` trên mỗi `MdsdvEntry` = `overdraftCodeSet.has(code)` — kiểm tra mã Cấp 6 đầy đủ có nằm trong **danh sách trắng** `overdraftCodes` hay không.
- Đây là whitelist **theo mã Cấp 6**, **không** suy từ ngành hay từ bộ mục đích. Một mã được thấu chi hay không là dữ liệu, không phải quy tắc tính.
- Bộ lọc `overdraftOnly` trong `searchMdsdv` dựa thẳng vào set này.

**Mã chi tiết không liên tục và không dùng chung giữa các ngành.** Vay tiêu dùng đời sống bắt đầu từ `09`, `18`, `21`… nên `CET0000001` **không tồn tại** — tra không ra là đúng dữ liệu, không phải lỗi tìm kiếm.

---

## 6. Bảng hàm công khai

Tất cả ở `src/lib/mdsdv.ts` trừ khi ghi khác.

| Hàm | Vai trò |
| :--- | :--- |
| `normalizeVi(value)` | Bỏ dấu + hạ thường + gộp khoảng trắng; nền của tìm kiếm |
| `searchMdsdv(options)` | Tìm theo từ khoá / ngành Cấp 1 / thấu chi; trả `items` + `total` + `truncated` |
| `findMdsdvByCode(code)` | Tra một mã Cấp 6 cụ thể → `MdsdvEntry \| null` |
| `getLevel1Options()` | Danh sách ngành Cấp 1 duy nhất (`{code,name}`), giữ thứ tự xuất hiện |
| `countMdsdvEntries()` | Tổng số mã Cấp 6 tái tạo (kỳ vọng 9.133) |
| `MDSDV_VERSION` | Phiên bản danh mục |
| `useMdsdvController()` | Hook màn tra cứu (`src/hooks/useMdsdvController.ts`): giữ `query`, `level1Code`, `overdraftOnly`, gọi `searchMdsdv` với `limit = RESULT_LIMIT (300)` |

`MdsdvEntry` (kết quả đã dựng) gồm: `code`, `fbeName`, `detailCode`, `purposeName`, `level1Code..level5Code`, `level1Name..level5Name`, `allowsOverdraft`.

---

## 7. Ghi chú UI: màn tra cứu dạng bảng

Màn **Tra Cứu MĐSDV** vừa đổi sang **dạng bảng gọn**, bỏ chế độ gom nhóm. Cột hiện tại (`MdsdvTableView.tsx`):

| Cột | Nguồn dữ liệu |
| :--- | :--- |
| **MÃ CẤP 5** | `item.level5Code` |
| **NGÀNH NGHỀ** | `item.level5Name` |
| **NGÀNH KINH TẾ** | `item.level1Name` (title kèm `level1Code`) |
| **QUY ƯỚC FBE** | `item.fbeName` |

> **Đây chỉ là thay đổi UI.** Mô hình dữ liệu và nghiệp vụ (mục 1–6) **giữ nguyên** — vẫn là `sectors + purposeGroups + overdraftCodes`, vẫn sinh mã Cấp 6 qua `buildEntry`, vẫn tìm kiếm qua `searchMdsdv`. Cột "MÃ CẤP 5" và "QUY ƯỚC FBE" đặt `select-all` để bôi đen chép tay nhanh.

Đây là **dữ liệu tham chiếu tĩnh**, không phải dữ liệu khách hàng: không nằm trong cơ sở dữ liệu, **không chịu RLS**, không có gì phải phân quyền.

---

## 8. Những lỗi từng xảy ra

- **Tưởng đã xem hết kết quả.** Trước khi có `total`/`truncated`, banker thấy danh sách bị cắt và tưởng đã đủ. Nay luôn báo tổng thật để nhắc thu hẹp từ khoá.
- **Tra `CET0000001` không ra rồi báo lỗi tìm kiếm.** Mã chi tiết không liên tục; mã đó không tồn tại. Không ra là đúng dữ liệu.
- **Định cắt "bỏ CE" để lấy tên FBE.** Sai với mã Cấp 6 11 ký tự. Luôn dùng `code.slice(-8)` (8 ký tự cuối), như `buildEntry` làm.
- **Định gộp bộ mục đích theo ngành Cấp 1.** Cùng `detailCode` mang nghĩa khác nhau giữa các ngành Cấp 5 → sai. Phải dùng con trỏ `g` tới đúng bộ.
- **Nhầm chuỗi con là "tìm sai".** `trong lua` khớp cả `ngựa, lừa` là đánh đổi cố ý, không phải lỗi.
