import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';

const nhaNguoiDung = () => process.env.AGENT_KIT_NHA || os.homedir();

const MAC_DINH = { chiChung: false, lanKiemCuoi: null, ketQuaCuoi: null };

export const tepTrangThai = () => path.join(nhaNguoiDung(), '.agent-kit-may.json');

export function docTrangThai() {
  try {
    return { ...MAC_DINH, ...JSON.parse(fs.readFileSync(tepTrangThai(), 'utf8')) };
  } catch {
    return { ...MAC_DINH };
  }
}

export const ghiTrangThai = (patch) => fs.writeFileSync(tepTrangThai(), `${JSON.stringify({ ...docTrangThai(), ...patch }, null, 2)}\n`);
