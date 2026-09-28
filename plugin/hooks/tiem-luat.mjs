import fs from 'node:fs';
import path from 'node:path';
import { ghepLuat } from './lib/luat.mjs';

const thuMucKit = process.env.AGENT_KIT_DIR || 'D:\\agent-kit';
const thuMucLuat = path.join(thuMucKit, 'rules');

if (!fs.existsSync(thuMucLuat)) {
  process.stdout.write(
    `[agent-kit] Không tìm thấy ${thuMucLuat} — luật chung KHÔNG được nạp. ` +
      'Clone lại repo agent-kit vào đó hoặc đặt biến AGENT_KIT_DIR.\n',
  );
  process.exit(0);
}

const tep = fs
  .readdirSync(thuMucLuat)
  .filter((ten) => ten.endsWith('.md'))
  .map((ten) => ({ ten, noiDung: fs.readFileSync(path.join(thuMucLuat, ten), 'utf8') }));

process.stdout.write(
  `# Luật chung (agent-kit — nguồn: ${thuMucLuat})\n\n` +
    'Áp dụng cho mọi repo. Luật riêng của repo (CLAUDE.md / AGENTS.md) bổ sung, và thắng khi mâu thuẫn.\n\n' +
    `${ghepLuat(tep)}\n`,
);
