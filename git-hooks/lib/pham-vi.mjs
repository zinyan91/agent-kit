export const SHA_RONG = '0'.repeat(40);

export function docDongRef(stdin) {
  const ketQua = [];
  for (const dong of stdin.split(/\r?\n/)) {
    const [, local, , remote] = dong.trim().split(/\s+/);
    if (!local || local === SHA_RONG) continue;
    ketQua.push(remote === SHA_RONG ? { loai: 'nhanh-moi', local } : { loai: 'cap-nhat', local, remote });
  }
  return ketQua;
}
