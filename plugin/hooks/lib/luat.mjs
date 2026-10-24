import fs from 'node:fs';
import path from 'node:path';

export function bocFrontmatter(md) {
  const s = md.replace(/\r\n/g, '\n');
  const m = s.match(/^---\n[\s\S]*?\n---\n?/);
  return (m ? s.slice(m[0].length) : s).trim();
}

export function ghepLuat(tep) {
  return [...tep]
    .sort((a, b) => a.ten.localeCompare(b.ten))
    .map((t) => bocFrontmatter(t.noiDung))
    .join('\n\n');
}

export function demDong(md) {
  const than = bocFrontmatter(md);
  return than ? than.split('\n').length : 0;
}

export function docLuatChoMay(thuMucLuat, tenMay) {
  const doc = (thuMuc, ten) => ({ ten, noiDung: fs.readFileSync(path.join(thuMuc, ten), 'utf8') });
  const chung = fs.readdirSync(thuMucLuat).filter((t) => t.endsWith('.md')).map((t) => doc(thuMucLuat, t));
  const thuMucMay = path.join(thuMucLuat, 'may');
  const tepMay = `${tenMay}.md`;
  return fs.existsSync(path.join(thuMucMay, tepMay)) ? [...chung, doc(thuMucMay, tepMay)] : chung;
}
