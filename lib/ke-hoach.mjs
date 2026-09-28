import path from 'node:path';

const cungCho = (a, b) => path.resolve(a).toLowerCase() === path.resolve(b).toLowerCase();

export function quyetDinhJunction(trang, nguon) {
  switch (trang.loai) {
    case 'khong-co':
      return { loai: 'tao' };
    case 'junction':
      return cungCho(trang.dichJunction, nguon)
        ? { loai: 'giu' }
        : { loai: 'xung-dot', lyDo: `junction đang trỏ tới ${trang.dichJunction}` };
    case 'thu-muc':
      return trang.giongKit
        ? { loai: 'thay-bang-junction' }
        : { loai: 'xung-dot', lyDo: 'thư mục thật có nội dung khác bản trong kit' };
    default:
      return { loai: 'xung-dot', lyDo: 'đã có một tệp cùng tên' };
  }
}

export function lapKeHoach({ thuMucSkillKit, skills, congCu, chiVao, hienTrang }) {
  const hanhDong = [];
  for (const skill of skills) {
    const nguon = path.join(thuMucSkillKit, skill);
    for (const [ten, cauHinh] of Object.entries(congCu)) {
      if (!cauHinh.skills) continue;
      if (chiVao[skill] && !chiVao[skill].includes(ten)) continue;
      const dich = path.join(cauHinh.skills, skill);
      hanhDong.push({ skill, congCu: ten, nguon, dich, ...quyetDinhJunction(hienTrang(dich, nguon), nguon) });
    }
  }
  return hanhDong;
}
