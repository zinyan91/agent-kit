export const CHU_KY_MS = 6 * 3600 * 1000;

export function quyetDinhCapNhat({ laJunction, trangThai, bayGio, chuKyMs }) {
  if (laJunction) return { chay: false, canhBao: null };
  const kq = trangThai.ketQuaCuoi;
  const canhBao = kq && kq.ok === false ? `[agent-kit] Lần tự cập nhật kit gần nhất (${kq.luc}) lỗi: ${kq.loi}. Báo người dùng.` : null;
  const lan = trangThai.lanKiemCuoi ? Date.parse(trangThai.lanKiemCuoi) : NaN;
  return { chay: Number.isNaN(lan) || bayGio - lan >= chuKyMs, canhBao };
}
