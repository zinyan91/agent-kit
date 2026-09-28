# Thẻ tín dụng — Hợp đồng thẻ, chính sách phát hành, biểu phí

Nguồn sự thật cho mảng **thẻ tín dụng** trong CustomerManager: hợp đồng thẻ, ba trường hợp
mở thẻ, mã chính sách phát hành, luật hạn mức theo chính sách, và biểu phí. Khi tài liệu này
lệch với code thì **theo code** — code là nguồn sự thật, tài liệu chỉ giải thích *vì sao*.

Tệp nguồn (đọc trực tiếp khi cần chi tiết):

| Tệp | Vai trò |
| :--- | :--- |
| `src/lib/cardContract.ts` | Danh mục sản phẩm thẻ, mã chính sách (`key`/`code`/`aliases`), số hợp đồng, tổng hạn mức, `checkCardContract` |
| `src/lib/cardPolicyRules.ts` | Luật hạn mức theo từng mã chính sách (4 hình dạng), `checkCardLimitAgainstPolicy` |
| `src/lib/cardFeeProfiles.ts` | Danh mục hồ sơ phí + lãi (bậc phí tĩnh trong mã nguồn) |
| `src/lib/cardFeeStore.ts` | Lưu/đọc/sửa hồ sơ phí qua `localStorage` |
| `src/lib/creditLimit.ts` | `checkCardLimit`, `checkCollateralCapacity` — ràng buộc LTV theo cụm (ngoài phạm vi 4 tệp trên nhưng liên quan trực tiếp) |
| `src/types/index.ts` | `CardContract`, `CardSupplementaryHolder` |
| `supabase/migrations/27_the_tin_dung_ngoai_le_ltv.sql` | Cột ngoại lệ LTV |

## Mục lục

1. [Ba trường hợp mở thẻ và ràng buộc LTV](#1-ba-trường-hợp-mở-thẻ-và-ràng-buộc-ltv)
2. [Cấu trúc CardContracts — bảng riêng, hạn mức dùng chung](#2-cấu-trúc-cardcontracts--bảng-riêng-hạn-mức-dùng-chung)
3. [Số hợp đồng thẻ và chặn trùng](#3-số-hợp-đồng-thẻ-và-chặn-trùng)
4. [Danh mục sản phẩm thẻ và thẻ ghi nợ](#4-danh-mục-sản-phẩm-thẻ-và-thẻ-ghi-nợ)
5. [Mã chính sách — khoá bền vs mã chính thức](#5-mã-chính-sách--khoá-bền-vs-mã-chính-thức)
6. [Tổng hạn mức thẻ](#6-tổng-hạn-mức-thẻ)
7. [Luật hạn mức theo chính sách — bốn hình dạng](#7-luật-hạn-mức-theo-chính-sách--bốn-hình-dạng)
8. [checkCardContract — kiểm tra hợp đồng khi lưu](#8-checkcardcontract--kiểm-tra-hợp-đồng-khi-lưu)
9. [Bậc phí và hồ sơ phí](#9-bậc-phí-và-hồ-sơ-phí)
10. [Ngoại lệ LTV — migration 27 và dấu vết](#10-ngoại-lệ-ltv--migration-27-và-dấu-vết)
11. [Bảng tra hàm nhanh](#11-bảng-tra-hàm-nhanh)
12. [Điểm mơ hồ / cần kiểm khi động vào](#12-điểm-mơ-hồ--cần-kiểm-khi-động-vào)

---

## 1. Ba trường hợp mở thẻ và ràng buộc LTV

Thẻ là **rủi ro tái sử dụng**: trả nợ vào là tiêu lại được. Vì vậy thẻ vào cụm kiểm soát TSĐB
theo **hạn mức được cấp** (`GrantedLimit`), **không** theo dư nợ hiện tại — cùng cơ sở với hạn
mức tín dụng tuần hoàn.

Ba trường hợp mở thẻ, phân biệt bằng `CardContract.CollateralKind`:

| TH | `CollateralKind` | TSBĐ | Ràng buộc hạn mức |
| :--- | :--- | :--- | :--- |
| 1 | `KHONG_TSBD` | Không có (tín chấp) | Không kiểm LTV. Hạn mức chỉ chịu trần theo mã chính sách (mục 7). |
| 2 | `CO_TSBD` | Tài sản đang thế chấp (BĐS, xe…) | Hạn mức thẻ ≤ phần còn trống của **cụm liên thông**, tính cả khoản vay lẫn thẻ khác trên cùng tài sản. |
| 3 | `TIEN_GUI` | Sổ/tiền gửi cầm cố tại Vietbank | Thêm **trần sản phẩm 90% mệnh giá** (`CARD_STK_LTV_PERCENT = 90`), áp **đồng thời** với ràng buộc cụm. |

Nhãn hiển thị của ba loại nằm ở `CARD_COLLATERAL_KINDS` (`cardContract.ts`).

**Trần sản phẩm và trần LTV là hai ràng buộc khác loại — cả hai phải thoả.**
Ví dụ: sổ tiết kiệm 500tr, ở góc nhìn cho vay LTV có thể 100% nên khả năng bảo đảm của cụm là
500tr; nhưng thẻ bị `CARD_STK_LTV_PERCENT = 90` kẹp về 450tr. Nếu sổ đó đang bảo đảm cho khoản
vay 300tr thì hạn mức thẻ tối đa = `min(500 − 300, 450) = 200tr`.

**Vì sao 90% chứ không theo bảng LTV cho vay:** đây là quy tắc *của sản phẩm thẻ*, cố ý đè lên
bảng LTV cho vay. **Đừng "sửa" nó thành `getEffectiveLtv`** — sẽ phá đúng ý đồ.

Hàm thực thi ràng buộc này là `checkCardLimit` trong `src/lib/creditLimit.ts` (gọi
`checkCollateralCapacity` để dựng cụm liên thông). Kết quả trả về trường `blocker` cho biết trần
nào bị chạm (`no_collateral`, `appraisal_unusable`, hoặc trần cụm/sản phẩm), để thông báo nêu
đúng nguyên nhân.

> **Lỗi từng xảy ra (07/08/2026):** thẻ **hoàn toàn vô hình** với chốt kiểm soát TSĐB vì
> `checkCollateralCapacity` chỉ nhận `LoanContract[]`. Một thẻ 500tr trên căn nhà đang thế chấp
> tiêu tốn 0đ khả năng bảo đảm, chốt báo xanh trong khi cụm đã vượt trần. Nay
> `checkCollateralCapacity` có tham số `cards: CardContract[]`. **Viết hàm mới đụng tới TSĐB phải
> kiểm nó đã nhận `CardContract[]` chưa.**

> **Lỗi từng xảy ra:** `CreditCardView` cũ tự tính `giá trị × LTV / 100` — tạo ra một "bản LTV thứ
> tư" trôi dạt, nhận cả định giá đã hết hiệu lực. Dùng `checkCardLimit` (đã lọc định giá qua
> `isAppraisalUsable`), đừng tự nhân LTV trong `.tsx`.

---

## 2. Cấu trúc CardContracts — bảng riêng, hạn mức dùng chung

Thẻ nằm ở **bảng riêng** `CardContracts`, **không** phải `LoanContracts`, cũng **không** phải
`CreditContracts`. Kiểu dữ liệu: `CardContract` trong `src/types/index.ts`.

Trường chính của `CardContract`:

| Trường | Ý nghĩa |
| :--- | :--- |
| `CardContractNumber` | Số hợp đồng dạng `NAT/<năm>/<3 chữ số>` |
| `CardHolderSide` | `'KH'` (khách hàng) hoặc `'KHLQ'` (vợ/chồng) — xem `CARD_HOLDER_SIDES` |
| `CardProducts` | Chuỗi các loại thẻ nối bằng `;` (một hợp đồng phát nhiều thẻ) |
| `GrantedLimit` | **Hạn mức cấp ở cấp hợp đồng** (dùng chung cho mọi thẻ trong hợp đồng) |
| `PolicyCode` | Lưu **khoá bền** của mã chính sách (`A1`…`B13`), xem mục 5 |
| `CollateralKind` | `KHONG_TSBD` / `TIEN_GUI` / `CO_TSBD` |
| `CollateralId` | TSBĐ gán khi `CollateralKind = 'CO_TSBD'` |
| `IsClosed` | Hợp đồng đã đóng — bị loại khỏi tổng hạn mức |

Thẻ phụ: `CardSupplementaryHolder` (`CardContractId`, `FullName`, `Relation`, …). Tối đa
**2 thẻ phụ / hợp đồng** (`MAX_SUPPLEMENTARY_PER_CONTRACT = 2`). Danh sách quan hệ:
`SUPPLEMENTARY_RELATIONS`.

**HẠN MỨC DÙNG CHUNG — điểm dễ làm sai nhất.**
Một hợp đồng thẻ phát hành được cả Visa, Mastercard *và* Napas trên **cùng một** hạn mức. Vì vậy
hạn mức nằm ở `CardContracts.GrantedLimit` (cấp hợp đồng), **không** ở từng thẻ vật lý. Thẻ phụ
cũng đồng mức cấp với thẻ chính nên `CardSupplementaryHolders` **cố ý không có cột hạn mức**.

> **Đừng** dựng bảng "từng thẻ vật lý có hạn mức riêng" rồi cộng lại — nó tiêu tốn khả năng bảo
> đảm **gấp ba lần thực tế**.

**KH và vợ/chồng là hai hợp đồng riêng** (`CardHolderSide` khác nhau) vì hạn mức khác nhau.
Đừng gộp thành một bản ghi hai chủ thẻ.

> **Lỗi từng xảy ra (10/08/2026):** dashboard hiện hạn mức thẻ bằng 0 — cũng vì hàm chỉ nhận
> `LoanContract[]`. Đây là lần thứ hai cùng một gốc lỗi.

---

## 3. Số hợp đồng thẻ và chặn trùng

Định dạng: `NAT/<năm>/<số thứ tự 3 chữ số>`, ví dụ `NAT/2026/001`. Tiền tố `CARD_CONTRACT_PREFIX = 'NAT'`.

| Hàm (`cardContract.ts`) | Việc |
| :--- | :--- |
| `formatCardContractNumber(year, seq)` | Ghép `NAT/<năm>/<seq 3 chữ số>` (`padStart(3,'0')`) |
| `parseCardContractNumber(no)` | Bóc `{year, seq}`; regex `^NAT\/(\d{4})\/(\d+)$/i`; không khớp → `null` |
| `nextCardContractNumber(year, existing)` | Lấy **`MAX(seq)` của đúng năm đó rồi + 1**, không đếm số dòng |
| `normalizeCardContractNumber(no)` | `trim().toLowerCase()` để so trùng |
| `findCardContractNumberClash(no, excludeId, existing)` | Tìm hợp đồng khác trùng số sau chuẩn hoá |

**`nextCardContractNumber` lấy MAX + 1, KHÔNG đếm số dòng** và đếm riêng theo năm. Đếm dòng sẽ
sinh số trùng ngay khi có hợp đồng bị xoá giữa dãy (ví dụ có 001, 002, 003; xoá 002; đếm dòng ra
`MAX seq = 2` → sinh 003 trùng).

**`findCardContractNumberClash` chuẩn hoá qua `normalizeCardContractNumber` và bỏ qua chính nó**
bằng `excludeId` (`c.Id !== excludeId`) — nhờ vậy khi *sửa* một hợp đồng, chính nó không tự báo
trùng với mình. So sánh trên chuỗi đã `lower(trim(...))` để `'NAT/2026/001'` và
`' nat/2026/001 '` là cùng một số.

**Hai lớp kiểm tra phải nói cùng một chuyện:** unique index dưới database đặt trên
`lower(btrim(...))` (cùng khuôn với `LoanContracts_ContractNumber_key`), khớp đúng cách
`normalizeCardContractNumber` chuẩn hoá ở tầng ứng dụng.

Giới hạn 2 thẻ phụ chặn bằng **trigger** `trg_chan_qua_hai_the_phu` dưới database (không dùng
`CHECK`, vì luật đếm qua nhiều dòng), song song với kiểm tra trong `checkCardContract`.

---

## 4. Danh mục sản phẩm thẻ và thẻ ghi nợ

`CARD_PRODUCTS` (`cardContract.ts`) khai từng sản phẩm với `brand` (`Mastercard`/`Visa`/`Napas`)
và `kind` (`credit`/`debit`):

- Vietbank Mastercard Lifecare / Happy — Mastercard, credit
- Vietbank Visa Luxury / My Style — Visa, credit
- Vietbank Napas — Napas, credit
- Thẻ ghi nợ ATM — Napas, **debit**

| Hàm | Việc |
| :--- | :--- |
| `cardProductOf(name)` | Tra sản phẩm theo tên (so khớp `trim().toLowerCase()`) |
| `parseCardProducts(contract)` | Tách `CardProducts` theo `;`, `trim`, bỏ rỗng |
| `isDebitCard(contract)` | `true` **chỉ khi mọi** loại thẻ trong hợp đồng đều là `debit` |

**Thẻ ghi nợ ATM không phải khoản cấp tín dụng** — không có hạn mức nên không được tiêu tốn khả
năng bảo đảm. `isDebitCard` yêu cầu **mọi** loại thẻ đều là ghi nợ: hợp đồng lẫn cả thẻ tín dụng
và thẻ ghi nợ thì **không** coi là ghi nợ (vẫn cần hạn mức). Nếu `CardProducts` rỗng → `isDebitCard`
trả `false`.

`checkCardContract` chặn hai chiều (xem mục 8): thẻ tín dụng mà hạn mức ≤ 0 thì chặn; thẻ ghi nợ
mà khai hạn mức > 0 cũng chặn.

---

## 5. Mã chính sách — khoá bền vs mã chính thức

Hai khái niệm **khác nhau**, đừng lẫn. Định nghĩa ở `CARD_POLICIES` (`cardContract.ts`), gồm 15 mã:
`A1`, `A2` (có TSBĐ) và `B1`…`B13` (không TSBĐ).

| | Khoá bền (`key`) | Mã chính thức (`code`) |
| :--- | :--- | :--- |
| Giá trị | `A1`, `A2`, `B1`…`B13` | `B6_KHCN_KHONG TSBD_THUNHAP_ LUONG QUA VIETBANK` |
| Lưu xuống CSDL | **có** — `CardContracts.PolicyCode` | không |
| Hiển thị cho banker | không | **có** |
| Đổi khi có QĐ mới | không bao giờ | có thể |

**Lưu chuỗi mã chính thức xuống CSDL là sai:** một quyết định mới đổi tên mã thì mọi hợp đồng cũ
sẽ trỏ vào chỗ không còn tồn tại. Chỉ lưu `key`.

Mỗi `CardPolicy` có: `key`, `code`, `group`, `subject`, `collateralKind`, tuỳ chọn `aliases`,
`retiredAt`, `supersededByKey`.

| Hàm (`cardContract.ts`) | Việc |
| :--- | :--- |
| `normalizePolicyRef(v)` | Chuẩn hoá tham chiếu: `trim` + `toLowerCase` + gộp **dấu cách quanh gạch dưới** (`\s*_\s*` → `_`) + gộp khoảng trắng |
| `cardPolicyOf(ref)` | Tra chính sách qua `key`, rồi `code`, rồi `aliases` (theo thứ tự) |
| `cardPolicyKeyOf(ref)` | Trả về `key` (khoá bền) của tham chiếu |
| `activeCardPolicies()` | Lọc bỏ mã có `retiredAt` |
| `searchCardPolicies(query)` | Tìm theo `key`/`code`/`group`/`subject`/`aliases` |
| `cardPoliciesForCollateralKind(kind, opts)` | Lọc theo loại TSBĐ; mặc định bỏ mã đã bãi bỏ trừ khi `includeRetired` |

**`normalizePolicyRef` cố ý bỏ dấu cách quanh gạch dưới** vì bản gốc khai không nhất quán —
`B6_KHCN_KHONG TSBD_THUNHAP_ LUONG QUA VIETBANK` có dấu cách sau `_` ở `_ LUONG`, chỗ khác lại
không. Không chuẩn hoá thì `cardPolicyOf` sẽ tra trượt.

**Mã bãi bỏ đánh `retiredAt`, đừng xoá khỏi danh mục:** nó biến khỏi `activeCardPolicies()` cho hồ
sơ mới, nhưng `cardPolicyOf` **vẫn tra được** cho hồ sơ cũ đã lưu. `aliases` giữ tên mã cũ để hồ
sơ cũ vẫn tra ra khi tên chính thức đổi.

**Quy trình khi Phòng Thẻ ban hành QĐ mới:** sửa số trong `CARD_POLICY_RULES`; thêm tên cũ vào
`aliases` nếu code đổi; đánh `retiredAt` cho mã bãi bỏ; cập nhật `CARD_POLICY_SOURCE`. **Không đụng
CSDL, không đụng hồ sơ đã lưu.** Dữ liệu chính sách cố ý để **trong mã nguồn**, không xuống CSDL.

`CARD_POLICY_SOURCE` khai xuất xứ văn bản (quyết định `1017/2025/QĐ-TGĐ`, revision `02`, danh sách
văn bản bị thay thế…) và hiện lên tab tra cứu để banker biết dữ liệu còn mới hay không.

Mỗi mã chính sách ràng buộc một `collateralKind`: `A1` → `TIEN_GUI`, `A2` → `CO_TSBD`, tất cả `B*`
→ `KHONG_TSBD`. `checkCardContract` chặn nếu `PolicyCode` và `CollateralKind` khai không khớp.

---

## 6. Tổng hạn mức thẻ

| Hàm (`cardContract.ts`) | Việc |
| :--- | :--- |
| `cardContractGrantedLimit(contract)` | Hạn mức của **một** hợp đồng: thẻ ghi nợ → `0`, còn lại → `GrantedLimit ?? 0` |
| `totalCardGrantedLimit(contracts)` | Cộng hạn mức các hợp đồng **chưa đóng** (`IsClosed` → cộng 0) |

**Đọc hạn mức thẻ bằng hai hàm này, đừng đọc thẳng `GrantedLimit`.** Hai hàm đã xử sẵn hai điều
kiện dễ quên: **thẻ ghi nợ trả 0** và **hợp đồng đã đóng trả 0**. Đọc thẳng `GrantedLimit` sẽ tính
cả thẻ ghi nợ và hợp đồng đã đóng vào khả năng bảo đảm.

---

## 7. Luật hạn mức theo chính sách — bốn hình dạng

`CARD_POLICY_RULES` (`cardPolicyRules.ts`) là luật hạn mức chi tiết cho từng mã (khớp với
`CARD_POLICIES` qua `code`). Mỗi `CardPolicyRule` có `code`, `subject`, `limitRule` (mô tả chữ),
`minLimit`, `maxLimit`, `conditions`, `reassessment`, `documents`, và **một trong bốn hình dạng
cấu trúc** để tính hạn mức:

| Hình dạng | Trường | Hàm tra | Áp cho ví dụ |
| :--- | :--- | :--- | :--- |
| Quy tắc đơn | chỉ `limitRule` (chữ) | (không có hàm — chỉ mô tả) | `A1`, `A2`, `B2`, `B4` |
| Bậc thang | `tiers: CardLimitTier[]` + `tierBasis` | `cardLimitFromTiers(tiers, basisAmount)` | `B1` (theo số dư tiền gửi bình quân) |
| Ma trận | `matrix: CardLimitMatrix` | `cardLimitFromMatrix(matrix, role, rating)` | `B3` (chức danh × xếp hạng DN), `B5` (người giới thiệu) |
| Nhánh | `brackets: CardLimitBracket[]` | (chọn nhánh theo chức danh; không có hàm tra tự động) | `B6`, `B7`, `B8`, `B10` |

- **`cardLimitFromTiers`**: tìm bậc mà `basisAmount >= fromAmount && (toAmount === null || basisAmount < toAmount)`. `basisAmount <= 0` hoặc không có bậc → `0`. Bậc cao nhất để `toAmount: null` (không trần trên số dư).
- **`cardLimitFromMatrix`**: tra theo `role` (so `toLowerCase().trim()`) rồi `rating`; không thấy → `0`.
- Một số nhánh `B8` có thêm `byTitleMaxLimit` — trần phụ khi cấp theo chức danh (khác với cấp theo lương).

| Hàm | Việc |
| :--- | :--- |
| `cardPolicyRuleOf(ref)` | Từ tham chiếu (key/code/alias) → `CardPolicyRule` (qua `cardPolicyOf` rồi khớp `code`) |
| `checkCardLimitAgainstPolicy(policyCode, grantedLimit)` | Kiểm hạn mức khai có nằm trong `[minLimit, maxLimit]` của mã không; trả `{ok, message?}` |
| `cardPolicyRulesForCollateralKind(kind, codesOfKind)` | Lọc luật theo tập code thuộc một loại TSBĐ |

`checkCardLimitAgainstPolicy` bỏ qua khi `grantedLimit <= 0` hoặc không tìm thấy rule (`ok: true`).
`minLimit`/`maxLimit` là `null` nghĩa là **không có** trần đó.

**`A1` là mã duy nhất không có trần trên** (`maxLimit: null`) — hạn mức = 90% giá trị tiền gửi,
không kẹp trần. Mọi mã còn lại có `maxLimit > 0`. Test khoá riêng ngoại lệ này.

`CARD_STK_LTV_PERCENT = 90` khai trong `cardPolicyRules.ts` (trần sản phẩm cho thẻ cầm cố tiền gửi,
xem mục 1). `CARD_POLICY_GENERAL_NOTES` là các lưu ý chung (miễn yêu cầu thời gian hoạt động cho DN
nhà nước / VNR500 / niêm yết…).

> **Hai trần theo doanh nghiệp CHƯA chặn được bằng code:** `B3` (tổng ≤ 1.000tr/500tr mỗi KHDN theo
> xếp hạng) và `B12` (≤ 10% HMTD và ≤ 5 tỉ mỗi DN, **cộng gộp cả thẻ `B3`**). Hệ thống không có
> thực thể doanh nghiệp nên hai trần này chỉ là **chữ trong `limitRule` / `matrix.note`**, không có
> chốt tự động. Đừng tưởng đã có chốt.

Test cấu trúc khoá các tính chất: bảng bậc phủ liên tục (không hở, không chồng lấn), ma trận không
ô rỗng, `maxLimit` của mã bằng đúng ô/nhánh lớn nhất. **Nhập lệch một ô là test đỏ** — xem
`src/lib/__tests__/cardPolicyRules.test.ts`.

---

## 8. checkCardContract — kiểm tra hợp đồng khi lưu

`checkCardContract(input)` (`cardContract.ts`) trả về mảng `CardContractIssue[]`
(`{level: 'error'|'warn', field, message}`). Các kiểm tra:

| Điều kiện chặn (`error`) | Vì sao |
| :--- | :--- |
| `CardContractNumber` không đúng dạng `NAT/<năm>/<3 chữ số>` | Chuẩn hoá số hợp đồng |
| Trùng số hợp đồng (`findCardContractNumberClash`, đã bỏ qua chính nó qua `excludeId`) | Không cho hai hợp đồng cùng số |
| Không chọn loại thẻ nào (`parseCardProducts` rỗng) | Hợp đồng phải có ít nhất 1 thẻ |
| Thẻ tín dụng mà `GrantedLimit <= 0` | Thẻ tín dụng phải có hạn mức > 0 |
| Thẻ ghi nợ mà `GrantedLimit > 0` | Thẻ ghi nợ không có hạn mức tín dụng |
| Thẻ tín dụng mà thiếu `PolicyCode` | Phải chọn mã chính sách |
| `PolicyCode` và `CollateralKind` không khớp `policy.collateralKind` | Mã chính sách buộc một loại TSBĐ |
| `CollateralKind = 'CO_TSBD'` mà thiếu `CollateralId` | Khoản có TSBĐ phải gán tài sản |
| Số thẻ phụ > `MAX_SUPPLEMENTARY_PER_CONTRACT` (2) | Trần thẻ phụ |
| Thẻ phụ thiếu `FullName` hoặc `Relation` | Bắt buộc khai đủ chủ thẻ phụ |

Tham số `excludeId` truyền vào để khi *sửa* hợp đồng, chính nó không tự báo trùng số với mình.

Đây là lớp kiểm tra tầng ứng dụng, song song với các ràng buộc dưới database (unique index số hợp
đồng, trigger giới hạn thẻ phụ). Ràng buộc **LTV theo cụm** (mục 1) nằm ở `checkCardLimit`
(`creditLimit.ts`), **không** trong `checkCardContract`.

---

## 9. Bậc phí và hồ sơ phí

Danh mục phí + lãi tĩnh ở `CARD_FEE_PROFILES` (`cardFeeProfiles.ts`). Mỗi `CardFeeProfile`:
`id`, `group`, `cardType`, `productMan` (mã sản phẩm corebanking), `feeIntProfile` (hồ sơ phí/lãi),
tuỳ chọn `note`.

Ba **nhóm đối tượng** (`CARD_FEE_GROUPS`), mỗi nhóm có 5 loại thẻ (Visa Mystyle, Visa Luxury,
Mastercard Lifecare, Mastercard Happy, Napas):

| Nhóm | Đặc điểm ưu đãi (theo `feeIntProfile`) |
| :--- | :--- |
| `KH thông thường` | Lãi 33% (Napas 18%), miễn phí thường niên 1 năm |
| `Khách hàng, Hoa Lâm, Gia An, CIH` | Lãi 16% (Napas 18%), miễn phí phát hành + thường niên trọn đời |
| `CBNV Vietbank, Vietbank AMC` | Lãi 16% (Napas 18%), miễn phí thường niên 5 năm |

`COMMON_FEE_NOTE` là ghi chú chung về loại trừ ưu đãi (không áp đồng thời với ưu đãi khác, KH đóng
thẻ rồi mở lại trong 6 tháng, KH đã có thẻ Vietbank phát thêm thẻ…).

`searchCardFeeProfiles(query, groupFilter?, cardTypeFilter?)` lọc theo nhóm/loại thẻ và tìm chuỗi
trên mọi trường. `groupFilter`/`cardTypeFilter` nhận `'ALL'` để bỏ lọc.

**Lưu trữ (`cardFeeStore.ts`)** — banker sửa được bậc phí, lưu ở **`localStorage`** (không xuống
CSDL):

| Hàm | Việc |
| :--- | :--- |
| `loadCardFeeProfiles()` | Đọc từ `localStorage`; rỗng/hỏng → trả `CARD_FEE_PROFILES` gốc |
| `saveCardFeeProfiles(items)` | Ghi mảng xuống `localStorage` |
| `loadCommonFeeNote()` / `saveCommonFeeNote(note)` | Đọc/ghi ghi chú chung |
| `addCardFeeProfile(item)` | Thêm hồ sơ mới (`id` sinh `fee-custom-<timestamp>-<rand>`) |
| `updateCardFeeProfile(id, patch)` | Sửa một hồ sơ |
| `deleteCardFeeProfile(id)` | Xoá một hồ sơ |
| `resetCardFeeProfiles()` | Xoá key `localStorage`, trả về danh mục + ghi chú gốc |

Mọi truy cập `localStorage` bọc `try/catch` (khoá `customer_manager_card_fee_profiles_v1` và
`..._common_note_v1`) — an toàn khi chạy nơi không có `localStorage` (SSR/test), tự rơi về hằng gốc.

---

## 10. Ngoại lệ LTV — migration 27 và dấu vết

Khi banker cấp hạn mức thẻ **vượt trần** khả năng bảo đảm của cụm (TH2/TH3 ở mục 1) thì phải **chặn
lưu**; chỉ mở được bằng ô xác nhận ngoại lệ kèm **lý do bắt buộc**.

Dấu vết ngoại lệ nằm ở **cột riêng**, **không** nhét vào `Note`. Migration
`27_the_tin_dung_ngoai_le_ltv.sql` thêm hai cột:

| Cột | Kiểu | Ý nghĩa |
| :--- | :--- | :--- |
| `IsLtvException` | `boolean NOT NULL DEFAULT false` | Đánh dấu hạn mức thẻ vượt khả năng bảo đảm, đã xác nhận là ngoại lệ |
| `LtvExceptionReason` | `text` | Lý do banker khai; **bắt buộc khi `IsLtvException = true`** |

**Lưu ý (lệch cần biết):** migration 27 `ALTER TABLE "CreditCards"` — tức thêm cột vào bảng
**`CreditCards`** (bảng thẻ đời cũ/WPF), *không* phải bảng `CardContracts` hiện hành. Kiểu
`CardContract` trong `src/types/index.ts` **chưa có** hai trường `IsLtvException` /
`LtvExceptionReason`. Xem mục 12.

---

## 11. Bảng tra hàm nhanh

| Hàm | Tệp | Dùng khi |
| :--- | :--- | :--- |
| `cardProductOf`, `parseCardProducts`, `isDebitCard` | `cardContract.ts` | Nhận diện loại thẻ / thẻ ghi nợ |
| `normalizePolicyRef`, `cardPolicyOf`, `cardPolicyKeyOf` | `cardContract.ts` | Tra mã chính sách (key/code/alias) |
| `activeCardPolicies`, `searchCardPolicies`, `cardPoliciesForCollateralKind` | `cardContract.ts` | Liệt kê / tìm / lọc chính sách |
| `formatCardContractNumber`, `parseCardContractNumber`, `nextCardContractNumber` | `cardContract.ts` | Sinh & phân tích số hợp đồng |
| `normalizeCardContractNumber`, `findCardContractNumberClash` | `cardContract.ts` | Chặn trùng số hợp đồng |
| `cardContractGrantedLimit`, `totalCardGrantedLimit` | `cardContract.ts` | Đọc hạn mức thẻ (xử ghi nợ/đã đóng) |
| `checkCardContract` | `cardContract.ts` | Kiểm hợp đồng khi lưu |
| `cardLimitFromTiers`, `cardLimitFromMatrix` | `cardPolicyRules.ts` | Tính hạn mức theo bậc / ma trận |
| `cardPolicyRuleOf`, `checkCardLimitAgainstPolicy`, `cardPolicyRulesForCollateralKind` | `cardPolicyRules.ts` | Tra & kiểm luật hạn mức |
| `checkCardLimit`, `checkCollateralCapacity` | `creditLimit.ts` | Ràng buộc LTV theo cụm (có nhận `CardContract[]`) |
| `loadCardFeeProfiles`, `saveCardFeeProfiles`, `add/update/delete/resetCardFeeProfile(s)`, `loadCommonFeeNote`, `saveCommonFeeNote` | `cardFeeStore.ts` | Quản lý biểu phí (localStorage) |
| `searchCardFeeProfiles` | `cardFeeProfiles.ts` | Tìm/lọc hồ sơ phí |

Test liên quan: `src/lib/__tests__/cardContract.test.ts`, `cardPolicyRules.test.ts`,
`cardLimit.test.ts`.

---

## 12. Điểm mơ hồ / cần kiểm khi động vào

- **`CreditCards` vs `CardContracts` — hai bảng thẻ.** Migration 27 thêm `IsLtvException` /
  `LtvExceptionReason` vào **`CreditCards`** (bảng đời cũ), nhưng mô hình thẻ hiện hành là
  `CardContracts` / kiểu `CardContract` — kiểu này **chưa** khai hai trường đó. CONVENTIONS §"Thẻ
  tín dụng" (dòng ~1038) cũng nói về `CreditCards.CreditLimit`/`Limit` và migration 28 (gộp cột) —
  đều thuộc bảng `CreditCards` cũ, tách biệt với 4 tệp `card*.ts` (vốn thao tác trên `CardContracts`).
  Khi làm ngoại lệ LTV cho `CardContract`, **kiểm** xem cột đã có trên `CardContracts` chưa (có thể
  cần migration bổ sung) thay vì giả định migration 27 đã phủ.

- **Tên hàm đọc hạn mức.** CONVENTIONS dòng ~1038 nhắc `cardGrantedLimit` (cho bảng `CreditCards`
  cũ). Với `CardContracts` hiện hành, hàm đúng là **`cardContractGrantedLimit`** và
  **`totalCardGrantedLimit`** (trong `cardContract.ts`). Đừng nhầm hai tên.

- **Trần theo doanh nghiệp (`B3`, `B12`) chưa có chốt** — chỉ là chữ trong `limitRule`/`matrix.note`
  (mục 7). Nếu cần enforce, phải thêm thực thể doanh nghiệp trước.

- **Hình dạng "nhánh" (`brackets`) không có hàm chọn tự động** — không như `tiers`/`matrix` có
  `cardLimitFromTiers`/`cardLimitFromMatrix`. Việc chọn nhánh theo chức danh hiện do UI/người dùng
  quyết; `checkCardLimitAgainstPolicy` chỉ kiểm `[minLimit, maxLimit]` toàn mã, không kiểm từng nhánh.
