export const auditActionLabel: Record<string, string> = {
	CREATE: 'Buat Baru',
	UPDATE: 'Perbarui',
	DELETE: 'Hapus',
	LOGIN: 'Login',
	LOGOUT: 'Logout',
	APPROVE: 'Setujui',
	REJECT: 'Tolak',
	CONFIRM_RETURN_LENDING: 'Konfirmasi Peminjaman Kembali',
	VALIDATE: 'Validasi',
	RECEIVE: 'Terima',
	ISSUE: 'Keluarkan',
	TRANSFER: 'Pindahkan',
	UPDATE_EQUIPMENT_STATUS: 'Perbarui Status Alat',
	SEND_BACK_LENDING: 'Kirim Balik Peminjaman',
	CONFIRM_RECEIVE_LENDING: 'Konfirmasi Terima Peminjaman',
	DISPATCH_LENDING: 'Kirim Peminjaman',
	APPROVE_LENDING: 'Setujui Peminjaman'
};

export const auditTableLabel: Record<string, string> = {
	item: 'Master Barang/Alat',
	equipment: 'Data Alat/Aset',
	stock: 'Stok Barang (BHP)',
	movement: 'Mutasi/Pergerakan',
	distribution: 'Distribusi',
	distribution_consumable: 'Item Distribusi (BHP)',
	distribution_equipment: 'Item Distribusi (Alat)',
	maintenance: 'Pemeliharaan',
	lending: 'Peminjaman',
	lending_item: 'Item Peminjaman',
	session: 'Sesi',
	warehouse: 'Gudang',
	organization: 'Organisasi/Satuan',
	user: 'Pengguna',
	member: 'Anggota Organisasi'
};
