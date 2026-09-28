---
name: tin-dung
description: Kiến thức nghiệp vụ, quy ước kỹ thuật, mô hình bảo mật, công thức tài chính và hướng dẫn phát triển của hệ thống CustomerManager. Dùng khi làm bất cứ việc gì liên quan tới lãi, gốc, lịch trả nợ, LTV, tài sản bảo đảm, hạn mức tín dụng, cho vay từng lần, phân nhóm nợ, sản phẩm vay, giải ngân theo tiến độ, phí phạt trả trước, chào lãi suất theo chương trình, huy động, mua bán vốn nội bộ (COF), thẻ tín dụng, báo cáo tài chính doanh nghiệp, phương án kinh doanh, mã mục đích sử dụng vốn, kiểm soát sau vay, xuất biểu mẫu (.docx/.xlsx/.pptx), bảo mật RLS, quy ước giao diện, kiến trúc dự án hoặc thiết lập môi trường trong codebase này.
---

# Cẩm Nang & Nghiệp Vụ Tín Dụng — CustomerManager

Ứng dụng web quản lý hồ sơ tín dụng ngân hàng: khách hàng, hợp đồng tín dụng (HĐTD), giấy nhận nợ (KUNN), tài sản bảo đảm (TSĐB), thẻ tín dụng, lịch trả nợ và các công cụ tính toán phục vụ tư vấn.

Mã nguồn **không chứa chú thích trực tiếp trong code**. Toàn bộ giải thích kiến trúc, mô hình bảo mật, quy ước kỹ thuật và công thức tài chính nằm ở **tài liệu này** (tổng quan + quy tắc cốt lõi) và **thư mục `references/`** (chi tiết từng nghiệp vụ).

> **Quy tắc bất biến:** Trước khi sửa bất cứ thứ gì liên quan tới tiền, lãi, gốc, LTV, hạn mức hoặc bảo mật — đọc SKILL.md này, rồi mở đúng file trong `references/` cho mảng đang làm. **CODE là nguồn sự thật**: nếu tài liệu mâu thuẫn code, tin code và sửa tài liệu.

---

## 1. Bản đồ điều hướng — mở `references/` nào khi làm gì

SKILL.md giữ phần cốt lõi luôn cần. Chi tiết đầy đủ từng nghiệp vụ nằm trong `references/`. Mở đúng file trước khi chạm vào mảng đó:

| Đang làm về... | Mở file |
| :--- | :--- |
| Lịch trả nợ, tính lãi Actual/365, phân bổ & làm tròn gốc, ân hạn, trả trước hạn, bất biến Σgốc | `references/loan-math.md` |
| Phân nhóm nợ, số ngày quá hạn, lãi phạt, **nhóm nợ tính sống + cron cập nhật DebtGroup** | `references/debt-classification.md` |
| LTV theo loại tài sản, hiệu lực định giá, so khớp `CollateralIds` | `references/collateral-ltv.md` |
| HMTD/HĐTD/KUNN, ba trường hợp hạn mức, đóng HĐTD, số KUNN, `min` ba giới hạn | `references/credit-limit-lifecycle.md` |
| Chào lãi suất theo chương trình, **chồng lấn (bản mới nhất thắng)**, huy động, COF, giảm lãi, nhân bản/xóa chương trình | `references/rate-programs.md` |
| Thẻ tín dụng: ba trường hợp mở thẻ, hợp đồng thẻ, mã chính sách, biểu phí | `references/credit-cards.md` |
| Báo cáo tài chính doanh nghiệp (B01a/B02/B01b theo TT133), kiểm tra cân đối, bộ tỉ số | `references/corporate-financial.md` |
| Phương án kinh doanh tính hạn mức, phân tích trả nợ trước hạn, TOI | `references/business-plan.md` |
| Mã mục đích sử dụng vốn (cấp 5/cấp 6), quy ước FBE, dữ liệu chuẩn hóa, tìm kiếm | `references/loan-purpose-mdsdv.md` |
| Hồ sơ khách hàng, phân quyền `OwnerId`, xóa KH/HĐTD, kiểm soát sau vay | `references/customer-and-post-loan.md` |
| RLS, vai trò admin/banker, quy ước CSDL, `SECURITY INVOKER`/`DEFINER`, pg_cron | `references/security-database.md` |
| Xuất `.docx`/`.xlsx`/`.pptx` thật, in qua iframe, đọc số thành chữ, xuất lịch kèm công thức | `references/export-documents.md` |
| Lớp token Sáng/Tối, định dạng số/tiền, i18n, định tuyến, **backdrop-blur bị vô hiệu**, de-nesting, Logo | `references/ui-conventions.md` |
| Kho hàng, bảng kê mua bán, hóa đơn bán lẻ (phân hệ phụ trợ, không phải lõi tín dụng) | `references/retail-inventory.md` |

---

## 2. Công nghệ & Môi trường phát triển

| Thành phần | Lựa chọn |
| :--- | :--- |
| **Giao diện** | React 19 + TypeScript + Vite |
| **Kiểu dáng** | TailwindCSS 4, giao diện Sáng / Tối |
| **Biểu đồ & Biểu tượng** | Recharts, Lucide Icons |
| **Dữ liệu & Xác thực** | Supabase (PostgreSQL + Auth + Row Level Security) |
| **Kiểm thử** | Vitest |
| **Triển khai** | Vercel |

Ứng dụng gọi trực tiếp Supabase từ trình duyệt qua `@supabase/supabase-js`. **Không có tầng backend riêng** — an toàn dữ liệu dựa hoàn toàn vào Auth và RLS ở phía PostgreSQL.

### Thiết lập & lệnh vận hành

Tạo `.env` từ `.env.example` (`VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`). **Không commit `.env`** — ứng dụng báo lỗi ngay khi thiếu biến môi trường thay vì âm thầm dùng giá trị dự phòng.

```bash
npm install
npm run dev        # Máy chủ phát triển Vite
npm run build      # Kiểm tra kiểu TypeScript + đóng gói
npm test           # Toàn bộ test tự động (Vitest)
npm run lint       # Kiểm tra mã nguồn (Oxlint / ESLint)
```

---

## 3. Cấu trúc thư mục & Nguyên tắc tổ chức

```
src/
├── components/
│   ├── views/        Màn hình chính từng phân hệ
│   ├── portfolio/    Khoản vay & Giấy nhận nợ (KUNN)
│   ├── collateral/   Tài sản bảo đảm
│   ├── calculator/   9 công cụ tính toán tài chính
│   ├── rate/         Chào lãi suất & biểu lãi suất huy động
│   ├── card/         Thẻ tín dụng
│   ├── corporateFinancial/  Báo cáo tài chính doanh nghiệp
│   ├── inventory/    Kho hàng, bảng kê, hóa đơn bán lẻ
│   ├── mdsdv/        Tra cứu mã mục đích sử dụng vốn
│   └── documents/    Soạn & xuất biểu mẫu (.docx, .xlsx, .pptx)
├── context/          Theme, Format, Date, Font, Auth, Confirm
├── hooks/            Controller cho từng màn (tách state khỏi view)
├── lib/              Logic nghiệp vụ THUẦN (pure functions) + tầng data access
└── types/            Kiểu dữ liệu TypeScript dùng chung
supabase/migrations/  Script SQL migration chạy theo thứ tự
```

**Nguyên tắc bất di:** mọi công thức tính tiền **phải là hàm thuần trong `src/lib/`**, tuyệt đối không nhúng phép tính tiền vào component `.tsx`. Component chỉ gọi hàm và hiển thị. State phức tạp tách ra `src/hooks/use*Controller.ts`.

---

## 4. Bài học kỹ thuật xương máu (quy tắc vàng)

**1. Không dùng `||` khi `0` là giá trị hợp lệ.** `parseFloat('0') || 80` cho ra `80`, biến tài sản "Hạn chế nhận TS" (LTV 0%) thành bậc cao nhất (80%). Luôn kiểm tra `null`/`undefined`/`NaN` tường minh; phân biệt `0` (số thật) và `null` (chưa khai).

**2. Cấm `toISOString().split('T')[0]` để lấy hôm nay.** `toISOString()` lấy giờ UTC → trước 07:00 sáng VN (UTC+7) trả về **ngày hôm qua**, tính sai mốc điều chỉnh lãi & hiệu lực HĐTD. Luôn dùng `todayIso()` (`utils.ts`).

**3. Không nuốt lỗi, không tự đoán ý.** Bắt lỗi rồi lưu sau khi xoá bớt trường → giao diện báo thành công trong khi mất dữ liệu. Không tự sinh lại số KUNN mà chưa kiểm DB — trùng số phải báo lỗi rõ để banker tra chứng từ.

**4. Không nhét dữ liệu nghiệp vụ vào `Note`.** Mỗi thông tin nghiệp vụ phải có cột riêng — nhét `Note` thì không truy vấn/kiểm toán được và trôi dạt khỏi cột thật.

**5. Hai chế độ lãi suất loại trừ nhau.** Một KUNN chỉ thuộc **Ưu đãi** (`PreferentialRate`, `PreferentialPeriodMonths`, `PostPreferentialRate`, `MarginRate`) HOẶC **Thông thường** (`BaseRate`, `MarginRate`, `NormalRate`). Chọn chế độ này thì xoá hoàn toàn nhánh kia. Chi tiết: `references/rate-programs.md`.

**6. Phụ trội điều kiện (`PenaltySurcharge`)** lưu theo **điểm phần trăm** (`0.2` = 0,20%), KHÔNG qua `toPercent()`. Công thức: `applyRateFloor(BaseRate + MarginRate) + PenaltySurcharge`.

**7. Đóng HĐTD ≠ hết hiệu lực.** Đóng HĐTD chỉ dừng quyền giải ngân mới (`available = 0`), không xoá nợ; KUNN còn nợ vẫn trả theo lịch tới khi tất toán. Không đóng được HĐTD khi còn KUNN chưa tất toán (trigger CSDL). Chi tiết: `references/credit-limit-lifecycle.md`.

**8. Nhóm nợ phải tính SỐNG.** Cột `LoanContracts.DebtGroup` lưu hay bị cũ. Dùng **`max(nhóm lưu, nhóm tự tính theo số ngày quá hạn)`**; có pg_cron cập nhật hàng ngày (chỉ nâng, không tự hạ). Chi tiết: `references/debt-classification.md`.

**9. Chương trình lãi suất ĐƯỢC PHÉP chồng lấn ngày.** Resolver chọn bản `EffectiveFrom` mới nhất; chỉ chặn khi trùng ĐÚNG ngày bắt đầu. Chi tiết: `references/rate-programs.md`.

---

## 5. Mô hình bảo mật & RLS (tóm tắt — chi tiết `references/security-database.md`)

- Bắt buộc đăng nhập, **không tự đăng ký**. Vai trò: `admin` (toàn quyền) / `banker` (chỉ KH mình phụ trách qua `Customers.OwnerId`). Quyền trên TSĐB/HĐTD/KUNN/thẻ/lịch trả nợ suy ra tự động theo quan hệ tới Khách hàng.
- RLS bật **100% bảng**. Khoá `anon` công khai trên client → RLS là lớp phòng thủ duy nhất. Bảng chưa dùng bật RLS **không kèm policy** (khoá mặc định).
- **Sinh ID do CSDL** (sequence), không `max(Id)+1` phía client (client chỉ thấy phần dữ liệu của mình).
- `service_role` key **tuyệt đối không** vào mã client.

---

## 6. Thuật ngữ ngân hàng & Ký hiệu

| Ký hiệu | Tên đầy đủ | Giải thích |
| :--- | :--- | :--- |
| **HMTD** | Hạn mức tín dụng | Cấp tín dụng tuần hoàn bổ sung vốn lưu động (vay – trả – tự phục hồi hạn mức). |
| **TL** | Cho vay từng lần | Vay không tuần hoàn (dư nợ giảm dần, trả hết là tất toán). |
| **HĐTD** | Hợp đồng tín dụng | Hợp đồng khung (HMTD) hoặc hợp đồng vay cụ thể (TL). |
| **GNN / KUNN** | Giấy/Khế ước nhận nợ | Xác nhận số tiền, thời hạn, lãi suất của từng lần rút vốn. |
| **GN** | Giải ngân | Xuất tiền cho bên vay/thụ hưởng. |
| **LS / LSCV** | Lãi suất (cho vay) | Tỷ lệ tính tiền lãi (%/năm). |
| **LSCS** | Lãi suất cơ sở | Tham chiếu để tính lãi thả nổi sau thời gian ưu đãi. |
| **TSBĐ / TSĐB** | Tài sản bảo đảm | Tài sản thế chấp/cầm cố đảm bảo nghĩa vụ trả nợ. |
| **LTV** | Loan-to-Value | Tỷ lệ cho vay tối đa trên giá trị định giá TSĐB. |
| **COF** | Cost of Funds | Giá vốn nội bộ (FTP bán) Hội sở điều chuyển cho đơn vị. |
| **MĐSDV / FBE** | Mã mục đích sử dụng vốn | Mã ngành + mục đích, khai trên Core Banking. |

---

## 7. Công thức & Quy chuẩn tài chính cốt lõi

*(Chi tiết đầy đủ: `references/loan-math.md`, `references/collateral-ltv.md`, `references/debt-classification.md`.)*

**Lãi Actual/365:** `Tiền lãi = Dư nợ đầu kỳ × Lãi suất năm × Số ngày thực tế trong kỳ / 365`. Số ngày là số ngày thực tế giữa hai mốc (không làm tròn 30) — lãi tháng 31 ngày cao hơn tháng 28 ngày dù dư nợ giảm.

**Bất biến quan trọng nhất:** `Σ(Tiền gốc các kỳ) = Tổng số tiền vay giải ngân` — đúng ở **mọi** phương thức trả nợ (trả góp đều, gốc cuối kỳ, ân hạn, giải ngân theo tiến độ, trả trước hạn). Mọi test logic tiền phải kiểm bất biến này.

**Làm tròn gốc:** làm tròn **LÊN** bước 10.000đ (`PRINCIPAL_ROUND_MODE`); kỳ cuối gánh phần lẻ để khớp tổng. Gốc cố định theo GNN dùng `MonthlyPrincipalAmount` (migration 36).

**LTV theo loại tài sản** (chi tiết + hiệu lực định giá: `references/collateral-ltv.md`):

| Loại tài sản | LTV | Loại tài sản | LTV |
| :--- | ---: | :--- | ---: |
| BĐS Loại 1 | 80% | STK cùng hệ thống | 100% |
| BĐS Loại 2 | 70% | STK khác hệ thống | 90% |
| BĐS Loại 3 | 60% | Giấy tờ có giá | 80% |
| BĐS Loại 4 | 55% | Phương tiện vận tải | 70% |
| **Hạn chế nhận TS** | **0%** | Máy móc thiết bị | 60% |
| | | Hàng hóa, Quyền tài sản | 50% |

Chứng thư định giá chỉ tính hạn mức trong hiệu lực (6/12/24 tháng); hết hiệu lực → `usableCapacity` = 0. Lọc `CollateralIds` ("1,5,12") phải **tách theo dấu phẩy so từng phần tử**, không `LIKE '%1%'` (khớp nhầm `10`, `21`).

**Phân nhóm nợ** (căn cứ số ngày quá hạn lớn nhất của kỳ chưa thanh toán): N1 <10 ngày; N2 10–90; N3 91–180; N4 181–360; N5 >360. **Đọc `references/debt-classification.md`**: dùng `max(nhóm lưu, nhóm auto)`, có cron cập nhật.

---

## 8. Ba tầng hạn mức & Vòng đời khoản vay (chi tiết `references/credit-limit-lifecycle.md`)

```
Phê duyệt HMTD  →  Hợp đồng tín dụng (HĐTD)  →  Giấy nhận nợ (KUNN)
```

1. **HMTD — vốn lưu động:** vay–trả–tự phục hồi (`available = granted − used`); HĐTD 12–24 tháng, KUNN 3–12 tháng; lãi trả hàng tháng, gốc trả cuối kỳ KUNN; HĐTD hết hạn thì không rút mới, KUNN còn lại thu hồi tới đáo hạn.
2. **Cho vay từng lần:** HĐTD và KUNN gộp một, 60–360 tháng; không phục hồi khi trả gốc; hỗ trợ giải ngân theo tiến độ + ân hạn gốc; gốc trả đều sau ân hạn.
3. **Chốt chặn đáo hạn:** dãy kỳ kết thúc tại ngày đáo hạn; đổi kỳ hạn dùng `reconcileScheduleRows` (không xoá trắng lịch cũ để giữ lịch sử thu nợ).
4. **SQL thống kê hạn mức:** gom theo tiền tố HĐTD gốc, cộng mức bằng `coalesce(nullif("LoanAmount",0), "ContractAmount", 0)` — không cộng thẳng từng dòng KUNN (nhân ảo mức cấp).

---

## 9. Quy trình chuẩn khi sửa đổi logic tiền

1. Đọc SKILL.md này + đúng file `references/` cho mảng đang làm.
2. **Viết test trước** (Red-Green-Refactor), đặc biệt kiểm bất biến `Σ(gốc) = Tiền vay`.
3. Cài logic tại `src/lib/` (hàm thuần), không nhúng phép tính vào `.tsx`.
4. `npm test && npm run build`.
5. Nếu đổi CSDL: tạo migration trong `supabase/migrations/`, **áp migration trên Supabase TRƯỚC khi deploy code**.
6. Kiểm chứng thực tế: file xuất, giao diện, phản hồi CSDL.
7. Ghi một mục vào `docs/progress/YYYY-MM.md` theo khuôn tại `docs/progress/README.md` (`PROGRESS.md` cũ đã đóng băng, chỉ tra cứu); nếu quy tắc nghiệp vụ thay đổi, **cập nhật lại file `references/` tương ứng ở CẢ HAI cây** `.agents/` và `.claude/` để tài liệu không trôi khỏi code.
