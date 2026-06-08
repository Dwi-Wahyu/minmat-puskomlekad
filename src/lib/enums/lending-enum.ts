// Label mapping untuk enum yang berkaitan dengan Lending (Peminjaman)

export const lendingPurposeLabel: Record<string, string> = {
  OPERASI: "Operasi",
  LATIHAN: "Latihan",
  PERINTAH_LANGSUNG: "Perintah Langsung",
};

export const lendingStatusLabel: Record<string, string> = {
  DRAFT: "Draf",
  APPROVED: "Disetujui",
  REJECTED: "Ditolak",
  PERINTAH_LANGSUNG: "Perintah Langsung",
  DIPINJAM: "Sedang Dipinjam",
  KEMBALI: "Sudah Dikembalikan",
};
