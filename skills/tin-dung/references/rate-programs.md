# Chương trình lãi suất — chào lãi, lãi hiệu lực, huy động, giảm lãi, COF

> **Nguồn sự thật:** mã nguồn trong `src/lib/` và các migration SQL. Tài liệu này
> đã gộp và thay thế các mục tương ứng của `CONVENTIONS.md` (sẽ bị xóa). Khi
> tài liệu cũ lệch với mã nguồn, tài liệu này ghi theo **hành vi hiện tại của mã**.
> Nhiều điểm dưới đây đã **đổi trong đợt sửa gần nhất** — đọc kỹ phần đánh dấu
> ⚠️ ĐÃ ĐỔI.

## Mục lục

- [1. Bức tranh tổng thể & bảng dữ liệu](#1-buc-tranh-tong-the--bang-du-lieu)
- [2. Chọn chương trình hiệu lực (`findActiveProgram`)](#2-chon-chuong-trinh-hieu-luc-findactiveprogram) ⚠️ ĐÃ ĐỔI
- [3. Chồng lấn khoảng hiệu lực](#3-chong-lan-khoang-hieu-luc) ⚠️ ĐÃ ĐỔI
- [4. Nhân bản chương trình (clone)](#4-nhan-ban-chuong-trinh-clone)
- [5. Xóa chương trình (delete)](#5-xoa-chuong-trinh-delete) ⚠️ ĐÃ ĐỔI
- [6. Cảnh báo chặn khi chào (`collectQuoteWarnings`)](#6-canh-bao-chan-khi-chao-collectquotewarnings)
- [7. NULL ≠ 0](#7-null--0)
- [8. Công thức phí dịch vụ (`calcServiceFee`)](#8-cong-thuc-phi-dich-vu-calcservicefee)
- [9. Phí trả nợ trước hạn](#9-phi-tra-no-truoc-han)
- [10. Lãi suất hiệu lực của hợp đồng (dòng thời gian)](#10-lai-suat-hieu-luc-cua-hop-dong-dong-thoi-gian)
- [11. Hai chế độ lãi suất loại trừ nhau](#11-hai-che-do-lai-suat-loai-tru-nhau)
- [12. Phụ trội điều kiện `PenaltySurcharge`](#12-phu-troi-dieu-kien-penaltysurcharge)
- [13. Huy động (deposit)](#13-huy-dong-deposit)
- [14. Giảm lãi suất vay (`rateReduction.ts`)](#14-giam-lai-suat-vay-ratereductionts)
- [15. Mua bán vốn nội bộ — COF (`cof.ts`)](#15-mua-ban-von-noi-bo--cof-cofts)
- [16. Xuất bảng lãi suất gửi khách (`rateSheet.ts`)](#16-xuat-bang-lai-suat-gui-khach-ratesheetts)
- [17. Quyền ghi & bảo mật](#17-quyen-ghi--bao-mat)
- [Bảng tra hàm nhanh](#bang-tra-ham-nhanh)

---

## 1. Bức tranh tổng thể & bảng dữ liệu

Lãi suất chào khách **không được cứng hoá trong mã nguồn**. Mỗi kỳ là một văn bản
của Ban điều hành có ngày hiệu lực riêng, nên dữ liệu nằm trong CSDL. Logic thuần
ở `src/lib/rateQuote.ts`; giao diện là tab **Chào Lãi Suất**
(`src/components/views/RateQuoteView.tsx`), phần quản trị ở
`src/components/rate/RateProgramAdminPanel.tsx`.

Ba loại chương trình dùng **chung** bảng dòng lãi suất `RateProgramTiers`, vì cùng
bản chất "một điều kiện → một mức lãi". Cột nào không dùng cho loại đó để `NULL`.

| Loại (`Kind`) | Hằng | Cột `RateProgramTiers` dùng riêng |
| :--- | :--- | :--- |
| Cho vay ngắn hạn | `cho_vay_ngan_han` | `PackageCode`, `FixedMonths`, `MinFeeRatio`, `MinTenorMonths` |
| Cho vay trung dài hạn | `cho_vay_trung_dai_han` | như trên |
| Huy động | `huy_dong` | `Channel`, `BalanceTierLabel`, `PayoutMode`, `TenorMonths` |

Một chương trình (`RatePrograms`, migration 09) có **6 bảng con**. Đây là danh sách
chuẩn — clone chép đúng 6 bảng này, và cả 6 đều `ON DELETE CASCADE`:

| Bảng con | Nội dung | API đọc (`rateQuoteApi.ts`) |
| :--- | :--- | :--- |
| `RateProgramTiers` | Dòng lãi suất theo gói/điều kiện | `fetchRateProgramTiersAPI` |
| `RateProgramPrepaymentFees` | Phí trả nợ trước hạn theo năm | `fetchRateProgramPrepaymentFeesAPI` |
| `RateProgramFbeCodes` | Mã FBE / Rate ID (T24) | `fetchRateProgramFbeCodesAPI` |
| `DepositRateAuthorities` | Mức phân quyền lãi huy động | `fetchDepositRateAuthoritiesAPI` |
| `RateProgramFeeOptions` | Phương án phí dịch vụ (chọn 1/2) | `fetchRateProgramFeeOptionsAPI` |
| `RateProgramConditions` | Điều kiện áp dụng (văn bản) | `fetchRateProgramConditionsAPI` |

Kiểu TypeScript của mọi bảng khai trong `src/lib/rateQuote.ts` (interface
`RateProgram`, `RateProgramTier`, …). `fetchRateProgramsAPI` sắp xếp
`EffectiveFrom` giảm dần (mới nhất trước).

---

## 2. Chọn chương trình hiệu lực (`findActiveProgram`)

> ⚠️ **ĐÃ ĐỔI — CONVENTIONS.md cũ (mục "Chọn chương trình theo ngày, không theo
> mới nhất") đã LỖI THỜI ở phần diễn giải.**

Hàm `findActiveProgram(programs, kind, onDate)` trong `rateQuote.ts`:

1. **Lọc** các chương trình **cùng `Kind`** có `EffectiveFrom ≤ onDate` và
   (`EffectiveTo` trống **hoặc** `EffectiveTo ≥ onDate`). Hai đầu mút **tính vào**.
   `EffectiveTo = NULL` nghĩa là chưa có ngày kết thúc.
2. Nếu còn nhiều ứng viên phủ cùng ngày (do **chồng lấn**), **chọn bản có
   `EffectiveFrom MỚI NHẤT**` (`candidates.reduce((best, p) => p.EffectiveFrom >
   best.EffectiveFrom ? p : best)`).

**Vì sao "mới nhất thắng":** nghiệp vụ thường ra công văn mới **trước** khi kỳ cũ
hết để áp liền sau đó, nên khoảng hiệu lực gối nhau là bình thường. Khi hai bản
cùng phủ một ngày, bản có ngày bắt đầu muộn hơn là bản mới hơn → đè bản cũ. Đây
chính là lý do hệ thống **cho phép chồng lấn** (xem §3).

**Điểm vẫn đúng từ tài liệu cũ:** không được lấy "chương trình mới nhất tuyệt đối"
bất kể ngày. Khoản vay giải ngân trong quá khứ phải áp lãi suất của **kỳ phủ ngày
giải ngân đó**, không phải kỳ hiện hành. Cơ chế lọc theo `onDate` ở bước 1 đã bảo
đảm điều này; "mới nhất" ở bước 2 chỉ dùng để **phân định giữa các bản cùng phủ
một ngày**.

**Ví dụ.** Có hai chương trình huy động cùng loại:
- A: `2279`, hiệu lực 01/07 → 07/08
- B: `2400`, hiệu lực 06/08 → 15/08

Với `onDate = 06/08`, cả A và B đều phủ. `findActiveProgram` chọn **B** (EffectiveFrom
06/08 > 01/07). Với `onDate = 05/08`, chỉ A phủ → chọn A.

> **Lưu ý lịch sử:** migration 30 vẫn đóng bản 2279 ở 05/08 để tránh chồng lấn,
> nhưng đó là quyết định nghiệp vụ tại thời điểm đó, **không còn là ràng buộc kỹ
> thuật**. Resolver ngày nay tự phân định chồng lấn.

**Trường hợp duy nhất resolver KHÔNG phân định được:** hai bản cùng loại có
**đúng cùng một `EffectiveFrom`** → `reduce` hoà, không xác định. Đây là ràng buộc
duy nhất còn chặn (xem §3).

COF có hàm song song `findActiveCofProgram(programs, onDate)` trong `cof.ts` với
**đúng cùng logic** (lọc theo ngày rồi lấy `EffectiveFrom` mới nhất) — COF không
tách theo `Kind`.

---

## 3. Chồng lấn khoảng hiệu lực

> ⚠️ **ĐÃ ĐỔI — CONVENTIONS.md cũ ("Đóng chương trình đó lại trước khi mở kỳ mới"
> / "chặn mọi chồng lấn" / "không để hai chương trình cùng hiệu lực một ngày") đã
> LỖI THỜI. Nay CHỒNG LẤN ĐƯỢC PHÉP.**

**Nghiệp vụ:** công văn mới ra trước khi kỳ cũ hết để áp liền, nên hai khoảng hiệu
lực chồng lấn là bình thường. Vì resolver đã chọn bản `EffectiveFrom` mới nhất
(§2), chồng lấn được phân định **xác định** (bản mới đè bản cũ).

**Ràng buộc duy nhất còn lại:** chặn khi trùng **ĐÚNG cùng ngày bắt đầu** với một
chương trình cùng loại — vì khi đó resolver hoà, không biết áp bản nào.

Hai lớp kiểm tra, cùng một nguyên tắc:

| Lớp | Hàm / nơi | Chặn khi |
| :--- | :--- | :--- |
| Client (trước khi lưu/clone) | `checkProgramPeriod` → `findSameStartProgram` (`rateQuote.ts`) | Có chương trình cùng `Kind` **trùng đúng `EffectiveFrom`** |
| CSDL (bên trong RPC clone) | `clone_rate_program` (migration **56**) | `EXISTS ... WHERE "Kind" = src."Kind" AND "EffectiveFrom" = p_effective_from` |

`checkProgramPeriod` cũng chặn hai lỗi nhập cơ bản: thiếu `EffectiveFrom`, và
`EffectiveTo < EffectiveFrom`.

Có sẵn `findOverlappingPrograms` (trả về **mọi** bản chồng lấn khoảng ngày) nhưng
nó **không còn dùng để chặn** — chỉ hữu ích nếu cần cảnh báo/hiển thị mềm. Việc
chặn chỉ dựa trên `findSameStartProgram`.

**Lỗi từng xảy ra (đã sửa):** migration **49** (bản cũ của `clone_rate_program`)
chặn **mọi** chồng lấn cùng loại (`... p_effective_from <= "EffectiveTo" AND
"EffectiveFrom" <= p_effective_to`, kèm thông báo "Đóng chương trình đó lại
trước."). Điều đó **mâu thuẫn với resolver** và khiến **không nhân bản được kỳ mới**
khi kỳ cũ chưa đóng. Migration **56** thay bằng điều kiện trùng-đúng-ngày-bắt-đầu.
→ **Khi chạm SQL, migration 56 là bản đúng, không phải 49.**

---

## 4. Nhân bản chương trình (clone)

**Vì sao có:** ứng dụng không có đường thêm chương trình từ trình duyệt. Trước đây
mỗi kỳ mới phải viết một migration tay. Phần lớn kỳ mới dùng lại nguyên khung bảng
của kỳ trước, chỉ đổi số văn bản, khoảng ngày và vài con số → nhân bản rồi sửa từng
ô nhanh và ít sai hơn.

**Vì sao là RPC trong CSDL, không phải nhiều lệnh insert từ client:** bản sao trải
trên `RatePrograms` + 6 bảng con; đứt giữa chừng sẽ để lại chương trình thiếu dòng
lãi suất mà vẫn được coi là hiệu lực. RPC gói cả cụm trong **một giao dịch**.

Đặc điểm hàm `clone_rate_program` (migration 56, đang hiệu lực):

- `SECURITY INVOKER` (mặc định) → **RLS vẫn áp**, chỉ `admin` chạy được. **KHÔNG**
  dùng `SECURITY DEFINER`.
- `GRANT EXECUTE ... TO authenticated` (RLS mới là lớp chặn thật, không phải GRANT).
- Chép **6 bảng con** (Tiers, PrepaymentFees, FbeCodes, DepositRateAuthorities,
  FeeOptions, Conditions).
- **Bản sao LUÔN `SourceVerified = false`** — số liệu chép từ kỳ trước chưa đối
  chiếu văn bản kỳ mới; cờ này chặn đem chào khách (§6, §16).
- Ghi chú tự nối `[Nhân bản từ <số VB nguồn>. Số liệu CHƯA đối chiếu văn bản kỳ này.]`.
- Bắt buộc `p_document_number` khác rỗng và `p_effective_from` không NULL.

Gọi từ client qua `cloneRateProgramAPI(params)` (`rateQuoteApi.ts`) → `supabase.rpc('clone_rate_program', …)`.
Điều phối UI ở hook `useRateProgramAdmin.cloneProgram`
(`src/hooks/useRateProgramAdmin.ts`): kiểm `checkProgramPeriod` phía client trước,
rồi gọi API, rồi `reload()`. Thông báo thành công nhắc rõ bản mới **chưa chào khách
được** cho tới khi sửa số và được đánh dấu đã đối chiếu.

---

## 5. Xóa chương trình (delete)

> ⚠️ **ĐÃ ĐỔI — không cần RPC riêng. Xóa trực tiếp `RatePrograms` qua PostgREST.**

Hàm `deleteRateProgramAPI(id)` (`rateQuoteApi.ts`):

```
delete from RatePrograms where Id = :id and SourceVerified = false  → .select('Id')
```

Ba lớp bảo vệ:

1. **Điều kiện `SourceVerified = false`** trong chính câu lệnh → chỉ xóa được bản
   **chưa đối chiếu** (bản do clone tạo ra). Bản gốc nạp bằng migration được bảo vệ.
2. **RLS `FOR ALL (is_admin())`** trên `RatePrograms` → chỉ admin xóa.
3. **6 bảng con `ON DELETE CASCADE`** → tự dọn theo, không để lại dòng mồ côi.

Dùng `.select('Id')` để biết **có thật sự xóa được dòng nào không**: nếu RLS chặn
hoặc điều kiện `SourceVerified = false` loại hết, `data` rỗng → ném lỗi "Chỉ admin
xóa được, và chỉ với chương trình CHƯA đối chiếu văn bản gốc."

UI: hook `useRateProgramAdmin.deleteProgram` chặn sớm nếu `source.SourceVerified`
(khỏi gọi API vô ích). Nút **Xóa** ở `RateProgramAdminPanel.tsx` bị **disable** khi
`SourceVerified`, kèm hộp xác nhận trước khi gọi.

**Vì sao không cần RPC như clone:** xóa là **một** thao tác trên một bảng; CASCADE
lo phần con. Không có rủi ro "nửa chừng" như khi chép 6 bảng. Ghi chú này nằm ở
cuối migration 56.

---

## 6. Cảnh báo chặn khi chào (`collectQuoteWarnings`)

`collectQuoteWarnings(input)` (`rateQuote.ts`) trả mảng cảnh báo hai mức. Dùng
`hasBlockingWarning(warnings)` để biết có mức `block` không.

| Mức | Điều kiện | Nghĩa |
| :--- | :--- | :--- |
| `block` | Không có chương trình hiệu lực tại ngày chọn (`program == null`) | **Không được chào** |
| `block` | `program.SourceVerified === false` | Chưa đối chiếu văn bản gốc → chỉ tham khảo nội bộ |
| `block` | `isProgramExpired(program, onDate)` (`EffectiveTo < onDate`) | Chương trình đã hết hiệu lực |
| `block` | Có `tier` nhưng `tier.RateAnnual` không phải số | Gói chưa có lãi suất |
| `warn` | `program.AllowRateReduction === false` | Cấm thẩm quyền giảm LSCV suốt kỳ vay |
| `warn` | `program.AllowPrepayFeeWaive === false` | Cấm giảm phí trả nợ trước hạn |
| `warn` | `loanTenorMonths < tier.MinTenorMonths` | Thời gian vay dưới mức tối thiểu của gói |

`block` = **không được chào khách**. `warn` chỉ nhắc.

**Vì sao có `AllowRateReduction = false`:** Thông báo 2274 cấm áp dụng thẩm quyền
giảm LSCV trong suốt thời gian vay. Trước đây banker phải tự nhớ khi mở công cụ
giảm lãi.

---

## 7. NULL ≠ 0

Chỗ dễ mất tiền nhất. Bảng tính nội bộ ghi `0` cho ô chưa điền; khi nạp phải
chuyển thành `NULL`, nếu không hệ thống chào 0%/năm cho khách.

| Giá trị | Nghĩa |
| :--- | :--- |
| `RateAnnual = NULL` | **Chưa có số** → chặn chào gói đó |
| `RateAnnual = 0` | Lãi suất 0%/năm, số liệu đã biết |
| `FeeRatio = NULL` | Chưa có số |
| `FeeRatio = 0` | Miễn phí, số liệu đã biết |
| `casaAverage = NULL` | Chưa soát xét → **không** cộng phụ phí CASA |
| `casaAverage = 0` | Đã soát xét, CASA = 0 → **phải** cộng phụ phí |

Toàn bộ mã phân biệt bằng hàm `isNum(v)` (kiểm `null`/`undefined`/`NaN`), **không**
dùng `||` hay `!v` (vì `0` là falsy).

**Ví dụ đúng đã cài (đừng "sửa" ngược):**
- Gói cố định 3 tháng của trung dài hạn LSCV **đúng bằng 0%** (ưu đãi 0% ba tháng
  đầu). Migration 09 để `NULL` do suy đoán sai; migration 10 sửa thành `0`.
- Bản huy động 2400: kỳ hạn 07 tháng **không có** phương án lãi hàng quý → để
  `NULL`, đừng để 0.

**Lỗi từng xảy ra:** `Book.xlsx` sai cả 5 dòng lãi suất ngắn hạn so với văn bản
2274 (một dòng 110,50% thay vì 11,70%; một dòng 0% thay vì 8,45%). → Không đánh
`SourceVerified = true` khi chưa thực sự đối chiếu văn bản gốc.

---

## 8. Công thức phí dịch vụ (`calcServiceFee`)

`calcServiceFee(input)` trong `rateQuote.ts`:

```
Tỷ lệ phí = tỷ lệ theo gói × (1 − mức giảm KH mới) + phụ phí CASA
Phí phải thu = max(Tỷ lệ phí × số tiền giải ngân, mức sàn)
```

Thứ tự bắt buộc: **giảm KH mới áp trước, phụ phí CASA cộng sau.** Khớp ví dụ Thông
báo 2274: gói LC2 phí 0,75%, CASA bình quân không đạt 5% dư nợ → cộng 0,10% thành
**0,85%**.

Chi tiết logic:
- `discount` bị kẹp trong `[0, 1]`.
- Phụ phí CASA chỉ cộng khi `casaAddonApplied`: có `casaMinRatio`, có
  `casaAverage` (là số), và `casaAverage < amount × casaMinRatio`.
- `feeFromRatio = round(amount × effectiveRatio)`; nếu có `minFeeAmountVnd`,
  `feeAmount = max(feeFromRatio, minFee)`, và `minFeeApplied` báo sàn đã ăn.
- Nếu `feeRatio` là `NULL` → mọi kết quả tỷ lệ/phí trả `null` (chưa có số), nhưng
  vẫn tính `casaRequiredAmount`/`casaAddonApplied` để hiển thị.

---

## 9. Phí trả nợ trước hạn

`findPrepaymentFee(fees, year)` (`rateQuote.ts`) tìm dòng có
`year >= YearFrom && (YearTo == null || year <= YearTo)`. `YearTo = NULL` nghĩa là
"từ năm thứ N trở đi". `year < 1` trả `null`.

Nhãn hiển thị (`rateSheet.ts`): `prepaymentYearLabel` ("Năm 2", "Năm 2 – 3", "Từ
năm thứ 4") và `prepaymentFeeLabel` — **`FeeRatio === 0` in "Miễn phí"**, `NULL`
in "—" (§7).

---

## 10. Lãi suất hiệu lực của hợp đồng (dòng thời gian)

Đây là phần **khác** với "chương trình lãi suất": nó tính lãi suất **thực tế của
một KUNN theo thời gian**. Logic ở `src/lib/rateResolution.ts`.

`buildContractRateTimeline(contract)` → `buildRateTimeline(input)` dựng một chuỗi
`RateTimelinePoint` (mỗi điểm: `fromDate`, `ratePercent`, `kind`, `label`,
`forecast`). Rồi:

| Hàm | Việc |
| :--- | :--- |
| `resolveRateAt(timeline, date)` | Điểm áp dụng tại một ngày (điểm cuối có `fromDate ≤ date`) |
| `getEffectiveActiveRate(contract, date?)` | **Lãi suất hiệu lực** tại ngày (trả **tỷ lệ**, vd 0.085), dùng `todayIso()` nếu bỏ trống |
| `splitPeriodByRate(timeline, start, end, days)` | Cắt một kỳ thành các đoạn theo mốc đổi lãi, chia ngày |
| `weightedRatePercent(segments)` | Lãi bình quân gia quyền theo số ngày |
| `resolveRateModeOf(contract)` | Suy chế độ `'pref'` / `'base'` khi mở form |
| `buildRateFields(mode, input)` | **Nơi duy nhất** dựng nhóm cột lãi khi lưu |

Cấu trúc dòng thời gian (`buildRateTimeline`):
- Nếu có ưu đãi (`preferentialRate > 0` **và** `preferentialPeriodMonths > 0`):
  điểm 1 = ưu đãi + phụ trội; điểm 2 (sau `addMonthsClamped`) = thả nổi + phụ trội.
- Nếu không: một điểm mở đầu — thả nổi nếu cấu hình được, ngược lại mức hợp đồng.
- `rateHistory` (điều chỉnh lãi) thêm các điểm `kind='adjustment'`.
- Sắp theo ngày rồi theo hạng `rankOf` (adjustment > floating > preferential >
  contract); **cùng ngày thì điểm sau đè điểm trước** (dedup giữ điểm hạng cao/mới).

Thả nổi (`floatingRate`) ưu tiên: `baseRate + marginRate` (qua sàn) → `postPreferentialRate`
→ `normalRate` → `interestRate`. Chỉ `baseRate` mới đi qua `applyRateFloor`.

**Đơn vị:** `toPercent` nhận cả `0.085` lẫn `8.5` (≤ 1 thì ×100). `toPercentSigned`
giữ dấu cho biên độ âm. `getEffectiveActiveRate` **trả tỷ lệ** (chia 100 ở cuối).

**Lỗi từng xảy ra:** dùng `new Date().toISOString().split('T')[0]` lấy ngày hôm nay
là **ngày UTC** → ở UTC+7 mọi lần chạy trước 07:00 sáng trả về **hôm qua**, khiến
`getEffectiveActiveRate` chọn sai mốc điều chỉnh buổi sáng. **Luôn dùng `todayIso()`.**

---

## 11. Hai chế độ lãi suất loại trừ nhau

Quyết định nghiệp vụ 05/08/2026: một KUNN chỉ theo **một** chế độ.

| Chế độ | Cột được lưu | Cột phải để trống |
| :--- | :--- | :--- |
| **Ưu đãi** (`pref`) | `PreferentialRate`, `PreferentialPeriodMonths`, `PostPreferentialRate` (= ưu đãi + biên), `MarginRate` | `BaseRate`, `NormalRate` |
| **Thông thường** (`base`) | `BaseRate`, `MarginRate`, `NormalRate` (= cơ sở + biên) | `PreferentialRate`, `PreferentialPeriodMonths`, `PostPreferentialRate` |

`buildRateFields(mode, input)` (`rateResolution.ts`) là **nơi duy nhất** dựng nhóm
cột khi lưu — nó **xoá hẳn nhánh không dùng** (gán `null`), nên dữ liệu tự nói lên
chế độ, không tạo lại được mâu thuẫn. Có nhánh phụ `prefPhang` (ưu đãi phẳng: có
`pref` nhưng `months ≤ 0`) → lưu `PreferentialRate` mà không lưu kỳ/biên.

`resolveRateModeOf` suy chế độ ngược khi mở form.

**Lỗi từng xảy ra:** form cũ lưu cả hai nhóm cột bất kể banker chọn gì, còn
`buildRateTimeline` thấy `PreferentialRate > 0` kèm kỳ `> 0` là áp ưu đãi → khoản
khai lãi thông thường vẫn bị tính lãi ưu đãi. Hồ sơ ĐOÀN NGỌC LÝ
`2002/HĐTD_1/9718695/GNN-03` khai ưu đãi 10,20%/24 tháng **và** cơ sở 9,70% + biên
1,35%: khung hiện 11,25% còn mọi kỳ tính ở 10,20%. Ngoài ra `interestRateMode`
từng là state không nạp lại từ hợp đồng → **mở KUNN rồi bấm Lưu là đổi lãi đã lưu
dù không sửa gì**.

---

## 12. Phụ trội điều kiện `PenaltySurcharge`

Chốt 05/08/2026. `PenaltySurcharge` cộng vào **mọi đoạn định giá** của dòng thời
gian: đoạn ưu đãi, đoạn thả nổi sau ưu đãi, và mức hợp đồng khi không ưu đãi. Trong
`rateResolution.ts` nó vào qua `conditionSurchargePercent` (hàm `surchargePoints`).

Ba cái bẫy:

1. **Đơn vị khác các cột lãi khác.** `PenaltySurcharge` lưu theo **điểm phần trăm**
   (`0.2` = 0,20%), trong khi `MarginRate`/`BaseRate`/`PreferentialRate` lưu theo
   **tỷ lệ** (`0.0135` = 1,35%). **KHÔNG** đưa nó qua `toPercent()` — hàm đó biến
   `0.2` thành 20%. Mã dùng thẳng giá trị (`surchargePoints` chỉ lọc ≤ 0).
2. **Mốc điều chỉnh đã gồm phụ trội sẵn.** `ratePercent` của một
   `RateAdjustmentHistoryItem` do form dựng bằng `base + biên + phụ trội` → cộng
   thêm phụ trội cấp hợp đồng là **cộng đôi**. Chỉ nhánh dự phòng (mốc bỏ trống
   `ratePercent`) mới cộng `penaltyPercent` của chính mốc đó.
3. **Sàn áp cho phần định giá, phụ trội cộng lên sau.** `applyRateFloor(base + biên)`
   rồi mới `+ phụ trội`: cơ sở 5% + biên 1%, sàn 8%, phụ trội 0,2% → **8,2%**,
   không phải 8%.

Form không tự cộng lãi nữa: `currentActiveRateDisplay` dựng hợp đồng nháp từ các ô
đang nhập rồi gọi `getEffectiveActiveRate`, nên số xem trước **khớp đúng** số sẽ
lưu và sẽ tính.

---

## 13. Huy động (deposit)

Kiểu dữ liệu riêng của huy động (`rateQuote.ts`):
- `DepositChannel`: `'quay' | 'online' | 'ftp'` (nhãn `CHANNEL_LABELS`).
- `DepositPayoutMode`: `'cuoi_ky' | 'hang_thang' | 'hang_quy' | 'tra_truoc'` (nhãn
  `PAYOUT_MODE_LABELS`, thứ tự chuẩn `PAYOUT_ORDER` ở `rateSheet.ts`).
- Một dòng lãi = `RateProgramTier` với `Channel` + `BalanceTierLabel` (bậc số dư) +
  `PayoutMode` + `TenorMonths` + `RateAnnual`.

Hàm dựng bảng:

| Hàm | Tệp | Việc |
| :--- | :--- | :--- |
| `buildDepositRateRows(tiers)` | `rateQuote.ts` | Gộp theo (bậc số dư, kỳ hạn, cách trả), gom lãi **theo kênh** vào `byChannel` |
| `depositChannelsPresent(tiers)` | `rateQuote.ts` | Kênh khách hàng có mặt (`quay`, `online`) |
| `buildDepositMatrix(tiers, channel)` | `rateSheet.ts` | Ma trận bậc số dư × (kỳ hạn × cách trả) cho một kênh |
| `calcDepositInterest(principal, rateAnnual, days)` | `rateQuote.ts` | `round(P × lãi × days/365)`; `rateAnnual` NULL → `null` |

**Tuần lễ vàng — bản 2400 thay bản 2279 (lịch sử cấu trúc, đừng chép nhầm khuôn):**
- **Năm bậc số dư** thay vì ba: thêm `< 200 triệu`, tách `≥ 1 tỷ` thành `1–8 tỷ` và
  `≥ 8 tỷ`.
- **Thêm kỳ hạn 07 tháng**, kỳ này **không có lãi hàng quý** → để `NULL` (§7).
- **Thêm kênh `ftp`** (giá bán vốn nội bộ FTP mua VOF của riêng chương trình), đủ
  bốn cách trả ở cả ba kỳ hạn.
- Bậc `≥ 8 tỷ` kỳ 06 tháng có **lãi trả trước 8,97% cao hơn lãi cuối kỳ 8,95%** —
  đúng văn bản (khớp bậc thang +0,09 cột trả trước: 8,61→8,70→8,79→8,88→8,97).
  **Đừng "sửa" thành 8,95.**

Mức phân quyền cao hơn (Trưởng bộ phận huy động, 9,00–9,40%) nằm ở
`DepositRateAuthorities`, chỉ áp cho **lãi cuối kỳ** và chung cho cả ba kỳ hạn.

**Kênh `ftp` là số liệu nội bộ:** `KENH_GUI_KHACH = ['quay','online']` — tờ chào
khách **không bao giờ** in FTP (§16). Có test khẳng định chuỗi FTP không xuất hiện
trong tờ in.

---

## 14. Giảm lãi suất vay (`rateReduction.ts`)

Công cụ số 4 trong `CalculatorView`. Công thức lãi chung:

```
Tiền giảm lãi = Dư nợ × (LSCV theo quy định − LS đề xuất) × Số ngày / 365
```

Hai nghiệp vụ, chung công thức:

| Chế độ | Dùng cho | Hàm chính |
| :--- | :--- | :--- |
| Ngắn hạn / hạn mức | Nhiều khoản trên một tờ trình; số dư & số ngày nhập tay | `calcRateReductionForLoan`, `sumInterestReduced` |
| Trung dài hạn | Vay từng lần, gốc đều, lãi trên dư nợ giảm dần | `buildRateReductionSchedule`, `summarizeRateReduction` |

**Lãi suất giảm chốt** (`resolveReducedRateAnnual`):

```
LS giảm chốt = min(LS quy định, max(sàn LSCV, max(LS quy định − trần giảm, LS đề xuất)))
```

- **Kỳ đang trong thời gian ưu đãi KHÔNG được giảm thêm** (`m > prefMonths` mới xét
  cửa sổ). Khách đã hưởng ưu đãi thì không cộng dồn tiếp.
- Cửa sổ áp dụng: kỳ từ `s` đến `s + k − 1` (`reductionStartMonth`,
  `reductionMonths`). `k = 0` → không kỳ nào giảm; đây là **trạng thái hợp lệ**,
  không phải lỗi nhập.
- `deltaRateAnnual = max(0, standard − reduced)`; `isReduced` khi delta > 1e-9.

**Số ngày trong kỳ:** ngày thanh toán sinh theo `edate` (`calcMath.ts`) — **kẹp về
ngày cuối tháng đích**. Kỳ 1 rơi 31/01 thì kỳ 2 là 28/02, không phải 03/03.
`buildRateReductionSchedule` tính `daysInPeriod = max(1, diffDays(previousDate,
paymentDate))`, `dayFactor = days/365`.

**Gốc đều:** làm tròn theo `roundPrincipalCore` (mặc định `PRINCIPAL_ROUND_MODE`),
**kỳ cuối gánh phần dư** để tổng gốc = số tiền vay. Có `roundMode = 'exact'` cho
tính không làm tròn.

**Lỗi Excel gốc từng có (đừng "sửa" mã cho khớp file cũ):**

| Ô | Excel | Đúng | Nguyên nhân |
| :--- | ---: | ---: | :--- |
| Tiền giảm lãi (sheet NH) | 501.369.863 | **5.013.699** | Nhân chênh lệch `2.00` như 200%/năm thay vì 2%/năm — sai gấp 100 lần |
| Margin hiện tại (sheet NH) | 3,80% | **4,95%** | 10,25% − 5,30% = 4,95% |

Tổng tiền giảm lãi ví dụ trong file là **12.367.124 đồng**, không phải
1.236.712.329. Ngoài ra `GIẢM LS VAY.xlsx` chốt bằng `MAX(sàn, LS hiện tại − trần)`,
**bỏ hẳn ô "LS đề xuất"** → ô đề xuất chỉ trang trí. Ở đây LS đề xuất **được tôn
trọng**, chỉ bị kẹp bởi sàn và trần.

**Margin so với COF (tùy chọn):** nếu truyền `cofAnnual`, kết quả trả
`marginCurrentAnnual = standard − cof` và `marginProposedAnnual = min(standard,
proposed) − cof`; `cof = NULL` → cả hai `null`.

---

## 15. Mua bán vốn nội bộ — COF (`cof.ts`)

Giá mua vốn từ Hội Sở — FTP bán (COF). Tab riêng vì đây là **số liệu điều hành nội
bộ**, **không bao giờ** đưa vào tài liệu gửi khách. Dữ liệu ở `CofPrograms` /
`CofStandardRates` / `CofRateItems` (migration 13).

Đã nạp **phần cho vay VND** của Phụ lục B. Chưa nạp phần USD và toàn bộ Phụ lục A
(FTP mua VOF).

Sáu tiết mục (`CofSection` / `COF_SECTION_LABELS`): `vnd_thong_thuong`,
`cam_co_stk_vnd`, `san_pham_dac_thu`, `tat_toan_truoc_han`, `no_qua_han`,
`thanh_khoan`.

| Hàm | Việc |
| :--- | :--- |
| `findActiveCofProgram(programs, onDate)` | Chương trình COF hiệu lực — lọc theo ngày rồi lấy `EffectiveFrom` mới nhất (như §2, không tách `Kind`) |
| `lookupCofRate(rates, tenorLabel, column)` | Tra ô ma trận; trả `null` nếu ô không phải số (NULL) |
| `groupRateItems(items)` | Gom `CofRateItems` theo `GroupLabel` |
| `calcMarginOverCof(lendingRate, cof)` | `lendingRate − cof`; NULL bất kỳ → `null` |

**Bảng kỳ hạn để dạng RỘNG, không dạng dài:** `CofStandardRates` mỗi kỳ hạn **một
dòng**, mỗi kỳ điều chỉnh **một cột** (`FixedRate`, `Reset3M`…`Reset36M` —
`COF_RATE_COLUMNS`). Đúng hình dạng văn bản, admin bấm thẳng ô để sửa.

**Ô trống là NULL, không phải 0%** — văn bản chỉ công bố mức cho một số tổ hợp; ô
còn lại "không áp dụng". Ghi 0 là bịa giá vốn bằng không.

**`CofRateItems` tách `RateAnnual` và `Formula`:** có mục là con số (nhà ở xã hội
3,5%/năm), có mục là công thức bằng lời (CBNV = LSCV − 0,75%/năm). Nhét công thức
vào cột số sẽ mất nghĩa.

**Kỳ điều chỉnh 6M/9M/12M/24M chỉ cho khoản vay CŨ** (giải ngân trước ngày thông
báo hiệu lực). Khoản mới chỉ được chọn LSCĐ hoặc ĐCLS 3M. Giao diện đánh dấu `(*)`
(xem `hint` trong `COF_RATE_COLUMNS`).

---

## 16. Xuất bảng lãi suất gửi khách (`rateSheet.ts`)

Dựng tài liệu HTML **tự chứa, khổ A4 một trang**, mở cửa sổ mới rồi `print()` để
banker lưu PDF. **Không dùng thư viện ngoài.**

**Chặn khi thiếu số liệu** (`findRateSheetBlockers`) — không xuất nếu:
1. `SourceVerified = false` (chưa đối chiếu → **không gửi khách**),
2. Chương trình chưa có dòng nào (theo kênh nếu huy động),
3. Còn gói chưa có `RateAnnual`,
4. Còn bậc phí trả nợ trước hạn chưa có `FeeRatio`.

Gửi bảng có ô trống hoặc số chưa kiểm chứng là rủi ro danh tiếng và có thể thành
cam kết sai.

Điểm cấu trúc:
- **Tên file** do `rateSheetFileBase(program)` quyết, đi thẳng vào `<title>` → tên
  PDF gợi ý. Quy tắc: `LS NGAN HAN` / `LS TDH` / `LS HUY DONG`; tờ cho vay gắn thêm
  nhóm KH (`customerSegmentOf`: `KHDN` nếu tên/đối tượng nhắc "KHDN"/"DOANH
  NGHIỆP", ngược lại `KHCN`). Tờ huy động **không** gắn nhóm (dùng chung).
- **Hai hướng giấy:** cho vay **dọc**, huy động **ngang** (ma trận kỳ hạn × cách
  trả nhiều cột). `buildRateSheetParts` đặt `landscape = (Kind === 'huy_dong')`.
- **Chỉ in kênh khách hàng:** `KENH_GUI_KHACH = ['quay','online']` — **không in FTP**.
- **`0%` phải in "0%", không in "—".** `formatRateForCustomer` phân biệt `0` với
  `null` (không dùng `||`). `formatMoneyForCustomer` quy đổi tỷ / nghìn tỷ.
- **Escape mọi chuỗi từ CSDL** qua hàm `esc` trước khi ghép HTML (ghép thủ công,
  không có lớp bảo vệ React). Có test khẳng định `<script>` trong tên chương trình
  bị vô hiệu.
- **Tờ chào chỉ chứa thông tin đã công bố:** lãi suất, điều kiện, phí. **Không**
  đưa COF, biên lợi nhuận, hạn mức nội bộ, hay dữ liệu khách khác.
- **`print-color-adjust: exact`** bắt buộc cho `html, body, header, th, .meta` và
  hàng chẵn — Chrome mặc định **không in nền** khi Save as PDF, thiếu dòng này thì
  dải tiêu đề xanh và ô tiêu đề in ra trắng, chữ trắng mất hút.
- **Bề rộng cột để trình duyệt tự chia**, đừng `table-layout: fixed`: số cột đổi
  theo từng Thông báo. Ô lãi có `white-space: nowrap` nên đã đều; phần dư dồn về
  cột điều kiện. Giới hạn thật là **số kỳ hạn** — thang 1–36 tháng (44 cột) thì
  tách bảng hoặc đảo trục, đừng chỉnh bề rộng.

(Việc xuất **PNG** dùng `src/lib/htmlToPng.ts` — gói thân tờ vào `<foreignObject>`
của SVG, cần nội dung hợp lệ XML, ảnh nhúng dạng data URI, và giữ lớp
`.rate-sheet-root` vì trong `<foreignObject>` không có `body`.)

---

## 17. Quyền ghi & bảo mật

- **Đọc:** mọi người dùng đã đăng nhập. **Ghi: chỉ `admin`** (RLS `FOR ALL
  (is_admin())` trên `RatePrograms` và bảng con). Sai một con số ở đây là chào sai
  lãi suất cho toàn hệ thống — khác dữ liệu khách chỉ ảnh hưởng một hồ sơ.
- Các API ghi (`updateRateProgramAPI`, `updateRateProgramTierAPI`) dùng `.select()`
  sau update: `data` rỗng nghĩa RLS chặn → ném "Chỉ admin có quyền sửa".
- `clone_rate_program` là `SECURITY INVOKER` → RLS vẫn áp; **không** đổi sang
  `SECURITY DEFINER`.
- Chốt ở client không thay được RLS/trigger: đó chỉ là lớp trải nghiệm, đường ghi
  bằng SQL phải bị chặn ở CSDL.

---

## Bảng tra hàm nhanh

| Hàm | Tệp | Vai trò |
| :--- | :--- | :--- |
| `findActiveProgram` | `rateQuote.ts` | Chọn chương trình theo ngày; **cùng ngày phủ → EffectiveFrom mới nhất** |
| `checkProgramPeriod` | `rateQuote.ts` | Kiểm khi lưu/clone; chỉ chặn trùng đúng ngày bắt đầu |
| `findSameStartProgram` | `rateQuote.ts` | Tìm bản cùng loại trùng đúng `EffectiveFrom` |
| `findOverlappingPrograms` | `rateQuote.ts` | Liệt kê chồng lấn (không dùng để chặn) |
| `isProgramExpired` | `rateQuote.ts` | `EffectiveTo < onDate` |
| `collectQuoteWarnings` / `hasBlockingWarning` | `rateQuote.ts` | Cảnh báo block/warn khi chào |
| `calcServiceFee` | `rateQuote.ts` | Phí dịch vụ (giảm KH mới trước, CASA sau, sàn) |
| `findPrepaymentFee` | `rateQuote.ts` | Phí trả trước theo năm |
| `calcDepositInterest` | `rateQuote.ts` | Lãi huy động `P×r×d/365` |
| `buildDepositRateRows` / `buildDepositMatrix` | `rateQuote.ts` / `rateSheet.ts` | Dựng bảng huy động |
| `buildRateTimeline` / `getEffectiveActiveRate` | `rateResolution.ts` | Dòng thời gian & lãi hiệu lực của KUNN |
| `buildRateFields` / `resolveRateModeOf` | `rateResolution.ts` | Lưu/suy chế độ lãi (loại trừ) |
| `splitPeriodByRate` / `weightedRatePercent` | `rateResolution.ts` | Cắt kỳ theo mốc đổi lãi, bình quân gia quyền |
| `calcRateReductionForLoan` / `sumInterestReduced` | `rateReduction.ts` | Giảm lãi ngắn hạn/hạn mức |
| `buildRateReductionSchedule` / `resolveReducedRateAnnual` / `summarizeRateReduction` | `rateReduction.ts` | Giảm lãi trung dài hạn |
| `findActiveCofProgram` / `lookupCofRate` / `calcMarginOverCof` | `cof.ts` | COF |
| `buildRateSheetHtml` / `findRateSheetBlockers` / `rateSheetFileBase` | `rateSheet.ts` | Xuất tờ chào khách |
| `cloneRateProgramAPI` / `deleteRateProgramAPI` / `updateRateProgramAPI` | `api/rateQuoteApi.ts` | RPC/PostgREST |
| `useRateProgramAdmin` | `hooks/useRateProgramAdmin.ts` | Điều phối lưu kỳ / clone / xóa |

**Migration liên quan:** 09 (bảng `RatePrograms` + RLS), 10/13/30 (nạp số liệu),
**49** (clone bản đầu — chặn mọi chồng lấn, **đã bị thay**), **56** (clone bản hiện
hành — cho chồng lấn, chỉ chặn trùng đúng ngày bắt đầu; ghi chú xóa dùng CASCADE).
