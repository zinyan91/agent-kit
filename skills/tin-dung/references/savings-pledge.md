# Huy động & Cầm cố sổ tiết kiệm

Đối chiếu ngày 30/10/2026 với CustomerManager nhánh `main`. Mã nguồn thắng tài liệu này khi lệch.

## Phạm vi

Tab "Huy động & Cầm cố" (`/savings-pledge`, phân hệ `credit`) quản lý sổ tiết kiệm của khách và khoản vay cầm cố sổ tiết kiệm. Khoản cầm cố **không** còn tạo ở màn HĐTD: `loanMethodOptions()` trong `src/lib/loanProductRules.ts` chỉ giữ "Cầm cố sổ tiết kiệm" cho bản ghi cũ đang mang giá trị đó.

## Dữ liệu (migration 76)

- `SavingsBooks`: sổ / tiền gửi có kỳ hạn của khách. Lãi suất lưu phần trăm.
- `PledgeLoans`: một số HĐ cầm cố kiêm KUNN; ngày giải ngân, ngày đến hạn (số ngày tùy chọn), lãi suất phần trăm.
- `PledgeLoanSavingsBooks`: nhiều–nhiều, cột `PrincipalCovered` là phần gốc vay sổ đó bảo đảm; tổng theo khoản vay = số tiền vay.
- `PledgeLoanRepayments`: lịch sử trả. Dư nợ **không lưu**: = số tiền vay − Σ gốc đã trả; ngày tính lãi gần nhất = ngày trả gần nhất hoặc ngày giải ngân.
- Ghi qua hàm `save_pledge_loan` và `record_pledge_repayment` (SECURITY INVOKER). Hàm chặn: ngày trả lùi so với lần trả gần nhất, cấn trừ sổ đã tất toán, sửa số tiền hoặc ngày giải ngân khi đã có lần trả, trả một phần ≤ 0 hoặc ≥ dư nợ, trả lần hai trên khoản đã tất toán.
- Migration 76 GRANT tường minh cho bốn bảng và ba hàm, thu hồi `EXECUTE` của `PUBLIC`/`anon` trên hàm: từ 30/10/2026 Supabase không tự cấp quyền cho bảng mới trong `public` nữa (skill `postgres`).
- Bản ghi HĐTD/KUNN/TSBĐ cũ đã chuyển mang `MovedToPledgeLoanId` / `MovedToSavingsBookId`; mọi API liệt kê lọc bỏ chúng.
- API sổ và khoản vay đọc theo trang (`allPages` trong `src/lib/api/paging.ts`): PostgREST trả tối đa 1000 dòng mỗi lần và không báo bị cắt.
- Form khoản vay: một sổ thì `PrincipalCovered` tự bằng số tiền vay và không hiện ô nhập; từ hai sổ mới hiện ô "Phần gốc vay bảo đảm" kèm dòng "Đã chia x / y", sổ thêm sau điền sẵn phần còn thiếu.

## Công thức (`src/lib/pledgeLoanMath.ts`, `pledgeLoan.ts`, `savingsBook.ts`)

- Lãi = round(gốc × lãi suất năm × số ngày thực tế / 365).
- Trả trước một phần: lãi trên **toàn bộ** dư nợ từ ngày tính lãi gần nhất đến ngày trả, cộng gốc trả; kỳ sau tính từ ngày trả trên dư nợ còn lại.
- Trả toàn bộ trước hạn / khi đến hạn: gốc còn lại + lãi đến ngày trả (khi đến hạn thì ngày trả = ngày đến hạn).
- Trả sau đến hạn: lãi trong hạn tính đến ngày đến hạn; phạt gốc 150% lãi suất, phạt lãi 10%/năm (`calcOverduePenalty`).
- Tất toán sổ để cấn trừ: tiền sổ = gốc + lãi (trước đáo hạn: lãi không kỳ hạn 0,20%/năm) − lãi đã chi; chênh lệch với nợ phải trả là phần trả khách hoặc khách nộp thêm.
- Khả năng bảo đảm của sổ: lãnh lãi cuối kỳ = gốc + lãi đến đáo hạn; định kỳ/lãnh trước = gốc − lãi đã chi; ngoại tệ = 90% gốc quy đổi. Thiếu lãi suất, ngày gửi hoặc kỳ hạn thì không tính được (null), không coi là 0.
- Nghĩa vụ của khoản vay (dư nợ + lãi đến hạn) chia cho các sổ theo tỷ lệ `PrincipalCovered`; còn trống = khả năng bảo đảm − nghĩa vụ đã phân bổ.
- Nhóm nợ tính sống từ số ngày quá hạn (`debtGroupFromOverdueDays`).

## Tổng hợp

Dashboard (tổng dư nợ, hạn mức đã cấp, số KH có dư nợ, phương thức "Cầm cố sổ tiết kiệm", nhóm nợ, giá trị TSBĐ), báo cáo đến hạn và báo cáo danh mục cộng thêm khoản cầm cố qua `src/lib/pledgePortfolio.ts`. Bảng cảnh báo KUNN đến hạn (Dashboard và báo cáo cảnh báo, `src/lib/reports/alertData.ts`) gộp cả khoản cầm cố đang mở, đổi sang dạng KUNN bằng `pledgeLoanAsKunn`; bộ lọc "chỉ nhóm 1" dùng `pledgeLoanDebtGroup`.

## Chuyển dữ liệu cũ (migration 77)

Một khối DO nguyên tử. Chuyển KUNN cầm cố (KUNN hoặc HĐTD mang phương thức cầm cố); HĐTD chưa có KUNN không chuyển. Dư nợ cũ tính đúng như `outstandingOf`, gốc đã thu tính lại từ `RepaymentSchedules` (không đọc view `ContractPaidPrincipal` vì view rỗng khi chạy trong SQL Editor) và ghi thành dòng trả một phần tại ngày giải ngân. Dừng cả khối khi KUNN thiếu dữ liệu, TSBĐ không phải sổ, TSBĐ còn bảo đảm khoản vay khác hoặc nằm trong HĐ thế chấp, hay KUNN đang vay không còn sổ nào.
