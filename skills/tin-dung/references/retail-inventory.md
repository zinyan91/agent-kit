# Kho hàng, bảng kê mua bán, hóa đơn bán lẻ & dự toán vật dụng

Phân hệ **phụ trợ** (không thuộc lõi tín dụng) phục vụ hồ sơ vay có yếu tố hàng hóa: chứng minh tồn kho, dựng chứng từ mua/bán, dự toán vật dụng. Tài liệu này **audit thuần từ code** (CONVENTIONS.md chưa có mảng này). Nguồn sự thật là code trong `src/lib/`.

## Mục lục

- [1. Bức tranh tổng thể & lưu trữ](#1-bức-tranh-tổng-thể--lưu-trữ)
- [2. Quản lý kho hàng `inventory.ts`](#2-quản-lý-kho-hàng-inventoryts)
- [3. Bảng kê mua bán `statement.ts`](#3-bảng-kê-mua-bán-statementts)
- [4. Hóa đơn bán lẻ `statement.ts`](#4-hóa-đơn-bán-lẻ-statementts)
- [5. Dự toán vật dụng (shopping checklist) `shoppingChecklist.ts`](#5-dự-toán-vật-dụng-shopping-checklist-shoppingchecklistts)
- [6. Catalog sản phẩm bán `saleCatalogStore.ts`](#6-catalog-sản-phẩm-bán-salecatalogstorets)
- [7. Lưu trữ Supabase + fallback `inventoryDb.ts` / `statementDb.ts`](#7-lưu-trữ-supabase--fallback-inventorydbts--statementdbts)
- [8. Công thức chung & làm tròn](#8-công-thức-chung--làm-tròn)

---

## 1. Bức tranh tổng thể & lưu trữ

Năm mảng, mỗi mảng một tệp logic thuần trong `src/lib/`:

| Mảng | Màn (ScreenId / path) | Logic thuần | Data access |
| :--- | :--- | :--- | :--- |
| Kho hàng | `inventory` `/tools/inventory` | `inventory.ts` | `inventoryDb.ts` |
| Bảng kê mua bán | `purchase-statement` `/tools/purchase-statement` | `statement.ts` | `statementDb.ts` |
| Hóa đơn bán lẻ | `retail-invoice` `/tools/retail-invoice` | `statement.ts` | `statementDb.ts` |
| Dự toán vật dụng | `shopping-checklist` `/tools/shopping-checklist` | `shoppingChecklist.ts` | (localStorage trong component) |
| Catalog sản phẩm bán | (dùng trong soạn biểu mẫu `documents`) | `saleCatalogStore.ts` | localStorage + Supabase |

**Mẫu lưu trữ chung:** logic tính toán tách khỏi lưu trữ. Data access theo mẫu **localStorage-first + đồng bộ Supabase nền (non-blocking)**: đọc thử Supabase, lỗi/timeout thì rơi xuống localStorage; ghi thì cập nhật localStorage rồi upsert Supabase trong background, nuốt lỗi mạng (chỉ `console.warn`). Nhờ vậy công cụ vẫn chạy khi mất kết nối/ chưa có bảng.

---

## 2. Quản lý kho hàng `inventory.ts`

### Kiểu dữ liệu

`InventoryItem`: `id`, `code`, `name`, `unit`, `unitPrice`, `beginningQty` (tồn đầu), `importQty` (nhập), `exportQty` (xuất). `ComputedInventoryItem` bổ sung `beginningValue`, `importValue`, `exportValue`, `endingQty` (tồn cuối), `endingValue`.

### Công thức một dòng — `computeItemRow(item)`

Kẹp mọi số về **không âm** trước khi tính (`Math.max(0, …)`), rồi:

| Đại lượng | Công thức |
| :--- | :--- |
| `beginningValue` | `beginningQty × unitPrice` |
| `importValue` | `importQty × unitPrice` |
| `exportValue` | `exportQty × unitPrice` |
| `endingQty` (tồn cuối) | `beginningQty + importQty − exportQty` |
| `endingValue` | `endingQty × unitPrice` |

**Toàn kho dùng một đơn giá `unitPrice`** cho cả đầu kỳ, nhập, xuất, cuối kỳ (không phân biệt giá nhập/giá xuất). `endingQty` **có thể âm** nếu xuất > (đầu + nhập) — chỉ `endingQty` không bị kẹp; khi đó `endingValue` cũng âm.

### Tổng hợp — `computeInventorySummary(items)`

Cộng dồn từng dòng đã `computeItemRow` thành `InventorySummary`: `totalItems` = số dòng, cùng tổng của 8 đại lượng số lượng/giá trị. Cộng thuần, không làm tròn.

### Nhập nhanh — `parseInventoryText(text)`

Dán từ Excel/CSV: tách dòng, mỗi dòng tách theo **tab** (nếu có) hoặc **dấu phẩy**. Bỏ dòng tiêu đề (chứa "mã" ở cột 0 hoặc "tên" ở cột 1). Cột: `[0]` code, `[1]` name, `[2]` unit (mặc định `Cái`), `[3]` tồn đầu, nhập = `cols[5] ?? cols[4]`, xuất = `cols[7] ?? cols[5]`, đơn giá = **cột cuối cùng**. Số qua `parseDecimalNumber` (từ `utils.ts`). Mỗi dòng cấp id qua `nextItemId()` (`inv_<timestamp>_<seq>`, biến đếm module).

---

## 3. Bảng kê mua bán `statement.ts`

Dựng **BẢNG KÊ MUA BÁN HÀNG HÓA DỊCH VỤ** (chứng từ mua vào của khách/hộ kinh doanh).

### Thông tin bên bán/mua — `StatementSellerInfo`

`sellerName`, `sellerAddress`, `sellerBankAcc`, `sellerIdCard`, `buyerName`, `buyerIdCard`, `statementDateStr`; tùy chọn `paymentMethod: 'transfer' | 'cash'`, `bankAccNo`, `bankName`, `bankOwner`, `bankBranch`, `customStkText`.

`getComputedBankAccText(info)` dựng chuỗi thông tin thanh toán, ưu tiên giảm dần:
1. `customStkText` nếu có (ghi đè thủ công).
2. Nếu `paymentMethod === 'cash'`: trả `sellerIdCard` hoặc `"Tiền mặt"`.
3. Nếu có `bankAccNo`/`bankName`/chủ TK: ghép `"STK: <acc> - Ngân hàng <bank> CN <branch> - (Chủ TK: <owner>)"` (chủ TK mặc định = `sellerName` khi `bankOwner` undefined).
4. Cuối cùng: `sellerBankAcc` hoặc `sellerIdCard` hoặc `"STK: ....."`.

### Dòng hàng & tính tiền

`StatementItem`: `id`, `dateStr`, `itemName`, `unit`, `qty`, `unitPrice`, `note?`. `computeStatementItem` kẹp `qty`/`unitPrice` về ≥ 0 rồi **`amount = qty × unitPrice`**. `computeStatementSummary` → `StatementSummary` = `{ totalItems, totalQty, totalAmount }` (cộng dồn `amount` từng dòng, **không** làm tròn giữa chừng).

`StatementTemplate` (`id`, `name`, `sellerInfo` partial, `items` không id) cho lưu mẫu tái dùng. Id sinh qua `nextStatementId()` (`stmt_<ts>_<seq>`).

---

## 4. Hóa đơn bán lẻ `statement.ts`

Dựng **HÓA ĐƠN BÁN LẺ** (chứng từ bán ra).

- `RetailInvoiceHeader`: `buyerName`, `buyerAddress`, `shopName`, `invoiceDateStr`.
- `RetailInvoiceItem`: `id`, `itemName`, `unit`, `qty`, `unitPrice`. `computeRetailInvoiceItem` kẹp ≥ 0, **`amount = qty × unitPrice`**.
- `computeRetailInvoiceSummary` → `{ totalItems, totalQty, totalAmount }`.
- `RetailInvoiceTemplate` cho mẫu; id sinh qua `nextInvoiceId()` (`inv_ret_<ts>_<seq>`).

> `nextStatementId`/`nextInvoiceId` **dùng chung một biến đếm `seqId`** trong module — id không đụng nhau nhờ tiền tố khác nhau.

Công thức hóa đơn bán lẻ **giống hệt** bảng kê (qty × đơn giá, tổng cộng dồn). Khác nhau ở phần metadata: hóa đơn có `shopName`, và ở lớp lưu trữ có `discount`/`note`/`paymentMethod` (xem §7). **Chiết khấu (`discount`) không có trong hàm tính của `statement.ts`** — `computeRetailInvoiceSummary` chỉ tính tổng thô; trừ chiết khấu (nếu áp dụng) do component/lớp lưu trữ xử lý.

---

## 5. Dự toán vật dụng (shopping checklist) `shoppingChecklist.ts`

Dự toán mua sắm nội thất/vật dụng theo **cây ba tầng: Tầng (Floor) → Phòng (Room) → Vật dụng (Item)**.

### Kiểu dữ liệu

- `ShoppingItem`: `id`, `name`, `unit`, `quantity`, `unitPrice`, `note?`.
- `ShoppingRoom`: `id`, `name`, `items[]`.
- `ShoppingFloor`: `id`, `name`, `rooms[]`.
- `ShoppingPreset`: `id`, `name`, `description?`, `floors[]`, `createdAt`, `updatedAt`.
- `CatalogItem` (danh mục tra vật dụng): `id`, `code`, `name`, `category`, `unit`, `defaultPrice`, `note?`.

### Công thức cộng dồn theo cây

| Hàm | Công thức |
| :--- | :--- |
| `computeItemAmount(item)` | `(quantity ?? 0) × (unitPrice ?? 0)` |
| `computeRoomTotal(room)` | tổng `computeItemAmount` các item |
| `computeFloorTotal(floor)` | tổng `computeRoomTotal` các phòng |
| `computePresetTotal(preset)` | tổng `computeFloorTotal` các tầng |
| `countPresetItems(preset)` | đếm số item toàn cây |

Không kẹp âm, không làm tròn (cộng thuần theo cây).

### Dữ liệu mẫu & làm sạch

- `sanitizePreset(raw)`: chuẩn hóa dữ liệu bất kỳ về `ShoppingPreset` hợp lệ — cấp id thiếu (`floor_<i>`, `room_<..>`, `item_<..>`), tên mặc định ("Tầng i", "Phòng i"), `unit` mặc định `"Bộ/Cái"`; ép `quantity`/`unitPrice` về số (parse chuỗi, `NaN → 0`). Dữ liệu hỏng trả `DEFAULT_PRESET`.
- `DEFAULT_CATALOG_ITEMS`: 92 vật dụng mẫu (mã `VT-002…VT-093`) theo nhóm (Phòng khách, Bếp & Phòng ăn, Phòng ngủ, Phòng thờ, Sân thượng & Cây cảnh, Khác) kèm `defaultPrice`.
- `DEFAULT_PRESET`: mẫu "Nhà Phố 4 Tầng" (4 tầng, các phòng khách/bếp/ngủ/thờ/sân thượng) với quantity + unitPrice sẵn.

Màn này lưu preset ở **localStorage trong component** (không có tệp `*Db.ts` riêng).

---

## 6. Catalog sản phẩm bán `saleCatalogStore.ts`

Bộ **danh mục hàng hóa mẫu theo ngành** để chèn nhanh dòng hàng khi soạn biểu mẫu (`SaleItem` từ `components/documents/DocumentForm`: `id`, `name`, `unit`, `quantity`, `price`).

- `SaleCatalogProfile`: `id`, `name`, `category`, `isBuiltin?`, `items: SaleItem[]`.
- `BUILTIN_SALE_CATALOGS`: 5 hồ sơ dựng sẵn — Spa & Mỹ phẩm, Xưởng gỗ & Nội thất, Tạp hóa & Siêu thị mini, Vật liệu xây dựng & Sắt thép, Nông sản & Thức ăn chăn nuôi (mỗi hồ sơ 7–13 mặt hàng có `quantity`/`price`).

### Lưu trữ (localStorage + Supabase)

- Khóa localStorage `CUSTOMER_MANAGER_SALE_CATALOGS_V1`. `loadSaleCatalogs()` đọc localStorage; lần đầu (chưa có) thì ghi builtin làm hạt giống và trả builtin; dữ liệu hỏng → builtin.
- `saveSaleCatalog(profile)`: upsert theo `id` (thay nếu trùng, chèn đầu nếu mới), ghi localStorage, rồi `saveSaleCatalogToCloud` nền.
- `deleteSaleCatalog(id)`, `resetSaleCatalogs()` (đưa về builtin).
- Cloud (bảng `SaleCatalogProfiles`, cột `Id/Name/Category/IsBuiltin/Items/CreatedAt/UpdatedAt`): `fetchSaleCatalogsFromCloud` hợp nhất builtin → local → cloud (cloud đè), ghi lại localStorage; `saveSaleCatalogToCloud` (upsert), `deleteSaleCatalogFromCloud`. Mọi lỗi cloud nuốt bằng `console.warn`, fallback local.

`saleCatalogStore.ts` chỉ lưu/đồng bộ danh mục — **không** có hàm tính tổng riêng (tính tiền do màn soạn biểu mẫu đảm nhận).

---

## 7. Lưu trữ Supabase + fallback `inventoryDb.ts` / `statementDb.ts`

### `inventoryDb.ts` — bảng `InventoryItems`

- `fetchInventoryItemsDb(categoryName?)`: query Supabase (lọc `CategoryName` nếu truyền), có **timeout 2,5 giây** (Promise.race); ánh xạ cột PascalCase → `InventoryItem`; cache localStorage khóa `customer_manager_inventory_db` (chỉ khi không lọc theo category). Lỗi/timeout → đọc cache localStorage → `[]`.
- `saveInventoryItemDb(item, categoryName = 'HTK Lúa Gạo')`: cập nhật cache localStorage rồi upsert Supabase. `saveAllInventoryItemsDb(items, categoryName)` upsert cả mảng. `deleteInventoryItemDb(itemId)` xóa cả hai nơi.
- **`categoryName` mặc định `'HTK Lúa Gạo'`** — kho mặc định là hàng tồn kho lúa gạo (bối cảnh hồ sơ vay nông nghiệp).

### `statementDb.ts` — bảng `PurchaseStatements` & `RetailInvoices`

- `SavedPurchaseStatement`: `id`, `sellerInfo`, `items`, `statementDate`, `createdAt?`.
- `SavedRetailInvoice`: `id`, `invoiceNo`, `invoiceDate`, `headerInfo`, `items`, `discount?`, `note?`, `paymentMethod?`, `createdAt?` — lớp lưu trữ **có thêm** `discount`/`note`/`paymentMethod` mà `RetailInvoice*` trong `statement.ts` không mang.
- Fetch sắp theo `CreatedAt` giảm dần; cache khóa `customer_manager_statements_db` / `customer_manager_retail_invoices_db`; lỗi → cache → `[]`. Save cập nhật cache rồi upsert; delete xóa cả hai nơi.
- **Lưu ý cứng trong code:** `fetchRetailInvoicesDb` ghi cứng `headerInfo.shopName = 'SALON & SPA MINH THƯ'` khi dựng bản ghi từ cloud (cột này không lưu ở DB), và `paymentMethod` mặc định `'cash'`. Bảng kê mặc định `paymentMethod` `'transfer'`.

---

## 8. Công thức chung & làm tròn

**Công thức lõi thống nhất toàn phân hệ:**

```
thành tiền một dòng = số lượng × đơn giá
tổng      = Σ (số lượng × đơn giá) các dòng   (cộng dồn thuần)
tồn cuối  = tồn đầu + nhập − xuất             (chỉ riêng kho hàng)
```

**Về làm tròn — quan trọng:**

- Các hàm `compute*` trong `inventory.ts`, `statement.ts`, `shoppingChecklist.ts` **không làm tròn**: nhân và cộng ở dạng số thực JavaScript, giữ nguyên phần lẻ nếu có.
- Làm tròn chỉ xảy ra ở **lớp nhập/hiển thị tiền** (xem `formatSettings.ts`): `parseMoneyWith` làm tròn về số nguyên (`Math.round`), `formatMoneyWith` hiển thị **0 chữ số thập phân**. Vì đơn giá vật dụng/hàng hóa thường là số nguyên đồng, tích số cũng nguyên nên khác biệt thực tế gần như không có; nhưng nếu nhập đơn giá lẻ thì tổng thô vẫn giữ phần lẻ cho tới khi định dạng.
- Kẹp không âm (`Math.max(0, …)`) áp cho `inventory.computeItemRow` và cả hai `compute*Item` của `statement.ts`; **không** áp cho `shoppingChecklist` (dựa vào `sanitizePreset` chuẩn hóa trước). `endingQty` của kho **không** kẹp nên có thể âm.
- **Chiết khấu hóa đơn bán lẻ** (`discount`) nằm ở lớp lưu trữ `statementDb.ts`, không có trong hàm tính `statement.ts` — nếu cần "tổng sau chiết khấu" phải trừ ở tầng component.
