# Phân nhóm nợ, quá hạn, lãi phạt & danh sách đến hạn

Tài liệu tham chiếu cho mảng **theo dõi nợ**: xác định một kỳ đã "xong" chưa, đếm số ngày quá hạn, phân nhóm nợ, tính lãi phạt và dựng danh sách đến hạn. **Nguồn sự thật là code** — mọi công thức/ngưỡng dưới đây rút trực tiếp từ mã nguồn; chỗ nào tài liệu cũ (CONVENTIONS.md, SKILL.md) nói khác thì theo tài liệu này.

## Mục lục

1. [Nguyên tắc trụ cột](#1-nguyên-tắc-trụ-cột)
2. [Khi nào một kỳ được coi là "đã xong"](#2-khi-nào-một-kỳ-được-coi-là-đã-xong)
3. [Đếm số ngày quá hạn](#3-đếm-số-ngày-quá-hạn)
4. [Phân nhóm nợ theo số ngày quá hạn](#4-phân-nhóm-nợ-theo-số-ngày-quá-hạn)
5. [Nhóm nợ HIỆU LỰC = max(nhóm lưu, nhóm tự tính)](#5-nhóm-nợ-hiệu-lực--maxnhóm-lưu-nhóm-tự-tính)
6. [Cron nâng nhóm nợ hàng đêm (migration 57)](#6-cron-nâng-nhóm-nợ-hàng-đêm-migration-57)
7. [Lãi phạt quá hạn](#7-lãi-phạt-quá-hạn)
8. [Danh sách đến hạn](#8-danh-sách-đến-hạn)
9. [Bảng tra hàm nhanh](#9-bảng-tra-hàm-nhanh)
10. [Điểm cần lưu ý / mơ hồ](#10-điểm-cần-lưu-ý--mơ-hồ)

---

## 1. Nguyên tắc trụ cột

Ba quy tắc chi phối toàn bộ mảng này. Nếu quên một cái là khai sai dư nợ hoặc khai tốt nhóm nợ (đều lệch về phía có lợi cho hồ sơ):

1. **Một kỳ chỉ "xong" khi thu ĐỦ nghĩa vụ** (gốc + lãi + phạt), không phải khi cờ `IsPaid` được tích. → §2
2. **Số ngày quá hạn tính theo kỳ CHƯA thanh toán có ngày đến hạn xa nhất trong quá khứ.** Căn cứ phân nhóm là số ngày quá hạn **lớn nhất**. → §3, §4
3. **Không đọc thẳng cột `LoanContracts.DebtGroup`** để phân nhóm — nó hay bị cũ. Luôn lấy `max(nhóm lưu, nhóm tự tính từ số ngày quá hạn thực tế)`. → §5

Chuẩn nghiệp vụ tham chiếu: **Thông tư 11/2021/TT-NHNN** về phân loại nợ.

---

## 2. Khi nào một kỳ được coi là "đã xong"

Hàm nguồn: **`schedulePaymentStatus` trong `src/lib/loanMath.ts`** (dạng gọn: `isScheduleFullySettled`). Đây là nguồn DUY NHẤT quyết định trạng thái thu của một kỳ; mọi chỗ khác phải gọi nó.

### Nghĩa vụ của một kỳ

```
obligation = PrincipalAmount + InterestAmount + OverdueInterestAmount
```

Phạt (`OverdueInterestAmount`) có tính vào nghĩa vụ hay không do hằng số **`PENALTY_COUNTS_TOWARD_SETTLEMENT`** quyết định — hiện `= true`. Nghĩa là kỳ đã thu đủ gốc + lãi mà **chưa đóng phạt vẫn CHƯA xong**. Đổi hằng số này là đổi hành vi toàn hệ thống.

### Ba trạng thái trả về (`SchedulePaymentState`)

| Trạng thái | Điều kiện |
| :--- | :--- |
| `chua_thu` | Tổng đã thu `<= 0` |
| `thu_mot_phan` | Đã thu một phần nhưng còn thiếu (`shortfall > 0`) |
| `da_thu_du` | Đã thu bằng hoặc vượt nghĩa vụ (`shortfall = 0`) |

`isScheduleFullySettled(s)` trả `true` khi và chỉ khi trạng thái là `da_thu_du`.

### Ca biên bắt buộc phải giữ

**Quy ước "trả đủ theo lịch" (legacy).** `IsPaid = true` **kèm cả hai** cột `ActualPaidPrincipal` và `ActualPaidInterest` bỏ trống (hoặc `<= 0`) nghĩa là "đã trả đủ theo lịch". `schedulePaymentStatus` trả ngay `da_thu_du` với `collected = obligation`. **Vì sao:** đo được 831/835 kỳ đã thu ở trạng thái này; bỏ nhánh này là biến 831 kỳ thành chưa thu và làm dư nợ toàn danh mục phình lên.

**Trả trước hạn không được trừ hai lần.** `PrincipalAmount` đã bao gồm `PrepaidPrincipalAmount`. Nên gốc đã thu tính bằng `ActualPaidPrincipal + PrepaidPrincipalAmount` (khi có khai tay), **không** phải "nghĩa vụ trừ đi phần trả trước". Công thức sai từng biến khách trả sớm thành khách nợ quá hạn.

**Không có ngưỡng làm tròn.** So sánh `shortfall` bằng chính xác. Đo thực tế: 0 kỳ thiếu dưới 100.000đ; hai kỳ thiếu thật đều trên 3 triệu. Không cần dung sai.

### Vì sao điều này quan trọng cho phân nhóm nợ

`getAutoDebtGroupInfo` (§3) bỏ qua các kỳ `isScheduleFullySettled` khi đếm ngày quá hạn. Nếu tích `IsPaid` sớm (trước khi thu đủ), kỳ đó biến mất khỏi phép đếm → khai tốt nhóm nợ và tha phạt. Đó là lý do trạng thái thu và phân nhóm nợ dùng chung một định nghĩa "đã xong".

---

## 3. Đếm số ngày quá hạn

Có **ba** đường tính số ngày quá hạn, dùng cho các mục đích khác nhau. Chúng KHÔNG hoàn toàn giống nhau về cách làm tròn — xem §10.

### 3.1 `getAutoDebtGroupInfo(schedules, todayStr?)` — `loanMath.ts`

Đường chính để phân nhóm nợ. Trả `{ debtGroup, maxOverdueDays, worstDueDate }`.

Cách làm: duyệt mọi kỳ; **bỏ qua** kỳ không có `DueDate` hoặc `isScheduleFullySettled`; tính `diff = today - dueDate`; nếu `diff <= 0` bỏ qua (chưa quá hạn); ngược lại `overdueDays = Math.floor(diff / 86400000)`. Giữ giá trị **lớn nhất** và ngày đến hạn tệ nhất. Cuối cùng gọi `debtGroupFromOverdueDays(maxOverdueDays)`.

- Không có kỳ nào → `{ debtGroup: 1, maxOverdueDays: 0 }`.
- `todayStr` để trống thì dùng ngày local của máy (nên truyền `todayIso()` để chuẩn giờ VN).
- Dùng **`Math.floor`** — quá hạn "đủ ngày" mới tính.

### 3.2 `calculateOverdueDaysFromDates(paymentDateStr, dueDateStr)` — `loanMath.ts`

So hai ngày cụ thể (thường: ngày thu thực tế so với ngày đến hạn). `diff = payment - due`; nếu `> 0` trả `Math.ceil(diff / 86400000)`, ngược lại `0`. Dùng **`Math.ceil`** — trễ một phần ngày cũng tính tròn lên một ngày.

### 3.3 `overdueDaysOfSchedule(s, asOfDateStr?)` — `loanMath.ts`

Dùng khi tính lãi phạt. Ưu tiên cột đã lưu: nếu `s.OverdueDays > 0` thì trả thẳng con số đó; ngược lại gọi `calculateOverdueDaysFromDates(asOfDateStr || todayIso(), s.DueDate)` (tức dùng `Math.ceil`).

> **Vì sao ưu tiên cột lưu:** khi banker đã chốt số ngày quá hạn tại thời điểm thu nợ, con số đó là bằng chứng chứng từ, không được tính lại theo ngày hôm nay.

---

## 4. Phân nhóm nợ theo số ngày quá hạn

Hàm nguồn: **`debtGroupFromOverdueDays(maxOverdueDays)` trong `loanMath.ts`**. Tách riêng để dashboard và portfolio dùng CHUNG một bộ ngưỡng, không lệch nhau.

| Nhóm | Tên | Số ngày quá hạn lớn nhất | Điều kiện trong code |
| :---: | :--- | :--- | :--- |
| **1** | Đủ tiêu chuẩn | dưới 10 | mặc định (0–9) |
| **2** | Cần chú ý | 10 – 90 | `>= 10 && <= 90` |
| **3** | Dưới tiêu chuẩn | 91 – 180 | `>= 91 && <= 180` |
| **4** | Nghi ngờ | 181 – 360 | `>= 181 && <= 360` |
| **5** | Có khả năng mất vốn | trên 360 | `> 360` |

**Ca biên:** đúng 9 ngày → Nhóm 1; đúng 10 ngày → Nhóm 2; đúng 90 → Nhóm 2, 91 → Nhóm 3; đúng 360 → Nhóm 4, 361 → Nhóm 5. Các ngưỡng liền mạch không có khoảng trống (vì số ngày là số nguyên).

**Căn cứ là kỳ CHƯA thanh toán có số ngày quá hạn LỚN NHẤT** — không phải trung bình, không phải kỳ gần nhất. Một kỳ trễ 200 ngày kéo cả khoản xuống Nhóm 4 dù các kỳ khác đúng hạn.

### Ví dụ

Khoản vay có 3 kỳ chưa thanh toán, hôm nay 2026-09-06:

| Kỳ | Ngày đến hạn | Số ngày quá hạn | Trạng thái |
| :---: | :--- | :---: | :--- |
| 5 | 2026-08-25 | 12 | chưa thu |
| 6 | 2026-06-01 | 97 | thu một phần |
| 7 | 2026-09-20 | (chưa tới) | chưa thu |

`maxOverdueDays = 97` → `debtGroupFromOverdueDays(97)` = **Nhóm 3**. Kỳ 7 chưa đến hạn không tính; kỳ 6 tuy đã thu một phần nhưng chưa `da_thu_du` nên vẫn được đếm.

---

## 5. Nhóm nợ HIỆU LỰC = max(nhóm lưu, nhóm tự tính)

> **⚠️ SỬA LỆCH QUAN TRỌNG (hành vi hiện hành).** Cột `LoanContracts.DebtGroup` lưu trong CSDL **hay bị cũ** — nó không tự cập nhật khi một kỳ due trôi qua hạn. Khách trễ 22 ngày vẫn mang Nhóm 1 trong cột lưu. **KHÔNG đọc thẳng cột `DebtGroup`** để phân nhóm.

Nhóm nợ hiển thị/dùng cho nghiệp vụ là **nhóm hiệu lực**:

```
nhóm hiệu lực = Math.max(DebtGroup lưu ?? 1, nhóm tự tính từ số ngày quá hạn thực tế)
```

**Vì sao lấy `max`:**
- Lấy nhóm tự tính để **không bỏ sót quá hạn** (cột lưu cũ, để lọt).
- Vẫn cân nhắc nhóm lưu để **giữ nhóm banker chủ động nâng tay** vì lý do định tính (ví dụ chéo nhóm khách hàng liên quan) — chỉ quá hạn nhẹ nhưng banker đã xếp nhóm cao hơn thì không tự hạ xuống.
- Đây là chuẩn thận trọng ngân hàng: quá hạn tăng thì nâng ngay, còn hạ nhóm phải qua quy trình.

### Các nơi đã tính nhóm hiệu lực đúng cách

| Nơi | Cách tính | Ghi chú |
| :--- | :--- | :--- |
| Dashboard — memo `debtGroupByContract` (`src/components/views/DashboardView.tsx`) | duyệt kỳ chưa `IsPaid`, lấy `maxOverdue` qua `daysUntil`, rồi `Math.max(c.DebtGroup ?? 1, debtGroupFromOverdueDays(maxOverdue))` | Dùng `daysUntil` (UTC, `Math.round`) trên `DuePeriodRow` — chỉ có cờ `IsPaid`, không có đủ trường để gọi `isScheduleFullySettled` |
| Portfolio — `effectiveDg` (`src/components/portfolio/KunnTable.tsx`) | `getAutoDebtGroupInfo(cSchedules)` rồi `Math.max(c.DebtGroup ?? 1, autoDebt.debtGroup)` | Hiển thị kèm `({maxOverdueDays}d quá hạn)` cạnh nhãn nhóm |
| Ngữ cảnh khách hàng — `buildCustomerContext` | tính sống qua `getAutoDebtGroupInfo` | |

Khi thêm chỗ mới hiển thị nhóm nợ, **phải** dùng công thức `max` này, đừng đọc thẳng cột lưu.

### Hạ nhóm đi theo luồng thu nợ

Cột `DebtGroup` **chỉ được hạ** khi thu nợ / tất toán qua app: `usePaymentModal` và `useQuickSettle` ghi `DebtGroup = nhóm auto` (tính lại tại thời điểm thu). Không có cơ chế nào tự động hạ nhóm ngoài luồng đó — cron chỉ nâng (§6).

---

## 6. Cron nâng nhóm nợ hàng đêm (migration 57)

File: **`supabase/migrations/57_cron_cap_nhat_debt_group.sql`**.

Vì giao diện tính nhóm sống nhưng **cột `DebtGroup` trong CSDL vẫn cũ** cho tới khi ai đó đụng vào khoản đó, migration 57 tạo job `pg_cron` rà toàn bộ mỗi đêm cho khớp.

| Thuộc tính | Giá trị |
| :--- | :--- |
| Tên job | `refresh-debt-groups-daily` |
| Hàm gọi | `public.refresh_all_debt_groups()` (SECURITY DEFINER) |
| Lịch chạy | `15 17 * * *` UTC = **00:15 giờ VN** hàng ngày |
| Phạm vi | KUNN **chưa tất toán** (`IsSettled IS NOT TRUE`) |
| Chính sách | **CHỈ NÂNG, không tự hạ** |

Logic hàm:
- `today` lấy theo **giờ VN** (`now() AT TIME ZONE 'Asia/Ho_Chi_Minh'`), KHÔNG dùng UTC.
- Với mỗi khoản, `d = MAX(today - DueDate)` trên các kỳ có `IsPaid IS NOT TRUE` và `DueDate < today` (so ngày date thuần → số ngày nguyên, tương đương `Math.floor`, chỉ tính kỳ đã qua hạn thực sự).
- Ánh xạ `d` sang nhóm bằng đúng bộ ngưỡng ở §4 (BETWEEN 10 AND 90 → 2, v.v.).
- `UPDATE "DebtGroup" = GREATEST(COALESCE("DebtGroup", 1), nhóm_tính)` — chỉ ghi khi giá trị thay đổi.
- `REVOKE ALL ... FROM public`: chỉ postgres/cron gọi được, chặn user tự kích hoạt cập nhật hàng loạt.

> **Lưu ý nhất quán:** cron dùng cờ `IsPaid` (không phải `isScheduleFullySettled` đầy đủ) và chỉ tính `DueDate < today` — khớp với `getAutoDebtGroupInfo` (floor) hơn là với Dashboard (`daysUntil` round). Xem §10.

Chạy tay đối chiếu: `SELECT public.refresh_all_debt_groups();` (trả số dòng đã nâng nhóm).

---

## 7. Lãi phạt quá hạn

Hàm nghiệp vụ: **`computeSchedulePenalty` trong `loanMath.ts`**, ủy quyền tính cho **`calcOverduePenalty` trong `src/lib/stkPledge.ts`**.

### 7.1 Hai cấu phần phạt

Phạt gồm **hai phần độc lập**, tính theo Actual/365 (`accruedInterest = round(gốc × rate × days/365)`):

| Cấu phần | Gốc tính phạt | Lãi suất phạt | Số ngày |
| :--- | :--- | :--- | :--- |
| **Phạt trên nợ gốc quá hạn** | `PrincipalAmount` (gốc kỳ) | `lãi_suất_trong_hạn × hệ_số` (mặc định × **1.5**) | số ngày quá hạn |
| **Phạt chậm trả lãi** | `InterestAmount` (lãi chưa trả) | **10%/năm** cố định | số ngày quá hạn |

Hằng số (trong `stkPledge.ts`):
- `DEFAULT_PRINCIPAL_PENALTY_MULTIPLIER = 1.5`
- `DEFAULT_INTEREST_PENALTY_RATE = 0.10`

> **Đọc kỹ ý nghĩa "150%":** Đây là **150% của lãi suất trong hạn**, KHÔNG phải 150% của số tiền gốc. Nếu lãi suất trong hạn là 10%/năm thì lãi suất phạt gốc = `10% × 1.5 = 15%/năm`, áp trên số dư gốc quá hạn. Ghi chú "150% gốc + 10% lãi" trong SKILL.md là cách nói tắt — công thức thật là như bảng trên. `principalPenaltyRate = normalRateAnnual × multiplier`.

### 7.2 Hệ số phạt gốc theo từng khoản (migration 29)

File: **`supabase/migrations/29_lai_suat_phat_theo_khoan.sql`**. Cột **`LoanContracts.PrincipalPenaltyMultiplier`** (`numeric`) truyền vào `options.principalPenaltyMultiplier`.

| Giá trị cột | Ý nghĩa |
| :--- | :--- |
| `NULL` | Dùng mặc định **1.5** (150% lãi trong hạn) |
| `0` | **Miễn phạt gốc** (rà dữ liệu thật: đây thực chất là công tắc bật/tắt miễn phạt) |
| số khác | Hệ số tùy chỉnh |

Dùng cột số (không phải boolean) vì nó ánh xạ 1-1 với tham số `principalPenaltyMultiplier` mà `calcOverduePenalty` đã nhận sẵn — không đẻ thêm khái niệm. Chuỗi cũ `[PENALTY_RATE:150]` từng nhét trong `Note` đã được migration này chuyển sang cột (chia 100: 150 → 1.5) rồi gỡ khỏi `Note`.

**Phạm vi:** hệ số này CHỈ tác động phần phạt trên **nợ gốc**. Phần phạt chậm trả lãi (10%/năm) không chịu ảnh hưởng.

### 7.3 Kết quả trả về

`computeSchedulePenalty` trả `SchedulePenalty`:

```
{ overdueDays, principalPenaltyRate, principalPenalty, interestPenalty, total }
```

- Nếu `overdueDays <= 0` → tất cả bằng 0.
- `total = principalPenalty + interestPenalty` — **chỉ gồm hai khoản phạt**, KHÔNG cộng lại gốc và lãi gốc. (Khác với `calcOverduePenalty.totalDue` vốn = `gốc + lãi + phạt_gốc + phạt_lãi`.) Chọn đúng con số khi hiển thị.
- Số ngày quá hạn lấy từ `options.overdueDays` nếu truyền, ngược lại qua `overdueDaysOfSchedule` (§3.3, dùng `Math.ceil` / cột lưu).

### Ví dụ

Kỳ có `PrincipalAmount = 100.000.000`, `InterestAmount = 800.000`, lãi trong hạn 10%/năm, quá hạn 30 ngày, không khai hệ số riêng (mặc định 1.5):

- Lãi suất phạt gốc = `10% × 1.5 = 15%/năm`.
- `principalPenalty = round(100.000.000 × 0.15 × 30/365) ≈ 1.232.877`
- `interestPenalty = round(800.000 × 0.10 × 30/365) ≈ 6.575`
- `total ≈ 1.239.452`

Nếu khoản này có `PrincipalPenaltyMultiplier = 0` thì `principalPenalty = 0`, chỉ còn phạt chậm trả lãi `≈ 6.575`.

### 7.4 Chốt quan trọng: kỳ quá hạn không được "thu nhanh"

`canQuickSettle` (`loanMath.ts`) từ chối khi `today > DueDate` với lý do "Kỳ này đã quá hạn, lãi phạt phải do người quyết." → Kỳ quá hạn bắt buộc đi qua luồng thu nợ đầy đủ (có tính phạt), không được tất toán nhanh bỏ qua phạt.

---

## 8. Danh sách đến hạn

Hai file: **`src/lib/duePeriod.ts`** (trạng thái đến hạn của một khoản) và **`src/lib/dueList.ts`** (lọc/đếm/in danh sách).

### 8.1 Ngưỡng "sắp đến hạn"

Hằng số **`UPCOMING_DAYS = 5`** trong `duePeriod.ts`.

`contractDueState(periods, todayIso?)` tìm kỳ **chưa trả** (`!IsPaid`) có ngày đến hạn **sớm nhất**, rồi phân loại:

| `kind` | Điều kiện `daysLeft` |
| :--- | :--- |
| `overdue` | `< 0` (đã quá hạn) |
| `upcoming` | `0 – 5` (đến hạn hôm nay hoặc trong 5 ngày) |
| `none` | `> 5` (chưa cần cảnh báo) hoặc không còn kỳ chưa trả |

`dueCutoffIso(todayIso?)` = hôm nay + 5 ngày (mốc chặn trên).

### 8.2 Lọc & đếm (`dueList.ts`)

`filterByDue(items, filter, daysLeftOf)` với `DueFilter = 'all' | 'upcoming' | 'expired'`:
- `expired` khi `daysLeft < 0`.
- Đến hạn **hôm nay** (`daysLeft = 0`) được xếp vào **"sắp đến hạn"**, không phải "hết hạn" — khớp cách phân nhóm nợ (§4: quá hạn phải `<` mốc, đúng ngày chưa tính quá hạn).
- **Thiếu số ngày** (`null`/`undefined`) cũng coi là "sắp đến hạn" để dòng đó không âm thầm biến mất khỏi cả hai bộ lọc.

`countByDue` đếm song song `{ upcoming, expired }` theo cùng quy tắc.

### 8.3 `monthlyDueInfo` (`dueList.ts`)

Tính mốc thu lãi của **tháng hiện tại** dựa trên ngày gốc, **không** tự nhảy sang tháng sau khi đã quá hạn (giữ nguyên tháng để banker thấy đúng kỳ đang trễ). Kẹp ngày theo số ngày thực của tháng (31 → 30/28).

### 8.4 Các mốc cảnh báo ở Dashboard

Memo danh sách đến hạn trong `DashboardView.tsx` dùng các ngưỡng riêng theo từng loại:

| Danh sách | Ngưỡng `daysLeft` |
| :--- | :--- |
| Lãi đến hạn trong tháng | qua `contractDueState` (≤ 5 hoặc quá hạn) |
| KUNN đến hạn | `<= 10` |
| HĐTD (HMTD) đến hạn | `<= 45` |
| TSĐB hết hiệu lực định giá | `<= 30` |

Bộ lọc "chỉ Nhóm 1" ở Dashboard dùng **nhóm hiệu lực** (`debtGroupByContract.get(id) ?? c.DebtGroup ?? 1`), không đọc thẳng cột lưu.

### 8.5 In danh sách

`buildDueListHtml` dựng HTML khổ **A4 ngang** (nhiều cột) rồi in qua `openPrintWindow` → `printHtmlDoc` (iframe ẩn, không popup). Không dùng thư viện ngoài. `printHtmlDoc` trả `boolean` — phải kiểm và báo người dùng khi `false`.

---

## 9. Bảng tra hàm nhanh

| Nhu cầu | Hàm | Tệp |
| :--- | :--- | :--- |
| Kỳ đã thu đủ chưa (3 trạng thái) | `schedulePaymentStatus` | `loanMath.ts` |
| Kỳ đã tất toán đủ (bool) | `isScheduleFullySettled` | `loanMath.ts` |
| Nhóm nợ tự tính từ lịch trả | `getAutoDebtGroupInfo` | `loanMath.ts` |
| Ánh xạ số ngày quá hạn → nhóm | `debtGroupFromOverdueDays` | `loanMath.ts` |
| Số ngày quá hạn của một kỳ (ưu tiên cột lưu) | `overdueDaysOfSchedule` | `loanMath.ts` |
| So hai ngày ra số ngày quá hạn (ceil) | `calculateOverdueDaysFromDates` | `loanMath.ts` |
| Tính lãi phạt của một kỳ | `computeSchedulePenalty` | `loanMath.ts` |
| Lõi công thức phạt gốc + phạt lãi | `calcOverduePenalty` | `stkPledge.ts` |
| Chặn thu nhanh kỳ quá hạn | `canQuickSettle` | `loanMath.ts` |
| Trạng thái đến hạn của khoản | `contractDueState` | `duePeriod.ts` |
| Mốc chặn "sắp đến hạn" (+5 ngày) | `dueCutoffIso` | `duePeriod.ts` |
| Lọc / đếm danh sách theo hạn | `filterByDue` / `countByDue` | `dueList.ts` |
| Mốc thu lãi tháng hiện tại | `monthlyDueInfo` | `dueList.ts` |
| Dựng & in bảng danh sách hạn | `buildDueListHtml` / `openPrintWindow` | `dueList.ts` |
| Cron nâng nhóm nợ hàng đêm | `refresh_all_debt_groups()` | migration 57 |

Hằng số: `PENALTY_COUNTS_TOWARD_SETTLEMENT` (`loanMath.ts`), `DEFAULT_PRINCIPAL_PENALTY_MULTIPLIER = 1.5`, `DEFAULT_INTEREST_PENALTY_RATE = 0.10` (`stkPledge.ts`), `UPCOMING_DAYS = 5` (`duePeriod.ts`).

---

## 10. Điểm cần lưu ý / mơ hồ

1. **Ba cách làm tròn số ngày quá hạn không đồng nhất** — đây là điểm dễ gây lệch 1 ngày ở ca biên nhóm nợ:
   - `getAutoDebtGroupInfo` và cron migration 57: **floor** (chỉ tính ngày đã qua trọn vẹn).
   - `calculateOverdueDaysFromDates` / `overdueDaysOfSchedule`: **ceil** (dùng cho tính phạt).
   - Dashboard `debtGroupByContract`: qua `daysUntil` (`Math.round`, mốc UTC).
   Cùng một khoản, ngay ranh giới (ví dụ đúng 10 ngày lúc nửa đêm) có thể ra nhóm lệch nhau 1 bậc giữa Dashboard và Portfolio. Chưa có test khóa sự đồng nhất này — nếu cần chuẩn hóa nên gom về một hàm.

2. **Phạm vi kỳ được đếm khác nhau giữa các đường tính nhóm:**
   - `getAutoDebtGroupInfo` (Portfolio, buildCustomerContext) loại kỳ theo `isScheduleFullySettled` (thu đủ nghĩa vụ).
   - Dashboard và cron chỉ loại theo cờ `IsPaid`.
   Với kỳ `IsPaid = false` nhưng đã thu đủ (hiếm), hoặc `IsPaid = true` nhưng chưa thu đủ, hai đường có thể cho maxOverdueDays khác nhau. Lý do là `DuePeriodRow`/truy vấn SQL không mang đủ trường để chạy `schedulePaymentStatus`.

3. **"150% gốc" là cách nói tắt gây hiểu nhầm** — thực tế là 150% *lãi suất trong hạn* áp trên dư gốc quá hạn (§7.1). Bảng danh bạ hàm trong `SKILL.md` (dòng "150% gốc + 10% lãi") nên đọc theo giải thích ở §7, không hiểu là 1,5 lần số tiền gốc.

4. **`computeSchedulePenalty(...).total` chỉ là tiền phạt** (phạt gốc + phạt lãi), không bao gồm gốc/lãi gốc. Khi hiển thị "tổng phải trả" phải tự cộng thêm nghĩa vụ gốc + lãi, hoặc dùng `calcOverduePenalty(...).totalDue`.

5. **Cột `DebtGroup` là dữ liệu có độ trễ.** Ngay cả sau khi cron chạy, giá trị lưu vẫn có thể trễ tới gần một ngày so với thực tế (cron chạy 00:15 VN). Giao diện tính sống nên luôn đúng hơn cột lưu; báo cáo SQL đọc thẳng cột `DebtGroup` sẽ phản ánh trạng thái *sau lần cron gần nhất*, không phải thời gian thực.
