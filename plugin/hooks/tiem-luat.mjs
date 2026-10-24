import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { ghepLuat, docLuatChoMay } from './lib/luat.mjs';

const thuMucKit = process.env.AGENT_KIT_DIR || path.join(process.env.AGENT_KIT_NHA || os.homedir(), '.agent-kit');
const thuMucLuat = path.join(thuMucKit, 'rules');
const tenMay = (process.env.AGENT_KIT_TEN_MAY || os.hostname()).toUpperCase();

if (!fs.existsSync(thuMucLuat)) {
  process.stdout.write(
    `[agent-kit] Không tìm thấy ${thuMucLuat} — luật chung KHÔNG được nạp. ` +
      'Chạy `npx -y github:zinyan91/agent-kit` (máy dùng) hoặc `node <kit>/install.mjs` (máy nguồn).\n',
  );
  process.exit(0);
}

process.stdout.write(
  `# Luật chung (agent-kit — nguồn: ${thuMucLuat}, máy ${tenMay})\n\n` +
    'Áp dụng cho mọi repo. Luật riêng của repo (CLAUDE.md / AGENTS.md) bổ sung, và thắng khi mâu thuẫn.\n\n' +
    `${ghepLuat(docLuatChoMay(thuMucLuat, tenMay))}\n`,
);
