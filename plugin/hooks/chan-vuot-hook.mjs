import { timCachVuotHook } from './lib/vuot-hook.mjs';

let dauVao = '';
for await (const manh of process.stdin) dauVao += manh;

let lenh = '';
try {
  lenh = String(JSON.parse(dauVao)?.tool_input?.command ?? '');
} catch {
  process.exit(0);
}

const cach = timCachVuotHook(lenh);
if (cach) {
  process.stdout.write(
    JSON.stringify({
      hookSpecificOutput: {
        hookEventName: 'PreToolUse',
        permissionDecision: 'deny',
        permissionDecisionReason:
          `CHẶN: ${cach} vượt qua git hook kiểm tra trước khi push (quét bí mật + build). ` +
          'Hook chặn thì sửa nguyên nhân nó báo, không né. Người dùng muốn bỏ qua thì tự chạy lệnh.',
      },
    }),
  );
}
