import { test } from 'node:test';
import assert from 'node:assert/strict';
import { docDongRef, SHA_RONG } from '../git-hooks/lib/pham-vi.mjs';

const A = 'a'.repeat(40);
const B = 'b'.repeat(40);

test('push nhánh đã có trên remote: quét remote..local', () => {
  assert.deepEqual(docDongRef(`refs/heads/main ${A} refs/heads/main ${B}\n`), [
    { loai: 'cap-nhat', local: A, remote: B },
  ]);
});

test('push nhánh mới: remote sha toàn số 0 vẫn phải quét', () => {
  assert.deepEqual(docDongRef(`refs/heads/moi ${A} refs/heads/moi ${SHA_RONG}`), [
    { loai: 'nhanh-moi', local: A },
  ]);
});

test('xoá nhánh trên remote: bỏ qua', () => {
  assert.deepEqual(docDongRef(`(delete) ${SHA_RONG} refs/heads/cu ${B}`), []);
});

test('nhiều ref, bỏ dòng trống, chịu được CRLF', () => {
  const kq = docDongRef(`r ${A} r ${B}\r\n\r\nr2 ${B} r2 ${SHA_RONG}\r\n`);
  assert.deepEqual(kq.map((x) => x.loai), ['cap-nhat', 'nhanh-moi']);
});

test('stdin rỗng: không có gì để quét', () => {
  assert.deepEqual(docDongRef(''), []);
});
