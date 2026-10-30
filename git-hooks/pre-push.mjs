import { execFileSync, spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { docDongRef } from './lib/pham-vi.mjs';
import { quetDongThem, DAU_BO_QUA } from './lib/quet-bi-mat.mjs';

const doiSo = process.argv.slice(2);
const [tenRemote] = doiSo;
const stdin = fs.readFileSync(0, 'utf8');

const git = (...a) => execFileSync('git', a, { encoding: 'utf8', maxBuffer: 512 * 1024 * 1024 });

function chan(thongDiep) {
  process.stderr.write(`\n[agent-kit] CHẶN PUSH — ${thongDiep}\n\n`);
  process.exit(1);
}

function coCommit(sha) {
  try {
    git('cat-file', '-e', `${sha}^{commit}`);
    return true;
  } catch {
    return false;
  }
}

function vungLog(ref) {
  if (ref.loai === 'cap-nhat' && coCommit(ref.remote)) return [`${ref.remote}..${ref.local}`];
  return [ref.local, '--not', `--remotes=${tenRemote}`];
}

function quetBiMat(refs) {
  const phatHien = refs.flatMap((ref) =>
    quetDongThem(git('log', '-p', '--no-merges', '--format=', '--unified=0', '--no-color', '--no-ext-diff', ...vungLog(ref))),
  );
  if (!phatHien.length) return;
  chan(
    `${phatHien.length} dòng đáng ngờ trong các commit sắp push:\n` +
      phatHien.slice(0, 10).map((p) => `  [${p.quyTac}] ${p.dong}`).join('\n') +
      `\n\nChuyển giá trị sang biến môi trường; thiếu biến thì ném lỗi, không fallback chuỗi cứng.\n` +
      `Bí mật đã nằm trong commit thì phải viết lại commit đó (rebase/amend), sửa ở commit sau vẫn còn trong lịch sử.\n` +
      `Chắc chắn an toàn: thêm "${DAU_BO_QUA}" vào cuối đúng dòng đó.`,
  );
}

// Repo JS thuần (felix-api) cố ý không có `build`: có script đó là Vercel tự chạy và deploy fail.
const SCRIPT_KIEM = ['build', 'check'];

function kiemMa(goc) {
  const tepGoi = path.join(goc, 'package.json');
  if (!fs.existsSync(tepGoi)) return;
  let goi;
  try {
    goi = JSON.parse(fs.readFileSync(tepGoi, 'utf8'));
  } catch {
    return;
  }
  const script = SCRIPT_KIEM.find((ten) => goi.scripts?.[ten]);
  if (!script) return;
  process.stderr.write(`[agent-kit] npm run ${script} trước khi push...\n`);
  const kq = spawnSync('npm', ['run', script], { cwd: goc, encoding: 'utf8', shell: true, maxBuffer: 512 * 1024 * 1024 });
  if (kq.status === 0) return;
  const duoi = `${kq.stdout ?? ''}${kq.stderr ?? ''}`.trim().split('\n').slice(-25).join('\n');
  chan(
    `\`npm run ${script}\` FAIL. Lỗi cục bộ thì bản deploy cũng hỏng; Vercel giữ bản cũ trong im lặng.\n\n` +
      `25 dòng cuối:\n${duoi}`,
  );
}

function hookCucBo() {
  const tep = path.resolve(git('rev-parse', '--git-common-dir').trim(), 'hooks', 'pre-push');
  const cuaKit = path.resolve(path.dirname(fileURLToPath(import.meta.url)), 'pre-push');
  if (!fs.existsSync(tep) || tep.toLowerCase() === cuaKit.toLowerCase()) return;
  const kq = spawnSync('sh', [tep, ...doiSo], { input: stdin, stdio: ['pipe', 'inherit', 'inherit'] });
  if (kq.status !== 0) process.exit(kq.status ?? 1);
}

const refs = docDongRef(stdin);
if (refs.length) {
  quetBiMat(refs);
  kiemMa(git('rev-parse', '--show-toplevel').trim());
}
hookCucBo();
