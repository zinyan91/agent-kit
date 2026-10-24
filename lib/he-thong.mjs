import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

export const nhaNguoiDung = () => process.env.AGENT_KIT_NHA || os.homedir();

export const moRong = (p) => (p.startsWith('~') ? path.join(nhaNguoiDung(), p.slice(1)) : p);

function lietKe(goc, tuongDoi = '') {
  return fs.readdirSync(path.join(goc, tuongDoi), { withFileTypes: true }).flatMap((m) => {
    const con = path.join(tuongDoi, m.name);
    return m.isDirectory() ? lietKe(goc, con) : [con];
  });
}

const docChuan = (p) => fs.readFileSync(p, 'utf8').replace(/\r\n/g, '\n');

export function giongNhau(a, b) {
  const ta = lietKe(a).sort();
  const tb = lietKe(b).sort();
  return ta.length === tb.length && ta.every((t, i) => t === tb[i] && docChuan(path.join(a, t)) === docChuan(path.join(b, t)));
}

export function hienTrang(dich, nguon) {
  let st;
  try {
    st = fs.lstatSync(dich);
  } catch {
    return { loai: 'khong-co' };
  }
  if (st.isSymbolicLink()) return { loai: 'junction', dichJunction: fs.readlinkSync(dich) };
  if (st.isDirectory()) return { loai: 'thu-muc', giongKit: fs.existsSync(nguon) && giongNhau(dich, nguon) };
  return { loai: 'tep' };
}

export function taoJunction(nguon, dich) {
  fs.mkdirSync(path.dirname(dich), { recursive: true });
  fs.symlinkSync(nguon, dich, 'junction');
}

export const goJunction = (dich) => fs.unlinkSync(dich);

export function catVaoKhoLuu(p, khoLuu) {
  const den = path.join(khoLuu, path.relative(nhaNguoiDung(), p).replace(/[:\\/]+/g, '__'));
  fs.mkdirSync(path.dirname(den), { recursive: true });
  fs.cpSync(p, den, { recursive: true });
  fs.rmSync(p, { recursive: true, force: true });
  return den;
}

export const tenMay = () => (process.env.AGENT_KIT_TEN_MAY || os.hostname()).toUpperCase();
