# Bảo mật, RLS, Cơ sở dữ liệu & Migration

Tài liệu này là nguồn sự thật cho mô hình bảo mật và quy ước cơ sở dữ liệu của CustomerManager. **Mã nguồn là chuẩn cuối cùng** — nếu tài liệu và mã lệch nhau, đọc theo mã. Mọi số dòng trích dẫn có thể trôi theo thời gian; tra theo tên hàm / tên bảng thì chắc hơn.

## Mục lục

1. [Vì sao RLS là lớp phòng thủ duy nhất](#1-vì-sao-rls-là-lớp-phòng-thủ-duy-nhất)
2. [Đăng nhập: bắt buộc, không tự đăng ký](#2-đăng-nhập-bắt-buộc-không-tự-đăng-ký)
3. [Ba vai trò: master_admin, user_admin, user](#3-ba-vai-trò-master_admin-user_admin-user)
   - [3b. Cờ module theo tài khoản](#3b-cờ-module-theo-tài-khoản-migration-65)
4. [RLS bật 100% bảng — kể cả bảng chưa dùng](#4-rls-bật-100-bảng--kể-cả-bảng-chưa-dùng)
5. [Các hàm hỗ trợ RLS](#5-các-hàm-hỗ-trợ-rls)
6. [Chính sách (policy) từng bảng](#6-chính-sách-policy-từng-bảng)
7. [Sinh ID do cơ sở dữ liệu, không phải client](#7-sinh-id-do-cơ-sở-dữ-liệu-không-phải-client)
8. [service_role không bao giờ vào client](#8-service_role-không-bao-giờ-vào-client)
9. [SECURITY INVOKER vs SECURITY DEFINER](#9-security-invoker-vs-security-definer)
10. [pg_cron và job hệ thống](#10-pg_cron-và-job-hệ-thống)
11. [Mọi cột ngày là kiểu `date`](#11-mọi-cột-ngày-là-kiểu-date)
12. [Quy ước migration](#12-quy-ước-migration)
13. [Sổ tra nhanh tệp/hàm](#13-sổ-tra-nhanh-tệphàm)

---

## 1. Vì sao RLS là lớp phòng thủ duy nhất

Khoá `anon` của Supabase nằm **công khai** trong gói JavaScript gửi tới trình duyệt (`src/lib/supabase.ts` đọc nó từ `VITE_SUPABASE_ANON_KEY`). Bất cứ ai mở DevTools đều lấy được khoá này và gọi thẳng PostgREST. Vì vậy:

- Màn hình đăng nhập **chỉ** ngăn người dùng thường thao tác nhầm — nó không phải rào bảo mật.
- **Row Level Security (RLS) là lớp phòng thủ duy nhất và thực sự.** Mọi quy tắc "ai thấy dữ liệu gì" phải nằm ở tầng CSDL, không được dựa vào việc ẩn nút trên giao diện.

Hệ quả thực tế khi lập trình: khi RLS chặn một lệnh, PostgREST trả về **mảng rỗng mà không báo lỗi**. Mọi lệnh `delete`/`update` phải kèm `.select()` và kiểm tra số dòng thực sự bị tác động; nếu không, giao diện sẽ báo "thành công" trong khi không có gì thay đổi (nuốt lỗi).

## 2. Đăng nhập: bắt buộc, không tự đăng ký

`src/context/AuthContext.tsx` chỉ phơi ba thao tác auth: `signIn`, `signOut`, và theo dõi phiên qua `onAuthStateChange`. **Không có luồng đăng ký (`signUp`).** Tài khoản do quản trị tạo trong Supabase Dashboard rồi gán vai trò bằng SQL — xem `03_user_management.sql`.

Chi tiết đăng nhập cần biết:

| Điểm | Hành vi | Vì sao |
| :--- | :--- | :--- |
| Đăng nhập bằng username | `username-login` tra `UserRoles.Username` ở server, xác thực mật khẩu qua Supabase Auth rồi trả phiên; client dùng `auth.setSession`. Email cũ vẫn được hỗ trợ ở lớp auth | Migration `20261021071942_username_login` bổ sung username duy nhất, khởi tạo từ phần trước @; không đổi email, mật khẩu, UUID hoặc role. Quản trị tạo/sửa username qua `admin-users` |
| Vai trò tra sau khi có phiên | Sau khi có `session`, một `useEffect` truy vấn `UserRoles` theo `UserId` để lấy `Role` + `FullName` | Vai trò không nằm trong JWT; nó là dữ liệu bảng nên phải đọc riêng |
| `can(capability)` | Suy ra ở client từ ma trận trong `src/lib/permissions.ts` (`isMasterAdmin`, `isUserAdmin`, `isAdmin` chỉ là cờ tiện dùng) | Chỉ để bật/tắt UI. **Không phải** ranh giới bảo mật — ranh giới thật là `is_admin()` / `is_master_admin()` trong CSDL |
| `roleLoading` | `true` khi đã có phiên nhưng chưa tra xong `UserRoles` | `UserScopeProvider` chờ cờ này để admin không lỡ tải dữ liệu chưa lọc |
| Thông báo lỗi | Username không tồn tại hoặc mật khẩu sai trả cùng thông điệp, không công khai email; giới hạn 10 lượt/tên/5 phút và 200 lượt toàn hệ thống/5 phút | Limiter trong schema `app_auth`, RPC chỉ service_role gọi được; endpoint username không yêu cầu JWT vì dùng trước đăng nhập, endpoint admin-users vẫn xác minh JWT và role |

Quan trọng: `can()` / `isAdmin` phía client **chỉ để trình bày**. Một user sửa biến này trong trình duyệt vẫn không vượt được RLS, vì mọi quyết định quyền thật nằm ở `is_admin()` và `is_master_admin()` chạy trong CSDL. Khi đổi ma trận quyền phải đổi **cả hai nơi**: `permissions.ts` và migration RLS.

## 3. Ba vai trò: master_admin, user_admin, user

Kiểu `AppRole = 'master_admin' | 'user_admin' | 'user'` (định nghĩa ở `src/lib/permissions.ts`, ràng buộc `CHECK` ở bảng `UserRoles`). Từ migration 60 hai giá trị cũ đã bị bỏ: `admin` thành `master_admin`, `banker` thành `user`; client không còn nhận giá trị cũ.

> **Trạng thái triển khai (2026-10-06):** migration 59 và 60 đã áp lên DB thật; vai trò cũ đã chuyển (`admin` thành `master_admin`, `banker` thành `user`). Client coi giá trị vai trò cũ là không hợp lệ nên migration luôn phải áp **trước** khi deploy mã.

| Vai trò | Phạm vi |
| :--- | :--- |
| **master_admin** | Toàn quyền: xem/sửa KH mọi tài khoản, gán/chuyển KH, xóa vĩnh viễn KH, đổi vai trò, cấu hình kho lưu trữ (repo Google Drive), xóa tệp kho |
| **user_admin** | Xem/sửa KH mọi tài khoản, gán/chuyển KH, upload và xóa tệp kho. **Không** đổi vai trò, **không** cấu hình HF, **không** xóa vĩnh viễn KH |
| **user** | Chỉ khách hàng **mình phụ trách**, xác định qua `Customers.OwnerId = auth.uid()`; upload/tải tệp kho, không xóa tệp |

Ma trận chi tiết: `src/lib/permissions.ts` (`can(role, capability)`).

Nguyên tắc phân quyền (`01_roles_and_ownership.sql`):

- Quyền sở hữu **chỉ gắn ở bảng `Customers`** qua cột `OwnerId uuid REFERENCES auth.users(id)`.
- `OwnerId = NULL` nghĩa là **chỉ admin** (master_admin hoặc user_admin) nhìn thấy khách hàng đó.
- Quyền trên `Collaterals`, `LoanContracts`, `CreditCards`, `RepaymentSchedules` **không có cột chủ sở hữu riêng** — suy ra theo quan hệ tới `Customers`. Đây là quyết định thiết kế có chủ đích: một nguồn sự thật cho quyền sở hữu, tránh lệch dữ liệu.

Bảng `UserRoles` (`01_roles_and_ownership.sql`):

```
UserId    uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE
Role      text NOT NULL CHECK (Role IN ('master_admin','user_admin','user'))
FullName  text
CreatedAt timestamptz DEFAULT now()
```

Trigger `trg_guard_last_master_admin` (migration 60) chặn hạ quyền hoặc xóa Master Admin cuối cùng, tránh khóa hệ thống. Các thao tác quản trị người dùng dùng lại thường xuyên (gán vai trò theo email, bàn giao khách hàng khi nhân sự nghỉ/luân chuyển, thu hồi quyền) nằm ở `03_user_management.sql` (vẫn dùng giá trị vai trò cũ, cần đổi sang vai trò mới trước khi dùng lại). Lưu ý trình tự khi nhân sự nghỉ: **bàn giao khách hàng trước, thu hồi quyền sau** — vì `Customers.OwnerId` là khoá ngoại tới `auth.users(id)`, xoá user khi còn khách gán cho họ sẽ bị khoá ngoại chặn.

## 3b. Cờ module theo tài khoản (migration 65)

Hai vai trò quản trị chọn cho từng tài khoản được dùng những **module** nào; module bị tắt bị chặn ở CSDL chứ không chỉ ẩn menu. Bảy module: `credit`, `rates`, `dispatch`, `storage`, `inventory`, `quiz`, `tools`. Danh sách phải khớp ba chỗ: CHECK `UserModules_known_modules` trong `supabase/migrations/65_user_modules.sql`, `MODULE_IDS` trong `src/lib/modules.ts`, và các chính sách `mod_*`.

- Bảng `UserModules(UserId, Modules text[], UpdatedAt, UpdatedBy)`. **Không có dòng = đủ mọi module** (tương thích ngược); mảng rỗng = không module nào.
- Hàm `has_module(m)` (SECURITY DEFINER, STABLE): chưa đăng nhập → false; `is_admin()` → true; không có dòng → true; ngược lại `m = ANY(Modules)`. Hai vai trò quản trị không bao giờ bị khóa module.
- Chặn bằng chính sách **RESTRICTIVE** `mod_<module>` (nối AND với chính sách cũ, không sửa chính sách nào), dùng `(SELECT public.has_module('x'))` để tính một lần mỗi câu lệnh. Bảng lãi suất/vốn mở nếu có `rates` HOẶC `credit` (lập khoản vay cần bảng lãi suất). `StorageRepos` chặn theo `Kind` (dispatch/form → `dispatch`; shared/personal → `storage`). `SystemConfig` khóa `hf_config` (token Hugging Face cũ, nay không còn dùng) chỉ đọc được khi có `storage` hoặc `dispatch`.
- `UserModules`: đọc = chính mình hoặc admin; ghi = admin và dòng đích không phải Master Admin. Chỉ có ý nghĩa với tài khoản cấp User: ghi cờ cho admin không có tác dụng.
- Tác dụng phụ: `has_module` trả false cho khách chưa đăng nhập nên **đóng luôn** các bảng từng mở cho `anon`/`public` (DisbursementPayees, nhóm bảng Inventory/Statement/Retail, bảng lãi suất).
- Giới hạn: `tools` chỉ ẩn được ở giao diện (không có bảng riêng); khóa Gemini ở trình duyệt. Tệp nằm ở Google Drive; token Drive do Edge Function `drive-token` cấp theo quyền (ghi cho admin/module `storage`, đọc cho phần còn lại).
- Gỡ: `supabase/rollbacks/65_user_modules_rollback.sql` xóa các chính sách `mod_*`, giữ bảng cờ. Kiểm bằng PGlite: `src/lib/__tests__/userModulesRls.test.ts`.
- Áp migration 65 **trước** khi deploy mã mới: thiếu bảng thì tài khoản cấp User không nạp được cờ và thấy lỗi rõ ràng; admin không bị ảnh hưởng.

## 4. RLS bật 100% bảng — kể cả bảng chưa dùng

RLS bật trên **toàn bộ bảng** trong schema `public`, kể cả bảng chưa dùng tới. Bật RLS **không kèm policy** = chặn hoàn toàn (nguyên tắc từ chối mặc định / deny-by-default).

- `02_enable_rls.sql` bật RLS cho 6 bảng nghiệp vụ web app đang dùng: `Customers`, `Collaterals`, `LoanContracts`, `CreditCards`, `RepaymentSchedules`, `UserRoles` — và tạo policy cho chúng.
- `04_close_remaining_tables.sql` bật RLS cho các bảng **kế thừa từ ứng dụng WPF cũ** (`Loans`, `LoanSchedules`, `LoanCollaterals`, `ContractCollaterals`, `ApprovalConditions`, `PostLoanControls`, `__EFMigrationsHistory`) **mà không tạo policy nào** → khoá cứng với cả `anon` lẫn `authenticated`. Không làm hỏng WPF vì WPF nối trực tiếp bằng superuser `postgres` (superuser bỏ qua RLS); không làm hỏng web app vì 5 phân hệ hiện tại không đụng các bảng này.

Ngoài RLS, còn **thu hồi grant** (`REVOKE ALL ... FROM anon`, và với bảng WPF là `FROM anon, authenticated`) để phòng thủ nhiều lớp: policy đã giới hạn `TO authenticated` chặn anon, thu hồi grant là lớp thứ hai.

Kiểm tra nhanh — kỳ vọng **không trả về dòng nào** (mọi bảng đều đã bật RLS):

```sql
SELECT tablename FROM pg_tables WHERE schemaname = 'public' AND rowsecurity = false;
```

## 5. Các hàm hỗ trợ RLS

Định nghĩa ở `01_roles_and_ownership.sql`. Cả ba là `SECURITY DEFINER` **vì lý do kỹ thuật chống đệ quy RLS**, không phải để nâng quyền nghiệp vụ (xem §9):

| Hàm | Trả về | Ý nghĩa |
| :--- | :--- | :--- |
| `is_admin()` | boolean | `auth.uid()` có vai trò `master_admin` hoặc `user_admin` không (migration 60). Nhiều policy cũ dùng hàm này nên User Admin tự có quyền "gần đầy đủ" |
| `is_master_admin()` | boolean | Chỉ `master_admin` (migration 60). Dùng cho xóa vĩnh viễn KH, ghi `UserRoles`, ghi `SystemConfig` |
| `can_access_customer(cid bigint)` | boolean | admin, hoặc `Customers.OwnerId` của `cid` = `auth.uid()` |
| `can_access_contract(contract_id bigint)` | boolean | admin, hoặc HĐTD → `LoanContracts` → `Customers.OwnerId` = `auth.uid()` |

Vì sao phải `SECURITY DEFINER`: policy trên `Customers` cần đọc `UserRoles` để biết ai là admin; nếu hàm chạy `SECURITY INVOKER`, việc đọc `UserRoles` lại kích hoạt policy của chính `UserRoles`, gây đệ quy. `SECURITY DEFINER` cho hàm đọc bảng vai trò với quyền chủ sở hữu, cắt vòng đệ quy. Cả ba khai `STABLE` và `SET search_path = public`.

**Hiệu năng:** `01_roles_and_ownership.sql` tạo các index bắt buộc trước khi bật RLS — `idx_customers_owner`, `idx_collaterals_customer`, `idx_loancontracts_customer`, `idx_creditcards_customer`, `idx_repayment_contract`. Không có chúng, mỗi truy vấn dưới RLS sẽ quét toàn bảng cho từng dòng.

## 6. Chính sách (policy) từng bảng

Từ `02_enable_rls.sql`. Mọi policy đều `TO authenticated` (anon không có cửa).

| Bảng | Lệnh | USING / WITH CHECK | Ghi chú |
| :--- | :--- | :--- | :--- |
| `UserRoles` | SELECT | `UserId = auth.uid() OR is_admin()` | Ai cũng đọc vai trò của chính mình |
| `UserRoles` | ALL (ghi) | `is_master_admin()` | Chỉ Master Admin sửa vai trò (migration 60; trước đó `is_admin()`) |
| `Customers` | SELECT | `is_admin() OR OwnerId = auth.uid()` | |
| `Customers` | INSERT | `is_admin() OR OwnerId = auth.uid()` | Banker tạo KH **buộc tự đứng tên** chủ sở hữu |
| `Customers` | UPDATE | như trên (cả USING và WITH CHECK) | User không "chuyển" KH sang người khác được (WITH CHECK buộc OwnerId = chính mình); admin thì được |
| `Customers` | DELETE | `is_master_admin()` | **Chỉ Master Admin** xoá hồ sơ KH (migration 60; trước đó mọi admin) |
| `SystemConfig` | SELECT | `true` (TO authenticated) | Mọi tài khoản đăng nhập đọc được; anon bị chặn. Khóa `hf_config` còn giữ token Hugging Face cũ (app không còn đọc); nên xóa dòng này và thu hồi token ở Hugging Face |
| `SystemConfig` | INSERT/UPDATE/DELETE | `is_master_admin()` | Chỉ Master Admin cấu hình |
| `Dispatches` | SELECT | `true` (TO authenticated) | Kho văn thư/lưu trữ dùng chung |
| `Dispatches` | INSERT | `OwnerId = auth.uid()` | `OwnerId` có DEFAULT `auth.uid()` nên client không gửi cột này |
| `Dispatches` | UPDATE | `is_admin() OR OwnerId = auth.uid()` | |
| `Dispatches` | DELETE | `is_admin()` | Master Admin và User Admin xóa được |
| `StorageRepos` | SELECT | `Kind IN ('shared','dispatch') OR AssignedUserId = auth.uid() OR is_admin()` | Danh sách kho (thư mục Google Drive): Kho chung và Văn thư ai cũng thấy; kho cá nhân chỉ người được gán và admin |
| `StorageRepos` | INSERT/UPDATE/DELETE | `is_master_admin()` | Chỉ Master Admin tạo và gán repo |
| `Collaterals` | ALL | `can_access_customer("CustomerId")` | Suy quyền theo KH |
| `LoanContracts` | ALL | `can_access_customer("CustomerId")` | |
| `CreditCards` | ALL | `can_access_customer("CustomerId")` | |
| `RepaymentSchedules` | ALL | `can_access_contract("ContractId")` | Suy quyền qua HĐTD |

**Sửa repo (migration 67).** Repository ID còn nằm ở `OfficialDocuments."Files"` (mảng JSON, mỗi tệp có `repoId`) và `Dispatches."RepoId"`, nên đổi ID phải đi qua hàm `update_storage_repo(id, name, repo_id, folder)` (SECURITY DEFINER, chỉ Master Admin): đổi `StorageRepos` và cập nhật hai nơi kia trong một giao dịch. Không UPDATE thẳng cột `RepoId`. Hàm không đổi tên thư mục trên Google Drive. Kho Drive luôn tính từ thư mục gốc (`RepoId` là ID thư mục); app không còn dùng cột `Folder`.

> **Giới hạn đã biết:** phân quyền theo repo (ai upload/xóa ở repo nào) chỉ là quy tắc giao diện trong `src/lib/storageRepos.ts`. Token Drive do Edge Function `drive-token` cấp theo vai trò và module (`decideDriveAccess` trong `supabase/functions/drive-token/rules.ts`): admin hoặc có module `storage` nhận quyền ghi (scope `drive`), chỉ có `dispatch` nhận quyền đọc. Token ghi không gắn với một thư mục, nên RLS chỉ che việc *thấy* repo, không chặn ghi vào thư mục khác mà service account truy cập được. Cô lập thật cần proxy ghi qua Edge Function kiểm thư mục đích.

`02_enable_rls.sql` có sẵn khối **HOÀN TÁC KHẨN CẤP** (comment `DISABLE ROW LEVEL SECURITY` cho 6 bảng) phòng khi bật RLS mà app sập. Điều kiện tiên quyết đã ghi trong đầu file 02: **chỉ chạy sau khi frontend đã có luồng đăng nhập hoạt động** — chạy khi chưa có Auth thì `auth.uid()` = NULL nên mọi policy đều chặn, app ngừng hoạt động hoàn toàn.

## 7. Sinh ID do cơ sở dữ liệu, không phải client

`05_fix_id_generation.sql` trả việc sinh khoá chính về cho CSDL (sequence + `DEFAULT nextval`). **Không dùng `max(Id)+1` ở client.** Ba lý do (ghi trong file):

1. **Tranh chấp:** hai banker lưu cùng lúc sinh trùng `Id`.
2. **RLS làm `max(Id)` sai:** sau khi bật RLS, `select('Id')` chỉ trả các dòng banker được thấy, nên `max(Id)` là cực đại **cục bộ** — gần như chắc chắn đâm vào bản ghi của người khác.
3. **Tràn kiểu integer:** nhánh dự phòng `Date.now()` (~1,78e12) vượt giới hạn `integer` (2.147.483.647).

Điểm phải nhớ khi thêm bảng mới: bốn bảng cũ đã có sequence nhưng chưa từng dùng, nên phải `setval` đồng bộ con trỏ **trước** khi bỏ code sinh ID ở client, nếu không `nextval` trả 1,2,3… trùng dữ liệu có sẵn. Cần `GRANT USAGE, SELECT ON ALL SEQUENCES ... TO authenticated` (và `ALTER DEFAULT PRIVILEGES`), thiếu thì insert báo "permission denied for sequence".

## 8. service_role không bao giờ vào client

`src/lib/supabase.ts` chỉ tạo client bằng `VITE_SUPABASE_URL` + `VITE_SUPABASE_ANON_KEY`. **Khoá `service_role` (bỏ qua RLS) tuyệt đối không được đưa vào code phía trình duyệt.**

Tạo tài khoản người dùng cần `service_role`. Nếu làm màn hình quản trị người dùng trong app, phải qua **Supabase Edge Function** (chạy phía máy chủ, giữ khoá bí mật), không gọi từ trình duyệt. Hiện tại việc tạo user làm thủ công trong Dashboard rồi gán vai trò bằng `03_user_management.sql`.

## 9. SECURITY INVOKER vs SECURITY DEFINER

Đây là ranh giới an toàn quan trọng nhất khi viết hàm CSDL.

- **`SECURITY INVOKER` (mặc định)** — hàm chạy dưới quyền người gọi, **RLS vẫn áp**. Dùng cho mọi hàm nghiệp vụ mà người dùng kích hoạt.
- **`SECURITY DEFINER`** — hàm chạy dưới quyền chủ sở hữu, **bỏ qua RLS**. Chỉ dùng khi có lý do kỹ thuật bắt buộc (chống đệ quy) hoặc cho **job hệ thống** không có người gọi.

| Hàm | Chế độ | Vì sao |
| :--- | :--- | :--- |
| `is_admin`, `can_access_customer`, `can_access_contract` | DEFINER | Chống đệ quy RLS (§5) — không phải nâng quyền nghiệp vụ |
| `clone_rate_program` (nhân bản chương trình lãi suất) | **INVOKER** | RLS vẫn áp nên **chỉ admin** ghi được, đúng chính sách đặt ở migration 09. Chủ ý **KHÔNG** dùng DEFINER (ghi rõ trong `49_...sql` và `56_...sql`) |
| `refresh_all_debt_groups` (job cập nhật nhóm nợ) | DEFINER | Job hệ thống chạy bởi pg_cron, không có người gọi (§10) |
| `seed_quiz_bank` (nạp bộ câu hỏi gốc) | DEFINER | Phải bật cờ phiên `app.quiz_seed` — đặc quyền có lý do |
| `import_quiz_questions` (nạp thêm câu hỏi) | INVOKER | Chỉ làm đúng những gì RLS vốn cho phép; DEFINER không mua thêm gì mà để lại rủi ro |

**Bẫy phải nhớ với hàm INVOKER:** không được kiểm tra đăng nhập bằng `SELECT ... FROM auth.users` — `authenticated` không chắc đọc được bảng đó, hàm sẽ đổ ngay dòng đầu. Hỏi `auth.uid() IS NULL` thay vào.

`clone_rate_program` (migration 56 là bản mới nhất, cho phép chồng lấn — bản mới nhất thắng, chỉ chặn khi trùng đúng ngày bắt đầu cùng loại) luôn đặt bản sao `SourceVerified = false`, và có `REVOKE ALL ... FROM public` + `GRANT EXECUTE ... TO authenticated` — RLS mới là chốt thật quyết định chỉ admin chạy được.

## 10. pg_cron và job hệ thống

`57_cron_cap_nhat_debt_group.sql` cài `pg_cron` và lập lịch cập nhật `LoanContracts.DebtGroup` hàng ngày.

Vì sao cần job: `DebtGroup` lưu trong bảng chỉ được cập nhật khi có người thu nợ/tất toán/mở portfolio của KH đó. KH không ai đụng tới thì nhóm nợ lưu bị cũ — KH trễ 22 ngày vẫn mang Nhóm 1 trong CSDL (dù giao diện đã tính sống). Job rà toàn bộ KUNN chưa tất toán mỗi đêm và nâng nhóm cho khớp số ngày quá hạn.

| Điểm | Chi tiết |
| :--- | :--- |
| Hàm | `public.refresh_all_debt_groups()` trả `integer` (số dòng đã nâng nhóm) |
| Chế độ | `SECURITY DEFINER`, `SET search_path = public, pg_temp` |
| Chính sách nhóm | **Chỉ nâng, không tự hạ:** `DebtGroup = GREATEST(nhóm lưu, nhóm theo số ngày quá hạn lớn nhất của kỳ chưa trả)`. Hạ nhóm để luồng thu nợ/tất toán trong app quyết (chuẩn thận trọng ngân hàng, khớp cách app hiển thị `max(lưu, auto)`) |
| Ngưỡng ngày quá hạn → nhóm | 10–90 → 2; 91–180 → 3; 181–360 → 4; >360 → 5; còn lại → 1 |
| Ngày | Lấy theo giờ VN `now() AT TIME ZONE 'Asia/Ho_Chi_Minh'`, **KHÔNG dùng UTC** (§11) |
| Quyền chạy | `REVOKE ALL ON FUNCTION ... FROM public` — chỉ hệ thống (postgres/cron) gọi được, chặn user tự kích hoạt cập nhật hàng loạt |
| Lịch | `cron.schedule('refresh-debt-groups-daily', '15 17 * * *', ...)` = 00:15 giờ VN mỗi ngày (17:15 UTC). Idempotent: `cron.unschedule` job cùng tên trước khi lập lại |

Nhóm nợ **phải tính sống** ở tầng ứng dụng: đừng đọc thẳng field `DebtGroup` (có thể cũ), dùng `max(giá trị lưu, tính từ ngày quá hạn)`. Job cron chỉ đồng bộ dần dần giá trị lưu cho các báo cáo đọc thẳng cột.

## 11. Mọi cột ngày là kiểu `date`

Không dùng `timestamptz` cho ngày nghiệp vụ. Lý do lịch sử: `HdtdDueDate` từng là `timestamptz` nên PostgREST trả `2026-05-28T00:00:00+00:00` trong khi mọi cột khác trả `2026-05-28`. Hệ quả dây chuyền: `creditLimit.ts` so chuỗi giữa hai dạng ra sai thứ tự; hai view tự chặn bằng regex `^\d{4}-\d{2}-\d{2}$` nên nhánh dự phòng chết; `saveContractAPI` xoá hẳn trường khỏi payload → mở KUNN cũ rồi lưu là mất giá trị mà giao diện vẫn báo thành công. Migration 19 đã đổi kiểu về `date`; migration 48 xoá cột cũ.

Ngày đọc từ CSDL chuẩn hoá bằng **`toIsoDate` trong `utils.ts`**, không viết lại regex tại chỗ dùng. Hàm cắt phần giờ **không quy đổi múi giờ**: banker nhập từ trình duyệt ở +07 nên ngày họ thấy là ngày theo giờ VN; quy đổi về UTC sẽ lùi một ngày.

## 12. Quy ước migration

- Script trong `supabase/migrations/` chạy **thủ công qua Supabase SQL Editor**, theo đúng **thứ tự số**. Lưu ý: SQL Editor chạy với quyền quản trị nên **bỏ qua RLS** — các lệnh quản trị trong `03_user_management.sql` vì thế vẫn chạy được sau khi RLS đã bật.
- **Thứ tự triển khai:** khi một thay đổi vừa động lược đồ vừa động mã nguồn, **luôn chạy migration trước rồi mới deploy code**. Làm ngược lại tạo khoảng thời gian hệ thống hỏng. Ví dụ điển hình: file 02 (bật RLS) ghi rõ chỉ chạy **sau khi** frontend đã có đăng nhập.
- Script trong `supabase/reports/` là **báo cáo chỉ đọc** — không UPDATE, không INSERT, chạy lại bao nhiêu lần cũng được.
- Nhiều migration được viết **idempotent** (chạy lại an toàn): dùng `IF NOT EXISTS`, `CREATE OR REPLACE`, `ON CONFLICT DO UPDATE`, dò tên ràng buộc động rồi mới `DROP` (ví dụ `33_kunn_chan_xoa_hdtd.sql` tìm tên khoá ngoại qua `pg_constraint` thay vì viết cứng).

### Bước chốt an toàn trong migration phải thực sự chạy được

Bài học từ migration 16: bước 2 (kiểm "số mới có trùng số cũ không") thiếu dấu phẩy giữa hai CTE nên **luôn lỗi cú pháp**, còn bước 4 (đổi số) vẫn chạy — đây là đường sinh ra phần lớn cặp KUNN trùng số. Khi chạy migration nhiều bước: **đọc kết quả từng bước**, thấy lỗi cú pháp ở bước rà soát thì **dừng lại**, không nhảy sang bước cập nhật.

Ví dụ về ràng buộc là "lớp bảo vệ thật" chứ không phải chỉ chốt ở giao diện — `33_kunn_chan_xoa_hdtd.sql`: đổi khoá ngoại `LoanContracts.CreditContractId` từ `ON DELETE SET NULL` (mã chết, vì cột đang `NOT NULL` nên gán NULL luôn văng lỗi 23502) sang `ON DELETE RESTRICT`. Chốt ở `CreditContractView` (chặn xoá HĐTD khi `countKunnOfCreditContractAPI > 0`) không phải lớp bảo vệ — cùng lý lẽ với RLS và unique index số KUNN. Đây mới là lớp bảo vệ thật ở tầng dữ liệu.

## 13. Sổ tra nhanh tệp/hàm

| Tệp | Vai trò |
| :--- | :--- |
| `src/lib/supabase.ts` | Tạo Supabase client bằng anon key; bọc `fetch` bằng `wrapFetchWithHealthTracking` |
| `src/context/AuthContext.tsx` | Phiên, đăng nhập/đăng xuất, tra vai trò từ `UserRoles`, `isAdmin` (chỉ UI) |
| `supabase/migrations/01_roles_and_ownership.sql` | `UserRoles`, `Customers.OwnerId`, index, `is_admin`/`can_access_customer`/`can_access_contract` |
| `supabase/migrations/02_enable_rls.sql` | Bật RLS + policy cho 6 bảng nghiệp vụ; revoke anon; khối hoàn tác khẩn cấp |
| `supabase/migrations/03_user_management.sql` | Bộ lệnh tra cứu: gán vai trò, bàn giao KH, đổi vai trò, thu hồi quyền |
| `supabase/migrations/04_close_remaining_tables.sql` | Đóng các bảng WPF cũ (RLS không policy) |
| `supabase/migrations/05_fix_id_generation.sql` | Sequence + `nextval`, bỏ `max(Id)+1` client |
| `supabase/migrations/33_kunn_chan_xoa_hdtd.sql` | Khoá ngoại `ON DELETE RESTRICT` cho HĐTD ↔ KUNN |
| `supabase/migrations/57_cron_cap_nhat_debt_group.sql` | `refresh_all_debt_groups` + pg_cron hàng ngày |
| `supabase/migrations/49` & `56` | `clone_rate_program` (SECURITY INVOKER) |
| `src/lib/utils.ts` → `toIsoDate` | Chuẩn hoá ngày, không đổi múi giờ |
