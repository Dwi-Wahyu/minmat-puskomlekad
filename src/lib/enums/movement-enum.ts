// Label mapping untuk enum yang berkaitan dengan Movement (Pergerakan Barang)

export const movementEventTypeLabel: Record<string, string> = {
  RECEIVE: "Penerimaan",
  ISSUE: "Pengeluaran",
  ADJUSTMENT: "Penyesuaian Stok",
  TRANSFER_OUT: "Transfer Keluar",
  TRANSFER_IN: "Transfer Masuk",
  LOAN_OUT: "Peminjaman",
  LOAN_RETURN: "Pengembalian Pinjaman",
  DISTRIBUTE_OUT: "Distribusi Keluar",
  DISTRIBUTE_IN: "Distribusi Masuk",
  MAINTENANCE_IN: "Masuk Perawatan",
  MAINTENANCE_OUT: "Selesai Perawatan",
};

export const movementClassificationLabel: Record<string, string> = {
  BALKIR: "Barang Terkirim (Ekspedisi)",
  KOMUNITY: "Serah Terima ke Satuan",
  TRANSITO: "Gudang Transit / Penyimpanan Sementara",
};

export const movementReferenceTypeLabel: Record<string, string> = {
  LENDING: "Peminjaman",
  DISTRIBUTION: "Distribusi",
  MAINTENANCE: "Perawatan / Perbaikan",
};
