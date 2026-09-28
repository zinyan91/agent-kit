import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync, spawnSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const HOOKS = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', 'git-hooks').replaceAll('\\', '/');
const TOKEN_GIA = ['ghp', '_', 'A'.repeat(36)].join('');

let goc;
const git = (cwd, ...a) => execFileSync('git', a, { cwd, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] });
const push = (cwd, ...a) => spawnSync('git', ['push', ...a], { cwd, encoding: 'utf8' });

function repoMoi(ten) {
  const remote = path.join(goc, `${ten}.git`);
  const lam = path.join(goc, ten);
  git(goc, 'init', '-q', '--bare', remote);
  git(goc, 'init', '-q', '-b', 'main', lam);
  git(lam, 'config', 'user.name', 'test');
  git(lam, 'config', 'user.email', 'test@example.com');
  git(lam, 'config', 'core.hooksPath', HOOKS);
  git(lam, 'remote', 'add', 'origin', remote);
  return lam;
}

function commit(lam, tep, noiDung) {
  fs.mkdirSync(path.dirname(path.join(lam, tep)), { recursive: true });
  fs.writeFileSync(path.join(lam, tep), noiDung);
  git(lam, 'add', '-A');
  git(lam, 'commit', '-qm', `sua ${tep}`);
}

before(() => {
  goc = fs.mkdtempSync(path.join(os.tmpdir(), 'agent-kit-prepush-'));
});

after(() => fs.rmSync(goc, { recursive: true, force: true }));

test('push sạch, không có package.json: qua (nhánh mới vẫn được quét)', () => {
  const lam = repoMoi('sach');
  commit(lam, 'a.txt', 'xin chao\n');
  const kq = push(lam, '-u', 'origin', 'main');
  assert.equal(kq.status, 0, kq.stderr);
});

test('nhánh mới có token: bị chặn', () => {
  const lam = repoMoi('token-moi');
  commit(lam, 'a.ts', `const t = "${TOKEN_GIA}";\n`);
  const kq = push(lam, '-u', 'origin', 'main');
  assert.notEqual(kq.status, 0);
  assert.match(kq.stderr, /CHẶN PUSH/);
  assert.match(kq.stderr, /GitHub token/);
});

test('nhánh đã có trên remote, commit sau thêm token: bị chặn', () => {
  const lam = repoMoi('token-cap-nhat');
  commit(lam, 'a.txt', 'sach\n');
  assert.equal(push(lam, '-u', 'origin', 'main').status, 0);
  commit(lam, 'b.ts', `const t = "${TOKEN_GIA}";\n`);
  assert.notEqual(push(lam).status, 0);
});

test('token thêm rồi xoá ở commit sau vẫn bị chặn, vì còn trong lịch sử', () => {
  const lam = repoMoi('token-lich-su');
  commit(lam, 'a.ts', `const t = "${TOKEN_GIA}";\n`);
  commit(lam, 'a.ts', 'const t = process.env.GH;\n');
  assert.notEqual(push(lam, '-u', 'origin', 'main').status, 0);
});

test('dòng có secret-scan-ok: qua', () => {
  const lam = repoMoi('bo-qua');
  commit(lam, 'a.ts', `const t = "${TOKEN_GIA}"; // secret-scan-ok\n`);
  assert.equal(push(lam, '-u', 'origin', 'main').status, 0);
});

test('build fail: bị chặn; build pass: qua', () => {
  const lam = repoMoi('build');
  commit(lam, 'package.json', JSON.stringify({ scripts: { build: 'node -e "process.exit(1)"' } }));
  const hong = push(lam, '-u', 'origin', 'main');
  assert.notEqual(hong.status, 0);
  assert.match(hong.stderr, /npm run build/);
  commit(lam, 'package.json', JSON.stringify({ scripts: { build: 'node -e "process.exit(0)"' } }));
  assert.equal(push(lam, '-u', 'origin', 'main').status, 0);
});

test('xoá nhánh trên remote: qua, không quét, không build', () => {
  const lam = repoMoi('xoa');
  commit(lam, 'a.txt', 'x\n');
  assert.equal(push(lam, '-u', 'origin', 'main').status, 0);
  git(lam, 'checkout', '-q', '-b', 'tam');
  assert.equal(push(lam, 'origin', 'tam').status, 0);
  commit(lam, 'package.json', JSON.stringify({ scripts: { build: 'node -e "process.exit(1)"' } }));
  assert.equal(push(lam, 'origin', '--delete', 'tam').status, 0);
});

test('hook pre-push cục bộ của repo vẫn được gọi tiếp', () => {
  const lam = repoMoi('cuc-bo');
  commit(lam, 'a.txt', 'x\n');
  fs.writeFileSync(path.join(lam, '.git', 'hooks', 'pre-push'), '#!/bin/sh\necho "hook cuc bo tu choi" >&2\nexit 1\n');
  const kq = push(lam, '-u', 'origin', 'main');
  assert.notEqual(kq.status, 0);
  assert.match(kq.stderr, /hook cuc bo tu choi/);
});
