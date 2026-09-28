import { test } from 'node:test';
import assert from 'node:assert/strict';
import { timLenhHuy } from '../plugin/hooks/lib/sql-huy.mjs';

test('bắt các lệnh huỷ dữ liệu', () => {
  assert.deepEqual(timLenhHuy('drop table a'), ['DROP TABLE']);
  assert.deepEqual(timLenhHuy('DROP SCHEMA x cascade'), ['DROP SCHEMA']);
  assert.deepEqual(timLenhHuy('truncate a'), ['TRUNCATE']);
  assert.deepEqual(timLenhHuy('alter table a drop column b'), ['ALTER TABLE ... DROP COLUMN']);
  assert.deepEqual(timLenhHuy('delete from a'), ['DELETE FROM không có WHERE']);
});

test('DELETE có WHERE thì cho qua', () => {
  assert.deepEqual(timLenhHuy('delete from a where id = 1'), []);
});

test('xét từng câu: câu sau không có WHERE vẫn bị bắt', () => {
  assert.deepEqual(timLenhHuy('delete from a where id=1; delete from b'), ['DELETE FROM không có WHERE']);
});

test('bỏ qua chữ trong comment, chuỗi và thân hàm $$', () => {
  assert.deepEqual(timLenhHuy("-- drop table a\nselect 'truncate'"), []);
  assert.deepEqual(timLenhHuy('/* drop table x */ select 1'), []);
  assert.deepEqual(timLenhHuy('create function f() returns void as $$ delete from a $$ language sql'), []);
});

test('DROP đối tượng schema (policy, index, function) cho qua', () => {
  assert.deepEqual(timLenhHuy('drop policy p on a; drop index i; drop function f()'), []);
});
