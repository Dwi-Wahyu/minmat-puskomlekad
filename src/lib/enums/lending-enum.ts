// Label mapping untuk enum yang berkaitan dengan Lending (Peminjaman)

export const lendingPurposeLabel: Record<string, string> = {
	OPERASI: 'Operasi',
	LATIHAN: 'Latihan',
	PERINTAH_LANGSUNG: 'Perintah Langsung'
};

export const lendingStatusLabel: Record<string, string> = {
	DRAFT: 'Draf',
	APPROVED: 'Disetujui',
	REJECTED: 'Ditolak',
	PERINTAH_LANGSUNG: 'Perintah Langsung',
	DALAM_PENGIRIMAN: 'Dalam Pengiriman',
	DIPINJAM: 'Sedang Dipinjam',
	DIKIRIM_KEMBALI: 'Dikirim Kembali',
	KEMBALI: 'Sudah Dikembalikan'
};
