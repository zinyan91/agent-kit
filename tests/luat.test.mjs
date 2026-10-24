import { test } from 'node:test';
import assert from 'node:assert/strict';
import { bocFrontmatter, ghepLuat, demDong, docLuatChoMay } from '../plugin/hooks/lib/luat.mjs';

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

test('luật cho một máy: luật chung cộng đúng tệp của máy đó', async () => {
  const fs = await import('node:fs');
  const os = await import('node:os');
  const path = await import('node:path');
  const goc = fs.mkdtempSync(path.join(os.tmpdir(), 'agent-kit-luat-'));
  try {
    fs.mkdirSync(path.join(goc, 'may'));
    fs.writeFileSync(path.join(goc, '00-a.md'), '# A');
    fs.writeFileSync(path.join(goc, 'may', 'YING.md'), '# Máy YING');
    fs.writeFileSync(path.join(goc, 'may', 'KHAC.md'), '# Máy khác');
    assert.deepEqual(docLuatChoMay(goc, 'YING').map((t) => t.ten), ['00-a.md', 'YING.md']);
    assert.deepEqual(docLuatChoMay(goc, 'MAYMOI').map((t) => t.ten), ['00-a.md']);
    assert.equal(docLuatChoMay(goc, 'YING')[1].noiDung, '# Máy YING');
  } finally {
    fs.rmSync(goc, { recursive: true, force: true });
  }
});
