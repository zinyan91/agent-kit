import { test } from 'node:test';
import assert from 'node:assert/strict';
import { quetDongThem, DAU_BO_QUA } from '../git-hooks/lib/quet-bi-mat.mjs';

const lap = (c, n) => c.repeat(n);
const ENV = ["process", "env", ""].join(".");
const MAU = {
  jwt: `eyJ${lap('a', 20)}.${lap('b', 20)}`,
  telegram: `123456789:AA${lap('x', 33)}`,
  openai: `sk-${lap('z', 30)}`,
  github: `ghp_${lap('A', 36)}`,
  aws: `AKIA${lap('B', 16)}`,
  googleCu: `AIza${lap('c', 35)}`,
  stitch: `AQ.${lap('d', 40)}`,
  privateKey: `-----BEGIN RSA PRIVATE ${'KEY'}-----`,
};

const diff = (...dong) => ['+++ b/tep.ts', ...dong.map((d) => `+${d}`)].join('\n');

for (const [ten, giaTri] of Object.entries(MAU)) {
  test(`bắt ${ten}`, () => {
    assert.equal(quetDongThem(diff(`const x = "${giaTri}";`)).length, 1);
  });
}

test('bắt fallback chuỗi cứng cho biến bí mật', () => {
  assert.equal(quetDongThem(diff(`const s = ${ENV}JWT_SECRET || 'abc';`)).length, 1);
});

test('bắt fallback là tên hằng', () => {
  assert.equal(quetDongThem(diff(`const s = ${ENV}API_TOKEN || MAC_DINH;`)).length, 1);
});

test('bắt hằng bí mật khai báo cứng', () => {
  assert.equal(quetDongThem(diff(`const HF_TOKEN = '${lap('q', 20)}';`)).length, 1);
});

test('dòng có dấu bỏ qua thì cho qua', () => {
  assert.equal(quetDongThem(diff(`const x = "${MAU.github}"; // ${DAU_BO_QUA}`)).length, 0);
});

test('anon key Supabase công khai được miễn', () => {
  assert.equal(quetDongThem(diff(`NEXT_PUBLIC_SUPABASE_ANON_KEY=${MAU.jwt}`)).length, 0);
});

test('chỉ quét dòng thêm, bỏ qua dòng xoá và dòng ngữ cảnh', () => {
  const d = ['+++ b/a', `-${MAU.github}`, ` ${MAU.github}`, '+binh thuong'].join('\n');
  assert.equal(quetDongThem(d).length, 0);
});

test('không nhầm tiêu đề +++ là dòng thêm', () => {
  assert.equal(quetDongThem(`+++ b/${MAU.github}`).length, 0);
});

test('trả về tên quy tắc và dòng đã cắt gọn', () => {
  const [kq] = quetDongThem(diff(`x = "${MAU.github}"`));
  assert.equal(kq.quyTac, 'GitHub token');
  assert.ok(kq.dong.length <= 110);
});
