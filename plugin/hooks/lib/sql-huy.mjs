const LENH_HUY = [
  { ten: 'DROP TABLE', re: /\bDROP\s+TABLE\b/ },
  { ten: 'DROP SCHEMA', re: /\bDROP\s+SCHEMA\b/ },
  { ten: 'DROP DATABASE', re: /\bDROP\s+DATABASE\b/ },
  { ten: 'TRUNCATE', re: /\bTRUNCATE\b/ },
  { ten: 'ALTER TABLE ... DROP COLUMN', re: /\bALTER\s+TABLE\b[\s\S]*\bDROP\s+COLUMN\b/ },
];

export function timLenhHuy(sql) {
  const gon = String(sql)
    .replace(/--[^\n]*/g, ' ')
    .replace(/\/\*[\s\S]*?\*\//g, ' ')
    .replace(/'(?:[^']|'')*'/g, "''")
    .replace(/\$\$[\s\S]*?\$\$/g, ' ')
    .replace(/\s+/g, ' ')
    .toUpperCase();
  const thay = LENH_HUY.filter((l) => l.re.test(gon)).map((l) => l.ten);
  if (gon.split(';').some((cau) => /\bDELETE\s+FROM\b/.test(cau) && !/\bWHERE\b/.test(cau))) {
    thay.push('DELETE FROM không có WHERE');
  }
  return thay;
}
