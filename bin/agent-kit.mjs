#!/usr/bin/env node
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

const URL_KIT = process.env.AGENT_KIT_GIT_URL || 'https://github.com/zinyan91/agent-kit';
const nhaKit = path.join(process.env.AGENT_KIT_NHA || os.homedir(), '.agent-kit');

const dung = (thongDiep) => {
  console.error(`[agent-kit] ${thongDiep}`);
  process.exit(1);
};

if (Number(process.versions.node.split('.')[0]) < 18) dung(`cần Node 18 trở lên, máy đang có ${process.version}.`);
if (spawnSync('git', ['--version'], { stdio: 'ignore' }).status !== 0) dung('không thấy lệnh git. Cài Git for Windows rồi chạy lại.');

const chayGit = (...doiSo) => {
  const kq = spawnSync('git', doiSo, { stdio: 'inherit' });
  if (kq.status !== 0) dung(`git ${doiSo.join(' ')} thất bại (mã ${kq.status}). Kiểm tra đăng nhập GitHub (gh auth login) và mạng.`);
};

let trang = null;
try {
  trang = fs.lstatSync(nhaKit);
} catch {}

if (!trang) {
  console.log(`[agent-kit] tải kit về ${nhaKit}`);
  chayGit('clone', '--depth', '1', URL_KIT, nhaKit);
} else if (trang.isSymbolicLink()) {
  console.log(`[agent-kit] ${nhaKit} là junction (máy nguồn), không kéo bản mới`);
} else if (fs.existsSync(path.join(nhaKit, '.git'))) {
  console.log(`[agent-kit] cập nhật ${nhaKit}`);
  chayGit('-C', nhaKit, 'pull', '--ff-only');
} else dung(`${nhaKit} đã có nhưng không phải bản clone của kit. Đổi tên hoặc xoá nó rồi chạy lại.`);

const kq = spawnSync(process.execPath, [path.join(nhaKit, 'install.mjs'), ...process.argv.slice(2)], { stdio: 'inherit' });
process.exit(kq.status ?? 1);
