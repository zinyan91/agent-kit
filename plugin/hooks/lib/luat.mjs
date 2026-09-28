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
