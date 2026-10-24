import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync, execFileSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const BIN = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', 'bin', 'agent-kit.mjs');
let goc;
let nguon;

const git = (cwd, ...a) => execFileSync('git', ['-c', 'user.name=t', '-c', 'user.email=t@t', ...a], { cwd, stdio: 'pipe' });
const INSTALL_GIA = "import fs from 'node:fs';\nimport path from 'node:path';\nfs.writeFileSync(path.join(process.env.AGENT_KIT_NHA, 'da-chay.json'), JSON.stringify(process.argv.slice(2)));\n";

const chayBin = (nha, ...doiSo) =>
  spawnSync(process.execPath, [BIN, ...doiSo], { encoding: 'utf8', env: { ...process.env, AGENT_KIT_NHA: nha, AGENT_KIT_GIT_URL: nguon } });
const daChay = (nha) => JSON.parse(fs.readFileSync(path.join(nha, 'da-chay.json'), 'utf8'));

before(() => {
  goc = fs.mkdtempSync(path.join(os.tmpdir(), 'agent-kit-bin-'));
  nguon = path.join(goc, 'nguon');
  fs.mkdirSync(nguon);
  git(nguon, 'init', '-q', '-b', 'main');
  fs.writeFileSync(path.join(nguon, 'install.mjs'), INSTALL_GIA);
  git(nguon, 'add', '.');
  git(nguon, 'commit', '-q', '-m', 'dau');
});
after(() => fs.rmSync(goc, { recursive: true, force: true }));

test('máy mới: clone về ~/.agent-kit rồi chạy install với đối số được chuyển tiếp', () => {
  const nha = path.join(goc, 'nha-moi');
  fs.mkdirSync(nha);
  const kq = chayBin(nha, '--chi-chung');
  assert.equal(kq.status, 0, kq.stderr + kq.stdout);
  assert.ok(fs.existsSync(path.join(nha, '.agent-kit', '.git')));
  assert.deepEqual(daChay(nha), ['--chi-chung']);
});

test('chạy lại: kéo commit mới về bản clone', () => {
  const nha = path.join(goc, 'nha-moi');
  fs.writeFileSync(path.join(nguon, 'moi.txt'), 'x');
  git(nguon, 'add', '.');
  git(nguon, 'commit', '-q', '-m', 'moi');
  const kq = chayBin(nha);
  assert.equal(kq.status, 0, kq.stderr + kq.stdout);
  assert.ok(fs.existsSync(path.join(nha, '.agent-kit', 'moi.txt')));
  assert.deepEqual(daChay(nha), []);
});

test('máy nguồn (~/.agent-kit là junction): không động vào git, vẫn chạy install', () => {
  const nha = path.join(goc, 'nha-nguon');
  fs.mkdirSync(nha);
  fs.symlinkSync(nguon, path.join(nha, '.agent-kit'), 'junction');
  const kq = chayBin(nha, '--kiem');
  assert.equal(kq.status, 0, kq.stderr + kq.stdout);
  assert.deepEqual(daChay(nha), ['--kiem']);
});
