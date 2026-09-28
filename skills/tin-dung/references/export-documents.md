# Xuất tài liệu & in ấn

> Nguồn sự thật: **CODE**. Tài liệu gộp phần liên quan của `CONVENTIONS.md` (xuất OOXML thật; ngân hàng câu hỏi; in & tải file) nhưng khi lệch thì **theo code**. Kèm lý do "vì sao", ví dụ và lỗi từng xảy ra.

## Mục lục

- [1. Nguyên tắc lớn: file THẬT, không HTML đội lốt](#1-nguyên-tắc-lớn-file-thật-không-html-đội-lốt)
- [2. Hạ tầng OOXML dùng chung (`ooxml.ts`)](#2-hạ-tầng-ooxml-dùng-chung-ooxmlts)
- [3. Xuất `.xlsx` (`xlsxWriter.ts`)](#3-xuất-xlsx-xlsxwriterts)
- [4. Xuất `.docx` (`docxWriter.ts`)](#4-xuất-docx-docxwriterts)
- [5. Xuất `.pptx` (`pptxWriter.ts`)](#5-xuất-pptx-pptxwriterts)
- [6. In: `printHtmlDoc` — đường in duy nhất](#6-in-printhtmldoc--đường-in-duy-nhất)
- [7. Tải file: `xlsExport.ts` — đường tải duy nhất](#7-tải-file-xlsexportts--đường-tải-duy-nhất)
- [8. Bảng in HTML (`rateSheet.ts` / `dueList.ts`)](#8-bảng-in-html-ratesheetts--duelistts)
- [9. Đọc số thành chữ (`numberToWords.ts`)](#9-đọc-số-thành-chữ-numbertowordsts)
- [10. Lịch trả nợ kèm công thức Excel (`scheduleFormulaExport.ts`)](#10-lịch-trả-nợ-kèm-công-thức-excel-scheduleformulaexportts)
- [11. Ngân hàng câu hỏi (`quizBank.ts`) — chống trùng bằng trigger](#11-ngân-hàng-câu-hỏi-quizbankts--chống-trùng-bằng-trigger)

---

## 1. Nguyên tắc lớn: file THẬT, không HTML đội lốt

Khi xuất `.xlsx` / `.docx` / `.pptx`, hệ thống sinh **tệp OOXML thật** (ZIP + XML đúng lược đồ), **không ghi HTML rồi đặt đuôi Office**.

> Lỗi từng xảy ra: `downloadXls` cũ ghi HTML rồi đặt tên `.xls`. Excel mở được nhưng **luôn cảnh báo** *"The file format and extension don't match"*; đổi đuôi thành `.xlsx` chỉ hỏng nặng hơn vì `.xlsx` là một tệp **ZIP**, không phải HTML.

**Không nhúng thư viện ngoài** cho việc này — cùng lý lẽ với việc không nhúng thư viện PDF: mọi thứ tự dựng bằng `ooxml.ts`. Kiểm chứng không dừng ở test đơn vị: sinh tệp ra đĩa rồi cho bộ đọc OOXML thật (**openpyxl / python-docx / python-pptx**) đọc lại — mở được thì Office mở được (lưu ý python-pptx **dễ tính hơn** PowerPoint, bỏ qua vài lỗi thứ tự lược đồ).

Còn sót lại HTML `.xls` (hai tab `Công cụ 1`, `Công cụ 4`) vì chúng cần màu + gộp ô mà `xlsxWriter` hiện chỉ làm lưới trơn — đây là **nợ kỹ thuật đã biết**, không phải mẫu để noi theo.

---

## 2. Hạ tầng OOXML dùng chung (`ooxml.ts`)

Phần ZIP + XML chung nằm ở `src/lib/ooxml.ts` (từ 10/08/2026, khi `docxWriter` thành nơi dùng thứ hai):

| Hàm/hằng | Vai trò |
| :--- | :--- |
| `zipStore(entries)` | Đóng gói ZIP **dạng store** (không nén) kèm **CRC32 tự tính**. |
| `escapeXml(value)` | Thoát ký tự XML. |
| `utf8(text)` | Chuỗi → bytes UTF-8. |
| `XML_DECL` | Khai báo XML chuẩn (`standalone="yes"`). |

`xlsxWriter` **xuất lại** `escapeXml`/`zipStore` để nơi gọi cũ khỏi phải sửa import.

---

## 3. Xuất `.xlsx` (`xlsxWriter.ts`)

Sinh OOXML thật với **sáu thành phần bắt buộc**: `[Content_Types].xml`, `_rels/.rels`, `xl/workbook.xml`, `xl/_rels/workbook.xml.rels`, `xl/styles.xml`, `xl/worksheets/sheet1.xml`; chuỗi ghi **nội tuyến** (inline string).

API chính: `buildXlsx(sheet)`, `buildMultiSheetXlsx(sheets)`, `sheetXml`, `buildStyleSheet(rows)`, `styleKey`, `columnLetter`, `sanitizeSheetName`. Hằng: `MIME_XLSX`, `BASE_FONT = 'Times New Roman'`, `BASE_FONT_SIZE = 11`, `BORDER_COLOR`.

**Ba chỗ dễ sai (lỗi lược đồ, thiếu là Excel đòi sửa file):**
- Mã định dạng số tuỳ biến phải bắt đầu từ **164** (dưới đó là mã dựng sẵn của Excel).
- Hai ô tô nền đầu trong `fills` là **chỗ dành riêng** của Excel (`none`, `gray125`) → nền tự khai bắt đầu từ **chỉ số 2**.
- `styles.xml` phải khai ở **cả** `[Content_Types].xml` **lẫn** quan hệ của workbook — thiếu một chỗ là hỏng.

**Hai điểm bắt buộc khi sửa:**
- **`xml:space="preserve"` trên mọi ô chữ.** Thiếu nó Excel cắt khoảng trắng đầu/cuối → nhãn `"Tài sản lưu động "` mất dấu cách cuối (đúng thứ template cần giữ).
- **Ô rỗng thì bỏ hẳn thẻ `<c>`**, đừng ghi ô trắng.

`buildStyleSheet` gom kiểu theo khoá (`styleKey`) nên **mỗi kiểu chỉ đăng ký một lần**.

> Nền tảng nghiệp vụ (mục 10b `CONVENTIONS.md`): các phụ lục xuất ra còn **nạp ngược lên hệ thống** nên phải **trùng khít bản gốc** — giữ nguyên văn nhãn (kể cả nhãn sai nghĩa `b6`/`b7`), tiêu đề cột (kể cả dấu cách cuối vô hình), số/thứ tự cột, đơn vị (VND vs trđ), không chèn gì phía trên bảng. **Hình thức giữ nguyên, con số tính đúng.** Đã phạm một lần 09/08/2026 (đổi nhãn cho "đúng nghĩa" + thêm dòng tiêu đề) → có test khoá toàn bộ danh sách nhãn.

---

## 4. Xuất `.docx` (`docxWriter.ts`)

Đổi HTML của tab **Soạn biểu mẫu** (do `documentHtml.ts` sinh) thành WordprocessingML rồi gói **năm thành phần**: `[Content_Types].xml`, `_rels/.rels`, `word/document.xml`, `word/_rels/document.xml.rels`, `word/styles.xml`.

API chính: `htmlToDocx(html)`, `buildDocx(blocks, extra)`, `parseDocumentHtml`, `paragraphXml`, `tableXml`, `documentXml`. Hằng khổ giấy A4 lề 25/20/20/30mm (`PAGE_WIDTH/HEIGHT`, `MARGIN_*` tính bằng twip), `DOCX_FONT = 'Times New Roman'`, `DOCX_LINE = 276` (giãn dòng 1,5), `MIME_DOCX`.

**Bộ chuyển KHÔNG phải dựng HTML tổng quát** — nó chỉ hiểu đúng từ vựng `documentHtml.ts` sinh ra (`h1`/`h2`, `p`, `div`, `table`/`thead`/`tbody`/`tr`/`th`/`td`, `strong`, `em`, `span`, `br`, và các lớp `clause-p`, `item-p`, `no-indent`, `text-center`/`right`, `font-bold`, `font-italic`, `uppercase`, `text-[Npt]`, `pt-*`/`pb-*`/`pl-*`, `table-doc`, `sig-table`, `sig-space`). **Thêm lớp/thẻ mới vào biểu mẫu phải khai ở đây**, không thì nó lặng lẽ rơi về mặc định.

**Bốn chỗ dễ sai:**
- **Thứ tự lược đồ** (sai là Word từ chối mở): `w:tblPr` = `tblW → tblBorders → tblLayout → tblCellMar`; `w:pPr` = `spacing → ind → jc`; `w:rPr` = `b → i → spacing → sz`.
- Mỗi **ô bảng phải có ít nhất một `w:p`** (kể cả ô rỗng); sau mỗi `w:tbl` cũng phải có một `w:p` trống.
- **`xml:space="preserve"` trên mọi `w:t`** (như `.xlsx`).
- **Gộp khoảng trắng bằng `/[^\S ]+/g`, giữ nguyên nbsp.** `\s` của JavaScript bao cả nbsp → viết thiếu là nbsp biến thành dấu cách thường.

> Con số bám **bản xem trước trên màn hình**: giãn dòng 1,5 (bản `.doc` cũ 1,35), chữ trong bảng 12pt (cũ 11pt). Kiểm chứng: sinh 8 biểu mẫu, cho python-docx đọc lại, đối chiếu từng ký tự — nay là test thường trực `src/components/__tests__/DocumentTemplateExport.test.tsx`.

---

## 5. Xuất `.pptx` (`pptxWriter.ts`)

Dựng slide từ mô hình `{ title, subtitle, bullets, table }`; theme/master/layout tối thiểu ở `pptxTheme.ts` (là hằng, không phụ thuộc nội dung). API: `buildPptx(deck)`, `slideXml`, `presentationXml`, `contentTypesXml`, `paragraphXml`, `tableXml`. Đơn vị EMU: `EMU_PER_INCH = 914400`, `EMU_PER_PT = 12700`; khổ 16:9 `SLIDE_WIDE = 12192000 × 6858000`.

**Chưa màn nào gọi tới** — thư viện dựng trước (yêu cầu 10/08/2026) để lần sau khỏi làm lại từ đầu như đã từng với `.xls`/`.doc` HTML.

**Bốn thứ bắt buộc, thiếu là không mở được:**
- **Đủ chín thành phần khung**: `presentation.xml` + rels, `theme1.xml`, `slideMaster1.xml` + rels, `slideLayout1.xml` + rels, và mỗi slide một tệp kèm rels trỏ về layout (slide không rels trỏ layout là slide PowerPoint bỏ).
- **`a:clrScheme` đúng 12 màu đúng thứ tự** (`dk1,lt1,dk2,lt2,accent1…6,hlink,folHlink`); `a:fmtScheme` đủ bốn danh sách, mỗi danh sách ba phần tử.
- **Thứ tự lược đồ**: `a:pPr` xếp `buFont` trước `buChar`; `a:rPr` xếp `latin` trước `cs` (cùng loại lỗi `w:tblCellMar`).
- **`p:cNvPr id` không lặp trong một slide**; mọi hàng bảng đủ số ô (thiếu thì bù ô rỗng).

> Kiểm chứng bằng python-pptx đọc lại (khổ/số slide/cấp bullet/kích thước bảng), nhưng **python-pptx dễ tính hơn PowerPoint** — chưa mở được bằng PowerPoint thật trên máy này.

---

## 6. In: `printHtmlDoc` — đường in duy nhất

**Mọi thao tác in đi qua `printHtmlDoc(html, title?)` trong `src/lib/printHtmlDoc.ts`. Không nơi nào được gọi `window.open` để in.**

Cơ chế: tạo **iframe ẩn** (kích thước 0, cố định góc), `document.write(html)` (đồng bộ), **xoá `document.title` và `doc.title`** để Chrome/Edge không in tiêu đề trang lên header, rồi `win.print()`. Dọn iframe theo sự kiện **`afterprint`**, kèm `setTimeout(60s)` phòng hờ. Trả **`boolean`** — **phải kiểm và báo cho người dùng khi `false`** (vd `typeof document === 'undefined'`, hoặc không lấy được `contentDocument`).

**Vì sao iframe, không popup?**
> Lỗi từng xảy ra với popup (từng có 4 bản làm cùng việc: `printHtmlDoc`, `openPrintWindow` trong `dueList.ts`, một bản chép tay trong `RateQuoteView`, và `DocumentPreview`):
> - Trình duyệt **chặn popup** thì lệnh in im lặng không xảy ra — `DocumentPreview` còn `return` trắng, người dùng bấm In mà không có gì báo (kiểu nuốt lỗi bị cấm).
> - `setTimeout(300)` trước khi in là **cuộc đua** — máy chậm in ra trang trắng.
> - Cửa sổ **không bao giờ được dọn**.
>
> iframe không dính cái nào: không bị chặn, `document.write` đồng bộ nên khỏi chờ, `afterprint` dọn ngay.

---

## 7. Tải file: `xlsExport.ts` — đường tải duy nhất

**Mọi tải file đi qua `xlsExport.ts`:**
- `downloadTextFile(content, fileName, mimeType)` — Blob + thẻ neo, cho **văn bản** (gộp 3 bản chép tay giống hệt, chỉ khác MIME). `downloadXls` nay là lớp mỏng gọi nó.
- `downloadBytes(bytes, fileName, mimeType)` — cho **tệp nhị phân** (mọi OOXML đi đường này, **không** qua `downloadTextFile`).

Dùng **hằng MIME**, đừng gõ lại chuỗi: `MIME_XLS` (`xlsExport.ts`), `MIME_XLSX` (`xlsxWriter.ts`), `MIME_DOCX` (`docxWriter.ts`), `MIME_PPTX` (`pptxWriter.ts`). `MIME_DOC` đã gỡ cùng lúc bỏ bản `.doc` HTML.

> **Tệp Word phải mở đầu bằng `'﻿'` (BOM)** — thiếu thì Word đọc sai tiếng Việt. Viết bằng **dấu escape**, đừng dán ký tự BOM thật vào mã nguồn (nó vô hình, người sau dễ xoá nhầm).

---

## 8. Bảng in HTML (`rateSheet.ts` / `dueList.ts`)

Hai bảng này **không** là OOXML — chúng dựng **tài liệu HTML tự chứa** rồi để trình duyệt in ra PDF (không thư viện ngoài), in qua `printHtmlDoc`.

| Bảng | Khổ | Vì sao |
| :--- | :--- | :--- |
| Tờ lãi suất (`rateSheet.ts`) | A4 **dọc** | ít cột |
| Danh sách theo dõi hạn (`dueList.ts`, `buildDueListHtml`) | A4 **ngang** | nhiều cột |

**Bắt buộc `print-color-adjust: exact`** trong `<style>` cho `html, body, header, th, .meta` và hàng chẵn.
> Vì sao: **Chrome mặc định KHÔNG in nền khi Save as PDF** — thiếu dòng này thì dải tiêu đề xanh và ô tiêu đề bảng in ra trắng, chữ trắng mất hút.

`filterByDue` (`dueList.ts`): đến hạn **hôm nay** (mốc 0) tính là "sắp đến hạn", **chưa** quá hạn — khớp cách phân nhóm nợ; thiếu số ngày cũng coi là sắp đến hạn để dòng không biến mất khỏi cả hai bộ lọc.

`KENH_GUI_KHACH` chỉ gồm `quay` và `online` — có **test riêng** khẳng định chuỗi FTP không xuất hiện trong tờ in (tờ chào khách chỉ chứa thông tin đã công bố).

---

## 9. Đọc số thành chữ (`numberToWords.ts`)

Đọc số tiền thành chữ **tiếng Việt** cho biểu mẫu/hợp đồng.

| Hàm | Vai trò |
| :--- | :--- |
| `numberToVietnameseWords(value)` | Số → chữ. Làm tròn về nguyên; 0 → `"không"`; số âm thêm `"âm "`; quá `MAX_SUPPORTED` (`Number.MAX_SAFE_INTEGER`) hoặc NaN/∞ → chuỗi rỗng. |
| `moneyToVietnameseWords(value, {currency, capitalise})` | Bọc thêm đơn vị (mặc định `"đồng"`) và **viết hoa chữ đầu** (mặc định bật). |
| `moneyTextToWords(text, opts)` | Nhận chuỗi có ký tự thừa → `parseMoneyText` lọc lấy chữ số → đọc. |
| `parseMoneyText(text)` | Lọc `\D`, parse nguyên; rỗng → `null`. |
| `capitaliseFirst(text)` | Viết hoa ký tự đầu. |

Quy tắc đọc tiếng Việt cài trong `readTriple` (đọc từng nhóm 3 chữ số), đơn vị nhóm `GROUP_UNITS = ['', 'nghìn', 'triệu', 'tỷ', 'nghìn tỷ', 'triệu tỷ']`:
- hàng chục = 1 → `"mười"`; đơn vị 5 sau "mười" → `"lăm"`.
- hàng chục ≥ 2: đơn vị 1 → `"mốt"`, 4 → `"tư"`, 5 → `"lăm"`.
- chèn `"lẻ"` khi có trăm/nhóm cao hơn mà hàng chục = 0 và có đơn vị.
- `readLeadingZeros` bật cho các nhóm **không phải nhóm cao nhất** để đọc đủ "không trăm…".

> Vì sao xử lý riêng `mốt/tư/lăm/lẻ`: đây là đặc thù phát âm số tiếng Việt; đọc máy móc `"năm mươi năm"` thay vì `"năm mươi lăm"` là sai chuẩn chứng từ.

---

## 10. Lịch trả nợ kèm công thức Excel (`scheduleFormulaExport.ts`)

Xuất bảng lịch thu nợ ra `.xlsx` **KÈM công thức Excel động** (không chỉ số đã tính), để **kiểm toán/kiểm chứng** — mở file ra sửa một tham số là cả bảng tự tính lại.

API: `exportScheduleWithFormulas(opts)` (dựng bytes + tải qua `downloadBytes`), `buildScheduleWithFormulasXlsx(opts)` (chỉ dựng bytes). Đầu vào `ExportScheduleFormulaOptions` gồm tham số khoản vay (số tiền, kỳ hạn, lãi suất ưu đãi/cơ sở/biên độ/sau ưu đãi, ân hạn gốc, phương thức trả gốc, ngày giải ngân/bắt đầu trả, danh sách trả trước hạn) và `scheduleRows` đã tính sẵn.

**Cơ chế cốt lõi — mỗi ô mang cả `value` (số đã tính) lẫn `formula` (công thức trỏ ô khác):**
- Khối tham số ở đầu (ô `$B$3`, `$D$3`…) là **tham chiếu tuyệt đối** để công thức từng dòng trỏ về.
- Cột lãi/gốc/dư nợ mỗi dòng là công thức: lãi thường (phần dư × lãi/năm, chia 12 cho **niên kim** hoặc `×days/365` cho phần còn lại), dư nợ cuối `=MAX(0, đầu kỳ − tổng gốc)`, dòng tổng `=SUM(...)`.
- Ba phương thức trả gốc rẽ nhánh công thức riêng: `bullet` (trả gốc cuối kỳ), `equal_installment` (niên kim, dùng `PMT`), gốc đều (`roundPrincipalCore`, có ân hạn `grace`). Trả trước hạn `reduce_monthly` tính lại bước gốc/kỳ từ dòng trước.
- Số làm tròn theo bước: gốc `PRINCIPAL_STEP_VND = 10000`, niên kim `INSTALLMENT_STEP_VND = 1000` (dùng `CEILING`).

> Vì sao xuất công thức chứ không chỉ con số: người kiểm toán mở file **thấy được cách tính**, đổi lãi suất/kỳ hạn là bảng tự cập nhật — không phải tin vào số cứng do ứng dụng đổ ra. Định dạng số `#,##0`, tỷ lệ `0.00`; có gộp ô tiêu đề/tổng, độ rộng cột riêng, tô nền tiêu đề/tổng.

---

## 11. Ngân hàng câu hỏi (`quizBank.ts`) — chống trùng bằng trigger

Bảng `QuizQuestions` (migration 38) là **dữ liệu tham chiếu dùng chung**, không gắn khách hàng (cùng loại `RatePrograms`, không phải hồ sơ tín dụng). RLS: ai đăng nhập cũng **đọc + thêm**; **sửa/xoá** chỉ admin **hoặc chính người đã thêm** (`CreatedBy`).

### 11.1 Mô hình dữ liệu
- Lựa chọn để trong **`jsonb`** (`Options: {id, text}[]`), **không tách bảng con** — chúng là dữ liệu trình bày có thứ tự, không bao giờ tra riêng.
- **Số lựa chọn không cố định 4, số đáp án đúng không cố định 1** (đo trên 662 câu: cả hai phân bố 1→5). `MIN_DRAFT_OPTIONS = 2`, `MAX_DRAFT_OPTIONS = 12`.
- **`CorrectAnswers` rỗng = CHƯA CHỐT ĐÁP ÁN**, không phải dữ liệu lỗi (`hasSettledAnswer` = mảng có phần tử). `isAnswerCorrect` trả **`false` kể cả khi không chọn gì** cho câu chưa chốt — nếu không thì bỏ trắng lại thành "đúng".

### 11.2 Chống trùng — khoá gồm CẢ câu hỏi LẪN bộ lựa chọn
`quizDuplicateKey(questionText, options)` = `quizNormalizeText(câu)` + phân cách + các lựa chọn **đã chuẩn hoá và SẮP THỨ TỰ** (đảo thứ tự vẫn là một câu; mã A/B/C **không** tính vào khoá). `quizNormalizeText`: hạ chữ, gộp khoảng trắng, cắt hai đầu, **giữ nguyên dấu tiếng Việt** ("lãi" ≠ "lai").

> **Kết luận sai từng đưa ra:** so trùng chỉ bằng câu hỏi suông đã gom 4 câu (267,272,274,283) *"…hạn chế nhận thế chấp"* thành một cụm rồi kết luận "ít nhất một bản dạy sai". Sai — chúng có **hai bộ lựa chọn khác hẳn** (267/272 đáp án B, 274/283 đáp án D), mỗi đáp án đúng cho bộ của nó. Bài học: **so trùng trên một phần bản ghi thì sinh kết luận sai về phần còn lại.** Vì thế khoá phải có bộ lựa chọn.

Hàm liên quan: `findDuplicateQuestion(..., excludeId?)`, `duplicateClusters(questions)`, `validateQuizDraft(draft, questions, excludeId?)`.
> **Sửa thì phải truyền `excludeId`** để loại chính nó khỏi phép so — thiếu nó thì mở một câu ra sửa dấu phẩy cũng bị báo "câu này đã có". Nhưng sửa thành trùng câu **khác** thì vẫn chặn (cả hai chiều đều có test).

### 11.3 Vì sao trigger, không unique index
- Bộ gốc còn **6 cụm trùng thật** (chủ dự án chốt giữ) → **unique index không dựng nổi**, build đổ ngay trên dữ liệu nạp.
- **Trigger** cho đường nạp gốc đi qua bằng cờ phiên `app.quiz_seed`, chặn mọi đường ghi khác.
- **`COLLATE "C"`** khi sắp lựa chọn trong khoá SQL: TypeScript sắp bằng mã ký tự (`Array.prototype.sort`); collation mặc định của CSDL ra thứ tự khác → client và CSDL tính hai khoá khác nhau. `COLLATE "C"` = thứ tự byte UTF-8, khớp với mã ký tự. Hàm `public.quiz_normalize_text`/`quiz_duplicate_key` **phải giống hệt** bản TypeScript — sửa một bên phải sửa bên kia.

### 11.4 Hai đường nạp, không dùng lẫn
- `seed_quiz_bank` — **chỉ chạy trên bảng rỗng**, cố ý **bỏ qua** chống trùng (đường duy nhất mang 6 cụm trùng gốc vào). `SECURITY DEFINER` vì phải bật cờ `app.quiz_seed`. Nạp bằng nút trên tab, **không** nhét 662 dòng INSERT vào migration (gần 700KB, dán vào SQL editor là hỏng).
- `import_quiz_questions` (migration 40) — nạp thêm khi bảng **đã có** dữ liệu, **bỏ** câu trùng. `SECURITY INVOKER` (migration 41): chỉ làm đúng những gì RLS cho phép người đăng nhập.
  > Bẫy: hàm `SECURITY INVOKER` **không** được kiểm đăng nhập bằng `SELECT … FROM auth.users` (`authenticated` chưa chắc đọc được bảng đó, đổ ngay dòng đầu) — hỏi `auth.uid() IS NULL` thay vào.
  - Chạy **vòng lặp `BEGIN…EXCEPTION` từng dòng**, không một câu `INSERT`: một exception làm đổ cả `INSERT` → nạp 500 câu có 30 trùng thì mất cả 500. `plpgsql` tự đặt savepoint quanh khối `EXCEPTION` nên một dòng lỗi chỉ mất dòng đó. Hàm **không tắt trigger**, tự lọc trước; nếu có nổ (đua ghi) thì khối `EXCEPTION` hứng.
  - Trả báo cáo tách **bốn loại** + một loại đặc biệt: `da_nap`, `trung_trong_ngan_hang`, `trung_trong_file`, `khong_hop_le`, và `lech_dap_an` (trùng nội dung nhưng **đáp án khác bản đang có** → **bị bỏ, không ghi đè**, nêu cả hai đáp án cho người có thẩm quyền quyết). Bỏ âm thầm là để người dùng tưởng đã nạp.

### 11.5 Parse file nhập & tra cứu
- `parseQuizImportFile(text)` — nhận JSON: mảng, hoặc object có khoá `questions`. Chấp nhận nhiều tên khoá (song ngữ: `question`/`cau_hoi`, `options`/`lua_chon`/`choices`, `correct_answers`/`dap_an`/`answer(s)`, `sources`/`nguon`, `topic`/`chu_de`). Bỏ dòng lỗi kèm lý do (`skipped`): thiếu câu, không đọc được lựa chọn, mã lựa chọn lặp, **đáp án nằm ngoài danh sách lựa chọn**.
- `optionLetter(i)` — sinh mã A,B,…,Z,AA…; `relabelOptions` đánh lại mã theo thứ tự và remap `correctAnswers`.
- `searchQuestions(questions, term)` — `#12` nhảy tới câu 12; `#267,272,274,283` mở nguyên một cụm (báo cáo nạp thêm dùng số hiệu này); ngược lại tìm trong nội dung/lựa chọn/nguồn/chủ đề. **Nguồn vẫn tra được** dù màn Tra cứu không hiển thị.
- `quizStats` — thống kê tổng/nhiều đáp án/chưa chốt/phân bố số lựa chọn/số cụm trùng.

> Màn **Tra cứu là để đọc, không tự kiểm tra** (chốt 11/08/2026): đáp án đúng **tô sẵn** (đậm, nền `bg-pos-soft`), không có nút ẩn/hiện — muốn tự kiểm tra thì sang chế độ Luyện tập; danh sách chia trang 20 câu.
