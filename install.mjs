import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { lapKeHoach, quyetDinhJunction, timJunctionMoCoi } from './lib/ke-hoach.mjs';
import { layVungMoc, thayVungMoc } from './lib/moc.mjs';
import { ghepLuat, demDong } from './plugin/hooks/lib/luat.mjs';
import { moRong, hienTrang, taoJunction, goJunction, catVaoKhoLuu, nhaNguoiDung } from './lib/he-thong.mjs';

const KIT = path.dirname(fileURLToPath(import.meta.url));
const NGAN_SACH_LUAT = 200;
const cheDo = process.argv.includes('--kiem') ? 'kiem' : process.argv.includes('--go') ? 'go' : 'cai';
const cauHinh = JSON.parse(fs.readFileSync(path.join(KIT, 'kit.json'), 'utf8'));
const THU_MUC_SKILL = path.join(KIT, 'skills');
const THU_MUC_LUAT = path.join(KIT, 'rules');
const HOOKS_PATH = path.join(KIT, 'git-hooks').replaceAll('\\', '/');
const khoLuu = path.join(process.env.AGENT_KIT_KHO_LUU || path.join(os.tmpdir(), 'agent-kit-luu'), new Date().toISOString().replace(/[:.]/g, '-'));

const congCu = Object.fromEntries(
  Object.entries(cauHinh.congCu).map(([ten, c]) => [ten, Object.fromEntries(Object.entries(c).map(([k, v]) => [k, moRong(v)]))]),
);
const skills = fs.readdirSync(THU_MUC_SKILL, { withFileTypes: true }).filter((m) => m.isDirectory()).map((m) => m.name).sort();
const tepLuat = fs.readdirSync(THU_MUC_LUAT).filter((t) => t.endsWith('.md')).map((ten) => ({ ten, noiDung: fs.readFileSync(path.join(THU_MUC_LUAT, ten), 'utf8') }));
const noiDungLuatCodex =
  `# Luật chung (agent-kit)\n\nSinh tự động từ ${THU_MUC_LUAT} bởi install.mjs — đừng sửa tay trong vùng mốc; sửa ở kit rồi chạy lại.\n\n${ghepLuat(tepLuat)}`;

const junctions = [
  ...lapKeHoach({ thuMucSkillKit: THU_MUC_SKILL, skills, congCu, chiVao: cauHinh.chiVao ?? {}, hienTrang }).map((h) => ({ ...h, nhan: `skill ${h.skill} → ${h.congCu}` })),
  ...Object.entries(congCu)
    .filter(([, c]) => c.thuMucLuat)
    .map(([ten, c]) => ({ nhan: `luật → ${ten}`, nguon: THU_MUC_LUAT, dich: c.thuMucLuat, ...quyetDinhJunction(hienTrang(c.thuMucLuat, THU_MUC_LUAT), THU_MUC_LUAT) })),
];

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

function kiem() {
  for (const j of junctions) if (j.loai !== 'giu') loi.push(`${j.nhan}: ${j.loai === 'tao' ? 'chưa nối' : j.lyDo ?? j.loai} (${j.dich})`);
  for (const m of moCoi) loi.push(`${m.nhan}: junction mồ côi, skill đã xoá khỏi kit (${m.dich})`);
  for (const [ten, c] of Object.entries(congCu)) {
    if (!c.tepLuat) continue;
    const hien = fs.existsSync(c.tepLuat) ? layVungMoc(fs.readFileSync(c.tepLuat, 'utf8')) : null;
    if (hien !== noiDungLuatCodex) loi.push(`luật trong ${c.tepLuat} (${ten}) ${hien === null ? 'chưa có' : 'đã cũ'} — chạy lại install.mjs`);
  }
  if (hooksPathHienTai().toLowerCase() !== HOOKS_PATH.toLowerCase()) loi.push(`git core.hooksPath toàn cục = "${hooksPathHienTai()}", cần "${HOOKS_PATH}"`);
  for (const p of cauHinh.goBo ?? []) if (fs.existsSync(moRong(p))) loi.push(`còn tệp cũ cần gỡ: ${moRong(p)}`);
  const tong = tepLuat.reduce((s, t) => s + demDong(t.noiDung), 0);
  if (tong > NGAN_SACH_LUAT) loi.push(`luật chung ${tong} dòng, vượt ngân sách ${NGAN_SACH_LUAT}`);
  const caiDat = path.join(nhaNguoiDung(), '.claude', 'settings.json');
  const daBat = fs.existsSync(caiDat) && JSON.parse(fs.readFileSync(caiDat, 'utf8')).enabledPlugins?.['agent-kit@agent-kit'] === true;
  if (!daBat) loi.push('plugin Claude agent-kit chưa bật (claude plugin marketplace add D:\\agent-kit && claude plugin install agent-kit@agent-kit)');
  bao(`skill: ${skills.length} | junction: ${junctions.length} | luật: ${tong} dòng / ${NGAN_SACH_LUAT}`);
}

function cai() {
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
    bao(`- ${m.nhan} (đã xoá khỏi kit)`);
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
}

function go() {
  for (const j of junctions) if (j.loai === 'giu') {
    goJunction(j.dich);
    bao(`- ${j.nhan}`);
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
bao(cheDo === 'kiem' ? '\nSạch.' : '\nXong.');
