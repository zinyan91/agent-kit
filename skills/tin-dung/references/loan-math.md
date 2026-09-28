# Lịch trả nợ, tính lãi và phân bổ gốc (loan math)

Nguồn sự thật cho toàn bộ số học khoản vay: dựng dãy ngày đến hạn, chia gốc theo phương thức, tính lãi Actual/365, xử lý trả trước hạn, tính quá hạn/phạt/nhóm nợ, và đồng bộ lịch mà không mất lịch sử thu nợ. Tất cả là hàm thuần trong `src/lib/`, không phụ thuộc React, được phủ test tại `src/lib/__tests__/`. **Code là nguồn sự thật** — tài liệu này ghi đúng những gì code làm; chỗ nào tài liệu cũ mâu thuẫn code đã được sửa theo code (xem mục cuối).

## Mục lục
1. Hai hệ thống số học tách biệt (production vs công cụ tính)
2. Bất biến bắt buộc
3. Dựng dãy ngày đến hạn
4. Ngày đáo hạn chốt chặn dãy kỳ
5. Công thức tính lãi (Actual/365)
6. Phân bổ gốc theo phương thức + làm tròn
7. Trả trước hạn (reduce_monthly vs shorten_tenor)
8. Tính lại lịch, giữ lịch sử thu nợ
9. Trạng thái thu / dư nợ / quá hạn / phạt / nhóm nợ
10. Đồng bộ lịch (reconcile) — không xóa trắng
11. Danh bạ hàm
12. Các chỗ đã sửa lệch so với CONVENTIONS.md cũ + điểm còn mơ hồ

---

## 1. Hai hệ thống số học tách biệt

Có **hai** bộ dựng lịch, đừng lẫn:

| Hệ thống | Tệp | Dùng cho | Đặc điểm |
| :--- | :--- | :--- | :--- |
| **Production (KUNN thật)** | `loanMath.ts` (`generateSchedule`, `recalculateSchedules`, `buildDueDateSequence`, `redateSchedules`) | Lịch trả nợ thật lưu vào `RepaymentSchedules` | Dựa trên dòng thời gian lãi suất thật (`rateResolution.ts`), chốt chặn ngày đáo hạn qua `applyMaturityToDueDates`, **không** kéo kỳ cuối |
| **Công cụ tính minh hoạ** | `calcMath.ts` (`buildLoanSchedule`, `scheduleDueDate`) | 8 công cụ tính toán trên màn hình (mô phỏng, chào khách) | Tự tính lãi suất theo tham số truyền vào, **có** kéo kỳ cuối về đáo hạn, hỗ trợ annuity (gốc+lãi đều) |

Hệ production **không** có annuity; `calcMath` có ba phương thức (`equal_principal`, `bullet`, `equal_installment`). Khi sửa số của KUNN thật, sửa `loanMath.ts`. `calcMath.ts` chỉ nuôi các công cụ mô phỏng.

---

## 2. Bất biến bắt buộc

> **Tổng tiền gốc các kỳ luôn bằng đúng số tiền vay**, ở MỌI phương thức trả nợ, MỌI hệ thống.

Sai bất biến này là ngân hàng thu thừa hoặc thu thiếu của khách. Cơ chế bảo đảm: vòng lặp dừng khi dư nợ về 0 (`if (balance <= 0) break;`), và **kỳ cuối luôn lấy toàn bộ dư nợ còn lại** (`scheduledPrincipal = balance` khi `i === totalPeriods`). Nhờ vậy phần lẻ do làm tròn luôn dồn vào kỳ cuối, không rơi rớt. Bất biến này giữ nguyên **kể cả** khi trả trước hạn chia lại gốc/kỳ — vì kỳ cuối vẫn gánh phần dư. Đây là bài test đã bắt lỗi trừ đôi tiền trả trước hạn.

---

## 3. Dựng dãy ngày đến hạn

`buildDueDateSequence(repaymentStartDate, periods, disbursementDate, maturityIso)` (`loanMath.ts`) là **nguồn duy nhất** sinh dãy ngày đến hạn. Cả `generateSchedule` (tạo lịch mới) và `redateSchedules` (khai lại ngày khi banker sửa mốc của KUNN đã có lịch) đều phải đi qua nó. Đừng cộng tháng bằng tay ở nơi khác — bản chép tay trong `LoanPortfolioView` từng tái tạo lại lỗi cũ sau khi đường tạo mới đã sửa.

### Kỳ đầu là DỮ LIỆU GỐC, không suy ra được
`RepaymentStartDate` do khách chọn và ghi trên GNN (ngày 1, 15, 28, 30...). **Không** phải giải ngân + 1 tháng; **không** gom về một mốc dùng chung cho cả hợp đồng hạn mức.

- Ràng buộc duy nhất: **kỳ 1 phải SAU ngày giải ngân**. `resolveFirstDueAnchor` dịch mốc lên **từng tháng** (giữ nguyên ngày trong tháng) tới khi vượt ngày giải ngân (guard 600 lần).
- Ngày trong tháng **giữ nguyên** từ kỳ đầu tới kỳ cuối: khách trả ngày 15 thì mọi kỳ ngày 15.
- Để trống `RepaymentStartDate` mới mặc định giải ngân + 1 tháng — đây là **giá trị tạm chờ khai**, không phải quy tắc.

Ví dụ: LÊ NGỌC QUẾ HÂN giải ngân 05/05/2026, kỳ 1 khai 15/05/2026 → kỳ 1 chỉ 10 ngày (đúng). Lỗi từng xảy ra: 5 KUNN của NGÔ NHỊ ĐẠT mượn mốc 15/04/2026 của hợp đồng → kỳ 1 rơi trước ngày giải ngân, thu vượt khách hơn 21 triệu.

### Ngữ nghĩa EDATE — kẹp về ngày cuối tháng đích
`dueDateAtCycle` và `edate` (`calcMath.ts`) đều kẹp: kỳ rơi 31/01 → kỳ sau 28/02 (không tràn 03/03). `addMonthsToDate` (`loanMath.ts`) và `addMonths` (`calcMath.ts`) cùng dùng ngữ nghĩa này. Lỗi cũ dùng `new Date(y, m+1, 31)` tràn sang tháng sau, lệch cả ngày trả nợ lẫn số ngày tính lãi.

---

## 4. Ngày đáo hạn là chốt chặn của dãy kỳ

Nợ chấm dứt ở ngày đáo hạn, nên dãy kỳ cũng phải chấm dứt ở đó — không sớm hơn (thu thiếu lãi), không muộn hơn (thu lãi trên khoản đã hết hạn).

Cài ở `applyMaturityToDueDates(dates, maturityIso)`: **bỏ mọi ngày due sau ngày đáo hạn, rồi nối ngày đáo hạn vào cuối nếu chưa có**. Một phép biến đổi lo cả ba trường hợp và **luỹ đẳng** (chạy lại trên dãy đã có kỳ phụ ra đúng dãy cũ — nên bấm "Tính lại lịch" nhiều lần không đẻ thêm kỳ).

| Ngày due cuối so với đáo hạn | Kết quả |
| :--- | :--- |
| **Sau** | Huỷ kỳ due cố định, dời về đúng ngày đáo hạn; thu toàn bộ gốc còn lại + lãi thực tế. Số kỳ không đổi |
| **Trùng** | Không đổi |
| **Trước** | Kỳ due đóng như thường, mở thêm **một kỳ** tới ngày đáo hạn thu nốt gốc + lãi số ngày lẻ |

**Kỳ phụ chỉ sinh khi thật sự còn nợ** — `generateSchedule` dừng vòng lặp khi dư nợ về 0:
- Hạn mức (gốc trả cuối kỳ): dư nợ nguyên tới đáo hạn → kỳ phụ luôn có, gốc dồn vào chính kỳ đó.
- Từng lần (gốc trả đều, làm tròn LÊN 10.000đ): dư nợ về 0 tại/trước kỳ due cuối → kỳ phụ nếu có sẽ rỗng và không được sinh.

Nguồn ngày đáo hạn: `maturityDateOf(contract)` = `KunnDueDate` đã khai, thiếu thì `DisbursementDate + KunnTenor` (hoặc `LoanTenorMonths`). **Không** đọc `ContractEndDate` (lấy hạn HĐTD làm hạn khoản vay là lỗi đã gỡ; có test khoá riêng).

Chốt chặn theo loại vay: hạn mức → đáo hạn **KUNN** (KUNN được sống qua ngày HĐTD hết hạn); từng lần → đáo hạn **khoản vay** (HĐTD và KUNN là một).

Điều **vẫn còn bị gỡ** khỏi production: kéo kỳ cuối về đáo hạn cho mọi loại vay + nút bảo trì quét toàn danh mục ghi đè `InterestAmount` không xem trước (sự cố 06–07/08/2026). Bài học: một khuôn lặp lại trong dữ liệu là **quy tắc cần hỏi**, không phải lỗi cần sửa hàng loạt.

---

## 5. Công thức tính lãi (Actual/365)

```
Lãi kỳ = Dư nợ × Lãi suất năm × Số ngày thực tế trong kỳ / 365
```

| Điểm | Chi tiết |
| :--- | :--- |
| Số ngày | `getDaysBetween(prev, due)` (`loanMath.ts`): chênh lệch UTC theo ngày, tối thiểu 1; **rơi về 30** nếu parse lỗi. `diffDays` (`calcMath.ts`) tối thiểu 0, rơi về 0 nếu lỗi |
| Dư nợ tính lãi | Trong `recalculateSchedules` là `actualBalance` (dư nợ theo gốc **đã thực thu**), không phải gốc lịch — nên thu thiếu một kỳ làm lãi kỳ sau nhích lên |
| Nhiều mức LS trong kỳ | `splitPeriodByRate` (`rateResolution.ts`) chia kỳ theo từng đoạn lãi suất; lãi = Σ(dư nợ × ratePercent/100 × days/365) rồi `Math.round` **một lần** trên tổng |
| Không có mức LS | Rơi về `defaultAnnualRate` (`generateSchedule`) hoặc `getEffectiveActiveRate` (`recalculateSchedules`) |
| Chuẩn hoá lãi suất | `interestRate > 1 ? /100 : interestRate` — nhận cả 8.5 (%) lẫn 0.085 |

**Lãi có thể TĂNG dù dư nợ giảm** vì dùng số ngày thực: kỳ 15/03–15/04 (31 ngày) cao hơn kỳ 15/02–15/03 (28 ngày) là **đúng**. Có test riêng ghi nhận để không ai "sửa" thành sai.

Lãi suất đang áp dụng chỉ có MỘT nguồn: `getEffectiveActiveRate` (`rateResolution.ts`) — thứ tự `BaseRate+MarginRate` (áp sàn) → `PostPreferentialRate` → `NormalRate` → `InterestRate`. Không có lãi suất mặc định: thiếu thì trả **0** và hiện "— chưa khai" (hằng số dự phòng 8,5% từng chảy vào hồ sơ thật).

---

## 6. Phân bổ gốc theo phương thức + làm tròn

`isBulletPrincipal(contract)` **chỉ** căn cứ `PrincipalRepaymentMethod` (mặc định `'Gốc trả cuối kỳ'`). Phương thức vay **không** đè lên lựa chọn này — lỗi cũ ép mọi hợp đồng hạn mức thành gốc cuối kỳ khiến cột gốc mọi kỳ = 0 dù giao diện ghi "trả đều".

| Phương thức | Gốc mỗi kỳ (kỳ giữa) | Kỳ cuối |
| :--- | :--- | :--- |
| **Gốc trả cuối kỳ (bullet)** | 0 | Toàn bộ dư nợ |
| **Gốc trả đều** | `min(dư nợ, gốc/kỳ)`; kỳ ân hạn = 0 | Toàn bộ dư nợ còn lại |
| **Annuity** (chỉ `calcMath`) | `min(dư nợ, installment − lãi)` | Toàn bộ dư nợ |

### Làm tròn gốc — LÊN, bước 10.000đ
`roundPrincipalCore(raw, mode)` (`loanMath.ts`): `Math.ceil(raw / step) * step`. Mặc định `PRINCIPAL_ROUND_MODE = '10k'` (10.000đ). Modes: `'1k'` `'10k'` `'50k'` `'exact'`. `'exact'` hoặc raw ≤ 0 → `Math.round`.

- **Bước 10.000, làm tròn LÊN, kỳ cuối gánh phần dư** — để giữ bất biến §2.
- Chứng cứ: GNN `PNAT.CN.03111223/GNN-01` vay 500.000.000đ / 120 kỳ ghi 4.170.000đ/kỳ, kỳ cuối 3.770.000đ. `500tr/120 = 4.166.667` → ceil bước 10.000 = **4.170.000** (khớp). Bước 1.000 cho 4.167.000đ — lệch mọi kỳ so với chứng từ. Đã kiểm chứng toàn danh mục (Migration 18): 28 khoản tái tạo được bằng bước 10.000, 0 khoản nói bước khác.
- Cách đo phải là **tái tạo con số từ thương số**, không xét chia hết (chia hết cho 14 khoản trông như "bước 50.000" là ngộ nhận thống kê).

### `MonthlyPrincipalAmount` — gốc/kỳ khai theo GNN
Cột `LoanContracts.MonthlyPrincipalAmount` (Migration 36) khai ngoại lệ gốc/kỳ. `NULL` = **tự tính** bằng thương số đã làm tròn, KHÔNG phải "chưa khai". Đọc bằng `resolveMonthlyPrincipal(contract, totalPeriods)`, tuyệt đối đừng viết `MonthlyPrincipalAmount || <mặc định>` (0 và null lẫn nhau).
- `monthlyPrincipalQuotient` = `kunnPrincipal / max(1, totalPeriods − graceMonths)` — chia cho số kỳ **sau ân hạn**.
- `kunnPrincipal` = `LoanAmount` nếu > 0, không thì `CurrentBalance`, không thì 0.
- Ô nhập là **số tiền** (đọc thẳng "4.170.000đ/kỳ" trên GNN), cố ý không phải drop-down chọn bước. Chỉ hiện với "Gốc trả đều" (bullet thì `isBullet ? 0`, không có phép chia).
- ⚠️ `buildKunnPayload` luôn gửi cột này; **chưa chạy Migration 36 thì mọi lần lưu KUNN đổ lỗi PGRST204**.

---

## 7. Trả trước hạn (prepayment)

Phải được ghi nhận **kể cả khi kỳ đã tất toán**. `PrepaidPrincipalAmount` là gốc trả trước hạn trong kỳ.

**Không trừ hai lần.** `PrincipalAmount` (gốc phải trả của kỳ) **đã bao gồm** `PrepaidPrincipalAmount`. Trong `generateSchedule`: `totalPrincipalInPeriod = min(balance, normalPrincipal + periodPrepay)`, và dư nợ trừ đúng bằng con số đó. Cộng thêm phần trả trước lần nữa là trừ đôi → ngân hàng mất gốc. Lỗi từng xảy ra: LÊ VĂN HẬU `2002/HĐTD/9665732/GNN-01` kỳ 7 và 10 trả trước 785 và 888 triệu; công thức sai biến khách **trả sớm** thành **nợ quá hạn**.

Hai phương án sau khi trả trước (`prepaymentMode`):

| Mode | Ý nghĩa | Hành vi |
| :--- | :--- | :--- |
| `reduce_monthly` | Giảm gốc mỗi kỳ, giữ số kỳ | Chia lại `endingBal / remainingPeriods` cho các kỳ còn lại (chỉ khi **không** bullet) |
| `shorten_tenor` | Giữ gốc/kỳ, rút ngắn kỳ hạn | Không chia lại; dư nợ về 0 sớm hơn → vòng lặp dừng, số kỳ thực giảm |

**Chia lại phải theo số kỳ SAU ân hạn.** `recalculateSchedules` và `buildLoanSchedule` dùng divisor `totalPeriods − max(periodNum, graceMonths)` — đúng. Lỗi từng xảy ra khi dùng `tổng kỳ − kỳ hiện tại`: khoản 960 triệu / 120 kỳ, ân hạn 18 tháng ra gốc/kỳ 8,07 triệu thay vì ~9,26 triệu, kỳ cuối gánh 128,93 triệu.

Sau khi `reduce_monthly`, số `MonthlyPrincipalAmount` khai tay **không còn áp dụng** (mục đích của phương án là gốc/kỳ phải giảm); hệ thống tính lại theo bước mặc định, cố ý không suy bước từ số đã khai.

> ⚠️ **Điểm mơ hồ:** trong `generateSchedule`, nhánh chia lại `reduce_monthly` dùng divisor `totalPeriods − i` — **không** cộng ân hạn như `recalculateSchedules`/`buildLoanSchedule`. Xem mục 12.

---

## 8. Tính lại lịch, giữ lịch sử thu nợ

`recalculateSchedules(schedList, contract, todayStr)` giữ hai dư nợ song song:
- `planBalance` — theo gốc **lịch** (để tính gốc phải trả từng kỳ).
- `actualBalance` — theo gốc **đã thực thu** (`collectedPrincipal`), dùng làm cơ sở tính lãi kỳ chưa thu.

**Không ghi đè kỳ ĐÃ THU** (dữ liệu lịch sử):
- `InterestAmount` của kỳ `IsPaid` được **giữ nguyên** (là bản ghi tiền lãi đã thu — `ActualPaidInterest` chưa từng được điền, 0/898 kỳ). Tính lại theo mốc mới là sửa lịch sử.
- Gốc thì **vẫn** tính lại để tiền trả trước hạn ghi nhận được kể cả trên kỳ đã tất toán (đúng §7).
- `redateSchedules` giữ nguyên `DueDate` của kỳ `IsPaid`, chỉ đổi ngày kỳ chưa thu.

`markSchedulePaidOnTime(s, paymentDate)` đóng nhanh một kỳ đúng hạn: set `IsPaid`, `OverdueDays=0`, `OverdueInterestAmount=0`, `TotalAmount = gốc + lãi`. `canQuickSettle` chặn đóng nhanh nếu kỳ đã thu, đã quá hạn (lãi phạt phải do người quyết), có khai trả trước, hoặc đã khai số thu thật.

---

## 9. Trạng thái thu / dư nợ / quá hạn / phạt / nhóm nợ

### Kỳ chỉ xong khi thu ĐỦ nghĩa vụ
Nghĩa vụ kỳ = `PrincipalAmount + InterestAmount + OverdueInterestAmount`. `schedulePaymentStatus` (`loanMath.ts`) là nguồn duy nhất, trả `chua_thu` / `thu_mot_phan` / `da_thu_du`. `isScheduleFullySettled` là dạng gọn.
- **Quy ước cũ:** `IsPaid=true` kèm **cả hai** `ActualPaidPrincipal` và `ActualPaidInterest` bỏ trống nghĩa là "đã trả đủ theo lịch" (831/835 kỳ). Bỏ nhánh này là biến 831 kỳ thành chưa thu, dư nợ phình lên.
- Gốc đã thu = `ActualPaidPrincipal + PrepaidPrincipalAmount` (khi có khai tay), không phải nghĩa vụ trừ phần trả trước.
- So **bằng chính xác**, không cần ngưỡng làm tròn (0 kỳ thiếu dưới 100.000đ).
- Phạt có tính vào nghĩa vụ hay không đặt ở `PENALTY_COUNTS_TOWARD_SETTLEMENT` (hiện `true`).

### Dư nợ
`computeOutstandingBalance(schedules, contract)`: trả **0** nếu `IsSettled` (tất toán trước hạn là hết nợ dù lịch còn kỳ chưa tới hạn); không có dòng lịch nào thì rơi về `CurrentBalance` (⚠️ dư nợ đóng băng — 14/97 KUNN từng treo 4,635 tỷ vì không có lịch). Dư nợ giảm theo gốc **đã thực thu** (`paidPrincipalOf`), không theo gốc phải trả. `paidPrincipalOf`: nếu `ActualPaidPrincipal > 0` → `+ prepaid`; nếu chỉ `IsPaid` → `PrincipalAmount`; ngược lại → `prepaid`.

### Quá hạn và phạt
- `overdueDaysOfSchedule`: ưu tiên `OverdueDays` đã lưu (nếu > 0), không thì tính từ hôm nay.
- `calculateOverdueDaysFromDates` dùng `Math.ceil` (làm tròn LÊN ngày lẻ, có lợi cho tính phạt); còn `getAutoDebtGroupInfo` dùng `Math.floor` khi đếm ngày cho nhóm nợ. Hai phép làm tròn khác nhau — cố ý.
- `computeSchedulePenalty` gọi `calcOverduePenalty` (`stkPledge.ts`): **phạt gốc = 150% lãi suất trong hạn**, **phạt lãi chậm trả = 10%/năm**, cùng Actual/365. `resolvePenaltyDue` (`scheduleView.ts`): `OverdueInterestAmount` là lãi phạt **đã ghi nhận** và luôn thắng — kể cả khi bằng 0 (miễn phạt); phải dùng `??` không dùng `||`. Kỳ đã tất toán mà chưa khai phạt thì phạt = 0, không tính dồn tích.

### Nhóm nợ (Thông tư 11/2021)
`debtGroupFromOverdueDays(maxOverdueDays)` — nguồn ngưỡng CHUNG cho dashboard và portfolio:

| Nhóm | Số ngày quá hạn lớn nhất |
| :--- | :--- |
| 1 | < 10 |
| 2 | 10–90 |
| 3 | 91–180 |
| 4 | 181–360 |
| 5 | > 360 |

`getAutoDebtGroupInfo(schedules, todayStr)` quét mọi kỳ **chưa tất toán**, lấy `maxOverdueDays` (và `worstDueDate`), rồi ánh xạ. Nhóm nợ phải **tính sống**: field `DebtGroup` lưu có thể cũ; dùng `max(giá trị lưu, giá trị tính từ ngày quá hạn)`, đừng đọc thẳng.

### Phân rã nghĩa vụ một kỳ (`scheduleView.ts`)
`periodObligation(s, contract, asOfDate)` là nguồn duy nhất phân rã một kỳ thành gốc / lãi / lãi phạt theo ba cột **Phải trả · Đã trả · Còn nợ** (`ObligationLine` với `unpaid = max(0, due − paid)`). `sumObligations` cộng `total.unpaid` **của từng kỳ đã kẹp sàn 0** — không lấy tổng phải trả trừ tổng đã trả (một kỳ thu vượt sẽ bù khống kỳ thiếu và giấu mất kỳ nợ). Nhờ vậy tổng chân bảng **bằng định nghĩa** là tổng các dòng. Trước đây công thức này có ba bản viết trong `.tsx` và đã trôi dạt.

---

## 10. Đồng bộ lịch (reconcile) — không xóa trắng

`reconcileScheduleRows(existing, generated)` (`scheduleSync.ts`) so khớp lịch cũ và lịch mới sinh theo `PeriodNumber`, trả `{ toUpsert, toDeleteIds, blockedPaidPeriods, ambiguousPeriods }`. **Giữ lịch sử thu nợ, không xóa trắng:**

- Kỳ mới có, cũ chưa có → thêm (`toUpsert`).
- Kỳ khớp 1-1 → **giữ nguyên các cột bản ghi thu** của dòng cũ (`IsPaid`, `PaymentDate`, `ActualPaid*`, `OverdueDays`, `OverdueInterestAmount`, `PrepaidPrincipalAmount`, `Note`, `Id`), chỉ ghi đè `DueDate`, `PrincipalAmount`, `InterestAmount`, `TotalAmount` từ dòng mới. (Việc "không ghi đè kỳ đã thu" nằm ở tầng trên — `redate`/`recalculate` đã bảo toàn giá trị trước khi truyền vào đây.)
- Nhiều dòng cùng kỳ → giữ dòng **có bản ghi thu** (`hasPaymentRecord`); xoá dòng thừa. Nếu không đúng 1 dòng có bản ghi thu → `ambiguousPeriods` (bỏ qua, để người quyết).
- Kỳ cũ không còn trong lịch mới: **có** bản ghi thu → `blockedPaidPeriods` (chặn xoá); **không** → `toDeleteIds`.

`hasPaymentRecord` = `IsPaid || PaymentDate || ActualPaidAmount>0 || ActualPaidPrincipal>0 || ActualPaidInterest>0 || PrepaidPrincipalAmount>0`. `scheduleRowsForContract` ép mọi số về 0 nếu null/NaN (`so()`) khi map từ Partial sang hàng mới.

---

## 11. Danh bạ hàm

| Hàm | Tệp | Trách nhiệm |
| :--- | :--- | :--- |
| `buildDueDateSequence` | loanMath.ts | Nguồn DUY NHẤT sinh dãy ngày đến hạn (đã áp chốt đáo hạn) |
| `resolveFirstDueAnchor` | loanMath.ts | Dịch mốc kỳ 1 lên từng tháng tới khi vượt ngày giải ngân, giữ ngày trong tháng |
| `applyMaturityToDueDates` | loanMath.ts | Bỏ ngày due sau đáo hạn, nối đáo hạn vào cuối; luỹ đẳng |
| `maturityDateOf` | loanMath.ts | Ngày đáo hạn: KunnDueDate → DisbursementDate+KunnTenor/LoanTenorMonths; KHÔNG đọc ContractEndDate |
| `generateSchedule` | loanMath.ts | Sinh lịch mới đầy đủ (gốc, lãi, trả trước) cho KUNN |
| `recalculateSchedules` | loanMath.ts | Tính lại gốc/lãi giữ lịch sử kỳ đã thu; hai dư nợ plan/actual |
| `redateSchedules` | loanMath.ts | Chỉ đổi DueDate kỳ chưa thu, giữ nguyên số kỳ và cột khác |
| `roundPrincipalCore` | loanMath.ts | Làm tròn LÊN theo bước (mặc định 10.000đ) |
| `resolveMonthlyPrincipal` / `monthlyPrincipalQuotient` / `kunnPrincipal` | loanMath.ts | Gốc/kỳ khai tay hoặc thương số làm tròn (chia số kỳ sau ân hạn) |
| `isBulletPrincipal` | loanMath.ts | Chỉ căn cứ PrincipalRepaymentMethod |
| `schedulePaymentStatus` / `isScheduleFullySettled` | loanMath.ts | Trạng thái thu của một kỳ (chua_thu/thu_mot_phan/da_thu_du) |
| `paidPrincipalOf` | loanMath.ts | Gốc đã thu thật của một kỳ (gồm trả trước, không trừ đôi) |
| `computeOutstandingBalance` / `outstandingOf` | loanMath.ts | Dư nợ khoản vay (0 nếu IsSettled; rơi về CurrentBalance nếu không có lịch) |
| `computeSchedulePenalty` / `overdueDaysOfSchedule` / `calculateOverdueDaysFromDates` | loanMath.ts | Phạt (150% gốc + 10% lãi chậm) và số ngày quá hạn |
| `debtGroupFromOverdueDays` / `getAutoDebtGroupInfo` | loanMath.ts | Phân nhóm nợ theo ngưỡng TT11/2021 |
| `getDaysBetween` / `addMonthsToDate` / `addDaysToDate` / `parseDateParts` | loanMath.ts | Số học ngày (min 1 ngày, EDATE kẹp cuối tháng) |
| `canQuickSettle` / `markSchedulePaidOnTime` | loanMath.ts | Đóng nhanh kỳ đúng hạn |
| `periodObligation` / `sumObligations` / `resolvePenaltyDue` | scheduleView.ts | Phân rã nghĩa vụ một kỳ + tổng cột (Phải/Đã/Còn) |
| `reconcileScheduleRows` / `scheduleRowsForContract` / `hasPaymentRecord` | scheduleSync.ts | Đồng bộ lịch giữ lịch sử thu nợ |
| `buildLoanSchedule` / `scheduleDueDate` | calcMath.ts | Lịch mô phỏng cho công cụ tính (có annuity, có kéo kỳ cuối) |
| `annuityInstallment` / `emiFactor` / `emiMonthlyPayment` / `pvAnnuityFactor` | calcMath.ts | Số học niên kim (EMI); annuity làm tròn bước 1.000 |
| `edate` / `addMonths` / `diffDays` | calcMath.ts | Số học ngày kiểu EDATE cho công cụ tính |
| `postPromoRateAnnual` / `periodRateAnnual` | calcMath.ts | Lãi suất sau ưu đãi và theo kỳ (công cụ tính) |
| `effectiveAnnualRate` / `dtiMaxMonthlyPayment` / `flatToReducingApprox` | calcMath.ts | EAR, trần trả nợ theo DTI, quy đổi lãi phẳng |

---

## 12. Các chỗ đã sửa lệch so với CONVENTIONS.md cũ + điểm còn mơ hồ

### Đã sửa theo CODE
1. **Bước làm tròn của công cụ tính (`calcMath.buildLoanSchedule`).** CONVENTIONS §6 (dòng 465) viết "gốc trả đều làm tròn LÊN **bước 1.000 đồng**". Sai theo code hiện tại: `buildLoanSchedule` gọi `roundPrincipalCore(...)` **không truyền mode** → dùng mặc định `PRINCIPAL_ROUND_MODE = '10k'` (**bước 10.000đ**), thống nhất với lịch production. Chỉ `annuityInstallment` (annuity) mới truyền `'1k'` một cách tường minh. Câu trong CONVENTIONS §6 là tàn dư trước khi đổi bước (Migration 18 đã đổi 1.000 → 10.000 toàn hệ thống). **Theo code: bước mặc định 10.000đ; ngoại lệ duy nhất bước 1.000 là số tiền niên kim annuity.**

2. **`redateSchedules` với kỳ đã thu.** Sổ tra cứu cũ (dòng 1001) ghi "hiện vẫn ghi đè ngày của kỳ đã thu — chờ quyết định". Code hiện tại **không** ghi đè: `s.IsPaid ? {...s} : {...s, DueDate: ...}` — kỳ `IsPaid` giữ nguyên toàn bộ. Đã khớp với chủ trương "không ghi đè kỳ đã thu".

### Điểm còn mơ hồ (cần người nghiệp vụ quyết)
1. **`generateSchedule` chia lại `reduce_monthly` không cộng ân hạn.** Ba nơi chia lại gốc sau trả trước dùng divisor khác nhau:
   - `recalculateSchedules` (dòng ~496): `totalPeriods − max(periodNum, graceMonths)` — cộng ân hạn (đúng theo §7).
   - `buildLoanSchedule` (dòng ~230): `tenorMonths − max(i, graceMonths)` — cộng ân hạn (đúng).
   - `generateSchedule` (dòng ~266): `totalPeriods − i` — **không** cộng ân hạn.

   Nếu khách trả trước **trong** thời gian ân hạn gốc rồi chọn `reduce_monthly`, `generateSchedule` sẽ chia dư nợ mới cho cả các kỳ ân hạn còn lại → gốc/kỳ tính hụt, phần thiếu dồn vào kỳ cuối. Đây đúng loại lỗi mà CONVENTIONS §"Trả trước hạn" (dòng 312) cảnh báo, nhưng chỉ mới sửa ở `recalculateSchedules`/`buildLoanSchedule`. Bất biến §2 vẫn giữ (kỳ cuối gánh dư), nên sai lệch là ở **phân bổ**, không ở tổng. Cần xác nhận đây là ca thật (trả trước khi đang ân hạn) trước khi coi là bug phải sửa.

2. **Chốt chặn đáo hạn khác nhau giữa hai hệ thống.** `loanMath` áp `applyMaturityToDueDates` (bỏ ngày sau đáo hạn + nối đáo hạn, luỹ đẳng, **không** kéo kỳ cuối). `calcMath.scheduleDueDate` **có** kéo kỳ cuối về đáo hạn (nhánh `period === tenorMonths`). Khác biệt là cố ý (công cụ tính là minh hoạ), nhưng khi đối chiếu số giữa màn hình mô phỏng và lịch KUNN thật, kỳ cuối có thể lệch — cần nhớ để không "sửa" nhầm một trong hai.

3. **Fallback số ngày khác nhau.** `getDaysBetween` (production) rơi về **30** khi parse ngày lỗi và tối thiểu 1; `diffDays` (công cụ tính) rơi về **0**. Với dữ liệu ngày hợp lệ thì không ảnh hưởng, nhưng dữ liệu ngày hỏng cho ra lãi khác nhau giữa hai hệ.
