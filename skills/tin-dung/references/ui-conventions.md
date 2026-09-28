# Quy ước giao diện, định dạng, i18n, định tuyến & tách vai trò `src/`

Nguồn sự thật là **CODE**. Tài liệu này gấp lại các mục liên quan trong CONVENTIONS.md (đã/ sẽ xóa) nhưng khi tài liệu cũ lệch code thì **theo code**, và mọi chỗ lệch đều được ghi rõ trong phần "Lệch với tài liệu cũ".

## Mục lục

- [1. Lớp token giao diện (Sáng/Tối)](#1-lớp-token-giao-diện-sángtối)
- [2. Chuỗi class dùng chung `uiClasses.ts`](#2-chuỗi-class-dùng-chung-uiclassests)
- [3. Thang chữ & font `fontSettings.ts`](#3-thang-chữ--font-fontsettingsts)
- [4. Định dạng số/tiền/lãi suất `formatSettings.ts`](#4-định-dạng-sốtiềnlãi-suất-formatsettingsts)
- [5. Định tuyến tập trung `routes.ts` + `navigation.ts`](#5-định-tuyến-tập-trung-routests--navigationts)
- [6. Hai ngôn ngữ i18n `i18n.ts`](#6-hai-ngôn-ngữ-i18n-i18nts)
- [7. Hiệu năng: backdrop-blur bị vô hiệu toàn cục](#7-hiệu-năng-backdrop-blur-bị-vô-hiệu-toàn-cục)
- [8. De-nesting: một lớp card ngoài cùng](#8-de-nesting-một-lớp-card-ngoài-cùng)
- [9. Logo dùng chung](#9-logo-dùng-chung)
- [10. Quy tắc hình thức dùng chung](#10-quy-tắc-hình-thức-dùng-chung)
- [11. Tách vai trò thư mục `src/`](#11-tách-vai-trò-thư-mục-src)
- [12. Lệnh vận hành](#12-lệnh-vận-hành)
- [13. Lệch với tài liệu cũ](#13-lệch-với-tài-liệu-cũ)

---

## 1. Lớp token giao diện (Sáng/Tối)

### Vì sao có lớp token

Trước đây mỗi component tự quyết định màu bằng `isLight ? 'bg-white…' : 'bg-slate-900…'` — rải khắp hàng chục file, cộng chuỗi class truyền qua props và nhiều dòng `!important` để vá tương phản. Đổi diện mạo là phép nhân theo số file; tương phản WCAG phải sửa ở từng lớp Tailwind. Lớp token gom màu về **một chỗ**: đổi một biến, cả app đổi theo.

### Cơ chế (theo `src/index.css`)

1. Biến màu `--t-*` khai ba lần:
   - `:root, :root.dark` — bảng màu **Tối** (đây cũng là **mặc định** khi chưa gắn class).
   - `:root.light` — bảng màu **Sáng**.
2. Khối `@theme inline` ánh xạ mỗi `--t-*` thành `--color-*`, biến chúng thành **utility Tailwind thật** (`bg-panel`, `text-ink`, `border-line`…).
3. `@custom-variant dark`/`light` cho phép biến thể `dark:` / `light:` bám theo class `.dark` / `.light` trên tổ tiên (không theo `prefers-color-scheme`).

Vì `:root` trần = Tối, giao diện **mặc định là Tối**; class `.light` (do context giao diện gắn lên `<html>`) mới lật sang Sáng.

### Danh mục utility (đọc từ `@theme inline`)

| Nhóm | Utility | Dùng cho |
| :--- | :--- | :--- |
| Nền | `bg-surface` `bg-panel` `bg-panel-muted` | nền trang, thẻ, dải tiêu đề bảng |
| Viền | `border-line` `border-line-strong` | viền thường, viền nhấn (đường tổng cộng) |
| Chữ | `text-ink` `text-ink-muted` `text-ink-faint` | số liệu, chữ phụ, nhãn cột |
| Hành động | `bg-accent` `text-accent` `bg-accent-soft` `text-accent-ink` | nút chính, dòng đang chọn |
| Trạng thái | `text-pos` `text-neg` `text-warn` (+ `-soft`) | đã thu, quá hạn/còn nợ, cảnh báo |
| Nhóm nợ | `bg-g1..g5`, `text-g1..g5` | 5 nhóm nợ (xanh → đỏ đậm) |
| Sắc định danh KPI | `kpi-cust` (tím) `kpi-collateral` (ngọc) `kpi-card` (hồng) | **chỉ** hàng KPI dashboard |

### Quy tắc tô màu — "đúng năm chỗ, không tô chỗ khác"

| Vị trí | Màu |
| :--- | :--- |
| Năm ô KPI | năm sắc định danh: `accent`, `kpi-cust`, `kpi-collateral`, `kpi-card`, `neg` |
| Số tiền trong bảng | `pos` |
| Ngày tháng trong bảng | `accent` |
| Trạng thái, hạn còn lại | viên nền `pos-soft`/`warn-soft`/`neg-soft`; quá hạn dùng `bg-neg` + `text-surface` |
| Tiêu đề, nhãn, khung | trung tính — **không tô** |

- Tiêu đề panel **không** được tô màu (tránh hai màu trang trí vô nghĩa cạnh các panel cảnh báo mang đúng nghĩa).
- `--t-kpi-*` **chỉ** cho hàng KPI, sống ở namespace riêng để không đụng nghĩa `pos`/`warn`. Cần phân biệt nơi khác thì phân biệt bằng chữ và bố cục.
- Viên trạng thái nền đặc phải dùng `text-surface`, **không** `text-white`: ở giao diện Tối nền đỏ sáng + chữ trắng chỉ đạt tương phản 2,71.

### Tương phản & kiểm thử

- Mọi cặp màu ngữ nghĩa đã đo ở **cả hai giao diện**, thấp nhất **4,50** (`accent` trên `panel-muted`, giao diện Sáng).
- `src/lib/themeTokens.ts` giữ **bản sao TypeScript** của bảng màu (`THEME_TOKENS.dark`/`.light`) và danh sách cặp cần đạt tương phản (`CONTRAST_PAIRS`, min 4.5) để test đọc được.
- Test giữ ngưỡng: `src/lib/__tests__/contrast.test.ts` (đo WCAG AA), `src/lib/__tests__/themeTokens.test.ts` (chặn bản TS trôi khỏi `index.css`).
- Đổi `--t-*` thì **đo lại**, đừng ước lượng bằng mắt; đừng hạ ngưỡng trong test để cho xanh — chỉnh giá trị màu.

> Lưu ý đặt tên lớp động: Tailwind quét mã tĩnh nên `bg-g${n}` **không sinh ra lớp**. Dùng bảng tra `DEBT_GROUP_COLOR[n]` trong `uiClasses.ts`.

---

## 2. Chuỗi class dùng chung `uiClasses.ts`

`src/lib/uiClasses.ts` là **nơi duy nhất** khai báo chuỗi class dùng chung. Component **không được** nhận chuỗi class qua props (luật cấm truyền props class, không cấm dùng biến cục bộ `const x = UI.inputStyle`).

| Hằng/Đối tượng | Nội dung |
| :--- | :--- |
| `UI.containerCardBg` | `bg-panel border border-line/65 text-ink shadow-xs` — card ngoài cùng |
| `UI.sectionBoxBg` | `bg-surface/90 border border-line/50 text-ink` |
| `UI.inputStyle` | ô nhập: `bg-surface/80 border-line/70 text-ink placeholder-ink-faint focus:border-accent` |
| `UI.readonlyInputStyle` | ô chỉ đọc: nền `panel-muted/80`, `font-semibold cursor-default` |
| `UI.tableHeaderStyle` / `TABLE_HEAD` | hàng tiêu đề bảng: nền `surface`, chữ `ink-faint` 10px in hoa, viền dưới |
| `UI.tableRowHover` | `hover:bg-accent/[0.04] transition-colors` |
| `UI.labelStyle` | `text-ink-muted font-medium` |
| `PANEL` | `bg-panel border border-line/70 shadow-xs` + `RADIUS_PANEL` |
| `TABLE_CELL` | `px-[var(--row-px)] py-[var(--row-py)]` — ô lấy giãn cách từ biến mật độ |
| `HEADING_SCREEN` / `HEADING_PANEL` / `SECTION_LABEL` | tiêu đề màn / tiêu đề thẻ / nhãn nhỏ 10px in hoa |
| `BTN_PRIMARY` | nền `accent`, chữ `accent-ink` — **mỗi màn chỉ một nút chính** |
| `BTN_SECONDARY` (= `BTN_GHOST`) | viền mờ, cho thao tác phụ (xuất Excel, in, nhập CSV) |
| `BTN_DANGER` | viền `neg`, cho thao tác xóa |
| `RADIUS_PANEL` / `RADIUS_CONTROL` / `RADIUS_PILL` | `rounded-[var(--r-panel/-control/-pill)]` |
| `ROW_RAIL_SELECTED` / `_NEUTRAL` / `_ALERT` | thanh trái dòng: chọn (`border-accent bg-accent-soft`), thường (trong suốt), cảnh báo (`border-neg`) |
| `DEBT_GROUP_COLOR` / `DEBT_GROUP_TEXT` | `Record<1..5, string>` — nền/chữ nhóm nợ (`bg-g1`…`bg-g5`) |

Bo góc dùng ba bán kính khai bằng biến CSS trong `index.css`: `--r-panel` 12px (thẻ/bảng/hộp thoại), `--r-control` 8px (nút/ô nhập/tab), `--r-pill` 999px (viên). Dùng qua hằng `RADIUS_*`, **không** viết `rounded-*` thô.

---

## 3. Thang chữ & font `fontSettings.ts`

### Vì sao không tải font ngoài

Hệ thống chạy trong **mạng nội bộ ngân hàng**; tải font từ CDN kéo theo phụ thuộc mạng và làm chữ nhảy khi mở trang. `FONT_FAMILIES` chỉ liệt kê font **có sẵn trên máy** (system, Inter/Segoe UI, Roboto, Noto Sans, Times New Roman), mỗi lựa chọn có dấu tiếng Việt đầy đủ + stack dự phòng. Mặc định `family: 'system'`.

**Không dùng `font-sans` của Tailwind** ở bất cứ đâu: nó ghi cứng `font-family`, chặn kế thừa `--app-font`. Cần thoát ngữ cảnh mono thì dùng `.font-app` (khai trong `index.css`, trỏ `var(--app-font)`).

### Người dùng chỉnh 4 nhóm → sinh biến ngữ nghĩa

`FontSettings` gồm `family`, `heading`, `table`, `small`, `mono`. Giới hạn kẹp trong `FONT_SIZE_LIMITS` (ví dụ heading 11–20, mặc định 14; table 11–18, mặc định 12). `clampFontSize` kẹp và làm tròn; `normalizeFontSettings` chuẩn hóa; lưu localStorage khóa `app_font_settings`.

`cssVariablesFor(s)` sinh biến gắn lên `<html>` qua `applyFontSettings`:

| Biến | Dẫn xuất | Mặc định | Dùng cho |
| :--- | :--- | ---: | :--- |
| `--app-font` | stack theo `family` | system | toàn bộ chữ |
| `--fs-heading` `--fs-table` `--fs-small` `--fs-mono` | 4 giá trị gốc | 14/12/11/12px | (bốn biến "cầu tạm") |
| `--fs-screen` | `heading + 4` | 18px | tiêu đề màn |
| `--fs-title` | `heading + 1` | 15px | tiêu đề thẻ |
| `--fs-body` | `table + 1` | 13px | ô bảng thường, ô nhập |
| `--fs-dense` | `table` | 12px | bảng dày (lịch 120 kỳ, ma trận COF) |
| `--fs-label` | `small` | 11px | nhãn cột/KPI, chú thích |
| `--fs-num` | `mono × 2` | 24px | số trên thẻ KPI |

### Cách các lớp Tailwind ăn theo thiết lập (theo `index.css`)

Ứng dụng dùng lớp tiện dụng Tailwind khắp nơi, nên `index.css` **ghi đè chính các lớp đó** sau `.font-mono`: `.text-xs → var(--fs-table)`, `.text-sm → var(--fs-heading)`, `.text-lg → var(--fs-screen)`, `.text-2xl → calc(--fs-heading × 1.35)`… Số tiền luôn `font-mono` (đã bật `tabular-nums`). Vì các lớp cỡ chữ cùng độ đặc hiệu với `.font-mono`, viết `text-[calc(...)]` thẳng trong component sẽ **bị ép về `--fs-mono`** — thêm cỡ mới phải khai trong `index.css` cạnh `.num-lead` (đã có `.num-lead` = mono × 1.4).

> Trạng thái thực tế: sáu biến ngữ nghĩa đã sinh ra nhưng phần lớn màn vẫn ăn theo **bốn biến cũ** qua khối ghi đè cuối `index.css`. Mã mới nên dùng biến ngữ nghĩa; bốn biến cũ là cầu tạm.

Mật độ dòng qua `data-density="cozy" | "compact"` đặt ở khối bao ngoài; ô bảng dùng `px-[var(--row-px)] py-[var(--row-py)]` nên đổi mật độ một chỗ là cả vùng đổi.

---

## 4. Định dạng số/tiền/lãi suất `formatSettings.ts`

Logic thuần ở `src/lib/formatSettings.ts`, trạng thái ở `FormatSettingsContext`. Người dùng chỉnh ở tab **Cấu Hình & Cài Đặt**.

| Thiết lập | Khóa localStorage | Mặc định |
| :--- | :--- | :--- |
| Kiểu phân cách (`numberStyle`) | `app_number_style` | `vi` — nghìn dấu chấm, thập phân dấu phẩy |
| Số thập phân (`decimalDigits`) | `app_decimal_digits` | 2 |
| Phần trăm (`percentDigits`) | `app_percent_digits` | 2 |
| Định dạng giờ (`timeFormat`) | `app_time_format` | `24h` |
| Tự động phân cách khi gõ (`autoGroupMoneyInput`) | `app_auto_group_money` | bật |

`NUMBER_SEPARATORS`: `vi` = `. , `, `en` = `, .`, `space` = `␠ ,`. `MAX_DIGITS = 6` (kẹp bởi `clampDigits`).

### Số tiền KHÔNG có phần thập phân

Đồng Việt Nam không dùng phần lẻ trong nghiệp vụ. `formatMoneyWith` **luôn gọi `formatNumberWith(value, 0, style)`** — tức 0 chữ số thập phân, chỉ ăn theo kiểu phân cách. Thiết lập "số thập phân" áp cho số thường (`formatDecimalWith`), **không** áp cho tiền. `parseMoneyWith` làm tròn về số nguyên (`Math.round`).

### Đổi mặc định của lãi suất

`fmtRate` (trong `utils.ts`, đọc `percentDigits`) mặc định nay in **`8,50%/năm`** — dấu phẩy chuẩn Việt Nam, khớp bảng lãi suất gửi khách. Muốn kiểu cũ `8.5%` thì chọn phân cách "Quốc tế" + phần trăm 1 chữ số. Suy đoán cũ `v > 1 ? v/100 : v` vẫn giữ (nhận cả `0.085` lẫn `8.5`) nhưng **sai với lãi suất > 100%/năm** — đừng dựa vào cho dữ liệu mới.

### Vì sao đọc thẳng localStorage + cache

Các hàm định dạng đọc thẳng localStorage (qua `loadFormatSettings`) để **mọi màn hình đổi theo mà không sửa nơi gọi**. Thiết lập được **cache trong module** (`cached`), xóa cache khi lưu (`saveFormatSettings` → `resetFormatSettingsCache`). Không cache thì mỗi ô tiền trong bảng vài nghìn dòng đọc localStorage một lần → chậm.

Hàm chính: `formatNumberWith`, `formatMoneyWith`, `formatDecimalWith`, `formatPercentWith`, `formatTimeWith`, `parseNumberWith`, `parseMoneyWith`, `groupInteger`. `NUMBER_STYLE_SAMPLES` cho mẫu hiển thị.

---

## 5. Định tuyến tập trung `routes.ts` + `navigation.ts`

`react-router` v7. **Bảng đường dẫn khai một chỗ** ở `src/lib/routes.ts` (`ROUTE_OF: Record<ScreenId, string>`); `src/lib/navigation.ts` đọc từ đó nên thanh bên và bảng lệnh không lệch đường dẫn.

- `DEFAULT_ROUTE = ROUTE_OF.dashboard` (`/dashboard`).
- `SCREEN_OF_PATH` = ánh xạ ngược; `screenIdOfPath(pathname)` trả `ScreenId | null` (bỏ gạch chéo cuối).
- Đường dẫn viết **tiếng Anh**, chữ thường, **không** gạch chéo cuối (chốt để tránh rắc rối mã hóa/công cụ). Bám `ScreenId`, cộng tiền tố nhóm `/tools/` và `/reference/`. Test `src/lib/__tests__/routes.test.ts` giữ ba quy tắc.

### Sáu nhóm điều hướng (`NAV_GROUPS`)

| `groupKey` | Nhãn VI | Các màn (id) |
| :--- | :--- | :--- |
| `nav.groupOverview` | Tổng quan | `dashboard` |
| `nav.groupRecords` | Hồ sơ tín dụng | `customers`, `credit-contracts`, `loans`, `collaterals`, `credit-cards` |
| `nav.groupCorporate` | Phân tích & BCTC Doanh nghiệp | `business-plan`, `corporate-financial`, `inventory` |
| `nav.groupProcurement` | Chứng từ & Bán hàng | `shopping-checklist`, `purchase-statement`, `retail-invoice` |
| `nav.groupFinancialTools` | Công cụ tính & Lãi suất | `calculators`, `rate-quote`, `cof` |
| `nav.groupLookupControl` | Tra cứu & Kiểm soát | `mdsdv`, `card-policies`, `templates`, `quiz-bank`, `post-loan`, `settings` |

Mỗi `NavItem` gồm `id`, `labelKey`, `groupKey`, `icon` (lucide-react), `path` (từ `ROUTE_OF`), `keywords` (cho tìm kiếm/bảng lệnh). `NAV_ITEMS = NAV_GROUPS.flatMap(g => g.items)`.

Đường dẫn công cụ tồn kho/chứng từ: `inventory → /tools/inventory`, `shopping-checklist → /tools/shopping-checklist`, `purchase-statement → /tools/purchase-statement`, `retail-invoice → /tools/retail-invoice`, `rate-quote → /tools/rate-quote`, `cof → /tools/cost-of-funds`. Tra cứu: `mdsdv → /reference/loan-purpose`, `card-policies → /reference/card-policies`, `templates → /reference/templates`, `quiz-bank → /reference/quiz`. Riêng `post-loan → /post-loan-control`.

### Thêm màn sửa BA chỗ

`routes.ts` (đường dẫn) + `navigation.ts` (mục thanh bên) + `App.tsx` (một `<Route>` cùng import `lazy`, vì `App.tsx` **viết cứng** từng route, không đọc `NAV_ITEMS`). Quên chỗ thứ ba: menu vẫn hiện nhưng bấm vào lặng lẽ nhảy về `/dashboard`, không lỗi — chỉ `src/components/__tests__/routing.test.tsx` bắt được. `vercel.json` đã có rewrite `/(.*) → /index.html` cho F5 đường dẫn con; đừng gỡ.

### Đường dẫn có phạm vi khách

Ngoài họ **phẳng** (`/loans`…), có họ **lồng** `/customers/:customerId/…` cho năm màn hồ sơ, cùng render một component. `src/lib/customerRoutes.ts` là **nơi duy nhất** dựng/đọc đường có `:customerId` (`customerPath`, `customerProfilePath`, `kunnSchedulePath`, `parseCustomerPath`, `CUSTOMER_SCOPED_SCREENS`). `src/hooks/useSelectedCustomerId.ts` là nơi duy nhất **đọc** khách đang chọn (thử `useParams` trước, rơi xuống `parseCustomerPath`). URL là nguồn sự thật duy nhất cho khách đang chọn (`WorkContext` đã xóa). Thêm màn có phạm vi khách sửa thêm chỗ thứ tư (`CUSTOMER_SCOPED_SCREENS` + `<Route>` lồng).

---

## 6. Hai ngôn ngữ i18n `i18n.ts`

`src/lib/i18n.ts` giữ từ điển `vi`/`en`; `LanguageContext` cấp `t()`, ghi `app_lang` vào localStorage + thuộc tính `lang` trên `<html>`. Công tắc VI/EN ở Header.

- `translate(lang, key, vars?)` tra từ điển, **fallback** `en → vi → key`; thay biến `{name}` nếu có.
- `TranslationKey` suy ra từ `dictionary.vi` (an toàn kiểu).
- `normalizeLang` mặc định `vi`.

**Công tắc đang TẮT** qua cờ `LANG_SWITCH_ENABLED = false`: mới có Header/Sidebar/`ScheduleTab`/`PeriodDetailCard` chuyển sang `t()`, các màn còn lại còn chuỗi tiếng Việt cứng. Bật nửa vời còn tệ hơn (nav tiếng Anh cạnh thân tiếng Việt). Dịch xong toàn bộ mới bật lại.

**Không viết song ngữ chồng dòng** (nhãn Anh kèm Việt bên dưới): một màn chỉ nói một thứ tiếng tại một thời điểm. Giá trị dữ liệu từ CSDL (`KunnTenor`, `PrincipalRepaymentMethod`, tên nhóm nợ…) **không dịch** — đó là dữ liệu nghiệp vụ.

---

## 7. Hiệu năng: backdrop-blur bị vô hiệu toàn cục

**Thay đổi hiện hành.** Cuối `index.css`, ngoài `@layer`, khai đè trực tiếp:

```
.backdrop-blur-md, .backdrop-blur-lg, .backdrop-blur-xl,
.backdrop-blur-2xl, .backdrop-blur-3xl { backdrop-filter: none; -webkit-backdrop-filter: none; }
```

- Vì sao: toàn app dùng ~196 chỗ backdrop-blur (đa số `-xl`, bán kính 24px) trên các panel trong vùng cuộn. Mỗi khung hình khi cuộn trình duyệt phải làm mờ lại nền sau từng panel → **nguồn giật chính**. Các panel này vốn đã đục 85–95% nên blur gần như không thấy mà rất tốn GPU.
- Chỉ vô hiệu các tầng nặng (**md trở lên**). **Giữ `backdrop-blur-xs` và `backdrop-blur-sm`** cho lớp nền mờ (scrim) của modal — nhẹ, chỉ hiện khi modal mở (không cuộn).
- Khai ngoài `@layer` nên thắng utility Tailwind theo tầng cascade (cùng cơ chế phần ghi đè cỡ chữ).
- **Hệ quả cho code mới:** thêm `backdrop-blur-md/-lg/-xl/-2xl/-3xl` mới sẽ **KHÔNG có tác dụng**. Header dùng nền đục thay cho blur.

---

## 8. De-nesting: một lớp card ngoài cùng

Quy ước left-rail (giảm viền lồng nhau):

- **Chỉ 1 lớp card ngoài cùng.** Nhóm con **không** bọc card riêng; phân tách bằng:
  - **Thanh màu trái (left-rail):** `pl-4 border-l-2 border-<màu>/40`.
  - **Đường kẻ** cho dòng lặp lại: `pb-3 border-b border-<màu>/15 last:border-b-0` (không phải card riêng cho mỗi dòng).
- **Vẫn giữ dạng card cho:** card ngoài cùng; thẻ KPI/summary là sibling top-level; wrapper bảng dữ liệu; banner kết quả nhấn mạnh.
- Vì sao: viền lồng nhau nhiều lớp làm rối thị giác và tăng "hộp trong hộp" không mang nghĩa; thanh màu/đường kẻ truyền cùng cấu trúc với ít nhiễu hơn.

---

## 9. Logo dùng chung

`src/components/Logo.tsx` — biểu tượng **khiên ngân hàng** (mái + cột trụ) vẽ bằng SVG nội tuyến, `viewBox="0 0 64 64"`. Nét vẽ dùng class `fill-accent` / `fill-panel` nên **tự đổi theo giao diện Sáng/Tối**, sắc nét mọi kích thước, **không tải ảnh ngoài**. Props: `className` (mặc định `w-8 h-8`), `title` (mặc định "Quản lý Khách hàng", đưa vào `aria-label`, `role="img"`).

Dùng **chung** cho `Header` và `LoginView` để nhất quán thương hiệu (đây là component thay cho logo dựng riêng từng chỗ).

---

## 10. Quy tắc hình thức dùng chung

Khai ở `src/lib/uiClasses.ts`, đừng dựng lại tại chỗ:

| Hạng mục | Quy tắc |
| :--- | :--- |
| Bo góc | 3 bán kính qua biến CSS (`--r-panel/-control/-pill`); dùng `RADIUS_*`, không `rounded-*` thô |
| Nút | `BTN_PRIMARY` — **mỗi màn một nút chính**; `BTN_SECONDARY` cho thao tác phụ; `BTN_DANGER` cho xóa |
| Tiêu đề | `HEADING_SCREEN` / `HEADING_PANEL` / `SECTION_LABEL`. **Chữ in hoa chỉ cho nhãn 10–11px**; tiêu đề `text-sm` trở lên viết thường |
| Trạng thái nền đặc | `bg-neg/bg-warn/bg-pos` đi kèm `text-surface` (không `text-white`) |
| Bảng | `TABLE_HEAD` cho hàng tiêu đề, `TABLE_CELL` cho ô (giãn cách theo `--row-px/--row-py`) |

### Thông báo — một đường duy nhất

`Toast` (`src/components/Toast.tsx`) + hook `useToast`. **Không** nơi nào tự dựng khung thông báo hay gọi `window.alert`. Toast có nút đóng, `role="status"` với `aria-live` theo mức độ, mốc trên bám `--header-h`, trên màn hẹp trải ngang. Đừng báo thành công cho việc chưa xảy ra.

### Bảng đổi hình dạng theo thiết bị

`DataTable` (`src/components/ui/DataTable.tsx`) nhận **một** bộ `columns` kèm `priority: 1|2|3` rồi dựng cả hai hình dạng: **bảng** trên máy tính, **thẻ dọc** trên điện thoại (điểm ngắt `md` 768px). Đừng viết bảng và thẻ thành hai đoạn mã riêng (chúng sẽ trôi dạt). Hai chỗ cố ý giữ bảng cuộn ngang: lịch trả nợ 120 kỳ (Công cụ tính) và ma trận lãi suất COF.

---

## 11. Tách vai trò thư mục `src/`

| Thư mục | Vai trò |
| :--- | :--- |
| `src/lib/` | Logic thuần, **không phụ thuộc React**: tính toán tài chính, định dạng, gọi API/data access, chuỗi class dùng chung, từ điển ngôn ngữ |
| `src/hooks/` | Trạng thái + luồng nghiệp vụ tái sử dụng (vd `usePaymentModal` giữ trọn luồng ghi nhận thu nợ) |
| `src/context/` | Trạng thái toàn ứng dụng: phiên đăng nhập, giao diện Sáng/Tối, ngôn ngữ, thiết lập định dạng |
| `src/components/views/` | Màn hình: điều phối dữ liệu + ghép thành phần con, **không** ôm logic nghiệp vụ |
| `src/components/<miền>/` | Thành phần theo miền: `portfolio`, `collateral`, `calculator`, `rate`, `documents`, `inventory`, `dashboard` |
| `src/types/` | Định nghĩa kiểu dùng chung |

Một tệp làm một việc. Màn > 400 dòng là dấu hiệu logic nằm nhầm chỗ: rút phần tính thuần về `lib/`, trạng thái+luồng về `hooks/`, trình bày về component con. Ví dụ đã tách: `lib/kunnForm.ts` (ánh xạ bản ghi↔form), `hooks/useCustomerPortfolio.ts` (nạp dữ liệu), `hooks/usePaymentModal.ts` (luồng thu nợ), `views/LoanPortfolioView.tsx` (điều phối). Hook nhận cập nhật qua callback (`onCustomerChanged`…), không tự đụng state màn.

---

## 12. Lệnh vận hành

```bash
npm run dev        # Máy chủ phát triển
npm run build      # Kiểm tra kiểu + đóng gói
npm test           # Chạy test (Vitest)
npm run lint       # Kiểm tra mã nguồn
```

---

## 13. Lệch với tài liệu cũ

- **Số test cố định:** CONVENTIONS.md ghi `npm test # 1.686 test`. Con số này thay đổi theo thời gian — tài liệu này bỏ con số cứng, chỉ ghi mục đích lệnh.
- **Gộp màn tồn kho:** CONVENTIONS.md §15 nói `/tools/purchase-statement` và `/tools/retail-invoice` sẽ "biến mất vào `/tools/inventory` ở đợt 5". **Code hiện vẫn giữ ba màn riêng** — cả ba đường dẫn còn tồn tại trong `routes.ts` và ba mục còn trong `navigation.ts` (nhóm `groupProcurement`). Theo code.
- **Nhãn nhóm điều hướng:** CONVENTIONS.md gọi chung "6 nhóm chuẩn hóa". Nhãn VI thực tế trong `i18n.ts`: nhóm `groupProcurement` = "Chứng từ & Bán hàng" (không phải "Mua sắm"), `groupCorporate` = "Phân tích & BCTC Doanh nghiệp". `i18n.ts` còn giữ vài khóa nhóm cũ không dùng (`groupTools`, `groupBusinessTools`, `groupLookup`, `groupControl`) — `NAV_GROUPS` không tham chiếu chúng.
- **`--app-font` khởi tạo:** `index.css` đặt sẵn `--app-font: 'IBM Plex Sans', system-ui…` làm giá trị ban đầu trước khi JS chạy, trong khi `fontSettings.ts` mặc định `family: 'system'` (stack `system-ui…`, không có IBM Plex Sans). Khi `applyFontSettings` chạy sẽ ghi đè theo lựa chọn người dùng; IBM Plex Sans chỉ là nền tạm nếu máy có sẵn.
- **Biến ngữ nghĩa font chưa dùng hết:** sáu biến `--fs-screen/-title/-body/-dense/-label/-num` đã sinh nhưng phần lớn màn vẫn ăn theo bốn biến cũ qua khối ghi đè lớp Tailwind cuối `index.css` (đúng như CONVENTIONS cảnh báo). `--fs-num` đổi **không** tự làm số thẻ KPI đổi (KpiCard khai cứng cỡ).
