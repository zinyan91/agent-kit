# Phương án kinh doanh & Hạn mức + máy tính phụ trợ

Bộ máy thay bốn file Excel của banker để lập phương án kinh doanh và tính hạn mức cho
**khách hàng cá nhân và hộ kinh doanh** (không phải doanh nghiệp). Kèm hai máy tính phụ
trợ: phân tích trả nợ trước hạn (`prepaymentAnalysis`) và tính thu nhập thuần TOI
(`toiMath`).

**Tệp mã liên quan:** `src/lib/businessPlan.ts`, `src/lib/businessPlanExport.ts`,
`src/lib/prepaymentAnalysis.ts`, `src/lib/toiMath.ts` (và `src/lib/calcMath.ts` cho
`pvAnnuityFactor`, `dtiMaxMonthlyPayment`).

---

## Mục lục

1. [Đây là máy tính, không phải hồ sơ](#1-đây-là-máy-tính-không-phải-hồ-sơ)
2. [Mô hình dữ liệu & luồng tính](#2-mô-hình-dữ-liệu--luồng-tính)
3. [Kỳ kế hoạch là dự phóng (hệ số × kỳ thực hiện)](#3-kỳ-kế-hoạch-là-dự-phóng)
4. [Bảng cân đối & kết quả kinh doanh](#4-bảng-cân-đối--kết-quả-kinh-doanh)
5. [Nhu cầu vốn bằng tiền không phụ thuộc lãi vay](#5-nhu-cầu-vốn-bằng-tiền-không-phụ-thuộc-lãi-vay)
6. [Hạn mức tuần hoàn (`kind='limit'`)](#6-hạn-mức-tuần-hoàn-kindlimit)
7. [Vay từng lần = min ba giới hạn (`kind='each_time'`)](#7-vay-từng-lần--min-ba-giới-hạn-kindeach_time)
8. [Bảy lỗi Excel gốc — đã sửa, đừng sửa ngược](#8-bảy-lỗi-excel-gốc--đã-sửa-đừng-sửa-ngược)
9. [File xuất phải trùng khít bản gốc](#9-file-xuất-phải-trùng-khít-bản-gốc)
10. [Máy tính phụ trợ — Trả nợ trước hạn (`prepaymentAnalysis`)](#10-máy-tính-phụ-trợ--trả-nợ-trước-hạn)
11. [Máy tính phụ trợ — Thu nhập thuần TOI (`toiMath`)](#11-máy-tính-phụ-trợ--thu-nhập-thuần-toi)
12. [Sổ tra cứu hàm](#12-sổ-tra-cứu-hàm)

---

## 1. Đây là máy tính, không phải hồ sơ

Quyết định nghiệp vụ 10/08/2026 (CONVENTIONS §10b): bảng tính này là **công cụ nhập
liệu cho tờ trình** — **không** gắn khách hàng, **không** gắn HĐTD, **không lưu**.
Banker nhập → xem kết quả → xuất phụ lục → thôi. Migration 34 đã xoá hai bảng
(`BusinessPlans`, `BusinessPlanDebts`) mà migration 31 dựng.

Hai hệ quả đã chấp nhận:
- Đóng tab là mất số đã nhập.
- **Khả năng bảo đảm của TSĐB thành ô nhập tay** (`collateralCapacity` trong
  `EachTimeInput`) — vì không còn khách hàng để `totalUsableCapacity` đọc tài sản.

**Đừng gắn nó trở lại vào khách hàng** cho "tiện tra cứu". Nó không phải hồ sơ tín
dụng; gắn vào là lại phải trả lời "bản nào mới là bản chính thức" khi số trên tờ trình
đã lệch số trong máy.

Bốn file Excel gốc **không phải bốn bảng**: `BẢNG TÍNH HM` là bảng làm việc, ba file
kia chỉ là **liên kết ngoài** trỏ về nó (và trong thực tế đã trôi lệch nhau — phụ lục
KQKD giữ doanh thu 908 trđ/tháng trong khi bảng gốc chỉ còn 128). Trong hệ thống:
**một nguồn dữ liệu, ba bản in.**

---

## 2. Mô hình dữ liệu & luồng tính

`computeBusinessPlan(input: BusinessPlanInput): BusinessPlanResult` là **nguồn duy nhất**
của mọi số dẫn xuất. Luồng:

```
input.balanceSheet ──► computeBalanceSheet ──► balance
input.actual, debts('actual') ──► computePeriod ──► actual (kỳ thực hiện)
planDriversOf(input), debts('plan') ──► computePeriod ──► plan (kỳ kế hoạch)
kind='limit'   ──► computeLimit(actual/plan) ──► result.limit
kind='each_time' ──► computeEachTime(input, actual) ──► result.eachTime
```

`BusinessPlanKind`: `'limit'` (hạn mức tuần hoàn) hoặc `'each_time'` (vay từng lần).
`emptyBusinessPlanInput(todayStr)` khởi tạo rỗng, điền sẵn `growthFactor = 1.5`
(`DEFAULT_GROWTH_FACTOR`) và `maxDtiPercent = 60` (`DEFAULT_MAX_DTI_PERCENT`).

`num(value)` quy mọi `null`/`undefined`/`NaN` về 0 — dùng nhất quán để tránh lan `NaN`.

**Chi phí lãi vay chỉ sinh từ danh sách khoản vay** `debts: DebtItem[]`, qua
`interestAnnualOf(debts, scope)`: `Σ principal × rateAnnualPercent / 100`. `scope`
`'actual'` **bỏ qua** khoản có `scope='plan'` (khoản chỉ xuất hiện ở kỳ kế hoạch); kỳ
`'plan'` tính cả hai. Mỗi `DebtItem.scope` là `'both' | 'plan'`.

---

## 3. Kỳ kế hoạch là dự phóng

`planDriversOf(input)` nhân **mọi** khoản mục kỳ thực hiện với `growthFactor` (mặc định
1,5). Dòng cần khác thì gõ đè, lưu ở `planOverrides`; dòng không gõ đè bám hệ số.

**Hai bẫy (CONVENTIONS §10b):**

1. **Gõ đè bằng 0 là con số thật** — không được coi là "chưa gõ" rồi rơi về hệ số. Mã
   kiểm `null`/`undefined`/`NaN` tường minh (đúng bẫy `||` của CONVENTIONS §1):
   `daoDe === null || daoDe === undefined || isNaN(daoDe) ? actual[key]*factor : daoDe`.
2. **Lãi vay không nhân hệ số** — nó tính từ danh sách dư nợ thật qua
   `interestAnnualOf(debts, 'plan')`, nhân lên là bịa ra khoản vay không tồn tại.

`revenueGrowthOf(input)` = tăng trưởng doanh thu suy ra từ `planDriversOf` so kỳ thực
hiện (dùng cho `planCurrentAssets`).

---

## 4. Bảng cân đối & kết quả kinh doanh

`computeBalanceSheet(b)`:

```
currentAssets   = cash + inventory + receivables + otherCurrentAssets
longTermAssets  = longTermReceivables + fixedAssets + otherLongTermAssets
totalAssets     = currentAssets + longTermAssets
totalLiabilities= shortTermDebt + otherShortTermDebt + longTermDebt + otherLongTermDebt
ownEquity       = totalAssets − totalLiabilities        (số dư — luôn cân)
totalCapital    = totalLiabilities + ownEquity
```

`computePeriod(drivers, interestAnnual, currentAssets)` gộp **bảy dòng chi phí** vào
`CostBreakdown`:

```
costs = cogs + staff*12 + premises*12 + utilities*12 + interest + depreciation + other*12
profitBeforeTax = revenueAnnual − costs.total
profitAfterTax  = profitBeforeTax − tax
```

Doanh thu, giá vốn (`cogsAnnual`), khấu hao (`depreciationAnnual`), thuế (`taxAnnual`)
nhập theo **năm**; nhân công/mặt bằng/điện nước/khác nhập theo **tháng** rồi ×12.
`costRatios` = từng chi phí / doanh thu; `monthly` = mọi con số ÷ 12. **Tỷ lệ là kết
quả tính, không phải ô nhập** — banker gõ **số tiền** giá vốn như mọi dòng chi phí, cột
`%/DT` và `Tăng/giảm` không có ô nào phải gõ (CONVENTIONS §10b: "Giá vốn nhập bằng SỐ
TIỀN").

`planCurrentAssets`: nếu hạn mức đề nghị kỳ kế hoạch tăng so kỳ thực hiện
(`requestedLimitPlan − requestedLimitActual > 0`) thì cộng phần tăng vào tài sản lưu
động; ngược lại nhân theo tăng trưởng doanh thu.

---

## 5. Nhu cầu vốn bằng tiền không phụ thuộc lãi vay

Đây là bất biến khoá bằng test — **đừng sửa `c1` thành phụ thuộc lãi vay**:

```
c1 = DTT − khấu hao − lãi vay − LNTT
   = giá vốn + nhân công + mặt bằng + điện nước + chi phí khác
```

Rút gọn đại số ra đúng **các khoản chi bằng tiền**. Vì vậy lỗi #2 (lãi vay hai con số
lệch nhau, xem §8) làm sai lợi nhuận trình lên nhưng **không** làm sai hạn mức —
`cashNeed` trong `computeLimit` triệt tiêu cả lãi vay lẫn khấu hao:

```
cashNeed = revenueAnnual − costs.depreciation − costs.interest − profitBeforeTax
```

---

## 6. Hạn mức tuần hoàn (`kind='limit'`)

`computeLimit(period, requested)` cho mỗi kỳ (actual & plan):

| Kết quả | Công thức | Ghi chú |
| :--- | :--- | :--- |
| `cashNeed` | `DTT − khấu hao − lãi vay − LNTT` | Nhu cầu vốn bằng tiền (§5) |
| `turnover` | `revenueAnnual / currentAssets` | Vòng quay vốn lưu động; 0 nếu tài sản = 0 |
| `avgWorkingCapitalNeed` | `cashNeed / turnover` | Nhu cầu vốn lưu động bình quân 1 vòng |
| `requested` | `num(requested)` | Hạn mức đề nghị (nhập tay) |
| `exceedsNeed` | `requested > avgWorkingCapitalNeed` | Cờ cảnh báo vượt nhu cầu |

Đây là chuỗi `c1 → c2 → c3` của phụ lục `CapHanMucTinDung`: `c1 = b1 − b3 − b4 − b5`,
`c2 = b1 / b7`, `c3 = c1 / c2`.

---

## 7. Vay từng lần = min ba giới hạn (`kind='each_time'`)

`computeEachTime(input, actualPeriod)` lấy **giá trị nhỏ nhất** của ba giới hạn (dùng
kỳ **thực hiện** làm cơ sở dòng tiền, không dùng kỳ kế hoạch):

```
recommended = min(needFromBank, maxLoanFromCapacity, collateralCapacity)
```

| Giới hạn | Công thức |
| :--- | :--- |
| `needFromBank` | `max(0, projectCost − ownFunds)` — nhu cầu vay |
| `maxLoanFromCapacity` | `affordablePaymentMonthly × pvAnnuityFactor(rateMonthly, tenorMonths)` |
| `collateralCapacity` | Nhập tay (§1) — khả năng bảo đảm TSĐB |

Nguồn trả nợ và khoản trả tối đa theo DTI:

```
businessIncomeMonthly = (LNST + khấu hao) / 12          (từ kỳ thực hiện)
incomeMonthly         = businessIncomeMonthly + otherIncomeMonthly
affordablePaymentMonthly = dtiMaxMonthlyPayment(incomeMonthly, livingExpense,
                                                existingDebt, maxDtiPercent)
rateMonthly = rateAnnualPercent / 100 / 12
```

`dtiMaxMonthlyPayment` (`calcMath.ts`) = `min(thu nhập ròng khả dụng, trần DTI)`, cả
hai sàn 0. `pvAnnuityFactor` (`calcMath.ts`) = hệ số hiện giá dòng niên kim; lãi suất 0
→ trả về đúng `tenorMonths`.

Trường `binding: 'need' | 'capacity' | 'collateral'` chỉ ra giới hạn nào đang chặn (so
`recommended` với từng giới hạn theo thứ tự đó).

**`maxDtiPercent = 0` nghĩa là CHƯA khai** → `affordablePaymentMonthly = 0` →
`maxLoanFromCapacity = 0`, không suy đoán. Trần mặc định `DEFAULT_MAX_DTI_PERCENT = 60`,
form điền sẵn khi tạo mới — chính sách chỉ có một chỗ, không nhúng vào lược đồ CSDL.

---

## 8. Bảy lỗi Excel gốc — đã sửa, đừng sửa ngược

File Excel gốc có bảy lỗi công thức, đều đã sửa trong `businessPlan.ts`. **Đừng "sửa"
ngược lại** (CONVENTIONS §10b):

| # | Lỗi gốc | Đã xử lý |
| :--- | :--- | :--- |
| 1 | `D27 = D18+D23+F24` cộng Vốn góp (nguồn vốn) vào Tổng tài sản | Bỏ Vốn góp khỏi đầu vào; phụ lục vẫn in dòng đó giá trị 0 |
| 2 | Lãi vay hai con số không khớp (`D6`=48trđ từ bảng dư nợ vs dòng lãi vay=0 nhập tay) | `interestAnnualOf` từ `debts` là **nguồn duy nhất** |
| 3 | LNTT hai kỳ hai công thức: `E7` bỏ sót mặt bằng và chi phí khác | Hai kỳ dùng chung `computePeriod` |
| 4 | `D3 = D10*3,4` rồi `D13 = D3/D10 = 3,4` — vòng quay chạy ngược | Doanh thu là đầu vào, vòng quay là kết quả |
| 5 | Lãi suất 8%/năm nhúng cứng trong `*8/100/12` | Lãi suất theo từng khoản vay (`DebtItem.rateAnnualPercent`) |
| 6 | `ROUNDUP(.../12,0)` làm tròn lên hàng triệu rồi lấy số đã tròn tính tỷ trọng | Tính trên số gốc, làm tròn khi hiển thị |
| 7 | `SUM(C4:C8)` phụ lục KQKD cộng thiếu một dòng chi phí | `costs.total` gộp đủ bảy dòng |

Lỗi #1 không lộ vì vốn chủ sở hữu là **số dư** nên hai vế luôn cân — tổng tài sản bị
thổi lên đúng bằng vốn góp mà bảng vẫn trông đúng. Lỗi #2 sai lợi nhuận nhưng **không**
sai hạn mức (§5) — có test khoá tính chất này.

Ranh giới: **hình thức giữ nguyên, con số tính đúng.**

---

## 9. File xuất phải trùng khít bản gốc

`businessPlanExport.ts` dựng ba phụ lục — ràng buộc **cứng** vì file còn được **nạp
ngược lên hệ thống**, chữ nào lệch cũng làm file không dùng được:

| Sheet (`fileBase`) | Đơn vị | Nội dung | Kiểu STT |
| :--- | :--- | :--- | :--- |
| `TINH HINH TAI CHINH` | VND | `buildFinancialPositionSheet` — bảng cân đối | số |
| `KET QUA KINH DOANH` | VND | `buildIncomeStatementSheet` — KQKD (a, b, b1…b7, c, d, e) | chữ |
| `CapHanMucTinDung` | trđ | `buildCreditLimitSheet` — chỉ khi `kind='limit'` | số |

`buildBusinessPlanSheets` gộp hai sheet đầu + thêm `CapHanMucTinDung` nếu `kind='limit'`
(vay từng lần **không** có phụ lục này — `buildCreditLimitSheet` ném lỗi nếu `!r.limit`).

**Giữ nguyên văn** (CONVENTIONS §10b), có test khoá toàn bộ danh sách nhãn:

- **Nhãn từng dòng, kể cả nhãn sai nghĩa.** Dòng `b6` KQKD ghi "Chi phí 6: Chi phí
  khác" nhưng nạp giá trị **khấu hao** (`c.depreciation`), `b7` "Chi phí 7:…" nhận chi
  phí khác — đúng như bản gốc. Sửa nhãn cho "đúng nghĩa" là **phá template** (đã phạm
  một lần 09/08/2026).
- **Tiêu đề cột kể cả ký tự vô hình:** cột cuối `CapHanMucTinDung` là `"Tăng/giảm "` có
  một dấu cách cuối (`'Tăng/giảm '` trong mã).
- **Không chèn gì phía trên bảng** — bắt đầu ngay ở dòng tiêu đề cột.
- Hai dòng Vốn góp và Nguồn kinh phí & quỹ khác giữ giá trị 0 cho khách cá nhân.

Định dạng số: `#,##0` cho tiền, `0%` cho tăng/giảm, `#,##0.0` cho vòng quay. Dòng tiêu
đề nền `DCE6F1` (`HEADER_FILL`). Xuất ra **.xlsx thật** qua `xlsxWriter.ts` (OOXML), không
phải HTML đội lốt Excel — chi tiết cơ chế ZIP/OOXML ở CONVENTIONS §10b.

`ExportContext` mang `customerCif`, ngày, năm, và `basis` (cơ sở xác định từng dòng —
banker nhập, không có thì rơi về mô tả tự sinh như `shareOfRevenueText`).

---

## 10. Máy tính phụ trợ — Trả nợ trước hạn

`calcPrepaymentAnalysis(input): PrepaymentAnalysisResult` (`prepaymentAnalysis.ts`) —
độc lập, không gắn hồ sơ. Tính **phí phạt, lãi tiết kiệm, lợi ích ròng**.

**Số tiền trả trước thực tế** (sàn/trần):
```
actualPrepayAmount = min(max(0, prepayAmount), currentBalance)
isFullPrepayment   = actualPrepayAmount >= currentBalance  (khi currentBalance>0)
remainingBalanceAfterPrepay = max(0, currentBalance − actualPrepayAmount)
```

**Tỷ lệ phí phạt** — hai chế độ (`feeScheduleType`):
- `'custom_rate'`: dùng `customPenaltyPercent` (sàn 0).
- mặc định (`'by_year'`): theo tuổi khoản vay `loanAgeYear` (mặc định 1) →
  năm 1 = `penaltyYear1` (mặc định **2.0%**), năm 2 = `penaltyYear2` (**1.5%**),
  năm 3 = `penaltyYear3` (**1.0%**), năm ≥4 = `penaltyYear4Plus` (**0.0%**).

**Tiền phí phạt** (có sàn phí tối thiểu):
```
rawPenalty = round(actualPrepayAmount × activePenaltyPercent / 100)
penaltyFee = (actualPrepayAmount>0 && rawPenalty < minPenaltyFee) ? minPenaltyFee : rawPenalty
totalPaymentRequired = actualPrepayAmount + penaltyFee
```

**Lãi tiết kiệm** — so tổng lãi còn lại **không** trả trước vs **có** trả trước, theo
`repayMethod` (`monthlyRate = rateAnnual / 12`, `tenorMonths` sàn 1):

| `repayMethod` | Tổng lãi trên số dư `B` |
| :--- | :--- |
| `equal_principal` (gốc đều) | `round(B × monthlyRate × (N+1)/2)` |
| `bullet` (gốc cuối kỳ) | `round(B × monthlyRate × N)` |
| `equal_installment` (niên kim) | `round(annuityPmt × N − B)`, với `annuityPmt = B×r×(1+r)^N / ((1+r)^N − 1)`; `r=0` → 0 |

```
totalInterestSaved = max(0, totalInterestWithoutPrepay − totalInterestWithPrepay)
netSavings = totalInterestSaved − penaltyFee
isBeneficial = netSavings > 0
```

**Lưu ý:** đây là ước lượng **xấp xỉ** tổng lãi theo công thức đóng (không dựng lịch
từng kỳ như `buildLoanSchedule` trong `calcMath.ts`) — dùng để so nhanh lợi ích trả
trước, không phải để phát hành lịch chính thức. Với niên kim, nếu trả hết
(`remainingBalanceAfterPrepay = 0`) thì `totalInterestWithPrepay = 0`.

---

## 11. Máy tính phụ trợ — Thu nhập thuần TOI

`toiMath.ts` tính **TOI (Total Operating Income)** — thu nhập thuần từ chênh lệch lãi
suất so **giá vốn vốn nội bộ (FTP)**, theo **quy ước lãi ngày 30/360** (chia 360).

`computeToiLoanMonth(input)` cho một tháng, tách ngắn hạn / dài hạn:

```
margin  = rate − ftp                          (điểm %; ví dụ 9.0 − 8.0 = 1.0)
income  = bal × (margin / 100) × days / 360   (bal sàn 0)
totalIncome = shortTermIncome + longTermIncome
```

`computeToiLoanSummary(inputs[])` cộng 12 tháng:

| Kết quả | Công thức |
| :--- | :--- |
| `totalShortTermIncome` / `totalLongTermIncome` | Σ thu nhập từng loại |
| `totalIncomeAnnual` | Σ `totalIncome` cả năm |
| `avgBalanceAnnual` | `Σ totalBal / số tháng` (dư nợ bình quân) |
| `toiOverAvgBalance` | `totalIncomeAnnual / avgBalanceAnnual` — TOI/dư nợ bình quân |

`DAYS_IN_MONTHS_DEFAULT = [31,28,31,...]` (năm thường). `defaultToiLoanInputs()` cho bộ
12 tháng mẫu. `days` mặc định 30 nếu bỏ trống. **Quan trọng — mẫu số 360, không phải
365**: TOI dùng quy ước 30/360, khác với lịch trả nợ (`buildLoanSchedule` dùng
`days/365`). Đừng đồng nhất hai mẫu số này.

---

## 12. Sổ tra cứu hàm

### `businessPlan.ts`

| Hàm | Điều phải biết |
| :--- | :--- |
| `computeBusinessPlan` | **Nguồn duy nhất** mọi số dẫn xuất. Hai kỳ chung `computePeriod` (chặn lỗi #3). |
| `computeBalanceSheet` | `ownEquity` là **số dư** = tổng tài sản − nợ (nên luôn cân, che lỗi #1 gốc). |
| `computePeriod` | Bảy dòng chi phí; tháng ×12; tỷ lệ là **kết quả**, không phải ô nhập. |
| `interestAnnualOf` | Lãi vay **chỉ** từ `debts`. `scope='actual'` bỏ khoản `scope='plan'`. Đừng thêm ô nhập lãi thứ hai (lỗi #2). |
| `planDriversOf` | Kỳ kế hoạch = kỳ thực hiện × `growthFactor`, trừ `planOverrides`. **Gõ đè 0 là số thật** — kiểm null/undefined/NaN. |
| `computeLimit` | `cashNeed`/`turnover`/`avgWorkingCapitalNeed`. `cashNeed` **không** phụ thuộc lãi vay (§5, có test khoá). |
| `computeEachTime` | `recommended = min(need, capacity, collateral)`; `binding` chỉ giới hạn chặn. `maxDti=0` → khả năng vay = 0. |
| `emptyBusinessPlanInput` | Điền sẵn `growthFactor=1.5`, `maxDtiPercent=60`. |

### `businessPlanExport.ts`

| Hàm | Điều phải biết |
| :--- | :--- |
| `buildBusinessPlanSheets` | Hai sheet + `CapHanMucTinDung` nếu `kind='limit'`. |
| `buildFinancialPositionSheet` / `buildIncomeStatementSheet` / `buildCreditLimitSheet` | Nhãn/tiêu đề/thứ tự STT **nguyên văn** bản gốc (có test khoá). `b6`/`b7` KQKD cố ý lệch nghĩa. |
| `shareOfRevenueText` | "Chiếm x% doanh thu" — cơ sở tự sinh khi `basis` để trống. |
| `sheetToXlsx` / `sheetToXlsxModel` | Xuất OOXML thật qua `xlsxWriter`; nền tiêu đề `DCE6F1`. |

### `prepaymentAnalysis.ts`

| Hàm | Điều phải biết |
| :--- | :--- |
| `calcPrepaymentAnalysis` | Phí phạt theo tuổi khoản (2/1.5/1/0%) hoặc `custom_rate`; có sàn `minPenaltyFee`. Lãi tiết kiệm **xấp xỉ** theo công thức đóng, ba `repayMethod`. `netSavings = tiết kiệm − phí phạt`. |

### `toiMath.ts`

| Hàm | Điều phải biết |
| :--- | :--- |
| `computeToiLoanMonth` | `income = bal × (rate−ftp)/100 × days/360`. Quy ước **30/360**, không phải 365. |
| `computeToiLoanSummary` | Cộng 12 tháng; `toiOverAvgBalance = TOI năm / dư nợ bình quân`. |

### `calcMath.ts` (phụ thuộc)

| Hàm | Điều phải biết |
| :--- | :--- |
| `pvAnnuityFactor(rateMonthly, tenorMonths)` | Hệ số hiện giá niên kim; lãi 0 → `tenorMonths`. |
| `dtiMaxMonthlyPayment(income, living, existingDebt, maxDtiPercent)` | `min(thu nhập ròng khả dụng, trần DTI)`, cả hai sàn 0. |
