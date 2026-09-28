import { test } from 'node:test';
import assert from 'node:assert/strict';
import { timCachVuotHook } from '../plugin/hooks/lib/vuot-hook.mjs';

const chan = (lenh) => assert.ok(timCachVuotHook(lenh), `phải chặn: ${lenh}`);
const qua = (lenh) => assert.equal(timCachVuotHook(lenh), null, `phải cho qua: ${lenh}`);

test('chặn git push --no-verify ở mọi vị trí', () => {
  chan('git push --no-verify');
  chan('git push origin main --no-verify');
  chan('cd D:/x && git push --no-verify origin HEAD');
});

test('chặn đổi core.hooksPath để né hook', () => {
  chan('git -c core.hooksPath=/dev/null push');
  chan('git config core.hooksPath .githooks');
  chan('git config --local core.hooksPath ""');
  chan('git config --global --unset core.hooksPath');
});

test('push -n là chạy thử, không phải bỏ hook', () => {
  qua('git push -n origin main');
});

test('lệnh bình thường cho qua', () => {
  qua('git push origin main');
  qua('git commit -m "no-verify trong thông điệp"');
  qua('npm run build');
  qua('git config user.name x');
  qua('git config --get core.hooksPath');
});
