const CACH_VUOT = [
  { ten: '`git push --no-verify`', re: /\bgit\b[^;&|\n]*\bpush\b[^;&|\n]*--no-verify\b/ },
  { ten: '`git -c core.hooksPath=…`', re: /\bgit\s+(?:-[^\s]+\s+)*-c\s+core\.hooksPath\s*=/i },
  { ten: '`git config core.hooksPath`', re: /\bgit\s+config\b(?![^;&|\n]*--get)[^;&|\n]*\bcore\.hooksPath\b/i },
];

export function timCachVuotHook(lenh) {
  return CACH_VUOT.find((c) => c.re.test(lenh))?.ten ?? null;
}
