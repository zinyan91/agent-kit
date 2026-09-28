export const DAU_BO_QUA = 'secret-scan-ok';

const TEN_BI_MAT = '(SECRET|TOKEN|PASSWORD|SALT|PRIVATE|APIKEY|API_KEY)';

export const QUY_TAC = [
  {
    ten: 'JSON Web Token / khoá Supabase',
    re: /eyJ[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}/,
    mien: (dong) => /NEXT_PUBLIC_SUPABASE_(ANON|PUBLISHABLE)_KEY/.test(dong),
  },
  { ten: 'Telegram bot token', re: /\b\d{8,10}:AA[A-Za-z0-9_-]{30,}\b/ },
  { ten: 'Khoá kiểu OpenAI/Anthropic', re: /\b(sk|sk-ant)-[A-Za-z0-9_-]{20,}/ },
  { ten: 'GitHub token', re: /\bgh[pousr]_[A-Za-z0-9]{30,}/ },
  { ten: 'AWS access key id', re: /\bAKIA[0-9A-Z]{16}\b/ },
  { ten: 'Google API key', re: /\bAIza[0-9A-Za-z_-]{30,}\b/ },
  { ten: 'Google/Stitch API key (dạng AQ.)', re: /\bAQ\.[A-Za-z0-9_-]{30,}\b/ },
  { ten: 'Khối private key', re: /-----BEGIN [A-Z ]*PRIVATE KEY-----/ },
  {
    ten: 'Fallback chuỗi cứng cho biến bí mật',
    re: new RegExp(`process\\.env\\.[A-Za-z_]*${TEN_BI_MAT}[A-Za-z_]*\\s*\\|\\|\\s*['"\`]`, 'i'),
  },
  {
    ten: 'Fallback là hằng cho biến bí mật',
    re: new RegExp(`process\\.env\\.[A-Za-z_]*${TEN_BI_MAT}[A-Za-z_]*\\s*\\|\\|\\s*[A-Za-z_$][A-Za-z0-9_$.]*`, 'i'),
  },
  {
    ten: 'Hằng bí mật khai báo cứng',
    re: new RegExp(`\\b(const|let|var)\\s+[A-Za-z_$][A-Za-z0-9_$]*${TEN_BI_MAT}[A-Za-z0-9_$]*\\s*=\\s*['"\`][^'"\`]{12,}['"\`]`, 'i'),
  },
];

export function quetDongThem(diff) {
  const ketQua = [];
  for (const dong of diff.split(/\r?\n/)) {
    if (!dong.startsWith('+') || dong.startsWith('+++')) continue;
    if (dong.includes(DAU_BO_QUA)) continue;
    const quyTac = QUY_TAC.find((q) => !q.mien?.(dong) && q.re.test(dong));
    if (quyTac) ketQua.push({ quyTac: quyTac.ten, dong: dong.slice(1).trim().slice(0, 110) });
  }
  return ketQua;
}
