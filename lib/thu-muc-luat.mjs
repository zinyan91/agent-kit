import fs from 'node:fs';
import path from 'node:path';
import { DANH_DAU_LUAT } from './ke-hoach.mjs';
import { hienTrang } from './he-thong.mjs';

const cungCho = (a, b) => path.resolve(a).toLowerCase() === path.resolve(b).toLowerCase();

export function trangThuMucLuat(dich, thuMucLuatKit) {
  const trang = hienTrang(dich, thuMucLuatKit);
  if (trang.loai === 'junction') return { ...trang, laCuaKit: cungCho(trang.dichJunction, thuMucLuatKit) };
  if (trang.loai === 'thu-muc') return { ...trang, coDanhDau: fs.existsSync(path.join(dich, DANH_DAU_LUAT)) };
  return trang;
}

const tepMd = (dich) => fs.readdirSync(dich).filter((t) => t.endsWith('.md'));

export function giongThuMucLuat(dich, tepLuat) {
  if (!fs.existsSync(path.join(dich, DANH_DAU_LUAT))) return false;
  const hien = tepMd(dich).sort();
  const can = tepLuat.map((t) => t.ten).sort();
  return hien.length === can.length && hien.every((t, i) => t === can[i]) && tepLuat.every((t) => fs.readFileSync(path.join(dich, t.ten), 'utf8') === t.noiDung);
}

export function ghiThuMucLuat(dich, tepLuat) {
  fs.mkdirSync(dich, { recursive: true });
  const can = new Set(tepLuat.map((t) => t.ten));
  for (const t of tepMd(dich)) if (!can.has(t)) fs.rmSync(path.join(dich, t));
  for (const t of tepLuat) fs.writeFileSync(path.join(dich, t.ten), t.noiDung);
  fs.writeFileSync(path.join(dich, DANH_DAU_LUAT), 'Thư mục này do agent-kit sinh ra; sửa luật ở kit rồi chạy lại install.mjs.\n');
}

export const xoaThuMucLuat = (dich) => fs.rmSync(dich, { recursive: true, force: true });
