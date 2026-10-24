import path from 'node:path';

const cungCho = (a, b) => path.resolve(a).toLowerCase() === path.resolve(b).toLowerCase();

export const nhanVai = (kit, nhaKit) => (cungCho(kit, nhaKit) ? 'dung' : 'nguon');

export function quyetDinhNhaKit(trang, kit) {
  if (trang.loai === 'khong-co') return { loai: 'tao' };
  if (trang.loai === 'junction' && cungCho(trang.dichJunction, kit)) return { loai: 'giu' };
  if (trang.loai === 'junction') return { loai: 'xung-dot', lyDo: `junction đang trỏ tới ${trang.dichJunction}` };
  return { loai: 'xung-dot', lyDo: trang.loai === 'thu-muc' ? 'đã có một thư mục thật (bản clone cũ?)' : 'đã có một tệp cùng tên' };
}
