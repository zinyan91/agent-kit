import { test } from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';
import { nhanVai, quyetDinhNhaKit } from '../lib/vai.mjs';

const KIT = path.join('D:', 'agent-kit');
const NHA_KIT = path.join('C:', 'Users', 'u', '.agent-kit');

test('chạy từ chính ~/.agent-kit là máy dùng, chạy từ chỗ khác là máy nguồn', () => {
  assert.equal(nhanVai(NHA_KIT, NHA_KIT.toUpperCase()), 'dung');
  assert.equal(nhanVai(KIT, NHA_KIT), 'nguon');
});

test('máy nguồn: tạo junction ~/.agent-kit, giữ nếu đã đúng, xung đột nếu khác', () => {
  assert.equal(quyetDinhNhaKit({ loai: 'khong-co' }, KIT).loai, 'tao');
  assert.equal(quyetDinhNhaKit({ loai: 'junction', dichJunction: KIT + path.sep }, KIT).loai, 'giu');
  assert.equal(quyetDinhNhaKit({ loai: 'junction', dichJunction: 'E:\khac' }, KIT).loai, 'xung-dot');
  assert.equal(quyetDinhNhaKit({ loai: 'thu-muc' }, KIT).loai, 'xung-dot');
  assert.equal(quyetDinhNhaKit({ loai: 'tep' }, KIT).loai, 'xung-dot');
});
