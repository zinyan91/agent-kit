import { spawn } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { quyetDinhCapNhat, CHU_KY_MS } from './lib/cap-nhat.mjs';
import { docTrangThai, ghiTrangThai } from './lib/trang-thai.mjs';

const nhaKit = path.join(process.env.AGENT_KIT_NHA || os.homedir(), '.agent-kit');
let laJunction;
try {
  laJunction = fs.lstatSync(nhaKit).isSymbolicLink();
} catch {
  process.exit(0);
}
if (!laJunction && !fs.existsSync(path.join(nhaKit, '.git'))) process.exit(0);

const { chay, canhBao } = quyetDinhCapNhat({ laJunction, trangThai: docTrangThai(), bayGio: Date.now(), chuKyMs: CHU_KY_MS });
if (canhBao) process.stdout.write(`${canhBao}\n`);
if (chay) {
  ghiTrangThai({ lanKiemCuoi: new Date().toISOString() });
  spawn(process.execPath, [path.join(nhaKit, 'plugin', 'hooks', 'cap-nhat-nen.mjs')], { detached: true, stdio: 'ignore', windowsHide: true }).unref();
}
