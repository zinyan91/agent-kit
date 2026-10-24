import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { docTrangThai, ghiTrangThai } from './lib/trang-thai.mjs';

const nhaKit = path.join(process.env.AGENT_KIT_NHA || os.homedir(), '.agent-kit');
const KHONG_HOI = { ...process.env, GIT_TERMINAL_PROMPT: '0', GCM_INTERACTIVE: 'never' };
const rutGon = (s) => s.split('\n').slice(-6).join(' | ').slice(-500);

const chay = (lenh, doiSo, { shell = false, timeout = 120_000 } = {}) => {
  const kq = spawnSync(lenh, doiSo, { cwd: nhaKit, encoding: 'utf8', windowsHide: true, shell, timeout, env: KHONG_HOI });
  const ra = `${kq.stdout ?? ''}${kq.stderr ?? ''}`.trim();
  return { ok: kq.status === 0, ra: kq.error ? `${kq.error.message} ${ra}`.trim() : ra };
};
const ketThuc = (ok, loi) => {
  ghiTrangThai({ ketQuaCuoi: ok ? { luc: new Date().toISOString(), ok: true } : { luc: new Date().toISOString(), ok: false, loi: rutGon(loi) } });
  process.exit(0);
};
const versionPlugin = () => {
  try {
    return JSON.parse(fs.readFileSync(path.join(nhaKit, 'plugin', '.claude-plugin', 'plugin.json'), 'utf8')).version;
  } catch {
    return null;
  }
};

const keo = chay('git', ['pull', '--ff-only']);
if (!keo.ok) ketThuc(false, `git pull --ff-only: ${keo.ra}`);

const trangThai = docTrangThai();
const head = chay('git', ['rev-parse', 'HEAD']).ra;
if (head !== trangThai.headDaCai) {
  const cai = chay(process.execPath, [path.join(nhaKit, 'install.mjs'), trangThai.chiChung ? '--chi-chung' : '--ca-hai'], { timeout: 300_000 });
  if (!cai.ok) ketThuc(false, `install.mjs: ${cai.ra}`);
  ghiTrangThai({ headDaCai: head });
}

const version = versionPlugin();
if (trangThai.versionPluginDaCai !== undefined && version !== trangThai.versionPluginDaCai && !process.env.AGENT_KIT_BO_PLUGIN) {
  for (const doiSo of [['plugin', 'marketplace', 'update', 'agent-kit'], ['plugin', 'update', 'agent-kit@agent-kit']]) {
    const kq = chay('claude', doiSo, { shell: true });
    if (!kq.ok) ketThuc(false, `claude ${doiSo.join(' ')}: ${kq.ra}`);
  }
}
ghiTrangThai({ versionPluginDaCai: version });
ketThuc(true);
