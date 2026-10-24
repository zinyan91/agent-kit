import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { docTrangThai, ghiTrangThai } from './lib/trang-thai.mjs';

const nhaKit = path.join(process.env.AGENT_KIT_NHA || os.homedir(), '.agent-kit');
const chay = (lenh, doiSo, shell = false) => {
  const kq = spawnSync(lenh, doiSo, { cwd: nhaKit, encoding: 'utf8', windowsHide: true, shell });
  return { ok: kq.status === 0, ra: `${kq.stdout ?? ''}${kq.stderr ?? ''}`.trim() };
};
const ketThuc = (ok, loi) => {
  ghiTrangThai({ ketQuaCuoi: ok ? { luc: new Date().toISOString(), ok: true } : { luc: new Date().toISOString(), ok: false, loi } });
  process.exit(0);
};
const head = () => chay('git', ['rev-parse', 'HEAD']).ra;
const versionPlugin = () => {
  try {
    return JSON.parse(fs.readFileSync(path.join(nhaKit, 'plugin', '.claude-plugin', 'plugin.json'), 'utf8')).version;
  } catch {
    return null;
  }
};

const headTruoc = head();
const versionTruoc = versionPlugin();
const keo = chay('git', ['pull', '--ff-only']);
if (!keo.ok) ketThuc(false, `git pull --ff-only: ${keo.ra}`);
if (head() === headTruoc) ketThuc(true);

const cai = chay(process.execPath, [path.join(nhaKit, 'install.mjs'), ...(docTrangThai().chiChung ? ['--chi-chung'] : [])]);
if (!cai.ok) ketThuc(false, `install.mjs: ${cai.ra.split('\n').slice(-6).join(' | ')}`);

if (versionPlugin() !== versionTruoc && !process.env.AGENT_KIT_BO_PLUGIN) {
  for (const doiSo of [['plugin', 'marketplace', 'update', 'agent-kit'], ['plugin', 'update', 'agent-kit@agent-kit']]) {
    const kq = chay('claude', doiSo, true);
    if (!kq.ok) ketThuc(false, `claude ${doiSo.join(' ')}: ${kq.ra}`);
  }
}
ketThuc(true);
