import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

let nha;
let tt;
before(async () => {
  nha = fs.mkdtempSync(path.join(os.tmpdir(), 'agent-kit-tt-'));
  process.env.AGENT_KIT_NHA = nha;
  tt = await import('../plugin/hooks/lib/trang-thai.mjs');
});
after(() => fs.rmSync(nha, { recursive: true, force: true }));

test('chưa có tệp trạng thái thì trả mặc định', () => {
  assert.deepEqual(tt.docTrangThai(), { chiChung: false, lanKiemCuoi: null, ketQuaCuoi: null });
});

test('ghi một phần giữ các trường khác', () => {
  tt.ghiTrangThai({ chiChung: true });
  tt.ghiTrangThai({ lanKiemCuoi: '2026-10-24T00:00:00.000Z' });
  assert.deepEqual(tt.docTrangThai(), { chiChung: true, lanKiemCuoi: '2026-10-24T00:00:00.000Z', ketQuaCuoi: null });
  assert.equal(tt.tepTrangThai(), path.join(nha, '.agent-kit-may.json'));
});

test('tệp hỏng thì coi như chưa có, không ném lỗi', () => {
  fs.writeFileSync(path.join(nha, '.agent-kit-may.json'), '{hong');
  assert.deepEqual(tt.docTrangThai(), { chiChung: false, lanKiemCuoi: null, ketQuaCuoi: null });
});
