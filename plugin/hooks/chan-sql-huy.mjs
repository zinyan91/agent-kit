import { timLenhHuy } from './lib/sql-huy.mjs';

let dauVao = '';
for await (const manh of process.stdin) dauVao += manh;

let sql = '';
try {
  sql = String(JSON.parse(dauVao)?.tool_input?.query ?? '');
} catch {
  process.exit(0);
}

const thay = timLenhHuy(sql);
if (thay.length) {
  process.stdout.write(
    JSON.stringify({
      hookSpecificOutput: {
        hookEventName: 'PreToolUse',
        permissionDecision: 'deny',
        permissionDecisionReason:
          `CHẶN SQL HUỶ DỮ LIỆU: ${thay.join(', ')}.\n\n` +
          'Database là dữ liệu production; migration phải không phá huỷ. Nếu thật sự cần huỷ: ' +
          '(1) tạo nhánh backup, (2) sao lưu bằng CREATE TABLE <ten>_backup_YYYYMMDD AS SELECT * FROM <ten>, ' +
          '(3) xin xác nhận người dùng, (4) người dùng tự chạy trong Supabase SQL Editor. Hook này cố ý không có cờ bỏ qua.',
      },
    }),
  );
}
