import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { lapKeHoach, timJunctionMoCoi, quyetDinhThuMucLuat, chonSkill } from './lib/ke-hoach.mjs';
import { layVungMoc, thayVungMoc } from './lib/moc.mjs';
import { ghepLuat, demDong, docLuatChoMay } from './plugin/hooks/lib/luat.mjs';
import { trangThuMucLuat, giongThuMucLuat, ghiThuMucLuat, xoaThuMucLuat } from './lib/thu-muc-luat.mjs';
import { nhanVai, quyetDinhNhaKit } from './lib/vai.mjs';
import { docTrangThai, ghiTrangThai } from './plugin/hooks/lib/trang-thai.mjs';
import { moRong, hienTrang, taoJunction, goJunction, catVaoKhoLuu, nhaNguoiDung, tenMay } from './lib/he-thong.mjs';

const KIT = path.dirname(fileURLToPath(import.meta.url));
const NGAN_SACH_LUAT = 200;
const cheDo = process.argv.includes('--kiem') ? 'kiem' : process.argv.includes('--go') ? 'go' : 'cai';
const chiChung = process.argv.includes('--chi-chung') ? true : process.argv.includes('--ca-hai') ? false : docTrangThai().chiChung;
const cauHinh = JSON.parse(fs.readFileSync(path.join(KIT, 'kit.json'), 'utf8'));
const THU_MUC_SKILL = path.join(KIT, 'skills');
const THU_MUC_LUAT = path.join(KIT, 'rules');
const HOOKS_PATH = path.join(KIT, 'git-hooks').replaceAll('\\', '/');
const khoLuu = path.join(process.env.AGENT_KIT_KHO_LUU || path.join(os.tmpdir(), 'agent-kit-luu'), new Date().toISOString().replace(/[:.]/g, '-'));

const NHA_KIT = path.join(nhaNguoiDung(), '.agent-kit');
const vai = nhanVai(KIT, NHA_KIT);
const nhaKit = vai === 'nguon' ? quyetDinhNhaKit(hienTrang(NHA_KIT, KIT), KIT) : { loai: 'giu' };

const congCu = Object.fromEntries(
  Object.entries(cauHinh.congCu).map(([ten, c]) => [ten, Object.fromEntries(Object.entries(c).map(([k, v]) => [k, moRong(v)]))]),
);
const skillTrongKit = fs.readdirSync(THU_MUC_SKILL, { withFileTypes: true }).filter((m) => m.isDirectory()).map((m) => m.name).sort();
const skills = chonSkill(skillTrongKit, cauHinh.nhomRieng ?? [], chiChung);
const tepLuat = docLuatChoMay(THU_MUC_LUAT, tenMay());
const noiDungLuatCodex =
  `# Luật chung (agent-kit)\n\nSinh tự động từ ${THU_MUC_LUAT} bởi install.mjs — đừng sửa tay trong vùng mốc; sửa ở kit rồi chạy lại.\n\n${ghepLuat(tepLuat)}`;

const junctions = lapKeHoach({ thuMucSkillKit: THU_MUC_SKILL, skills, congCu, chiVao: cauHinh.chiVao ?? {}, hienTrang }).map((h) => ({
  ...h,
  nhan: `skill ${h.skill} → ${h.congCu}`,
}));
const thuMucLuat = Object.entries(congCu)
  .filter(([, c]) => c.thuMucLuat)
  .map(([ten, c]) => ({ nhan: `luật → ${ten}`, dich: c.thuMucLuat, ...quyetDinhThuMucLuat(trangThuMucLuat(c.thuMucLuat, THU_MUC_LUAT)) }));

const moCoi = timJunctionMoCoi({
  thuMucSkillKit: THU_MUC_SKILL,
  skills,
  congCu,
  lietKe: (thuMuc) => (fs.existsSync(thuMuc) ? fs.readdirSync(thuMuc) : []),
  hienTrang,
}).map((m) => ({ ...m, nhan: `skill ${m.skill} → ${m.congCu}` }));

const git = (...a) => {
  try {
    return execFileSync('git', a, { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }).trim();
  } catch {
    return '';
  }
};
const hooksPathHienTai = () => git('config', '--global', '--get', 'core.hooksPath').replaceAll('\\', '/');

const loi = [];
const bao = (dong) => console.log(dong);

const pluginDaBat = () => {
  try {
    return JSON.parse(fs.readFileSync(path.join(nhaNguoiDung(), '.claude', 'settings.json'), 'utf8')).enabledPlugins?.['agent-kit@agent-kit'] === true;
  } catch {
    return false;
  }
};
const LENH_PLUGIN = [['plugin', 'marketplace', 'add', KIT], ['plugin', 'install', 'agent-kit@agent-kit']];
const chayClaude = (doiSo) => execFileSync('claude', doiSo.map((a) => (/\s/.test(a) ? `"${a}"` : a)), { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'], shell: process.platform === 'win32' });
const coClaude = () => {
  try {
    chayClaude(['--version']);
    return true;
  } catch {
    return false;
  }
};

function kiem() {
  for (const j of junctions) if (j.loai !== 'giu') loi.push(`${j.nhan}: ${j.loai === 'tao' ? 'chưa nối' : j.lyDo ?? j.loai} (${j.dich})`);
  for (const m of moCoi) loi.push(`${m.nhan}: junction mồ côi, không còn trong bộ cài (${m.dich})`);
  for (const t of thuMucLuat) {
    if (t.loai === 'xung-dot') loi.push(`${t.nhan}: ${t.lyDo} (${t.dich})`);
    else if (t.loai !== 'ghi-de') loi.push(`${t.nhan}: chưa có thư mục luật do kit sinh (${t.dich})`);
    else if (!giongThuMucLuat(t.dich, tepLuat)) loi.push(`${t.nhan}: thư mục luật đã cũ — chạy lại install.mjs (${t.dich})`);
  }
  for (const [ten, c] of Object.entries(congCu)) {
    if (!c.tepLuat) continue;
    const hien = fs.existsSync(c.tepLuat) ? layVungMoc(fs.readFileSync(c.tepLuat, 'utf8')) : null;
    if (hien !== noiDungLuatCodex) loi.push(`luật trong ${c.tepLuat} (${ten}) ${hien === null ? 'chưa có' : 'đã cũ'} — chạy lại install.mjs`);
  }
  if (hooksPathHienTai().toLowerCase() !== HOOKS_PATH.toLowerCase()) loi.push(`git core.hooksPath toàn cục = "${hooksPathHienTai()}", cần "${HOOKS_PATH}"`);
  for (const p of cauHinh.goBo ?? []) if (fs.existsSync(moRong(p))) loi.push(`còn tệp cũ cần gỡ: ${moRong(p)}`);
  const tong = tepLuat.reduce((s, t) => s + demDong(t.noiDung), 0);
  if (tong > NGAN_SACH_LUAT) loi.push(`luật chung ${tong} dòng, vượt ngân sách ${NGAN_SACH_LUAT}`);
  if (!pluginDaBat()) loi.push(`plugin Claude agent-kit chưa bật (${LENH_PLUGIN.map((l) => `claude ${l.join(' ')}`).join(' && ')})`);
  if (nhaKit.loai !== 'giu') loi.push(`~/.agent-kit: ${nhaKit.loai === 'tao' ? 'chưa nối' : nhaKit.lyDo} (${NHA_KIT})`);
  bao(`skill: ${skills.length} | junction: ${junctions.length} | luật: ${tong} dòng / ${NGAN_SACH_LUAT}`);
}

function cai() {
  if (nhaKit.loai === 'tao') taoJunction(KIT, NHA_KIT);
  if (nhaKit.loai === 'xung-dot') loi.push(`~/.agent-kit: XUNG ĐỘT, không đụng vào — ${nhaKit.lyDo} (${NHA_KIT})`);
  else bao(`${nhaKit.loai === 'tao' ? '+' : '='} ~/.agent-kit (${vai === 'nguon' ? 'máy nguồn' : 'máy dùng'})`);
  ghiTrangThai({ chiChung, vai });
  for (const j of junctions) {
    if (j.loai === 'tao') taoJunction(j.nguon, j.dich);
    else if (j.loai === 'thay-bang-junction') {
      bao(`  lưu bản cũ ${j.dich} → ${catVaoKhoLuu(j.dich, khoLuu)}`);
      taoJunction(j.nguon, j.dich);
    } else if (j.loai === 'xung-dot') {
      loi.push(`${j.nhan}: XUNG ĐỘT, không đụng vào — ${j.lyDo} (${j.dich})`);
      continue;
    }
    bao(`${j.loai === 'giu' ? '=' : '+'} ${j.nhan}`);
  }
  for (const m of moCoi) {
    goJunction(m.dich);
    bao(`- ${m.nhan} (không còn trong bộ cài)`);
  }
  for (const t of thuMucLuat) {
    if (t.loai === 'xung-dot') {
      loi.push(`${t.nhan}: XUNG ĐỘT, không đụng vào — ${t.lyDo} (${t.dich})`);
      continue;
    }
    if (t.loai === 'thay-junction') goJunction(t.dich);
    const moi = t.loai !== 'ghi-de' || !giongThuMucLuat(t.dich, tepLuat);
    if (moi) ghiThuMucLuat(t.dich, tepLuat);
    bao(`${moi ? '+' : '='} ${t.nhan}`);
  }
  for (const [ten, c] of Object.entries(congCu)) {
    if (!c.tepLuat) continue;
    const cu = fs.existsSync(c.tepLuat) ? fs.readFileSync(c.tepLuat, 'utf8') : '';
    const moi = thayVungMoc(cu, noiDungLuatCodex);
    if (moi !== cu.replace(/\r\n/g, '\n')) {
      fs.mkdirSync(path.dirname(c.tepLuat), { recursive: true });
      fs.writeFileSync(c.tepLuat, moi);
      bao(`+ luật → ${ten} (${c.tepLuat})`);
    } else bao(`= luật → ${ten}`);
  }
  const hp = hooksPathHienTai();
  if (!hp) {
    git('config', '--global', 'core.hooksPath', HOOKS_PATH);
    bao(`+ git core.hooksPath = ${HOOKS_PATH}`);
  } else if (hp.toLowerCase() === HOOKS_PATH.toLowerCase()) bao('= git core.hooksPath');
  else loi.push(`git core.hooksPath toàn cục đang là "${hp}" — không ghi đè, tự quyết rồi đặt lại`);
  for (const p of cauHinh.goBo ?? []) {
    const that = moRong(p);
    if (fs.existsSync(that)) bao(`- gỡ ${that} → ${catVaoKhoLuu(that, khoLuu)}`);
  }
  if (pluginDaBat()) bao('= plugin Claude agent-kit');
  else if (process.env.AGENT_KIT_BO_PLUGIN) bao('  bỏ qua bước plugin Claude (AGENT_KIT_BO_PLUGIN)');
  else if (!coClaude()) loi.push(`không thấy lệnh claude; cài Claude Code rồi chạy: ${LENH_PLUGIN.map((l) => `claude ${l.join(' ')}`).join(' && ')}`);
  else {
    try {
      for (const l of LENH_PLUGIN) chayClaude(l);
      bao('+ plugin Claude agent-kit');
    } catch (e) {
      loi.push(`cài plugin Claude lỗi: ${String(e.stderr || e.message).trim().split('\n').slice(-3).join(' | ')} — chạy tay: ${LENH_PLUGIN.map((l) => `claude ${l.join(' ')}`).join(' && ')}`);
    }
  }
}

function go() {
  for (const j of junctions) if (j.loai === 'giu') {
    goJunction(j.dich);
    bao(`- ${j.nhan}`);
  }
  for (const t of thuMucLuat) if (t.loai === 'ghi-de') {
    xoaThuMucLuat(t.dich);
    bao(`- ${t.nhan}`);
  }
  for (const [ten, c] of Object.entries(congCu)) {
    if (!c.tepLuat || !fs.existsSync(c.tepLuat)) continue;
    const cu = fs.readFileSync(c.tepLuat, 'utf8');
    if (layVungMoc(cu) === null) continue;
    fs.writeFileSync(c.tepLuat, cu.replace(/\r\n/g, '\n').replace(/\n*<!-- agent-kit:bat-dau -->[\s\S]*<!-- agent-kit:ket-thuc -->\n?/, '\n').trimStart());
    bao(`- luật → ${ten}`);
  }
  if (hooksPathHienTai().toLowerCase() === HOOKS_PATH.toLowerCase()) {
    git('config', '--global', '--unset', 'core.hooksPath');
    bao('- git core.hooksPath');
  }
}

({ kiem, cai, go })[cheDo]();
if (loi.length) {
  console.error(`\n${loi.length} vấn đề:\n${loi.map((l) => `  ! ${l}`).join('\n')}`);
  process.exit(1);
}
if (cheDo === 'cai' && vai === 'dung') ghiTrangThai({ headDaCai: git('-C', KIT, 'rev-parse', 'HEAD') || null });
bao(cheDo === 'kiem' ? '\nSạch.' : '\nXong.');
