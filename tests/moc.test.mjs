import { test } from 'node:test';
import assert from 'node:assert/strict';
import { thayVungMoc, layVungMoc, MOC_DAU, MOC_CUOI } from '../lib/moc.mjs';

test('chưa có mốc thì nối vùng vào cuối, giữ nội dung cũ', () => {
  const kq = thayVungMoc('Luật riêng của tôi\n', 'A');
  assert.equal(kq, `Luật riêng của tôi\n\n${MOC_DAU}\nA\n${MOC_CUOI}\n`);
});

test('tệp rỗng thì chỉ có vùng mốc', () => {
  assert.equal(thayVungMoc('', 'A'), `${MOC_DAU}\nA\n${MOC_CUOI}\n`);
});

test('đã có mốc thì chỉ thay phần giữa, giữ trước và sau', () => {
  const cu = `đầu\n${MOC_DAU}\ncũ\n${MOC_CUOI}\ncuối\n`;
  assert.equal(thayVungMoc(cu, 'mới'), `đầu\n${MOC_DAU}\nmới\n${MOC_CUOI}\ncuối\n`);
});

test('chạy hai lần cho kết quả như một lần', () => {
  const mot = thayVungMoc('x\n', 'B');
  assert.equal(thayVungMoc(mot, 'B'), mot);
});

test('đọc lại được nội dung vùng mốc', () => {
  assert.equal(layVungMoc(thayVungMoc('x', 'nội dung\nhai dòng')), 'nội dung\nhai dòng');
  assert.equal(layVungMoc('không có mốc'), null);
});

test('chuẩn hoá CRLF khi so', () => {
  const cu = `a\r\n${MOC_DAU}\r\ncũ\r\n${MOC_CUOI}\r\n`;
  assert.equal(layVungMoc(cu), 'cũ');
});
