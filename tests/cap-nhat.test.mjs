import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync, execFileSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { quyetDinhCapNhat } from '../plugin/hooks/lib/cap-nhat.mjs';

const HOOKS = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', 'plugin', 'hooks');
const SAU_GIO = 6 * 3600 * 1000;
const BAY_GIO = Date.parse('2026-10-24T12:00:00Z');
const tt = (vao) => ({ chiChung: false, lanKiemCuoi: null, ketQuaCuoi: null, ...vao });

test('máy nguồn (junction): không chạy, không cảnh báo', () => {
  assert.deepEqual(quyetDinhCapNhat({ laJunction: true, trangThai: tt({ ketQuaCuoi: { ok: false, loi: 'x' } }), bayGio: BAY_GIO, chuKyMs: SAU_GIO }), { chay: false, canhBao: null });
});

test('chưa kiểm lần nào hoặc đã quá chu kỳ thì chạy; trong chu kỳ thì thôi', () => {
  assert.equal(quyetDinhCapNhat({ laJunction: false, trangThai: tt(), bayGio: BAY_GIO, chuKyMs: SAU_GIO }).chay, true);
  assert.equal(quyetDinhCapNhat({ laJunction: false, trangThai: tt({ lanKiemCuoi: '2026-10-24T05:00:00Z' }), bayGio: BAY_GIO, chuKyMs: SAU_GIO }).chay, true);
  assert.equal(quyetDinhCapNhat({ laJunction: false, trangThai: tt({ lanKiemCuoi: '2026-10-24T07:00:00Z' }), bayGio: BAY_GIO, chuKyMs: SAU_GIO }).chay, false);
});

test('lần trước lỗi: cảnh báo kèm nguyên thông điệp lỗi', () => {
  const { canhBao } = quyetDinhCapNhat({ laJunction: false, trangThai: tt({ ketQuaCuoi: { luc: '2026-10-24T05:00:00Z', ok: false, loi: 'fatal: Not possible to fast-forward' } }), bayGio: BAY_GIO, chuKyMs: SAU_GIO });
  assert.match(canhBao, /fatal: Not possible to fast-forward/);
});

let goc;
let origin;
const git = (cwd, ...a) => execFileSync('git', ['-c', 'user.name=t', '-c', 'user.email=t@t', ...a], { cwd, stdio: 'pipe' });
const INSTALL_GIA = "import fs from 'node:fs';\nimport path from 'node:path';\nfs.writeFileSync(path.join(process.env.AGENT_KIT_NHA, 'da-chay.json'), JSON.stringify(process.argv.slice(2)));\n";
const docTT = (nha) => JSON.parse(fs.readFileSync(path.join(nha, '.agent-kit-may.json'), 'utf8'));

function mayDung(ten, trangThai) {
  const nha = path.join(goc, ten);
  fs.mkdirSync(nha);
  git(goc, 'clone', '-q', origin, path.join(nha, '.agent-kit'));
  fs.writeFileSync(path.join(nha, '.agent-kit-may.json'), JSON.stringify(trangThai));
  return nha;
}
const commitOrigin = (tep, noiDung) => {
  fs.writeFileSync(path.join(origin, tep), noiDung);
  git(origin, 'add', '.');
  git(origin, 'commit', '-q', '-m', tep);
};
const chayNen = (nha) =>
  spawnSync(process.execPath, [path.join(HOOKS, 'cap-nhat-nen.mjs')], { encoding: 'utf8', env: { ...process.env, AGENT_KIT_NHA: nha, AGENT_KIT_BO_PLUGIN: '1' } });

before(() => {
  goc = fs.mkdtempSync(path.join(os.tmpdir(), 'agent-kit-capnhat-'));
  origin = path.join(goc, 'origin');
  fs.mkdirSync(origin);
  git(origin, 'init', '-q', '-b', 'main');
  fs.writeFileSync(path.join(origin, 'install.mjs'), INSTALL_GIA);
  commitOrigin('a.txt', '1');
});
after(() => fs.rmSync(goc, { recursive: true, force: true }));

test('nền: có commit mới thì kéo về và cài lại theo nhóm đã lưu', () => {
  const nha = mayDung('nha-1', { chiChung: true });
  commitOrigin('b.txt', '2');
  const kq = chayNen(nha);
  assert.equal(kq.status, 0, kq.stderr);
  assert.ok(fs.existsSync(path.join(nha, '.agent-kit', 'b.txt')));
  assert.deepEqual(JSON.parse(fs.readFileSync(path.join(nha, 'da-chay.json'), 'utf8')), ['--chi-chung']);
  assert.equal(docTT(nha).ketQuaCuoi.ok, true);
});

test('nền: không có commit mới thì không cài lại', () => {
  const nha = mayDung('nha-2', { chiChung: false });
  assert.equal(chayNen(nha).status, 0);
  assert.ok(!fs.existsSync(path.join(nha, 'da-chay.json')));
  assert.equal(docTT(nha).ketQuaCuoi.ok, true);
});

test('nền: bản clone bị sửa tay khiến pull lỗi thì ghi lỗi, không reset', () => {
  const nha = mayDung('nha-3', { chiChung: false });
  fs.writeFileSync(path.join(nha, '.agent-kit', 'a.txt'), 'sua tay');
  commitOrigin('a.txt', '3');
  chayNen(nha);
  const kq = docTT(nha).ketQuaCuoi;
  assert.equal(kq.ok, false);
  assert.ok(kq.loi.length > 0);
  assert.equal(fs.readFileSync(path.join(nha, '.agent-kit', 'a.txt'), 'utf8'), 'sua tay');
});

test('hook: lần trước lỗi thì in cảnh báo; trong chu kỳ thì không ghi lại mốc kiểm', () => {
  const nha = mayDung('nha-4', { chiChung: false, lanKiemCuoi: new Date().toISOString(), ketQuaCuoi: { luc: '2026-10-24T05:00:00Z', ok: false, loi: 'loi-mau-123' } });
  const truoc = docTT(nha).lanKiemCuoi;
  const kq = spawnSync(process.execPath, [path.join(HOOKS, 'cap-nhat.mjs')], { encoding: 'utf8', env: { ...process.env, AGENT_KIT_NHA: nha } });
  assert.equal(kq.status, 0, kq.stderr);
  assert.match(kq.stdout, /loi-mau-123/);
  assert.equal(docTT(nha).lanKiemCuoi, truoc);
});

test('hook: máy nguồn (junction) thoát im lặng', () => {
  const nha = path.join(goc, 'nha-nguon');
  fs.mkdirSync(nha);
  fs.symlinkSync(origin, path.join(nha, '.agent-kit'), 'junction');
  const kq = spawnSync(process.execPath, [path.join(HOOKS, 'cap-nhat.mjs')], { encoding: 'utf8', env: { ...process.env, AGENT_KIT_NHA: nha } });
  assert.equal(kq.status, 0);
  assert.equal(kq.stdout, '');
});
