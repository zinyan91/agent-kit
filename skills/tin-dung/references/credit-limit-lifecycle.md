# Hạn mức, HĐTD, KUNN & Sản phẩm vay

Vòng đời cấp tín dụng trong CustomerManager: từ phê duyệt hạn mức tín dụng (HMTD),
qua hợp đồng tín dụng (HĐTD), tới từng giấy nhận nợ (KUNN). Tài liệu này giải thích
mô hình dữ liệu, công thức tính hạn mức khả dụng, ba trường hợp gom hạn mức, các chốt
kiểm soát và **hai điểm bẫy nghiêm trọng** đã phát hiện trong mã (hai cách tính `limitOf`
vs SQL; hai cài đặt `isRevolvingCredit`).

**Tệp mã liên quan:** `src/lib/creditContract.ts`, `src/lib/creditLimit.ts`,
`src/lib/loanProductRules.ts`, `src/lib/kunnForm.ts`, `src/lib/kunnFormRules.ts`.

---

## Mục lục

1. [Ba tầng: HMTD → HĐTD → KUNN](#1-ba-tầng-hmtd--hĐtd--kunn)
2. [Ba trường hợp gom hạn mức (TH1/TH2/TH3)](#2-ba-trường-hợp-gom-hạn-mức)
3. [available = granted − used](#3-available--granted--used)
4. [BẪY 1 — `limitOf` (mức cấp) khác công thức SQL (mức giải ngân)](#4-bẫy-1--limitof-mức-cấp-khác-công-thức-sql-mức-giải-ngân)
5. [BẪY 2 — Hai cài đặt `isRevolvingCredit`](#5-bẫy-2--hai-cài-đặt-isrevolvingcredit)
6. [`summarizeCreditContracts` & `totalsOfCreditContracts`](#6-summarizecreditcontracts--totalsofcreditcontracts)
7. [`computeLimitGroups` — nguồn duy nhất tính hạn mức khả dụng](#7-computelimitgroups--nguồn-duy-nhất-tính-hạn-mức-khả-dụng)
8. [Đóng HĐTD ≠ hết hiệu lực; không đóng khi còn KUNN chưa tất toán](#8-đóng-hĐtd--hết-hiệu-lực)
9. [Số hiệu KUNN là số chứng từ, không được trùng](#9-số-hiệu-kunn-là-số-chứng-từ-không-được-trùng)
10. [Vòng đời & hiệu lực KUNN trong HĐTD](#10-vòng-đời--hiệu-lực-kunn-trong-hĐtd)
11. [Sản phẩm vay & ràng buộc (`loanProductRules.ts`)](#11-sản-phẩm-vay--ràng-buộc)
12. [Vay từng lần = min của ba giới hạn](#12-vay-từng-lần--min-của-ba-giới-hạn)
13. [Sổ tra cứu hàm](#13-sổ-tra-cứu-hàm)

---

## 1. Ba tầng: HMTD → HĐTD → KUNN

Nghiệp vụ có ba tầng, mỗi tầng một khái niệm khác nhau — trộn lẫn là sai:

| Tầng | Là gì | Trường dữ liệu chính |
| :--- | :--- | :--- |
| **HMTD** (phê duyệt hạn mức) | Tổng mức được duyệt cho khách/cụm | `CreditLimitCode`, `CreditLimitAmount` (khi dùng chung nhiều HĐTD) |
| **HĐTD** (hợp đồng tín dụng) | Một hợp đồng, có ngày hiệu lực và mức cấp | `CreditContracts` (bảng riêng) hoặc tiền tố `ContractNumber` |
| **KUNN** (giấy nhận nợ) | Một lần nhận nợ/giải ngân cụ thể | Một dòng `LoanContracts`, số dạng `HD.../GNN-01` |

Số HĐTD gốc nằm ở **tiền tố của `ContractNumber`**, dạng `HD123/GNN-01` — phần trước
`/GNN-`. Hàm `getMasterHdtdNumber` (`utils.ts`) trích phần này; nếu `ContractNumber`
không chứa `/GNN-` thì trả về nguyên chuỗi, và trả `'HĐTD-CHÍNH'` khi rỗng. Cột
`HdtdDueDate` **không** chứa số hợp đồng — đó là tàn dư thiết kế cũ.

Một KUNN có thể liên kết HĐTD bằng khoá ngoại `CreditContractId` (bảng
`CreditContracts`) **hoặc** chỉ bằng tiền tố `ContractNumber` (dữ liệu cũ chưa tách
bảng). `resolveMasterHdtdNumber` (`creditContract.ts`) ưu tiên đọc `HdtdNumber` của
HĐTD liên kết qua `CreditContractId`, không có mới suy từ tiền tố — dùng nó thay vì
đọc thẳng `getMasterHdtdNumber` khi có sẵn danh sách `CreditContracts`.

---

## 2. Ba trường hợp gom hạn mức

Đây là nền tảng để tổng mức cấp không bị đếm trùng hoặc đếm thiếu (CONVENTIONS §4):

| | Trường hợp | Cách biểu diễn trong dữ liệu |
| :--- | :--- | :--- |
| **TH1** | Một số HĐTD, nhiều KUNN | `ContractAmount` **lặp** trên từng dòng KUNN là **đúng**. Gom theo tiền tố `ContractNumber` trước `/GNN-`, lấy **giá trị lớn nhất**, không cộng dồn. |
| **TH2** | Khác số HĐTD, **cùng một HMTD** | Khai cùng `CreditLimitCode`. Hạn mức chỉ tính **một lần** cho cả nhóm. |
| **TH3** | Khác số HĐTD, khác HMTD | Cộng mức cấp của từng hợp đồng. |

Vì `ContractAmount` cố ý lặp trên mọi KUNN của cùng HĐTD (TH1), **không được** `SUM`
thẳng cột này qua các dòng — sẽ nhân mức cấp lên theo số KUNN. Phải gom nhóm rồi lấy
`MAX`. Đây chính là lý do `computeLimitGroups` và `computeCreditLimit`
(`creditLimit.ts`) đều nhóm trước, lấy max trong nhóm, rồi mới cộng giữa các nhóm.

`computeCreditLimit` trả về `CreditLimitBreakdown { total, shared[], standalone[] }`:
nhóm `shared` gom theo `CreditLimitCode` (TH2), nhóm `standalone` gom theo số HĐTD gốc
(TH1/TH3). Trong mỗi nhóm, ưu tiên `CreditLimitAmount` đã khai (>0), không có mới rơi
về `limitOf(c)`.

---

## 3. available = granted − used

Công thức trung tâm, nhưng `used` **phụ thuộc loại sản phẩm** (xem BẪY 2 để biết
"loại sản phẩm" được quyết định thế nào):

```
used   = revolving ? Σ(dư nợ KUNN còn hiệu lực) : Σ(đã nhận nợ, kể cả KUNN đã tất toán)
headroom = max(0, granted − used)
available = (hết hiệu lực | chưa hiệu lực | đã đóng) ? 0 : headroom
```

| Cơ sở trừ hạn mức | Sản phẩm | Vì sao |
| :--- | :--- | :--- |
| **Dư nợ** hiện hữu | HMTD tuần hoàn (`revolving`) | Trả nợ là **giải phóng** hạn mức, rút lại được |
| **Tổng đã nhận nợ** (gồm cả KUNN tất toán) | Cho vay từng lần | Đã giải ngân là hết, không rút lại được |

Phân biệt `headroom` vs `available`: `headroom` chỉ xét dư nợ, **chưa** xét hiệu lực —
giữ lại để đối chiếu. `available` mới là số **giải ngân được thật**: HĐTD hết hiệu lực,
chưa hiệu lực hoặc đã đóng đều cho `available = 0` dù `headroom` còn.

---

## 4. BẪY 1 — `limitOf` (mức cấp) khác công thức SQL (mức giải ngân)

Đây là điểm dễ nhầm nhất. Có **hai** công thức chọn "số tiền của một dòng", cho **hai
khái niệm khác nhau**, và thứ tự ưu tiên **ngược nhau**:

| Nơi | Công thức | Khái niệm | Ưu tiên |
| :--- | :--- | :--- | :--- |
| `limitOf` trong `creditLimit.ts` | `c.ContractAmount \|\| c.LoanAmount \|\| 0` | **Mức CẤP** (granted / hạn mức) | `ContractAmount` trước |
| SQL thống kê (vd `reports/06`) | `coalesce(nullif("LoanAmount",0), "ContractAmount", 0)` | **Mức GIẢI NGÂN** (disbursed) | `LoanAmount` trước |
| `kunnPrincipal` trong `loanMath.ts` | `LoanAmount>0 ? LoanAmount : (CurrentBalance>0 ? CurrentBalance : 0)` | **Mức GIẢI NGÂN** (phía TS) | `LoanAmount`, rồi `CurrentBalance`, **không bao giờ** `ContractAmount` |

**Khi nào dùng cái nào:**

- **Tính hạn mức được cấp / trần** (TH1–TH3, cột `granted` của nhóm) → `limitOf`. Nó
  lấy `ContractAmount` (mức cấp HĐTD) trước, chỉ rơi về `LoanAmount` khi dòng không có
  mức cấp riêng. Dùng cho `computeCreditLimit`, và cho `granted` trong
  `computeLimitGroups` khi không có `CreditLimitAmount` khai riêng.
- **Tính số tiền đã thực sự ra khỏi ngân hàng** (dư nợ, đã giải ngân, cơ sở trừ hạn
  mức của vay từng lần, mọi con số thống kê) → `kunnPrincipal` (trong TypeScript) hoặc
  `coalesce(nullif(LoanAmount,0), ContractAmount, 0)` (trong SQL báo cáo).

**Lỗi từng xảy ra:** hồ sơ ĐOÀN NGỌC LÝ `2002/HĐTD/9738792/GNN-01` có
`LoanAmount = 0`, tiền vay 830 triệu nằm ở `ContractAmount`. Một câu kiểm bất biến so
`sum(PrincipalAmount)` với `LoanAmount` **trần** (không coalesce) đã báo sai lịch trả
nợ vì bỏ qua `ContractAmount` (CONVENTIONS §1). SQL đúng phải là
`coalesce(nullif("LoanAmount", 0), "ContractAmount", 0)`.

**Chú ý tinh tế:** `kunnPrincipal` (TS) rơi về `CurrentBalance` còn SQL rơi về
`ContractAmount` — không hoàn toàn trùng nhau. `kunnPrincipal` **cố ý không bao giờ**
dùng `ContractAmount` (mức cấp là khái niệm khác, xem test `loanMath.test.ts` mục
"kunnPrincipal — số tiền vay của KUNN không bao giờ là mức cấp HĐTD"). Trong khi đó
`disbursedOf` trong `creditLimit.ts` chỉ là bọc mỏng gọi `kunnPrincipal`.

**Cạm bẫy `||` chung:** cả `limitOf` dùng `||` nên `ContractAmount = 0` sẽ rơi xuống
`LoanAmount`. Đây là hành vi mong muốn ở đây, nhưng nhắc lại nguyên tắc §1 của
CONVENTIONS: với các trường mà 0 là giá trị hợp lệ, phải kiểm `null`/`undefined`/`NaN`
tường minh thay vì `||`.

---

## 5. BẪY 2 — Hai cài đặt `isRevolvingCredit`

Tên hàm giống hệt, nằm ở hai tệp, cho **kết quả khác nhau với thẻ tín dụng**:

| Cài đặt | Logic | `'Hạn mức tín dụng'` | `'Hạn mức thẻ tín dụng'` | Khác |
| :--- | :--- | :---: | :---: | :--- |
| `loanProductRules.ts` | `getLoanProductRule(m).revolving` (tra bảng `RULES`) | ✅ true | ✅ **true** | Dựa dữ liệu; thẻ tín dụng cũng tuần hoàn |
| `kunnFormRules.ts` | `m === 'Hạn mức tín dụng'` (so chuỗi cứng) | ✅ true | ❌ **false** | Chỉ đúng với đúng một chuỗi |

**Ai dùng cái nào (đã kiểm tra import):**

- `creditContract.ts` và `creditLimit.ts` import từ **`loanProductRules`** → mọi tính
  toán hạn mức/exposure (`summarizeCreditContracts`, `computeLimitGroups`,
  `clusterExposure`) coi thẻ tín dụng là tuần hoàn. **Dùng bản này cho mọi phép tính
  tiền/hạn mức.**
- Giao diện form KUNN (`KunnHdtdSection.tsx` và các section khác) import từ
  **`kunnFormRules`** → khoá phương thức trả gốc/lãi, nhãn ô số tiền, kiểu chọn kỳ hạn.
  Bản này chỉ khoá UI khi phương thức đúng bằng `'Hạn mức tín dụng'`.

**Vì sao chấp nhận được:** thẻ tín dụng đi qua module `CardContract` riêng, không nhập
qua form KUNN, nên khác biệt "thẻ có tính là revolving không" chỉ hiện ra ở lớp tính
hạn mức (nơi phải coi thẻ là tuần hoàn) chứ không ở form KUNN. **Khi sửa:** nếu cần
biết một sản phẩm có tái sử dụng hạn mức để **tính tiền** hay không, luôn dùng bản
`loanProductRules`. Đừng dùng bản `kunnFormRules` cho việc tính toán — nó sẽ tính sai
cơ sở trừ hạn mức cho thẻ.

`kunnFormRules` còn dẫn xuất: `isPrincipalRepaymentLocked`,
`isInterestRepaymentLocked`, `getLoanAmountFieldLabel` (KUNN tuần hoàn = "Số tiền nhận
nợ lần này", còn lại = "Số tiền giải ngân thực tế"), `isRevolvingTenorSelect`.

---

## 6. `summarizeCreditContracts` & `totalsOfCreditContracts`

`summarizeCreditContracts(contracts, kunns, options?)` (`creditContract.ts`) trả về
một `CreditContractSummary` cho **mỗi** HĐTD trong bảng `CreditContracts` — kể cả HĐTD
**chưa có KUNN nào** (đã ký chưa giải ngân) và HĐTD **đã tất toán hết KUNN** nhưng còn
hiệu lực. Cả hai là trạng thái bình thường phải nhìn thấy, nên hàm không lọc bỏ.

Với mỗi HĐTD:

| Trường | Ý nghĩa |
| :--- | :--- |
| `granted` | `cc.ContractAmount \|\| 0` — mức cấp của HĐTD |
| `outstanding` | Σ dư nợ các KUNN **còn hiệu lực** (chưa tất toán), sàn 0 |
| `disbursedCumulative` | Σ `kunnPrincipal` của **mọi** KUNN (gồm đã tất toán) |
| `revolving` | `isRevolvingCredit(cc.LoanMethod)` — bản `loanProductRules` |
| `headroom` | `max(0, granted − (revolving ? outstanding : disbursedCumulative))` |
| `available` | 0 nếu hết/chưa hiệu lực/đã đóng; ngược lại = `headroom` |
| `blockReason` | Câu giải thích vì sao không giải ngân được (đã đóng / hết hiệu lực / chưa hiệu lực / hết hạn mức) |
| `isEmpty` | `activeKunnCount === 0` |

`getOutstanding` mặc định là `CurrentBalance ?? LoanAmount ?? 0` — truyền hàm khác qua
`options.getOutstanding` khi muốn dùng dư nợ tính sống. `today` (ISO) để xét hiệu lực.

`totalsOfCreditContracts(summaries, hdtdNumber?)` cộng `granted`/`outstanding`/
`available` trên các summary; nếu truyền `hdtdNumber` thì lọc theo đúng HĐTD đó
(so không phân biệt hoa thường, đã trim). `granted` ở đây cộng thẳng
`contract.ContractAmount` giữa các summary — **an toàn** vì mỗi HĐTD chỉ có một summary
(đã gom TH1 ở tầng bảng `CreditContracts`), không phải cộng qua từng KUNN.

---

## 7. `computeLimitGroups` — nguồn duy nhất tính hạn mức khả dụng

`computeLimitGroups(contracts, options?)` (`creditLimit.ts`) là **nguồn duy nhất** tính
hạn mức khả dụng từ danh sách KUNN (khác `summarizeCreditContracts` vốn đi từ bảng
`CreditContracts`). Nhóm theo `CreditLimitCode` nếu có (TH2, `isShared=true`), ngược lại
theo số HĐTD gốc (`getMasterHdtdNumber` hoặc `ContractNumber`). Cùng cách nhóm với
`computeCreditLimit` để tổng mức cấp hai hàm luôn khớp.

Điểm cần nhớ:

- **`granted`** = `grantedOverride` (nếu >0) → `CreditLimitAmount` khai lớn nhất trong
  nhóm (nếu >0) → `max(limitOf)` trong nhóm. Mức cấp là thông tin **cấp HĐTD**, nên
  vẫn ghi nhận cả từ dòng đang bị `excludeContractId` loại trừ.
- **`used`** = `revolving ? outstanding : disbursedCumulative` — đúng cơ sở theo sản
  phẩm ở §3.
- **Ngày hiệu lực**: `endDate` lấy mốc **muộn nhất**, `startDate` lấy mốc **sớm nhất**
  trong nhóm; có thể lấy từ HĐTD cha qua `options.getContractDates`.
- **`lockedOutstanding` vs `redeployableOutstanding`**: KUNN đáo hạn **sau** ngày hết
  hiệu lực nhóm → `locked` (trả xong không rút lại được); còn lại → `redeployable`.
- **Một KUNN thuộc HĐTD đã đóng** làm `closed=true` cho **cả nhóm** → `available=0`:
  nhóm dùng chung hạn mức thì hạn mức chỉ có một, không rút qua hợp đồng khác.
- `excludeContractId` loại một KUNN khỏi phần dư nợ/đã giải ngân (để mô phỏng "nếu
  không tính khoản này") nhưng **vẫn** dùng nó để lấy mức cấp và ngày hiệu lực.

`findLimitGroupFor(groups, hdtdNumber)` tra nhóm theo khoá hoặc theo số HĐTD thành viên.

---

## 8. Đóng HĐTD ≠ hết hiệu lực

Ba trạng thái tách bạch, đừng gộp (`hdtdLifecycle` trong `creditContract.ts`):

| Trạng thái | Điều kiện | Nhãn |
| :--- | :--- | :--- |
| `closed` | `IsClosed = true` (thao tác chủ động) | ĐÃ ĐÓNG |
| `expired` | `ContractEndDate < today` | HẾT HIỆU LỰC |
| `not_yet_effective` | `ContractStartDate > today` | CHƯA HIỆU LỰC |
| `expiring_soon` | còn ≤ 30 ngày (`HDTD_EXPIRING_SOON_DAYS`) | SẮP HẾT HẠN |
| `active` | còn lại | ĐANG HIỆU LỰC |

`IsClosed` được kiểm **trước tiên** — đóng là quyết định nghiệp vụ, không phải suy ra
từ ngày tháng. Một HĐTD có thể còn hiệu lực (chưa tới `ContractEndDate`) mà vẫn `active`
dù đã tất toán hết KUNN.

**Không đóng HĐTD khi còn KUNN chưa tất toán.** `canCloseCreditContract(contract, kunns)`
là chốt phía giao diện: trả `allowed=false` kèm danh sách `unsettledKunnNumbers` để
thông báo nêu đúng khoản phải xử lý. **Lớp bảo vệ thật là trigger/ràng buộc CSDL**:
`CreditContracts.CustomerId` là `ON DELETE CASCADE` còn KUNN chặn bằng `RESTRICT`; lỗi
Postgres `23503` được dịch sang tiếng Việt kèm số KUNN đang vướng, không lộ thông báo
gốc (CONVENTIONS §10).

---

## 9. Số hiệu KUNN là số chứng từ, không được trùng

Số KUNN phải khớp GNN giấy — nó là **số chứng từ**, không phải khoá tự sinh.

- `nextKunnNumber(hdtdNumber, existingKunnNumbers)` (`creditContract.ts`) chỉ **gợi ý**
  số tiếp theo khi mở form: lấy `MAX` số thứ tự sau `/GNN-` rồi +1, **không đếm số dòng**
  (đếm dòng sẽ sinh trùng ngay khi có KUNN bị xoá giữa dãy). Số đã dùng **không** tái
  sử dụng. `nextKunnNumberFor` trong `kunnForm.ts` là biến thể đếm-dòng cũ hơn cho form
  mới — kém chuẩn hơn, chỉ dùng khi chưa có danh sách số thật.
- Gợi ý đó **đã cũ vào lúc bấm lưu**, nên phải hỏi lại database — `assertKunnNumberFree`
  (trong `api.ts`) kiểm trước khi ghi. Dữ liệu thật từng có **8 dòng trùng số** vì thiếu
  bước này.
- Kiểm phía client **không phải lớp bảo vệ**: dưới RLS banker chỉ thấy KUNN của khách
  mình, nên số do banker khác dùng là vô hình. Lớp bảo vệ thật là **unique index** trên
  `lower(btrim("ContractNumber"))` (migration 20). Hai lớp so theo cùng quy tắc chuẩn
  hoá — đó là lý do có `normalizeKunnNumber` (hạ chữ + trim); `findKunnNumberClash`
  dùng nó để so, có `selfId` để loại chính mình khi sửa.
- **Không tự đổi số giúp người nhập.** Máy đặt lại số thì bản đối chiếu hồ sơ và core
  banking đều lệch. Trùng thì **báo lỗi** và để banker tra chứng từ.

`kunnSequenceOf(kunnNumber)` trích số thứ tự sau `/GNN-`.

---

## 10. Vòng đời & hiệu lực KUNN trong HĐTD

`checkKunnAgainstContract(kunn, contract)` trả **cảnh báo** (`level: 'warn'`), **không
chặn cứng**, vì nghiệp vụ luôn có ngoại lệ được phê duyệt và còn phải nhập được KUNN
lịch sử của HĐTD đã hết hiệu lực. Ràng buộc thật cần để ý là **ngày giải ngân**
(`DisbursementDate`) phải nằm trong `[ContractStartDate, ContractEndDate]`. Ba cảnh báo:
giải ngân trước ngày hiệu lực, giải ngân sau ngày hết hiệu lực, HĐTD đã đóng.

`kunnRevolvingStatus(kunn, contract)` phân biệt hai tình huống tái sử dụng:

| Trạng thái | Điều kiện | Ý nghĩa |
| :--- | :--- | :--- |
| `redeployable` | `KunnDueDate ≤ ContractEndDate` | Tất toán xong còn `daysOfHeadroom` ngày để giải ngân lại |
| `locked` | `KunnDueDate > ContractEndDate` | Tất toán xong hạn mức đã hết hiệu lực — **buộc tất toán**, không tất toán đúng hạn là nguy cơ chuyển nhóm nợ |
| `unknown` | thiếu ngày | — |

Lưu ý: KUNN đáo hạn **sau** ngày hết hiệu lực HĐTD **không** phải lỗi nhập liệu — nó
hợp lệ nhưng là khoản `locked`. `computeRemainingTenorMonths(disb, maturity)` tính số
tháng còn lại (sàn 1 tháng), có +1 tháng nếu ngày đáo hạn vượt qua ngày trong tháng.

`buildKunnPayload` (`kunnForm.ts`) khi lưu **ưu tiên ngày hiệu lực của HĐTD cha**
(`hdtdEffectiveDatesOf` đọc `ContractStart/EndDate` của HĐTD qua `CreditContractId`) ghi
đè ngày trên form — để KUNN luôn kế thừa đúng hiệu lực HĐTD.

### HĐTD hết hạn khi KUNN còn trong hạn — tái cấp

HĐTD hết hạn chỉ có nghĩa **không giải ngân thêm được**; nó **không** phải nợ quá hạn.
KUNN ngắn hạn giải ngân trước ngày hết hạn vẫn chạy tới `KunnDueDate` của nó, và quá
hạn của KUNN chỉ tính theo lịch trả nợ và ngày đến hạn KUNN. Thường ngân hàng ký một
HĐTD mới (**tái cấp**) để giải ngân các khoản tiếp theo, trong khi KUNN cũ vẫn nối vào
HĐTD cũ.

CSDL **không có cột liên kết tái cấp**. `findRenewingHdtd` (`hdtdExpiryAlerts.ts`) nhận
diện ngầm: HĐTD khác của **cùng khách**, chưa đóng, đã hiệu lực và còn hạn tính tới
hôm nay (`hdtdLifecycle` là `active` hoặc `expiring_soon`), bắt đầu sau HĐTD cũ (thiếu
ngày bắt đầu thì so ngày hết hạn).

Danh sách cảnh báo "HĐTD sắp hết hạn" của Dashboard (`buildHdtdExpiryList`):

- Tra HĐTD cha qua `CreditContractId`, không có mới tra theo số HĐTD **trong cùng
  khách** (số HĐTD chỉ duy nhất theo khách). Ngày hết hạn lấy từ bản ghi HĐTD; bản sao
  `ContractEndDate` trên KUNN chỉ dùng khi không tìm được HĐTD — bản sao này ghi lúc lưu
  KUNN và **không** cập nhật khi sửa HĐTD.
- HĐTD đã được tái cấp thì bỏ khỏi danh sách; hết hạn mà chưa tái cấp thì vẫn hiện để
  nhắc tái cấp.
- Các dòng này **không** được cộng vào ô "Quá hạn thu nợ".

---

## 11. Sản phẩm vay & ràng buộc

Bảng `RULES` trong `loanProductRules.ts` khai ràng buộc theo phương thức. Không khớp
sản phẩm nào → rơi về `PERMISSIVE` (cho tất cả, kỳ hạn 1–360). Lưu ý `LOAN_METHODS`
(`kunnForm.ts`) có 5 mục nhưng `RULES` chỉ định nghĩa 4; `'Hạn mức tín dụng từng lần'`
rơi về `PERMISSIVE`.

| Sản phẩm | Mục đích | Kỳ hạn HĐTD | Kỳ hạn KUNN | Ân hạn gốc | `revolving` |
| :--- | :--- | :--- | :--- | :--- | :---: |
| **Hạn mức tín dụng** | "Kinh doanh" (khoá) | 12–24 th | 3–12 th | không | ✅ |
| **Cho vay từng lần** | tiêu dùng/sửa nhà/mua BĐS/nhà HTTTL | 60–360 th | — | 6/12/15/18/24/36 th | ❌ |
| **Cầm cố sổ tiết kiệm** | mọi (PERMISSIVE) | 1–360 th | — | — | ❌ |
| **Hạn mức thẻ tín dụng** | mọi (PERMISSIVE) | 1–360 th | — | — | ✅ |

Kiểm tra (`RuleCheck { ok, message? }`) — tất cả **cảnh báo, không chặn lưu** (nghiệp vụ
luôn có ngoại lệ được duyệt; chặn cứng khiến banker tìm cách lách):

- `checkTenor` / `checkKunnTenor`: nằm ngoài khoảng thì cảnh báo, nêu "Chỉ tiếp tục khi
  đã có phê duyệt ngoại lệ". `checkKunnTenor` dùng khoảng `kunnTenor` nếu sản phẩm có
  (chỉ HMTD), ngược lại rơi về `checkTenor`.
- `checkPurpose`: mục đích ngoài danh sách sản phẩm → cảnh báo. `isPurposeLocked` (chỉ
  HMTD) khoá ô chọn về "Kinh doanh". `allowedPurposes` lọc danh sách theo sản phẩm.
- `checkGrace`: ân hạn gốc ngoài các mức cho phép → cảnh báo; sản phẩm không áp dụng ân
  hạn mà khai >0 cũng cảnh báo.

Nhãn hiển thị mục đích được viết lại cho rõ nghĩa nhưng **giá trị lưu trong CSDL giữ
nguyên** (`purposeLabel`), nên hợp đồng cũ vẫn hiển thị đúng.

**Kiểm gốc mỗi kỳ (`checkMonthlyPrincipal`, `kunnForm.ts`):** ba con số phải nhất quán
— số tiền vay ÷ số kỳ trả gốc ≈ gốc mỗi kỳ, trong dung sai
`MONTHLY_PRINCIPAL_TOLERANCE = 100.000đ` (làm tròn xuống/lên bội số 100k). Lệch thì báo
"kiểm lại GNN xem sai ở số tiền vay, kỳ hạn hay gốc mỗi kỳ" kèm số hệ thống tự tính.
KUNN trả gốc cuối kỳ (bullet) bỏ qua kiểm này.

---

## 12. Vay từng lần = min của ba giới hạn

Hạn mức đề xuất cho một khoản vay từng lần là **giá trị nhỏ nhất** của ba giới hạn
(chi tiết công thức ở tài liệu `business-plan.md`, hàm `computeEachTime` /
`EachTimeResult` trong `businessPlan.ts`):

```
recommended = min(
    nhu cầu vốn      = chi phí phương án − vốn tự có,
    khả năng trả nợ  = PV(khoản trả tối đa theo DTI, lãi suất, kỳ hạn),
    khả năng TSĐB    = totalUsableCapacity(tài sản)
)
```

Trường `binding` (`'need' | 'capacity' | 'collateral'`) chỉ ra giới hạn nào đang chặn.
Đây khác với "hạn mức khả dụng của HĐTD đang chạy" ở §3/§7 — đó là bước **thẩm định
trước cấp**, còn §3/§7 là **theo dõi sau cấp**. `MaxDtiPercent = 0` nghĩa là **chưa
khai** → khả năng trả nợ trả về 0, không suy đoán.

---

## 13. Sổ tra cứu hàm

### `creditContract.ts`

| Hàm | Điều phải biết |
| :--- | :--- |
| `nextKunnNumber` | Lấy `MAX` số thứ tự rồi +1, **không đếm dòng**. Số đã dùng không tái sử dụng. Chỉ gợi ý — phải kiểm lại DB lúc lưu. |
| `normalizeKunnNumber` | Hạ chữ + trim; khớp unique index `lower(btrim(...))` dưới DB. |
| `findKunnNumberClash` | So trùng đã chuẩn hoá, có `selfId` để loại chính mình khi sửa. |
| `kunnSequenceOf` | Trích số thứ tự sau `/GNN-`. |
| `hdtdLifecycle` | 5 trạng thái; `IsClosed` xét trước; sắp hết hạn = còn ≤30 ngày. |
| `checkKunnAgainstContract` | **Cảnh báo** (không chặn); ràng buộc thật là ngày giải ngân trong hiệu lực. |
| `kunnRevolvingStatus` | `redeployable` nếu đáo hạn ≤ ngày hết hiệu lực; `locked` nếu sau. |
| `computeRemainingTenorMonths` | Số tháng còn lại, sàn 1, +1 nếu vượt ngày trong tháng. |
| `canCloseCreditContract` | Chốt UI đóng HĐTD; trả danh sách KUNN chưa tất toán. Lớp thật là RESTRICT/trigger. |
| `summarizeCreditContracts` | Đi từ bảng `CreditContracts`; trả cả HĐTD chưa/hết KUNN. `revolving` bản `loanProductRules`. |
| `totalsOfCreditContracts` | Cộng granted/outstanding/available; lọc theo HĐTD nếu truyền số. |
| `resolveMasterHdtdNumber` | Ưu tiên `HdtdNumber` của HĐTD liên kết, mới suy từ tiền tố. |

### `creditLimit.ts`

| Hàm | Điều phải biết |
| :--- | :--- |
| `computeLimitGroups` | **Nguồn duy nhất** tính hạn mức khả dụng từ KUNN. `granted`/ngày hiệu lực vẫn tính cả từ dòng bị `excludeContractId`. Một KUNN thuộc HĐTD đóng → cả nhóm `available=0`. |
| `computeCreditLimit` | Tổng mức cấp theo TH1/TH2/TH3; `shared` theo `CreditLimitCode`, `standalone` theo HĐTD gốc; lấy max trong nhóm. |
| `limitOf` (nội bộ) | Mức **CẤP**: `ContractAmount \|\| LoanAmount \|\| 0`. **Khác** `kunnPrincipal`. |
| `disbursedOf` (nội bộ) | Bọc `kunnPrincipal` — mức **giải ngân**. |
| `findLimitGroupFor` | Tra nhóm theo khoá hoặc số HĐTD thành viên. |
| `clusterExposure` / `checkCollateralCapacity` | Exposure theo **cụm liên thông** hợp đồng↔tài sản; HMTD tính theo mức cấp, vay từng lần theo dư nợ, thẻ theo hạn mức cấp. Xem tài liệu TSĐB/LTV. |

### Khác

| Hàm (tệp) | Điều phải biết |
| :--- | :--- |
| `getMasterHdtdNumber` (`utils.ts`) | Tiền tố trước `/GNN-`; rỗng → `'HĐTD-CHÍNH'`. |
| `kunnPrincipal` (`loanMath.ts`) | `LoanAmount>0` → `CurrentBalance>0` → 0. **Không bao giờ** `ContractAmount`. |
| `isRevolvingCredit` (`loanProductRules.ts`) | Tra bảng `RULES`; thẻ tín dụng = revolving. **Dùng cho tính tiền.** |
| `isRevolvingCredit` (`kunnFormRules.ts`) | `=== 'Hạn mức tín dụng'`; thẻ ≠ revolving. **Chỉ cho UI form.** |
| `buildKunnPayload` (`kunnForm.ts`) | Ghi đè ngày KUNN bằng hiệu lực HĐTD cha; xử lý lãi suất/gốc/TSĐB. |
| `checkMonthlyPrincipal` (`kunnForm.ts`) | Ba số (vay/kỳ/gốc mỗi kỳ) nhất quán trong dung sai 100k. |
| `findRenewingHdtd` (`hdtdExpiryAlerts.ts`) | HĐTD tái cấp của cùng khách: chưa đóng, đang hiệu lực, bắt đầu sau HĐTD cũ. |
| `buildHdtdExpiryList` (`hdtdExpiryAlerts.ts`) | Cảnh báo HĐTD sắp/đã hết hạn trên Dashboard; bỏ HĐTD đã tái cấp. |
