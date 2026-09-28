# Tài sản bảo đảm & LTV

> Nguồn sự thật của chính sách LTV và hiệu lực định giá là **`src/lib/collateralMath.ts`**. Tài liệu này giải thích *vì sao* mỗi quy tắc tồn tại và các lỗi đã từng xảy ra. Khi tài liệu và code lệch nhau, **code thắng** — sửa tài liệu, đừng sửa code cho khớp tài liệu.

## Mục lục

1. [Bảng LTV theo phân loại tài sản](#1-bảng-ltv-theo-phân-loại-tài-sản)
2. [Chọn LTV hiệu lực cho một tài sản](#2-chọn-ltv-hiệu-lực-cho-một-tài-sản)
3. [Tài sản hạn chế nhận & ngoại lệ](#3-tài-sản-hạn-chế-nhận--ngoại-lệ)
4. [Hiệu lực chứng thư định giá](#4-hiệu-lực-chứng-thư-định-giá)
5. [Khả năng bảo đảm dùng được (usableCapacity)](#5-khả-năng-bảo-đảm-dùng-được-usablecapacity)
6. [So khớp CollateralIds — tách theo dấu phẩy](#6-so-khớp-collateralids--tách-theo-dấu-phẩy)
7. [Quy tắc `||` khi 0 là giá trị hợp lệ](#7-quy-tắc--khi-0-là-giá-trị-hợp-lệ)
8. [Hợp đồng thế chấp (HĐTC)](#8-hợp-đồng-thế-chấp-hđtc)
9. [Sổ tra hàm nhanh](#9-sổ-tra-hàm-nhanh)

---

## 1. Bảng LTV theo phân loại tài sản

Bảng chính sách LTV nằm ở **một nơi duy nhất**: hằng `ASSET_TYPE_LTV` trong `collateralMath.ts`. Không nhân bản con số này ra chỗ khác — mọi nơi cần LTV mặc định phải gọi `defaultLtvForAssetType`.

| Phân loại tài sản | LTV | Ghi chú |
| :--- | ---: | :--- |
| Loại 1 | 80% | BĐS loại 1 |
| Loại 2 | 70% | BĐS loại 2 |
| Loại 3 | 60% | BĐS loại 3 |
| Loại 4 | 55% | BĐS loại 4 |
| **Hạn chế nhận TS** | **0%** | Cho vay là trình ngoại lệ, xem §3 |
| Sổ tiết kiệm (cùng hệ thống) | 100% | Nhận diện qua `isSavingsPassbook` |
| STK khác (khác hệ thống) | 90% | Cũng là trần sản phẩm thẻ, xem §4 |
| Giấy tờ (GTCG) | 80% | Giấy tờ có giá |
| Phương tiện (vận tải) | 70% | |
| Máy móc (thiết bị) | 60% | |
| Hàng hóa | 50% | |
| Quyền tài sản | 50% | |
| *Không khớp / không khai loại* | 80% | Giá trị dự phòng của `defaultLtvForAssetType` |

**Vì sao 80% là mặc định dự phòng:** hồ sơ cũ có nhiều loại tài sản ghi tự do; trả 80% (mức của BĐS Loại 1 / Giấy tờ) là mức phổ biến an toàn để không chặn nhập, nhưng banker vẫn phải khai lại `LtvPercent` cho đúng.

---

## 2. Chọn LTV hiệu lực cho một tài sản

Thứ tự quyết định LTV của một tài sản nằm ở `getEffectiveLtv(c)`:

1. Nếu `LtvPercent` **được khai** (không `undefined`, không `null`, không `NaN`) → dùng đúng con số đó, **kể cả khi bằng 0**.
2. Ngược lại → suy ra từ loại tài sản bằng `defaultLtvForAssetType(AssetType)`.

`defaultLtvForAssetType` chuẩn hoá tên loại trước khi so:

- Cắt tiền tố `BĐS -` / `BDS -` / `BĐS ` / `BDS ` ở đầu chuỗi rồi `trim()`.
- **So khớp chính xác trước** (`cleaned === name`), sau đó mới so `startsWith`. Thứ tự này quan trọng: `"Loại 1"` phải khớp đúng dòng Loại 1 chứ không rơi vào nhánh `startsWith` nhầm.
- Không khớp gì → trả 80.

`maxLoanFromCollateral(c)` = `collateralValue(c) × getEffectiveLtv(c) / 100`. Đây là **số học thuần** — chưa xét hiệu lực định giá. `collateralValue` lấy `AppraisedValue || Value || 0` (ưu tiên giá trị định giá, lùi về giá trị khai, cuối cùng 0).

> ⚠️ **Đừng dùng `maxLoanFromCollateral` để chốt kiểm soát.** Con số dùng cho chốt là `usableCapacity` (§5), vì nó trả 0 khi định giá hết hiệu lực. Lẫn hai hàm này là lỗi phân loại rủi ro: banker sẽ tưởng khoản vay vượt hạn mức trong khi thật ra chỉ là cần định giá lại.

---

## 3. Tài sản hạn chế nhận & ngoại lệ

- `isRestrictedAsset(assetType)` = đúng khi `defaultLtvForAssetType(assetType) === 0`, tức loại "Hạn chế nhận TS".
- Tài sản hạn chế nhận có **LTV mặc định 0%** → tự nó không sinh khả năng bảo đảm.
- Cho vay trên tài sản hạn chế nhận là **trình ngoại lệ, bắt buộc có phê duyệt của cấp có thẩm quyền**. Hệ thống **không chặn cứng**: buộc người nhập xác nhận và đánh dấu `⚠ NGOẠI LỆ` trên danh sách.
- `isLtvException(c)` = đúng khi tài sản là loại hạn chế nhận **nhưng** `getEffectiveLtv(c) > 0` — tức banker đã khai đè `LtvPercent` một mức dương. Đây chính là dấu hiệu "đã có ngoại lệ được duyệt", dùng để gắn nhãn cảnh báo.

**Vì sao không chặn cứng:** nghiệp vụ ngân hàng luôn có ngoại lệ được phê duyệt; chặn cứng khiến banker tìm cách lách (khai sai loại tài sản để qua mặt), làm dữ liệu tệ hơn.

---

## 4. Hiệu lực chứng thư định giá

Định giá **chỉ có hiệu lực trong 6 / 12 / 24 tháng** kể từ `AppraisalDate`. Hết hiệu lực thì con số đó **không còn dùng để tính hạn mức**, dù vẫn nằm trong CSDL.

### Hằng số

| Hằng | Giá trị | Ý nghĩa |
| :--- | ---: | :--- |
| `APPRAISAL_TENOR_DEFAULT_MONTHS` | 12 | Dùng khi `AppraisalTenorMonths` trống / ≤ 0 |
| `APPRAISAL_WARN_DAYS` | 60 | Ngưỡng "sắp hết hạn" |
| `CARD_STK_LTV_PERCENT` | 90 | Trần sản phẩm thẻ trên STK, xem cuối §4 |

### Trạng thái định giá (`appraisalStatus`)

| Trạng thái | Điều kiện | Tính vào khả năng bảo đảm |
| :--- | :--- | :--- |
| `valid` (Còn hiệu lực) | Còn > 60 ngày tới ngày hết hạn | Có |
| `expiring_soon` (Sắp hết hạn) | Còn ≤ 60 ngày | **Có**, kèm cảnh báo |
| `expired` (Hết hiệu lực) | Ngày hết hạn < hôm nay | **Không — bằng 0** |
| `missing` (Chưa có ngày định giá) | Không parse được `AppraisalDate` | **Không — bằng 0** |

`isAppraisalUsable(c)` = đúng khi trạng thái là `valid` **hoặc** `expiring_soon`. Nghĩa là *sắp hết hạn vẫn dùng được* (chỉ cảnh báo để banker kịp định giá lại), còn *đã hết hạn* thì bằng 0.

### Ngày hết hiệu lực được TÍNH LẠI, không đọc cột text

`appraisalExpiryDate(c)` tính từ `AppraisalDate + AppraisalTenorMonths` (cộng tháng thủ công, kẹp ngày theo số ngày thực của tháng đích để tránh tràn ngày). Hàm **cố tình không đọc** cột `AppraisalExpiryDate`.

> **Vì sao:** `AppraisalExpiryDate` là kiểu text, có thể lưu ở định dạng hiển thị (dd/mm/yyyy, có/không số 0 đứng đầu…), không đáng tin để so sánh ngày. Tính lại từ ngày gốc + kỳ hạn tháng là nguồn xác định duy nhất.

### Trần sản phẩm thẻ trên STK (`cardProductCap`)

- Chỉ áp dụng khi tài sản là sổ tiết kiệm (`isSavingsPassbook`); ngược lại trả `null` (không có trần sản phẩm).
- Định giá không dùng được → trả **0**.
- Ngược lại → `collateralValue × 90% (CARD_STK_LTV_PERCENT)`.

`isSavingsPassbook` nhận diện chuỗi loại (sau khi cắt tiền tố `BĐS`) bắt đầu bằng `"Sổ tiết kiệm"` hoặc `"STK"`.

---

## 5. Khả năng bảo đảm dùng được (usableCapacity)

Đây là con số **duy nhất** được phép dùng cho chốt kiểm soát theo TSĐB:

```
usableCapacity(c) = isAppraisalUsable(c) ? maxLoanFromCollateral(c) : 0
```

- `totalUsableCapacity(cols)` = tổng `usableCapacity` của cả danh sách (bỏ qua phần tử null).
- Trong `creditLimit.ts`, `checkCollateralCapacity` gọi `totalUsableCapacity` trên **cụm liên thông** hợp đồng ↔ tài sản (union-find), không xét từng tài sản lẻ — vì một hợp đồng thường được bảo đảm bằng nhiều tài sản cộng lại, và một tài sản có thể bảo đảm cho nhiều hợp đồng. Chi tiết cụm ở tài liệu `credit-limit-lifecycle.md` §"Chốt kiểm soát theo TSĐB".
- Tài sản có định giá `expired`/`missing` được `checkCollateralCapacity` báo **riêng** trong `expiredAppraisals`, tách khỏi lỗi vượt hạn mức, để banker biết cần định giá lại chứ không nhầm với vượt mức cấp.

---

## 6. So khớp CollateralIds — tách theo dấu phẩy

`CollateralId` (một tài sản) và `CollateralIds` (chuỗi nhiều id, ví dụ `"1,5,12"`) cùng tồn tại. Chuẩn tách nằm ở `parseCollateralIds(c)` trong `creditLimit.ts`:

1. Nếu có `CollateralId` → thêm vào tập.
2. Nếu có `CollateralIds` → `split(',')`, `trim` từng phần, `parseInt`, bỏ `NaN`, gom vào `Set` để khử trùng.

`contractToFormFields` trong `kunnForm.ts` tách theo đúng cách này khi nạp form.

> ❌ **Tuyệt đối không dùng `LIKE '%1%'`** để tìm hợp đồng đang thế chấp một tài sản. `LIKE '%1%'` khớp nhầm `10`, `21`, `100`… Phải **tách theo dấu phẩy rồi so bằng từng phần tử**. Đây là chốt chặn xoá tài sản: xoá TSĐB bị chặn nếu nó đang nằm trong `CollateralIds` của một khoản vay, và so sai kiểu `LIKE` sẽ vừa chặn nhầm vừa bỏ sót.

---

## 7. Quy tắc `||` khi 0 là giá trị hợp lệ

Đây là lỗi kinh điển đã ăn sâu vào thiết kế `getEffectiveLtv`:

```js
// SAI — nuốt mất mức 0% do người dùng cố ý khai
const ltv = parseFloat(row.LtvPercent) || 80;   // parseFloat('0') || 80  ===  80  (BUG)

// ĐÚNG — như getEffectiveLtv làm: kiểm undefined/null/NaN riêng, cho phép 0
if (c.LtvPercent !== undefined && c.LtvPercent !== null && !isNaN(c.LtvPercent)) return c.LtvPercent;
return defaultLtvForAssetType(c.AssetType);
```

**Vì sao quan trọng:** với tài sản **hạn chế nhận**, `LtvPercent = 0` là *cố ý* (không cho vay trên tài sản này). Nếu dùng `|| 80`, con số 0 hợp lệ biến thành 80% → tự dưng sinh khả năng bảo đảm cho tài sản đáng lẽ không được nhận, phá thẳng chốt kiểm soát ngoại lệ ở §3.

Nguyên tắc chung áp cho **mọi trường số mà 0 là giá trị hợp lệ** (LTV, gốc mỗi kỳ, DTI, số ngày…): kiểm `=== null` / `=== undefined` / `Number.isNaN` một cách tường minh, **không** dùng `||` để đặt mặc định. (Ví dụ khác cùng loại lỗi: `MaxDtiPercent = 0` nghĩa là *chưa khai*, xử lý riêng — xem `credit-limit-lifecycle.md`.)

---

## 8. Hợp đồng thế chấp (HĐTC)

HĐTC lưu ở `MortgageContracts` (migration 58), màn `/customers/:id/mortgage-contracts`. Một HĐTC gồm **nhiều tài sản** (`MortgageContractCollaterals`) và bảo đảm cho **nhiều HĐTD** (`MortgageContractCreditContracts`). Khi HĐTD được tái cấp, HĐTD mới được gắn thêm vào HĐTC cũ, không phải nhập lại. `Pledgor` để trống nghĩa là bên thế chấp chính là khách hàng; có giá trị khi tài sản của bên thứ ba.

Quy tắc toàn vẹn nằm ở CSDL, không trông vào giao diện:

- Chỉ nối tài sản / HĐTD **cùng khách hàng** với HĐTC (trigger `mortgage_link_same_customer`).
- **Không xoá HĐTC chưa giải chấp** (trigger `mortgage_block_delete_unreleased`). Không có ngoại lệ xoá dây chuyền: xoá khách phải giải chấp và xoá HĐTC trước.
- **Không đổi khách sở hữu** (`CustomerId`) của tài sản / HĐTD / HĐTC khi bản ghi đang nằm trong một HĐTC (trigger `mortgage_block_owner_change`), để liên kết không thành nối chéo khách.
- **Không xoá tài sản / HĐTD đang nằm trong HĐTC**, kể cả HĐTC đã giải chấp — phải gỡ khỏi HĐTC trước (khoá ngoại NO ACTION `fk_mortgage_link_collateral`, `fk_mortgage_link_credit_contract`). `mortgageLinkErrorMessage` (`mortgageContract.ts`) đổi lỗi khoá ngoại này sang tiếng Việt cho `deleteCollateralAPI` và `deleteCreditContractAPI`.
- Giải chấp phải có ngày giải chấp (CHECK `mortgage_released_has_date`).
- Xoá khách hàng bị chặn khi còn HĐTC (`customerDeleteBlockers`), như với KUNN / HĐTD / TSBĐ / thẻ. HĐTC đứng ngay sau KUNN trong danh sách vì phải gỡ HĐTC rồi mới xoá được HĐTD và tài sản.

Lưu HĐTC chạy hai bước: ghi dòng HĐTC rồi ghi bảng nối theo chênh lệch (`linkDiff`). Bước sau lỗi thì API ném `MortgageLinkSaveError` mang `mortgageId`, và controller chuyển form sang chế độ sửa HĐTC vừa tạo — lần Lưu kế tiếp là cập nhật, không chèn trùng.

**Hai nguồn độc lập:** `CreditContracts.CollateralIds` (chuỗi CSV, §6) vẫn là nguồn cho hạn mức và LTV. Bảng nối HĐTC ↔ tài sản là nguồn pháp lý riêng. Hai nguồn **có thể lệch nhau** và hiện chưa có gì đối chiếu tự động — đừng đọc bảng nối để tính hạn mức.

---

## 9. Sổ tra hàm nhanh

Tất cả ở `src/lib/collateralMath.ts` trừ khi ghi khác.

| Hàm | Trả về | Điều phải nhớ |
| :--- | :--- | :--- |
| `defaultLtvForAssetType(assetType)` | % LTV theo loại | Cắt tiền tố BĐS; khớp chính xác trước rồi mới `startsWith`; mặc định 80 |
| `getEffectiveLtv(c)` | % LTV hiệu lực | Ưu tiên `LtvPercent` khai (cho phép 0); không dùng `||` |
| `isRestrictedAsset(assetType)` | boolean | LTV mặc định = 0 |
| `isLtvException(c)` | boolean | Tài sản hạn chế nhận nhưng đã khai LTV > 0 = ngoại lệ đã duyệt |
| `collateralValue(c)` | số tiền | `AppraisedValue || Value || 0` |
| `maxLoanFromCollateral(c)` | số tiền | Số học thuần, **chưa** xét hiệu lực định giá |
| `appraisalExpiryDate(c)` | ISO date / null | Tính từ `AppraisalDate + AppraisalTenorMonths`, không đọc cột text |
| `appraisalStatus(c, today?)` | `valid`/`expiring_soon`/`expired`/`missing` | Ngưỡng cảnh báo 60 ngày |
| `isAppraisalUsable(c, today?)` | boolean | `valid` hoặc `expiring_soon` |
| `usableCapacity(c, today?)` | số tiền | **Con số dùng cho chốt kiểm soát**; 0 khi định giá hết hiệu lực |
| `totalUsableCapacity(cols, today?)` | số tiền | Tổng danh sách |
| `cardProductCap(c, today?)` | số tiền / null | Chỉ STK; trần 90%; null nếu không phải STK |
| `isSavingsPassbook(assetType)` | boolean | Bắt đầu `"Sổ tiết kiệm"` / `"STK"` |
| `parseCollateralIds(c)` *(creditLimit.ts)* | `number[]` | Tách theo dấu phẩy, không `LIKE` |
