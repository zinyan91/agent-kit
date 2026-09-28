import { test } from 'node:test';
import assert from 'node:assert/strict';
import { bocFrontmatter, ghepLuat, demDong } from '../lib/luat.mjs';

test('bóc frontmatter đầu tệp', () => {
  assert.equal(bocFrontmatter('---\ntrigger: always_on\n---\n\n# Tiêu đề\nnội dung\n'), '# Tiêu đề\nnội dung');
});

test('không có frontmatter thì giữ nguyên (chỉ cắt khoảng trắng hai đầu)', () => {
  assert.equal(bocFrontmatter('# A\n\n'), '# A');
});

test('không bóc dấu --- nằm giữa tệp', () => {
  assert.equal(bocFrontmatter('# A\n---\nB'), '# A\n---\nB');
});

test('ghép theo thứ tự tên tệp, cách nhau một dòng trống', () => {
  const kq = ghepLuat([
    { ten: '20-b.md', noiDung: '---\nx: 1\n---\n# B' },
    { ten: '00-a.md', noiDung: '# A' },
  ]);
  assert.equal(kq, '# A\n\n# B');
});

test('đếm dòng không tính frontmatter', () => {
  assert.equal(demDong('---\ntrigger: always_on\n---\n# A\nb\n'), 2);
});
