import { test } from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';
import { lapKeHoach, timJunctionMoCoi } from '../lib/ke-hoach.mjs';

const KIT = path.join('D:', 'kit', 'skills');
const congCu = { claude: { skills: path.join('C:', 'c') }, codex: { skills: path.join('C:', 'x') } };

function ke(hienTrang, extra = {}) {
  return lapKeHoach({ thuMucSkillKit: KIT, skills: ['a'], congCu, chiVao: {}, hienTrang, ...extra });
}

test('đích chưa có thì tạo junction', () => {
  const kq = ke(() => ({ loai: 'khong-co' }));
  assert.deepEqual(kq.map((h) => h.loai), ['tao', 'tao']);
  assert.equal(kq[0].nguon, path.join(KIT, 'a'));
  assert.equal(kq[0].dich, path.join('C:', 'c', 'a'));
});

test('junction đã trỏ đúng thì giữ', () => {
  const kq = ke(() => ({ loai: 'junction', dichJunction: path.join(KIT, 'a') }));
  assert.deepEqual(kq.map((h) => h.loai), ['giu', 'giu']);
});

test('junction trỏ chỗ khác là xung đột', () => {
  const kq = ke(() => ({ loai: 'junction', dichJunction: 'E:\khac' }));
  assert.equal(kq[0].loai, 'xung-dot');
});

test('thư mục thật giống hệt bản trong kit thì thay bằng junction', () => {
  const kq = ke(() => ({ loai: 'thu-muc', giongKit: true }));
  assert.equal(kq[0].loai, 'thay-bang-junction');
});

test('thư mục thật khác bản trong kit là xung đột, không đụng vào', () => {
  const kq = ke(() => ({ loai: 'thu-muc', giongKit: false }));
  assert.equal(kq[0].loai, 'xung-dot');
});

test('tệp thường trùng tên là xung đột', () => {
  assert.equal(ke(() => ({ loai: 'tep' }))[0].loai, 'xung-dot');
});

test('chiVao giới hạn công cụ đích', () => {
  const kq = ke(() => ({ loai: 'khong-co' }), { chiVao: { a: ['codex'] } });
  assert.deepEqual(kq.map((h) => h.congCu), ['codex']);
});

test('công cụ không khai thư mục skills thì bỏ qua', () => {
  const kq = lapKeHoach({
    thuMucSkillKit: KIT, skills: ['a'], chiVao: {},
    congCu: { claude: { skills: 'C:\c' }, khac: { tepLuat: 'x' } },
    hienTrang: () => ({ loai: 'khong-co' }),
  });
  assert.deepEqual(kq.map((h) => h.congCu), ['claude']);
});

const moCoi = (hienTrang, lietKe) =>
  timJunctionMoCoi({ thuMucSkillKit: KIT, skills: ['a'], congCu, lietKe, hienTrang });

test('junction trỏ vào skill đã xoá khỏi kit là mồ côi', () => {
  const kq = moCoi((dich) => ({ loai: 'junction', dichJunction: path.join(KIT, path.basename(dich)) }), () => ['cu', 'a']);
  assert.deepEqual(kq.map((h) => [h.congCu, h.skill]), [['claude', 'cu'], ['codex', 'cu']]);
  assert.equal(kq[0].dich, path.join('C:', 'c', 'cu'));
});

test('junction trỏ ra ngoài kit hoặc thư mục thật thì không phải mồ côi', () => {
  const kq = moCoi((dich) => (path.basename(dich) === 'cu' ? { loai: 'junction', dichJunction: 'E:\khac\cu' } : { loai: 'thu-muc' }), () => ['cu', 'tu-tao']);
  assert.deepEqual(kq, []);
});
