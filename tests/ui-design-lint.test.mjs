import { test } from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const KIT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const LINT = path.join(KIT, 'skills', 'ui-design', 'scripts', 'lint.mjs');
const FIXTURE = path.join(KIT, 'tests', 'fixtures', 'ui-tells.html');

const lint = (...doiSo) => spawnSync(process.execPath, [LINT, ...doiSo, '--json'], { encoding: 'utf8' });
const ids = (kq) => new Set(JSON.parse(kq.stdout).findings.filter((f) => f.level === 'FAIL').map((f) => f.id));

test('lint bắt đủ dấu hiệu cài sẵn', () => {
  const kq = lint(FIXTURE);
  assert.equal(kq.status, 1, kq.stderr);
  const co = ids(kq);
  for (const id of ['gradient', 'micro-label', 'numbering', 'shadow']) assert.ok(co.has(id), `thiếu ${id}`);
});

test('--allow shadow tắt đúng luật bóng đổ', () => {
  const co = ids(lint(FIXTURE, '--allow', 'shadow'));
  assert.ok(!co.has('shadow'));
  for (const id of ['gradient', 'micro-label', 'numbering']) assert.ok(co.has(id), `thiếu ${id}`);
});

test('bỏ qua node_modules, .next, .tmp', () => {
  const goc = fs.mkdtempSync(path.join(os.tmpdir(), 'ui-design-lint-'));
  try {
    for (const thuMuc of ['node_modules', '.next', '.tmp']) {
      fs.mkdirSync(path.join(goc, thuMuc));
      fs.copyFileSync(FIXTURE, path.join(goc, thuMuc, 'index.html'));
    }
    const kq = spawnSync(process.execPath, [LINT, goc], { encoding: 'utf8' });
    assert.equal(kq.status, 2);
    assert.match(kq.stderr, /No source files/);
  } finally {
    fs.rmSync(goc, { recursive: true, force: true });
  }
});
