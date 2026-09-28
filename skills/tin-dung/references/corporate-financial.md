# Báo cáo tài chính doanh nghiệp (TT 133/2016/TT-BTC)

Phân hệ thẩm định **báo cáo tài chính doanh nghiệp** phục vụ chấm điểm tín dụng khách hàng là tổ chức. Khác hẳn phần Phương án kinh doanh & Hạn mức (`business-plan.md`) vốn dành cho **cá nhân / hộ kinh doanh** — phần này nhập nguyên ba biểu mẫu kế toán theo Thông tư 133/2016/TT-BTC (chế độ kế toán doanh nghiệp nhỏ và vừa — DNNVV), tính chỉ tiêu tổng hợp, kiểm tra cân đối và bộ tỉ số tài chính.

> Tài liệu này audit thuần từ code (`CONVENTIONS.md` chưa có mảng này). Code là nguồn sự thật. Mọi công thức dưới đây chép đúng từ `src/lib/corporateFinancialFormulas.ts`.

## Mục lục

- [Kiến trúc & luồng dữ liệu](#kiến-trúc--luồng-dữ-liệu)
- [Cấu trúc một dòng chỉ tiêu](#cấu-trúc-một-dòng-chỉ-tiêu)
- [Ba biểu mẫu](#ba-biểu-mẫu)
- [Công thức tổng hợp — B01a](#công-thức-tổng-hợp--b01a-báo-cáo-tình-hình-tài-chính)
- [Công thức tổng hợp — B02](#công-thức-tổng-hợp--b02-kết-quả-kinh-doanh)
- [Công thức tổng hợp — B01b](#công-thức-tổng-hợp--b01b-theo-thanh-khoản-giảm-dần)
- [Kiểm tra cân đối](#kiểm-tra-cân-đối-checkb01abalance)
- [Bộ tỉ số tài chính](#bộ-tỉ-số-tài-chính-computefinancialratios)
- [Nhập từ Excel](#nhập-từ-excel-parsecorporatefinancialexcel)
- [Xuất Excel & In / PDF](#xuất-excel--in--pdf)
- [Những chỗ dễ sai](#những-chỗ-dễ-sai-lỗi-đã-hoặc-có-thể-xảy-ra)

---

## Kiến trúc & luồng dữ liệu

| Tệp | Trách nhiệm |
| :--- | :--- |
| `src/types/corporateFinancial.ts` | Định nghĩa kiểu: `FinancialLineItem`, `B01aStatement`, `B02Statement`, `B01bStatement`, `CorporateFinancialProfile`, `FinancialRatios` |
| `src/lib/corporateFinancialDefaults.ts` | Mẫu chỉ tiêu chuẩn (`DEFAULT_B01A_TEMPLATE`, `DEFAULT_B02_TEMPLATE`, `DEFAULT_B01B_TEMPLATE`), hàm tạo biểu rỗng và hồ sơ mẫu |
| `src/lib/corporateFinancialFormulas.ts` | **Toàn bộ công thức**: `computeB01a`, `computeB02`, `computeB01b`, `checkB01aBalance`, `computeFinancialRatios` |
| `src/lib/corporateFinancialImport.ts` | Đọc file Excel nhiều sheet → `CorporateFinancialProfile` (`parseCorporateFinancialExcel`) |
| `src/lib/corporateFinancialExport.ts` | Xuất `.xlsx` ba sheet (`exportCorporateFinancialToExcel`) và in / PDF theo mẫu Bộ Tài chính (`printStatementHtml`) |
| `src/components/views/CorporateFinancialView.tsx` | Màn hình cha: giữ `profile` trong state, chạy compute, truyền xuống các tab |
| `src/components/corporateFinancial/*.tsx` | Ba tab nhập liệu + thẻ tỉ số |

**Luồng tính là một chiều và không lưu ngầm.** Màn hình cha (`CorporateFinancialView.tsx`) giữ `profile` (dữ liệu người dùng nhập, chỉ có các dòng nhập tay mang giá trị thật). Mỗi lần render nó chạy lại qua `useMemo`:

```
computedB01a = computeB01a(profile.b01a)
computedB02  = computeB02(profile.b02)
computedB01b = computeB01b(profile.b01b)
financialRatios = computeFinancialRatios(computedB01a, computedB02)
```

Vì sao tính lại mỗi lần thay vì lưu số đã tính: các dòng công thức (tổng, cộng nhóm) **không bao giờ là ô nhập**. Người dùng chỉ gõ dòng chi tiết; dòng tổng luôn được `computeB01a/B02/B01b` điền lại từ dòng chi tiết. Lưu số tổng vào state sẽ tạo nguồn thứ hai trôi khỏi dòng chi tiết — đúng loại lỗi §10b của `CONVENTIONS.md` cảnh báo với bảng tính hạn mức.

Các hàm compute đều `JSON.parse(JSON.stringify(...))` để clone rồi mới ghi — **không đột biến (mutate) đối tượng đầu vào**. Giữ nguyên tắc này khi sửa: người gọi truyền `profile.b01a` vào và không mong nó bị thay đổi.

---

## Cấu trúc một dòng chỉ tiêu

`FinancialLineItem` (`src/types/corporateFinancial.ts`):

| Trường | Ý nghĩa |
| :--- | :--- |
| `id` | Khoá duy nhất (vd `b01a_100`) |
| `code` | **Mã số** chỉ tiêu (`'100'`, `'110'`, `'01'`) — khoá của mọi công thức và của việc so khớp khi nhập Excel |
| `note` | Thuyết minh (vd `V.01`) |
| `name` | Tên chỉ tiêu hiển thị |
| `isHeader` | Dòng tiêu đề nhóm (A, B, I, II) — in đậm |
| `isFormula` | **Dòng tự tính, không cho nhập tay.** Tab render dòng này thành ô chỉ đọc; compute điền giá trị |
| `indent` | Cấp thụt lề (0/1/2) |
| `isNegative` | Chỉ tiêu ghi giảm (hao mòn, dự phòng, cổ phiếu quỹ) — xem cảnh báo dấu bên dưới |
| `currentPeriod` | Số cuối năm / kỳ này |
| `previousPeriod` | Số đầu năm / kỳ trước |

Cả hai kỳ (`currentPeriod`, `previousPeriod`) đều được compute xử lý giống nhau qua vòng lặp `periods.forEach`.

### Cảnh báo dấu của `isNegative` — bẫy quan trọng nhất

`isNegative` **chỉ là cờ ngữ nghĩa / hiển thị**. Nó **không** khiến compute tự đổi dấu. Mọi công thức tổng đều là phép **cộng thuần** — ví dụ `130 = 131 + 132 + 133 + 134`, trong đó `134` là "Dự phòng phải thu khó đòi (*)" mang `isNegative: true`. Phép cộng chỉ ra đúng kết quả **khi giá trị âm đã được lưu sẵn dấu trừ**.

- Dữ liệu mẫu tuân thủ: `createSampleCorporateProfile` lưu `set01a('134', -50_000_000, ...)`, `set01a('222', -1_200_000_000, ...)`.
- Khi nhập Excel: `parseNumberCell` chuyển ngoặc kế toán `(1.234)` và dấu `-` thành số âm, nên dữ liệu vào cũng mang dấu.
- **Lỗi có thể xảy ra**: nếu ai đó nhập dự phòng / hao mòn thành số **dương** (tưởng cờ `isNegative` sẽ tự trừ), tổng tài sản sẽ bị thổi lên đúng gấp đôi khoản đó. Khi sửa compute, đừng thêm logic đảo dấu theo `isNegative` mà không đồng thời sửa cả dữ liệu mẫu và trình nhập — sẽ trừ hai lần.

---

## Ba biểu mẫu

| Mẫu | Tên | Mã mẫu | Đặc điểm |
| :--- | :--- | :--- | :--- |
| **B01a** | Báo cáo tình hình tài chính | `B 01a - DNNVV` | Bảng cân đối phân theo **Ngắn hạn / Dài hạn**. Có kiểm tra cân đối. |
| **B02** | Báo cáo kết quả hoạt động kinh doanh | `B 02 - DNNVV` | Doanh thu → chi phí → lợi nhuận. |
| **B01b** | Báo cáo tình hình tài chính (theo tính thanh khoản giảm dần) | `B 01b - DNNVV` | Cùng nội dung B01a nhưng xếp theo **thanh khoản giảm dần**, mã số khác. |

B01a và B01b là hai cách trình bày của cùng bảng cân đối (DN chọn một trong hai theo TT 133). Hồ sơ mẫu điền cả ba để người dùng quan sát.

---

## Công thức tổng hợp — B01a (Báo cáo tình hình tài chính)

Nguồn: `computeB01a` trong `src/lib/corporateFinancialFormulas.ts`. Áp cho **cả hai kỳ**.

| Mã | Chỉ tiêu | Công thức |
| :--- | :--- | :--- |
| `130` | Các khoản phải thu ngắn hạn | `131 + 132 + 133 + 134` (134 âm) |
| `140` | Hàng tồn kho | `141 + 142` (142 âm) |
| `100` | **A. Tài sản ngắn hạn** | `110 + 120 + 130 + 140 + 150` |
| `220` | Tài sản cố định | `221 + 222` (222 âm — hao mòn) |
| `200` | **B. Tài sản dài hạn** | `210 + 220 + 230 + 240 + 250 + 260` |
| `270` | **TỔNG CỘNG TÀI SẢN** | `100 + 200` |
| `310` | I. Nợ ngắn hạn | `311 + 312 + 313 + 314 + 315 + 316` |
| `330` | II. Nợ dài hạn | `331 + 332` |
| `300` | **C. Nợ phải trả** | `310 + 330` |
| `400` | **D. Vốn chủ sở hữu** | `411 + 412 + 413 + 414 + 415 + 416 + 417` (414 âm — cổ phiếu quỹ) |
| `440` | **TỔNG CỘNG NGUỒN VỐN** | `300 + 400` |

Bất biến kế toán: `270` (Tổng tài sản) phải bằng `440` (Tổng nguồn vốn) — xem [kiểm tra cân đối](#kiểm-tra-cân-đối-checkb01abalance).

Các dòng chi tiết (`110`, `120`, `131`…`134`, `141`, `142`, `150`, `210`, `221`, `222`, `230`…`260`, `311`…`316`, `331`, `332`, `411`…`417`) là **ô nhập tay** (`isFormula` không đặt).

---

## Công thức tổng hợp — B02 (Kết quả kinh doanh)

Nguồn: `computeB02`. Áp cho cả hai kỳ.

| Mã | Chỉ tiêu | Công thức |
| :--- | :--- | :--- |
| `10` | Doanh thu thuần | `01 − |02|` — dùng `Math.abs(02)` vì "các khoản giảm trừ" có thể nhập âm hoặc dương |
| `20` | Lợi nhuận gộp | `10 − 11` (11 = giá vốn) |
| `30` | Lợi nhuận thuần từ HĐKD | `20 + 21 − 22 − 24` |
| `40` | Lợi nhuận khác | `31 − 32` |
| `50` | Tổng lợi nhuận kế toán trước thuế | `30 + 40` |
| `60` | Lợi nhuận sau thuế TNDN | `50 − 51` |

Trong đó: `21` = doanh thu tài chính, `22` = chi phí tài chính, `24` = chi phí bán hàng và QLDN, `51` = chi phí thuế TNDN. Dòng `23` ("Trong đó: Chi phí lãi vay") là **dòng thông tin, không tham gia công thức** — chỉ để trình bày.

**Điểm cần nhớ về mã `02`**: `computeB02` lấy `Math.abs` của "các khoản giảm trừ doanh thu" trước khi trừ. Vì `02` mang `isNegative`, người nhập có thể để âm; `abs` bảo đảm doanh thu thuần luôn = doanh thu gộp trừ đi phần giảm trừ dù người nhập gõ dấu nào. Đây là ngoại lệ duy nhất so với quy ước "isNegative phải lưu sẵn dấu".

---

## Công thức tổng hợp — B01b (theo thanh khoản giảm dần)

Nguồn: `computeB01b`. Mã số **khác** B01a.

| Mã | Chỉ tiêu | Công thức |
| :--- | :--- | :--- |
| `130` | Các khoản phải thu | `131 + 132 + 133 + 134` (134 âm) |
| `140` | Hàng tồn kho | `141 + 142` (142 âm) |
| `150` | Tài sản cố định và BĐS đầu tư | `151 + 152 + 153` (152 âm — hao mòn) |
| `200` | **TỔNG CỘNG TÀI SẢN** | `110 + 120 + 130 + 140 + 150 + 160` |
| `300` | **VII. Nợ phải trả** | `310 + 320 + 330 + 340 + 350 + 360` |
| `400` | **VIII. Vốn chủ sở hữu** | `410 + 420 + 430 + 440` (440 = "Vốn khác và cổ phiếu quỹ (*)", `isNegative`) |
| `500` | **TỔNG CỘNG NGUỒN VỐN** | `300 + 400` |

Lưu ý mã `440` của B01b là dòng ghi giảm (`isNegative`) nhưng compute **cộng** nó vào `400`. Dữ liệu mẫu để `0`; nếu có giá trị phải lưu âm — cùng bẫy dấu như B01a.

**B01b không có hàm kiểm tra cân đối riêng** (chỉ B01a có `checkB01aBalance`). Nếu cần kiểm cân đối cho B01b (`200` vs `500`) thì phải viết mới.

---

## Kiểm tra cân đối (`checkB01aBalance`)

Chỉ dành cho **B01a**. Trả về:

```
diffCurrent   = round(270_current  − 440_current)
diffPrevious  = round(270_previous − 440_previous)
isBalancedCurrent  = diffCurrent  === 0
isBalancedPrevious = diffPrevious === 0
```

- Dùng `Math.round` trên chênh lệch trước khi so `=== 0`: dung sai thực tế là dưới 0,5 đồng — bỏ qua sai số làm tròn cực nhỏ, nhưng vẫn bắt mọi lệch từ 1 đồng trở lên.
- Hàm này được gọi ở tab `B01aFinancialPositionTab.tsx` để hiện cảnh báo "chưa cân đối" khi tổng tài sản khác tổng nguồn vốn.
- **Lưu ý nghiệp vụ**: vốn chủ sở hữu (`400`) trong biểu này là do người dùng nhập chi tiết `411`…`417`, **không** phải số dư cân đối tự tính. Nên bảng có thể lệch thật — đó là tín hiệu dữ liệu nhập sai, không phải lỗi công thức. (Đối lập với phương án hạn mức ở `business-plan.md`, nơi vốn chủ sở hữu là số dư nên luôn cân — chính vì vậy lỗi #1 của file Excel gốc ở đó không lộ ra.)

---

## Bộ tỉ số tài chính (`computeFinancialRatios`)

Nguồn: `computeFinancialRatios(b01a, b02)` — tự chạy lại `computeB01a`/`computeB02` bên trong nên nhận biểu **thô** cũng được. Mọi tỉ số lấy **kỳ hiện tại** (`currentPeriod`). Đơn vị: nhóm thanh khoản = lần; nhóm đòn bẩy/sinh lời = %; vòng quay = vòng.

Ký hiệu nguồn: `tsnh`=100, `htk`=140, `tien`=110, `tongTS`=270, `noNganHan`=310, `tongNo`=300, `vcsh`=400; `dtThuan`=10, `giaVon`=11, `lnGop`=20, `lnThuan`=30, `lnst`=60.

| Nhóm | Tỉ số | Công thức (code) | Làm tròn | Mẫu số 0 → |
| :--- | :--- | :--- | :--- | :--- |
| Thanh khoản | `currentRatio` (hiện hành) | `tsnh / noNganHan` | 2 lẻ | 0 |
| Thanh khoản | `quickRatio` (nhanh) | `(tsnh − htk) / noNganHan` | 2 lẻ | 0 |
| Thanh khoản | `cashRatio` (tức thời) | `tien / noNganHan` | 2 lẻ | 0 |
| Đòn bẩy | `debtToAssets` (Nợ/TS) | `tongNo / tongTS × 100` | 1 lẻ | 0 |
| Đòn bẩy | `debtToEquity` (Nợ/VCSH) | `tongNo / vcsh × 100` | 1 lẻ | 0 |
| Đòn bẩy | `inventoryTurnover` (vòng quay HTK) | `giaVon / htk` | 1 lẻ | 0 |
| Sinh lời | `grossMargin` (biên gộp) | `lnGop / dtThuan × 100` | 1 lẻ | 0 |
| Sinh lời | `operatingMargin` (biên HĐKD) | `lnThuan / dtThuan × 100` | 1 lẻ | 0 |
| Sinh lời | `netProfitMargin` (biên ròng) | `lnst / dtThuan × 100` | 1 lẻ | 0 |
| Sinh lời | `roa` | `lnst / tongTS × 100` | 1 lẻ | 0 |
| Sinh lời | `roe` | `lnst / vcsh × 100` | 1 lẻ | 0 |

**Quy ước "mẫu số 0 → trả 0" thay vì lỗi/NaN**: mọi tỉ số đều bảo vệ `mẫu số > 0 ? ... : 0`. Đây là quyết định có chủ đích — biểu chưa nhập đủ (nợ ngắn hạn = 0, doanh thu = 0) hiện `0` thay vì `Infinity`/`NaN` làm vỡ giao diện. Giữ nguyên khi thêm tỉ số mới.

### Ba điểm lệch giữa code, comment và giao diện — phải biết

1. **`inventoryTurnover` dùng tồn kho CUỐI KỲ, không phải bình quân.** Comment ở `types/corporateFinancial.ts` ghi "Giá vốn / HTK **bình quân**", nhưng code là `giaVon / htk` với `htk = mã 140 currentPeriod` (tồn kho cuối kỳ thuần sau dự phòng). Không có tồn kho đầu-cuối bình quân. Comment sai; **code là chuẩn**. Nếu nghiệp vụ cần bình quân `(đầu kỳ + cuối kỳ)/2` thì đây là chỗ phải sửa — và sửa cả comment.

2. **`operatingMargin` được TÍNH nhưng KHÔNG hiển thị.** `FinancialRatiosCard.tsx` chỉ hiện: hiện hành, nhanh, tức thời, Nợ/TS, Nợ/VCSH, vòng quay HTK, biên gộp, biên ròng, ROA, ROE. `operatingMargin` (biên HĐKD) nằm trong kết quả nhưng thẻ bỏ qua. Muốn hiện thì thêm dòng vào thẻ.

3. **Nhãn "ROS" trên giao diện trỏ về `netProfitMargin`, không phải `operatingMargin`.** Thẻ ghi "Biên lợi nhuận ròng (ROS)" và bind vào `ratios.netProfitMargin` (LNST/DTT). Về học thuật ROS thường là biên HĐKD (LN thuần/DT), nhưng ở đây ROS = biên ròng sau thuế. Đừng "sửa" bind sang `operatingMargin` khi thấy chữ ROS — nhãn và biến hiện tại là cố ý.

---

## Nhập từ Excel (`parseCorporateFinancialExcel`)

Nhận `ArrayBuffer`, đọc bằng thư viện `xlsx`, trả `ImportResult { profile, sheetCount, matchedItemsCount, warnings }`.

**Nhận diện sheet theo tên (regex), fallback theo thứ tự:**

| Mẫu | Regex tên sheet | Fallback |
| :--- | :--- | :--- |
| B01a | `b01a|thtc|tinh.*hinh.*tai.*chinh` | sheet đầu tiên |
| B02 | `b02|kqkd|ket.*qua.*kinh.*doanh` | sheet thứ hai |
| B01b | `b01b|cdkt|can.*doi.*ke.*toan` | sheet thứ ba |

- B01a và B02 **bắt buộc** — thiếu thì đẩy cảnh báo vào `warnings`. B01b **tuỳ chọn** — thiếu thì im lặng (không cảnh báo).
- Metadata (tên DN, MST, địa chỉ, năm) đọc từ 12 dòng đầu sheet B01a qua `extractCompanyMetadata`. MST bắt regex `[0-9]{10}(-[0-9]{3})?`. Mặc định tên "DOANH NGHIỆP NHẬP TỪ EXCEL", năm hiện tại nếu không thấy.
- Sau khi ghép giá trị theo mã số, gọi `computeB01a/B02/B01b` để điền dòng tổng.

**Dò cột trong sheet** (`detectTableColumns`): quét 25 dòng đầu tìm tiêu đề cột theo regex — mã số (`mã số|mã chỉ tiêu`), tên (`chỉ tiêu|khoản mục`), kỳ này (`cuối năm|năm nay|kỳ này|số cuối kỳ|năm 20xx`), kỳ trước (`đầu năm|năm trước|kỳ trước|số đầu kỳ`). Nếu không dò được, fallback bố cục TT 133 mặc định: cột 0 = tên, 1 = mã, 3 = số cuối năm, 4 = số đầu năm, bắt đầu từ dòng 6.

**So khớp bằng mã số**, không bằng tên: chỉ nhận mã dạng 2–3 chữ số (`/^\d{2,3}$/`). `matchedItemsCount` đếm số dòng khớp cho từng biểu — dùng để báo người dùng "đã nhận bao nhiêu chỉ tiêu".

**`normalizeCode`**: một chữ số được đệm số 0 (`'1'` → `'01'`) để khớp mã B02 như `01`, `02`.

### `parseNumberCell` — đọc số kiểu Việt/Anh lẫn lộn

Xử lý được: số thật, ngoặc kế toán `(1.234)` → âm, dấu `-`/`–`/`—` đơn lẻ → 0, phân cách nghìn kiểu Việt `1.234.567` và kiểu Anh `1,234,567`, cả số thập phân `1.234,56` (Việt) và `1,234.56` (Anh). Suy luận dấu nào là phân cách nghìn theo vị trí xuất hiện cuối cùng của `.` và `,`. Trả `0` cho ô rỗng/không đọc được (không ném lỗi).

- **Lỗi có thể xảy ra**: một dấu chấm đơn như `1.5` — code kiểm `dotCount > 1 || /\.\d{3}$/` để phân biệt "1.500" (nghìn) với "1.5" (thập phân). Số kết thúc đúng ba chữ số sau dấu chấm bị coi là phân cách nghìn. File có giá trị lẻ dạng `12.345` (ý là mười hai phẩy ba bốn năm) sẽ bị đọc thành `12345`. Với đơn vị VNĐ nguyên đồng thì gần như không gặp, nhưng cần biết khi nhập số triệu/tỉ có phần lẻ.

---

## Xuất Excel & In / PDF

Nguồn: `src/lib/corporateFinancialExport.ts`.

### `exportCorporateFinancialToExcel(b01a, b02, b01b)`

Sinh **một file `.xlsx` thật** ba sheet (`B01a_THTC`, `B02_KQKD`, `B01b_CDKT`) qua `buildMultiSheetXlsx` của `xlsxWriter.ts` (OOXML thật, không phải HTML đội lốt — xem §10b `CONVENTIONS.md`). Tên file `BCTC_TT133_<TênDN>_<Năm>.xlsx`.

Mỗi sheet dựng bởi `buildSheetRows` theo **đúng bố cục Bộ Tài chính**: góc trái thông tin DN (tên, địa chỉ, MST), góc phải mã mẫu + câu "Ban hành theo Thông tư số 133/2016/TT-BTC ngày 26/8/2016"; tiêu đề biểu ở giữa; "Đơn vị tính: Đồng Việt Nam (VND)"; bảng 5 cột (CHỈ TIÊU / Mã số / Thuyết minh / cột kỳ này / cột kỳ trước) kèm hàng số thứ tự cột `1 2 3 4 5`; chân trang ba chữ ký (NGƯỜI LẬP BIỂU / KẾ TOÁN TRƯỞNG / GIÁM ĐỐC) và ghi chú `(*)`. Số định dạng `#,##0;(#,##0);"-"` (âm trong ngoặc, 0 thành gạch). Dòng `isHeader`/`isFormula` in đậm.

Truyền vào là biểu **đã compute** (`computedB01a`…), không phải biểu thô — dòng tổng phải có sẵn giá trị.

### `printStatementHtml(...)` — in / PDF từng biểu

Dựng HTML khổ **A4 dọc**, font Times New Roman, in qua `printHtmlDoc` (iframe ẩn — cùng cơ chế các tờ in khác trong dự án, không dùng thư viện PDF ngoài). `fmtVnd` định dạng: `0` → `-`, số âm → `(...)`, còn lại phân cách nghìn kiểu `vi-VN`. Các dòng tổng lớn (`270`, `440`, `200`, `500`) tô nền đậm hơn. Mỗi tab tự gọi hàm này với tiêu đề và nhãn cột riêng.

---

## Những chỗ dễ sai (lỗi đã hoặc có thể xảy ra)

1. **Nhập dự phòng/hao mòn/cổ phiếu quỹ thành số dương.** Cờ `isNegative` không tự đổi dấu; compute cộng thuần. Phải lưu âm. Sai dấu → tổng tài sản/nguồn vốn phồng lên gấp đôi khoản đó.
2. **Sửa compute để đảo dấu theo `isNegative`.** Sẽ trừ hai lần vì dữ liệu mẫu và trình nhập Excel đã lưu sẵn dấu âm. Muốn đổi quy ước phải sửa đồng bộ cả ba nơi.
3. **Tưởng `inventoryTurnover` dùng tồn kho bình quân** như comment ghi. Code dùng tồn kho cuối kỳ. Code đúng.
4. **"Sửa" bind ROS sang operatingMargin** trên `FinancialRatiosCard`. Nhãn ROS ở đây cố ý trỏ `netProfitMargin`.
5. **Lưu số dòng tổng vào state.** Dòng `isFormula` phải luôn được tính lại từ dòng chi tiết, không lưu — tránh nguồn dữ liệu thứ hai trôi dạt.
6. **Thêm tỉ số mà quên bảo vệ mẫu số 0.** Toàn bộ tỉ số hiện tại trả `0` khi mẫu số ≤ 0; giữ đúng để không sinh `NaN`/`Infinity`.
7. **Đổi text mẫu ("Thông tư số 133/2016/TT-BTC ngày 26/8/2016", ba chức danh ký, ghi chú `(*)`)** trong file xuất. Đây là mẫu pháp lý; giữ nguyên văn.
8. **Quên B01b không có kiểm tra cân đối.** Chỉ `checkB01aBalance` tồn tại; B01b (`200` vs `500`) chưa có hàm kiểm.
