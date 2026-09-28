import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const KIT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
let nha;
let gitCauHinh;

const chay = (...doiSo) =>
  spawnSync(process.execPath, [path.join(KIT, 'install.mjs'), ...doiSo], {
    encoding: 'utf8',
    env: { ...process.env, AGENT_KIT_NHA: nha, GIT_CONFIG_GLOBAL: gitCauHinh, AGENT_KIT_KHO_LUU: path.join(nha, 'kho-luu') },
  });
const trongNha = (...p) => path.join(nha, ...p);
const laJunction = (p) => fs.lstatSync(p).isSymbolicLink();

before(() => {
  nha = fs.mkdtempSync(path.join(os.tmpdir(), 'agent-kit-install-'));
  gitCauHinh = path.join(nha, '.gitconfig');
  fs.writeFileSync(gitCauHinh, '');
  fs.mkdirSync(trongNha('.claude'), { recursive: true });
  fs.writeFileSync(trongNha('.claude', 'settings.json'), JSON.stringify({ enabledPlugins: { 'agent-kit@agent-kit': true } }));
  fs.mkdirSync(trongNha('.codex', 'skills', 'nha-anh-chatgpt'), { recursive: true });
  fs.copyFileSync(path.join(KIT, 'skills', 'nha-anh-chatgpt', 'SKILL.md'), trongNha('.codex', 'skills', 'nha-anh-chatgpt', 'SKILL.md'));
  fs.writeFileSync(trongNha('.codex', 'AGENTS.md'), 'Luật riêng tự viết\n');
  fs.mkdirSync(trongNha('.claude', 'commands'), { recursive: true });
  fs.writeFileSync(trongNha('.claude', 'commands', 'fp.md'), 'cu');
});

after(() => fs.rmSync(nha, { recursive: true, force: true }));

test('cài lần đầu: nối skill, luật, hook, gỡ lệnh cũ', () => {
  const kq = chay();
  assert.equal(kq.status, 0, kq.stderr + kq.stdout);
  assert.ok(laJunction(trongNha('.claude', 'skills', 'tin-dung')));
  assert.ok(fs.existsSync(trongNha('.claude', 'skills', 'tin-dung', 'SKILL.md')));
  assert.ok(laJunction(trongNha('.gemini', 'config', 'skills', 'fp')));
  assert.ok(laJunction(trongNha('.gemini', 'config', 'rules')));
  assert.ok(!fs.existsSync(trongNha('.claude', 'commands', 'fp.md')));
  assert.match(fs.readFileSync(gitCauHinh, 'utf8'), /hooksPath = .*git-hooks/);
});

test('skill chỉ dành cho Codex không vào Claude và Antigravity', () => {
  assert.ok(!fs.existsSync(trongNha('.claude', 'skills', 'nha-anh-chatgpt')));
  assert.ok(!fs.existsSync(trongNha('.gemini', 'config', 'skills', 'codex-with-chatgpt')));
  assert.ok(laJunction(trongNha('.codex', 'skills', 'codex-with-chatgpt')));
});

test('thư mục thật giống bản kit được thay bằng junction', () => {
  assert.ok(laJunction(trongNha('.codex', 'skills', 'nha-anh-chatgpt')));
});

test('luật Codex nằm trong vùng mốc, giữ phần tự viết', () => {
  const s = fs.readFileSync(trongNha('.codex', 'AGENTS.md'), 'utf8');
  assert.match(s, /^Luật riêng tự viết/);
  assert.match(s, /<!-- agent-kit:bat-dau -->[\s\S]*# Cách làm việc[\s\S]*<!-- agent-kit:ket-thuc -->/);
  assert.doesNotMatch(s, /trigger: always_on/);
});

test('chạy lần hai: không đổi gì, không lỗi', () => {
  const truoc = fs.readFileSync(trongNha('.codex', 'AGENTS.md'), 'utf8');
  const kq = chay();
  assert.equal(kq.status, 0, kq.stderr);
  assert.doesNotMatch(kq.stdout, /^\+/m);
  assert.equal(fs.readFileSync(trongNha('.codex', 'AGENTS.md'), 'utf8'), truoc);
});

test('--kiem sạch sau khi cài', () => {
  const kq = chay('--kiem');
  assert.equal(kq.status, 0, kq.stderr);
  assert.match(kq.stdout, /Sạch/);
});

test('thư mục thật khác bản kit: báo xung đột, không đụng vào', () => {
  const dich = trongNha('.claude', 'skills', 'tin-dung');
  fs.unlinkSync(dich);
  fs.mkdirSync(dich);
  fs.writeFileSync(path.join(dich, 'SKILL.md'), 'ban khac');
  const kq = chay();
  assert.notEqual(kq.status, 0);
  assert.match(kq.stderr, /XUNG ĐỘT/);
  assert.equal(fs.readFileSync(path.join(dich, 'SKILL.md'), 'utf8'), 'ban khac');
  assert.notEqual(chay('--kiem').status, 0);
  fs.rmSync(dich, { recursive: true });
});

test('hooksPath đang trỏ chỗ khác: không ghi đè', () => {
  fs.writeFileSync(gitCauHinh, '[core]\n\thooksPath = E:/khac\n');
  const kq = chay();
  assert.notEqual(kq.status, 0);
  assert.match(fs.readFileSync(gitCauHinh, 'utf8'), /E:\/khac/);
  fs.writeFileSync(gitCauHinh, '');
});

test('--go gỡ junction, vùng mốc và hooksPath; giữ phần tự viết', () => {
  assert.equal(chay().status, 0);
  const kq = chay('--go');
  assert.equal(kq.status, 0, kq.stderr);
  assert.ok(!fs.existsSync(trongNha('.claude', 'skills', 'tin-dung')));
  assert.ok(!fs.existsSync(trongNha('.gemini', 'config', 'rules')));
  assert.ok(fs.existsSync(path.join(KIT, 'skills', 'tin-dung', 'SKILL.md')));
  assert.equal(fs.readFileSync(trongNha('.codex', 'AGENTS.md'), 'utf8'), 'Luật riêng tự viết\n');
  assert.doesNotMatch(fs.readFileSync(gitCauHinh, 'utf8'), /hooksPath/);
});
