export const MOC_DAU = '<!-- agent-kit:bat-dau -->';
export const MOC_CUOI = '<!-- agent-kit:ket-thuc -->';

const chuanHoa = (s) => s.replace(/\r\n/g, '\n');

function viTri(vanBan) {
  const dau = vanBan.indexOf(MOC_DAU);
  const cuoi = vanBan.indexOf(MOC_CUOI, dau);
  return dau === -1 || cuoi === -1 ? null : { dau, cuoi };
}

export function layVungMoc(vanBan) {
  const s = chuanHoa(vanBan);
  const v = viTri(s);
  return v ? s.slice(v.dau + MOC_DAU.length, v.cuoi).replace(/^\n/, '').replace(/\n$/, '') : null;
}

export function thayVungMoc(vanBan, noiDung) {
  const s = chuanHoa(vanBan);
  const vung = `${MOC_DAU}\n${noiDung}\n${MOC_CUOI}`;
  const v = viTri(s);
  if (v) return s.slice(0, v.dau) + vung + s.slice(v.cuoi + MOC_CUOI.length);
  const truoc = s.trimEnd();
  return truoc ? `${truoc}\n\n${vung}\n` : `${vung}\n`;
}
