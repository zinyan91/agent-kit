import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const SKILLS = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', 'skills');
const VIET_LAI = ['writing', 'ui-design', 'postgres', 'nodejs'];
const THAY_THE = {
  writing: ['humanizer'],
  'ui-design': ['frontend-design', 'design-taste-frontend'],
  postgres: ['postgres-best-practices', 'pdf-processing-pro'],
  nodejs: ['nodejs-best-practices'],
};
const MAX_DONG = 250;

const tatCa = fs.readdirSync(SKILLS, { withFileTypes: true }).filter((m) => m.isDirectory()).map((m) => m.name);
const boBom = (s) => (s.charCodeAt(0) === 0xfeff ? s.slice(1) : s);
const doc = (ten) => boBom(fs.readFileSync(path.join(SKILLS, ten, 'SKILL.md'), 'utf8')).replace(/\r\n/g, '\n');
const frontmatter = (md) => md.match(/^---\n([\s\S]*?)\n---\n/)?.[1];

for (const ten of tatCa) {
  test(`${ten}: frontmatter có name trùng thư mục và description`, () => {
    const fm = frontmatter(doc(ten));
    assert.ok(fm, 'thiếu frontmatter');
    assert.equal(fm.match(/^name:\s*(.+)$/m)?.[1].trim(), ten);
    assert.match(fm, /^description:/m);
  });
}

for (const ten of VIET_LAI.filter((t) => tatCa.includes(t))) {
  test(`${ten}: SKILL.md ≤ ${MAX_DONG} dòng`, () => {
    assert.ok(doc(ten).split('\n').length <= MAX_DONG);
  });

  test(`${ten}: mọi references/… và scripts/… được nhắc tới đều tồn tại`, () => {
    const thuMuc = path.join(SKILLS, ten);
    const nhac = new Set();
    const tep = [path.join(thuMuc, 'SKILL.md'), ...(fs.existsSync(path.join(thuMuc, 'references')) ? fs.readdirSync(path.join(thuMuc, 'references')).map((t) => path.join(thuMuc, 'references', t)) : [])];
    for (const t of tep) for (const m of fs.readFileSync(t, 'utf8').matchAll(/`((?:references|scripts)\/[\w./-]+\.(?:md|mjs))`/g)) nhac.add(m[1]);
    for (const p of nhac) assert.ok(fs.existsSync(path.join(thuMuc, p)), `${p} không tồn tại`);
  });

  for (const cu of THAY_THE[ten]) {
    test(`${ten} đã thay ${cu}: thư mục cũ không còn`, () => {
      assert.ok(!tatCa.includes(cu));
    });
  }
}

const docRef = (ten, tep) => fs.readFileSync(path.join(SKILLS, ten, tep), 'utf8');

test('ui-design: hướng dẫn --allow cho bóng đổ nêu cả heavy-shadow của inspect --app', () => {
  assert.match(doc('ui-design'), /--allow shadow,heavy-shadow/);
});

test('ui-design: không bảo đặt dòng chữ dưới tiêu đề khi luật chung cấm subtitle', () => {
  for (const tep of ['SKILL.md', 'references/app-screens.md', 'references/public-page.md']) {
    const s = docRef('ui-design', tep);
    assert.doesNotMatch(s, /finding sits under the title|under the title or the headline figure/, tep);
    for (const m of s.matchAll(/[^\n]*(second line|supporting sentence)[^\n]*/gi)) {
      const doan = s.slice(Math.max(0, m.index - 300), m.index + 400);
      assert.match(doan, /repo/i, `${tep}: "${m[0].trim().slice(0, 60)}" thiếu điều kiện luật repo`);
    }
  }
});

test('postgres: hàm security definer phải nằm ngoài schema được expose', () => {
  assert.match(doc('postgres'), /private schema/i);
  assert.match(doc('postgres'), /revoke execute/i);
});
