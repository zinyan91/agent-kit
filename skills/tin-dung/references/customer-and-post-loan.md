# Hồ sơ khách hàng & Kiểm soát sau vay

> Nguồn sự thật: **CODE**. Tài liệu này gộp phần liên quan của `CONVENTIONS.md` (mục 9b) nhưng khi code lệch với văn bản thì **theo code**. Mọi quy tắc đều kèm lý do "vì sao", ví dụ và lỗi từng xảy ra để không tái phạm.

## Mục lục

- [1. Phân quyền theo `Customers.OwnerId`](#1-phân-quyền-theo-customersownerid)
- [2. Ràng buộc dữ liệu trên hồ sơ (`customerValidation.ts`)](#2-ràng-buộc-dữ-liệu-trên-hồ-sơ-customervalidationts)
- [3. Lưu trữ hồ sơ, không "tất toán" (`customerStatus.ts`)](#3-lưu-trữ-hồ-sơ-không-tất-toán-customerstatusts)
- [4. Xoá hồ sơ khách hàng](#4-xoá-hồ-sơ-khách-hàng)
- [5. Xoá HĐTD — lớp bảo vệ nằm ở khoá ngoại](#5-xoá-hđtd--lớp-bảo-vệ-nằm-ở-khoá-ngoại)
- [6. Ngữ cảnh khách hàng (`customerContext.ts`)](#6-ngữ-cảnh-khách-hàng-customercontextts)
- [7. Sổ nợ phải thu (`debt.ts`)](#7-sổ-nợ-phải-thu-debtts)
- [8. Kiểm soát sau vay (`postLoanControl.ts`)](#8-kiểm-soát-sau-vay-postloancontrolts)

---

## 1. Phân quyền theo `Customers.OwnerId`

Mô hình quyền là **hai vai + quyền sở hữu dữ liệu**, cài ở tầng CSDL (RLS), không cài ở giao diện. Nguồn: `supabase/migrations/01_roles_and_ownership.sql`, `02_enable_rls.sql`, và các policy trong từng migration bảng.

| Thành phần | Vai trò |
| :--- | :--- |
| Bảng `UserRoles("UserId","Role")` | `Role` chỉ nhận `'admin'` hoặc `'banker'` (CHECK). admin = toàn quyền xem/sửa; banker = **chỉ KH mình phụ trách**. |
| Cột `Customers.OwnerId uuid` | Banker phụ trách. **`NULL` = chỉ admin nhìn thấy** (không phải "mọi người thấy"). |
| `is_admin()` | `SECURITY DEFINER`, kiểm `auth.uid()` có dòng admin trong `UserRoles`. |
| `can_access_customer(cid)` | `is_admin() OR Customers.OwnerId = auth.uid()`. |
| `can_access_contract(id)` | Suy quyền qua `LoanContracts → Customers.OwnerId`. |
| `can_access_collateral(id)` | Suy quyền qua `Collaterals → Customers.OwnerId` (migration 08). |

**Vì sao chỉ một cột `OwnerId` trên `Customers`?** Quyền trên `Collaterals` / `LoanContracts` / `CreditCards` / `RepaymentSchedules` / `PostLoanControlRecords` được **suy ra theo quan hệ tới `Customers`**, không thêm cột chủ sở hữu cho từng bảng. Một nguồn sự thật về quyền, khỏi lệch.

**Vì sao hàm hỗ trợ là `SECURITY DEFINER`?** Để **tránh đệ quy RLS**: policy trên `Customers` mà lại `SELECT` chính `Customers` sẽ tự gọi lại policy. Hàm định nghĩa với quyền chủ sở hữu chạy ngoài vòng đó.

**Vì sao bắt buộc có index `idx_customers_owner` và các index `*_customer`?** Không có chúng, mỗi truy vấn dưới RLS quét toàn bảng cho **từng dòng** — hiệu năng sụp khi bật RLS.

> **Lỗi từng xảy ra / cạm bẫy:** khi bật RLS mà quên gán `OwnerId` cho dữ liệu cũ thì **banker không thấy gì** (dữ liệu không mất, chỉ bị ẩn). Migration 01 gán toàn bộ KH đang `NULL` về admin để tránh đúng cảnh này. Hệ quả kế thừa: dữ liệu nhập thẳng bằng SQL không đi qua ứng dụng nên có thể để `OwnerId = NULL` → chỉ admin thấy.

---

## 2. Ràng buộc dữ liệu trên hồ sơ (`customerValidation.ts`)

Nguyên tắc gốc: **mỗi thông tin nghiệp vụ có cột riêng**, không nhét vào `Note`. Type `Customer` (`src/types/index.ts`) đã có cột riêng cho CCCD, điện thoại, số tài khoản, thông tin KHLQ/bảo lãnh, thu nhập… — nhét dữ liệu có cấu trúc vào ghi chú tự do là mất khả năng kiểm tra và tra cứu.

Kiểm tra số liệu chạy **hai tầng, cả hai đều cần**:

| Tầng | Hàm | Làm gì |
| :--- | :--- | :--- |
| **Ô nhập** | `capDigits(value, max)`, `capNumberList(value, maxPerItem)` | Lọc bỏ ký tự không phải số và cắt ở mức tối đa — gõ thừa không vào được, chặn lỗi ngay lúc phát sinh. |
| **Lúc lưu** | `validateCustomerForm(values)` | Gom **đủ mọi lỗi một lượt**, nêu tên trường và **đang có bao nhiêu số**, không bắt banker sửa từng cái rồi lưu lại. |

Hằng số & luật độ dài (đọc thẳng từ code, không phải nhớ):

| Hằng | Giá trị | Áp cho |
| :--- | ---: | :--- |
| `NATIONAL_ID_CCCD_LENGTH` | 12 | CCCD |
| `NATIONAL_ID_CMND_LENGTH` | 9 | CMND |
| `PHONE_LENGTH` | 10 | mỗi số điện thoại |

Áp cho **cả trường của KH lẫn KHLQ / Bảo lãnh** (`validateCustomerForm` gọi `validateNationalId`/`validatePhone` bốn lần: `nationalId`, `phone`, `spouseNationalId`, `spousePhone`).

**Bỏ trống là hợp lệ.** `validateNationalId`/`validatePhone` trả `null` khi `digits.length === 0` — đây không phải trường bắt buộc, chỉ khi có nhập mới xét độ dài.
> Lỗi từng xảy ra: xét độ dài cả khi rỗng sẽ **chặn banker lưu hồ sơ mới chưa đủ giấy tờ**.

**CCCD chấp nhận cả 9 và 12 số.** `validateNationalId` trả `null` cho cả hai độ dài; ô nhập chỉ chặn ở mức tối đa **12** (CCCD), không chặn ở 9 — gõ CMND 9 số vẫn phải qua được **cùng một ô**.

**Điện thoại và số tài khoản nhận NHIỀU số trong một ô.** Một KHLQ có hai số là chuyện thật, không phải lỗi nhập liệu.
- `splitNumberList` tách theo `;` `,` `/` `|` và **xuống dòng**.
- `capNumberList` / `normalizeNumberList` gom về **một dạng ngăn cách duy nhất** là `LIST_SEPARATOR = " / "`.
- Luật 10 số áp cho **từng số**, không áp cho cả chuỗi. `validatePhone` báo lỗi chi tiết khi nhiều số: nêu còn mấy số chưa đúng và độ dài từng số.
- **Dấu ngăn đang gõ dở được giữ lại** (biến `trailing` kiểm regex `/[;,/\n|]\s*$/`) để nhập số tiếp theo — cắt nó đi thì không gõ được số thứ hai.

**CCCD thì ngược lại: một người một số** — ô CCCD vẫn chỉ nhận một giá trị.

Ngoài kiểm tra còn có `parseRawCustomerText(raw)` — bóc CIF/CCCD/điện thoại/email/STK/tên/địa chỉ từ đoạn văn bản dán vào (dùng regex nhãn, có nhánh dự phòng tách theo `|`/tab). Đây là tiện ích nhập nhanh, không phải ràng buộc.

> Đo trước khi đặt luật (10/08/2026, ghi trong `CONVENTIONS.md`): 14/14 CCCD hiện có đều 12 số, 11/11 điện thoại đều 10 số — luật không khoá ai khỏi sửa hồ sơ cũ.

---

## 3. Lưu trữ hồ sơ, không "tất toán" (`customerStatus.ts`)

Tab Khách hàng là **danh bạ hồ sơ**, cố ý chỉ nạp bảng `Customers` — không KUNN, không HĐTD, không thẻ. Vì thế nó **không thể tự biết ai đã tất toán**, nên trạng thái là **cờ thủ công** `Customers.ArchivedAt` (migration 32) do banker đánh dấu.

Ba filter: `CustomerStatusFilter = 'active' | 'archived' | 'ALL'`. Nhãn ở `CUSTOMER_STATUS_LABEL` ("Đang làm việc" / "Đã lưu trữ" / "Tất cả").

Hàm chính:
- `isCustomerArchived(c)` — trả `true` **chỉ khi** `ArchivedAt` là chuỗi **không rỗng** sau `trim`. `filterCustomersByStatus`, `countCustomersByStatus` dựa trên nó.

**Gọi là "lưu trữ", không gọi là "đã tất toán".** Cờ do người gõ tay không bảo đảm điều gì về nợ; gắn nhãn "đã tất toán" là tạo **nguồn thứ hai mâu thuẫn với dư nợ thật**.
> Lỗi từng xảy ra: `isKunnSettled` từng suy trạng thái tất toán từ `IsClosed` của HĐTD — đúng loại lỗi này. "Lưu trữ" thì trung thực: *hồ sơ này tôi không làm việc nữa*, không nói gì về nợ.

**Một cột mang cả cờ lẫn ngày.** `NULL` = đang làm việc. Nếu tách `IsArchived` + ngày sẽ đẻ ra trạng thái vô lý "cờ bật mà ngày rỗng".

**`ArchivedAt` chuỗi rỗng đọc thành *chưa* lưu trữ** (xem điều kiện `trim().length > 0`), không phải đã lưu trữ — hồ sơ thà nằm lại danh sách làm việc còn hơn âm thầm biến mất.

**Chốt chống trôi nằm ở `api.ts`, không ở tab Khách hàng.** `saveContractAPI` và `saveCreditContractAPI` tự **xoá `ArchivedAt`** khi ghi hợp đồng cho khách đang lưu trữ — áp cho **cả sửa lẫn tạo mới** (sửa một KUNN của khách đang lưu trữ cũng là đang làm việc với khách đó). Đặt ở lớp dữ liệu thì tab Khách hàng vẫn sạch mà cờ không mâu thuẫn được với thực tế. Dữ liệu nhập thẳng bằng SQL không đi qua đây; migration 32 có câu rà soát.

---

## 4. Xoá hồ sơ khách hàng

Ba điều kiện, thiếu một là hỏng, và cả ba từng cùng hỏng một lúc.

**(1) Kiểm tra ràng buộc trước.** `customerStatus.ts` cung cấp bộ đếm và thông báo:
- `CustomerLinkCounts { kunn, hdtd, collaterals, cards }`.
- `customerDeleteBlockers(counts)` — trả danh sách "N khoản vay (KUNN)", "N hợp đồng tín dụng", "N tài sản bảo đảm", "N thẻ tín dụng" cho những loại có số lượng > 0.
- `customerDeleteBlockedMessage(blockers)` — ghép thành thông báo chặn, **luôn nêu lối thoát là lưu trữ** ("…hoặc lưu trữ hồ sơ nếu chỉ muốn ẩn khỏi danh sách").

**Vì sao nêu số lượng từng loại?** Để banker biết gỡ từ đâu — cùng khuôn với `deleteCollateralAPI`. Phần lớn trường hợp bấm xoá thực ra chỉ muốn hồ sơ biến khỏi danh sách → luôn gợi ý lưu trữ.

**(2) `.select()` rồi đếm số dòng** (ở `deleteCustomerAPI`).
> Lỗi từng xảy ra: RLS chặn thì Supabase trả **mảng rỗng không kèm lỗi**, và giao diện báo "Đã xoá thành công" trên một hồ sơ **vẫn còn nguyên**. Phải đếm dòng trả về để biết có thật sự xoá.

**(3) Nút phải đọc được.** Dùng `BTN_DANGER` trong `uiClasses.ts`, đừng tự viết lại lớp màu.
> Lỗi từng xảy ra: bản cũ ghép `bg-neg` với `text-neg` — nền và chữ cùng token màu nên nút là **khối đỏ đặc**, icon `currentColor` cũng biến mất. Cùng gốc với (1): **một quy tắc chỉ cài ở một nơi**, kể cả quy tắc màu.

---

## 5. Xoá HĐTD — lớp bảo vệ nằm ở khoá ngoại

`LoanContracts.CreditContractId` là **`ON DELETE RESTRICT`** (migration 33). Xoá một HĐTD còn KUNN gắn vào là bị chặn tại CSDL.

> Lỗi từng xảy ra: trước đó cột mang hai ràng buộc chọi nhau — migration 14 đặt `ON DELETE SET NULL`, migration 23 đặt `SET NOT NULL` — nên nhánh `SET NULL` **không bao giờ chạy được**, xoá HĐTD còn KUNN chỉ nhận lỗi 23502 bằng tiếng Anh.

Ý định đã rõ ở ba nơi khác trước khi khoá ngoại xác nhận lại: migration 22 chặn *đóng* HĐTD khi còn dư nợ; migration 23 buộc mọi KUNN gắn HĐTD; `CreditContractView` chặn *xoá* khi còn KUNN. **Chốt ở giao diện không phải lớp bảo vệ** — khoá ngoại là lớp cuối cùng (cùng lý lẽ với RLS và unique index số KUNN).

Lỗi `23503` từ ràng buộc này được **dịch sang tiếng Việt kèm số KUNN đang vướng**, không để lộ thông báo gốc của Postgres.

**Xoá khách hàng đi qua đây gián tiếp:** `CreditContracts.CustomerId` là `ON DELETE CASCADE`, nên xoá khách kéo theo xoá HĐTD rồi **chạm `RESTRICT`**. Chốt đếm ràng buộc ở `deleteCustomerAPI` (mục 4) chặn trước, khoá ngoại đỡ phần còn lại.

---

## 6. Ngữ cảnh khách hàng (`customerContext.ts`)

`buildCustomerContext(input)` trả `CustomerContextSummary` — bảng tóm tắt tình trạng tín dụng của một khách, **tính sống tại thời điểm `today`**, không đọc số đã lưu.

| Trường | Nguồn | Ý nghĩa |
| :--- | :--- | :--- |
| `granted` | `totalsOfCreditContracts` | Tổng hạn mức được cấp (`Σ ContractAmount`). |
| `outstanding` | `totalsOfCreditContracts` | Tổng dư nợ còn lại. |
| `available` | `totalsOfCreditContracts` | Tổng hạn mức còn dùng được. |
| `debtGroup` | `getAutoDebtGroupInfo` | Nhóm nợ **tính từ số ngày quá hạn**. |
| `maxOverdueDays` | `getAutoDebtGroupInfo` | Số ngày quá hạn lớn nhất trong các kỳ chưa tất. |
| `activeKunnCount` | `Σ summary.activeKunnCount` | Số KUNN đang còn hiệu lực. |

Đầu vào `BuildCustomerContextInput`: `creditContracts`, `kunns`, `paidPrincipal` (map `Id → gốc đã trả`), `overdueSchedules`, `today`.

Cách tính (đọc code):
1. `summarizeCreditContracts(creditContracts, kunns, { getOutstanding, today })` — với `getOutstanding = (k) => outstandingOf(k, paidPrincipal[k.Id] ?? null)`.
2. `outstandingOf(contract, paidPrincipal)` (`loanMath.ts`): KUNN đã tất toán (`IsSettled === true`) → dư nợ **0**; thiếu `paidPrincipal` → dùng `CurrentBalance ?? loanAmt`; có thì `max(0, gốc vay − đã trả)`.
3. `getAutoDebtGroupInfo(overdueSchedules, today)` (`loanMath.ts`): không có lịch quá hạn → `{ debtGroup: 1, maxOverdueDays: 0 }`; ngược lại quét các kỳ **chưa tất** để tìm `maxOverdueDays` rồi suy nhóm nợ.

**Vì sao nhóm nợ tính sống?** Field `DebtGroup` lưu trong CSDL có thể cũ; quy ước hệ thống là dùng nhóm nợ **tính từ số ngày quá hạn tại `today`**, không đọc thẳng giá trị đã lưu. (Xem thêm quy ước "Nhóm nợ phải tính sống" trong bộ nhớ dự án.)

---

## 7. Sổ nợ phải thu (`debt.ts`)

Module này tính **bảng cân đối công nợ phải thu** (kiểu sổ kế toán phát sinh), độc lập với KUNN/HĐTD — dùng cho theo dõi công nợ đối tác/khách hàng doanh nghiệp.

- `ReceivableItem` — một dòng: `beginningDebit/Credit` (đầu kỳ), `occurredDebit/Credit` (phát sinh trong kỳ).
- `computeReceivableItemRow(item)` — chuẩn hoá về **không âm** (`Math.max(0, …)`), rồi tính:
  ```
  net = (đầuNợ − đầuCó) + (psNợ − psCó)
  endingDebit  = net > 0 ? net : 0
  endingCredit = net < 0 ? |net| : 0
  ```
  **Vì sao tách hai cột cuối kỳ?** Một dòng chỉ dư một bên (Nợ *hoặc* Có); dồn dấu vào một cột sẽ mất chuẩn trình bày kế toán.
- `computeReceivableSummary(items)` — cộng dồn tất cả cột, `netReceivableBalance = totalEndingDebit − totalEndingCredit`.
- `parseReceivableText(text)` — dán bảng từ Excel: tách theo **tab** (nếu có) hoặc `,`/`;`; bỏ dòng tiêu đề (chứa "mã"/"tên"/"tài khoản"); cần ≥ 2 cột. Số qua `parseDecimalNumber`.
- `nextDebtItemId()` — sinh id `debt_<timestamp>_<seq>`.
- `SAMPLE_RECEIVABLES` — dữ liệu mẫu.

---

## 8. Kiểm soát sau vay (`postLoanControl.ts`)

> Mảng này `CONVENTIONS.md` **chưa có** — mục này audit thuần từ code (`src/lib/postLoanControl.ts`), type (`src/types/index.ts`), API (`src/lib/api/postLoanApi.ts`) và bảng (`supabase/migrations/08_appraisal_history_and_post_loan_control.sql`).

### 8.1 Nguyên tắc lịch — sinh động, không lưu

**Lịch các đợt *cần* kiểm tra được sinh tự động** từ hợp đồng + tài sản (`generateControlSchedule`), **không lưu trong CSDL**. Chỉ **kết quả đã thực hiện** mới lưu vào bảng `PostLoanControlRecords`. (COMMENT của bảng nói rõ điều này.) Vì sao: lịch là hàm của dữ liệu hợp đồng hiện thời — lưu lại là tạo bản sao trôi khỏi thực tế.

### 8.2 Ba loại kiểm soát

`ControlType = 'purpose' | 'periodic' | 'collateral'`. Nhãn ở `CONTROL_TYPE_LABEL`:

| Loại | Nhãn | Phạm vi tự nhiên | Chu kỳ / mốc |
| :--- | :--- | :--- | :--- |
| `purpose` | Kiểm tra mục đích sử dụng vốn | **một KUNN** (`ContractId`) | 1 đợt, `PURPOSE_CHECK_DAYS = 30` ngày sau giải ngân |
| `periodic` | Kiểm tra sau vay | **một HĐTD gốc** (`MasterHdtd` + `CustomerId`) | mỗi `PERIODIC_CHECK_MONTHS = 3` tháng |
| `collateral` | Kiểm tra hiện trạng tài sản | **một tài sản** (`CollateralId`) | mỗi `COLLATERAL_CHECK_MONTHS_DEFAULT = 12` tháng |

**Vì sao ba loại, mỗi loại một phạm vi?** Migration 08 ghi rõ: mỗi loại có **một** phạm vi tự nhiên nên **không cần cột danh sách** — cột `ContractId` / `MasterHdtd` / `CollateralId` đủ định vị.

### 8.3 Cách sinh lịch (`generateControlSchedule`)

Đầu vào `GenerateControlInput`: `contracts`, `collaterals`, `todayStr`, `horizonMonths = 12`, `collateralIntervalMonths = 12`, `dueSoonDays = 30`.

- Chỉ xét hợp đồng **đang hoạt động**: `isActive(c) = !c.IsSettled`.
- **purpose**: mốc gốc = `DisbursementDate || ContractStartDate`; đến hạn = mốc + 30 ngày. Một đợt/ KUNN, `periodIndex = 1`, `key = purpose-<Id>`.
- **periodic**: gom KUNN theo `CustomerId::(MasterHdtd || ContractNumber)`; mốc = **ngày giải ngân sớm nhất** của nhóm; giới hạn = `min(ngày kết thúc muộn nhất của nhóm, chân trời horizon)`; sinh đợt mỗi 3 tháng cho tới giới hạn (chặn trên 400 vòng). `key = periodic-<groupKey>-<i>`.
- **collateral**: chỉ tài sản **đang được KUNN active tham chiếu** (`parseCollateralIds`); mốc = `AppraisalDate`; đợt mỗi `collateralIntervalMonths` tháng tới chân trời (chặn 200 vòng). `key = collateral-<colId>-<i>`.
- Kết quả sort theo `dueDate` rồi `key`.

### 8.4 Trạng thái đợt (`ControlStatus`)

`statusOf(dueDate, today, dueSoonDays)` tính `daysRemaining` rồi phân:

| Trạng thái | Điều kiện |
| :--- | :--- |
| `overdue` | `daysRemaining < 0` |
| `due_soon` | `0 ≤ daysRemaining ≤ dueSoonDays` |
| `upcoming` | còn lại |
| `done` | **không do `statusOf` sinh** — gán khi đã khớp được bản ghi kết quả (xem 8.6) |

`summarizeControls(items)` → `{ overdue, dueSoon, upcoming, total }`. `overdueDaysOf(item)` = `|daysRemaining|` khi quá hạn, 0 nếu khác. `daysFromBasis(item)` = số ngày từ mốc tới hạn.

### 8.5 Kết quả kiểm tra & bảng `PostLoanControlRecords`

Type `PostLoanControlRecord` (`src/types/index.ts`) ↔ bảng (migration 08). `ControlResult = 'pass' | 'watch' | 'fail'`; nhãn `CONTROL_RESULT_LABEL`: **Đạt / Cần theo dõi / Không đạt**.

Cột bảng (đối chiếu type):

| Cột | Kiểu / ràng buộc | Ghi chú |
| :--- | :--- | :--- |
| `Id` | identity PK | |
| `ControlType` | CHECK `purpose/periodic/collateral` | |
| `ControlKey` | text **UNIQUE** | Khoá đợt do lõi sinh (vd `purpose-1024`, `periodic-1::HD01-3`) — dùng khớp bản ghi với đợt. |
| `CustomerId` | FK `Customers` `ON DELETE CASCADE` | |
| `ContractId` | FK `LoanContracts` `ON DELETE CASCADE`, nullable | |
| `MasterHdtd` | text nullable | |
| `CollateralId` | FK `Collaterals` `ON DELETE CASCADE`, nullable | |
| `PeriodIndex` | int, default 1 | |
| `DueDate` | date | ngày đến hạn của đợt |
| `PerformedDate` | date | ngày thực hiện |
| `PerformedBy` | uuid FK `auth.users` | ghi từ session, không nhận từ client |
| `Result` | CHECK `pass/watch/fail` | |
| `Findings` | text nullable | |
| `AppraisalId` | FK `CollateralAppraisals` `ON DELETE SET NULL` | Bản định giá phát sinh từ đợt kiểm tra tài sản, nếu có. |

**Vì sao `AppraisalId`?** Kiểm tra hiện trạng tài sản là lúc phát sinh **định giá mới** — bản ghi kiểm soát trỏ tới bản ghi định giá tương ứng (`CollateralAppraisals`, migration 08). Định giá lại **không ghi đè** giá trị cũ trên `Collaterals` mà thêm dòng lịch sử; một **trigger** (`sync_collateral_latest_appraisal`) tự đồng bộ giá trị hiện hành về `Collaterals`. Vì sao dùng trigger: để ứng dụng không phải ghi hai nơi rồi lệch âm thầm.

### 8.6 API & khớp bản ghi

`src/lib/api/postLoanApi.ts`:
- `fetchPostLoanControlRecordsAPI()` — lấy tối đa 5000 bản ghi, sort `PerformedDate` giảm dần.
- `savePostLoanControlRecordAPI(record)` — **validate bắt buộc**: `ControlKey`, `CustomerId`, `PerformedDate`, `Result` (ném lỗi tiếng Việt nếu thiếu). `PerformedBy` lấy từ `session.user.id` (**không tin client**). Ghi bằng **`upsert` `onConflict: 'ControlKey'`** — nhờ `ControlKey` UNIQUE nên lưu lại một đợt sẽ **cập nhật đúng dòng cũ**, không sinh trùng.

Khớp lịch với kết quả (trong `postLoanControl.ts`):
- `mergeControlRecords(items, records)` — map theo `ControlKey`; đợt nào có bản ghi thì **status ép thành `done`** và đính kèm `record`.
- `summarizeWithRecords(items)` → `{ overdue, dueSoon, upcoming, done, total }`.
- `pendingControls(items)` — lọc các đợt **chưa `done`**.

### 8.7 RLS

Bảng bật RLS, policy `plc_all` dùng `can_access_customer("CustomerId")` cho cả `USING` lẫn `WITH CHECK` → banker chỉ đọc/ghi kết quả của **KH mình phụ trách**; `anon` bị `REVOKE ALL`. `CollateralAppraisals` dùng `can_access_collateral`.

> Cạm bẫy kế thừa: bảng cũ `PostLoanControls` (từ ứng dụng WPF) hiện rỗng và bị RLS chặn hoàn toàn — **không dùng**, vì chưa rõ lược đồ; nhồi dữ liệu vào cột sai kiểu chính là kiểu lỗi "diện mở thẻ" từng làm mất trắng dữ liệu.
