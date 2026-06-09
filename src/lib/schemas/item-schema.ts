import * as yup from 'yup';

export const itemSchema = yup.object({
	name: yup.string().required('Nama Barang harus diisi'),
	baseUnit: yup.string().oneOf(['PCS', 'BOX', 'METER', 'ROLL', 'UNIT']).required('Satuan dasar harus dipilih'),
	description: yup.string().nullable().default(null),
	warehouseId: yup.string().nullable().default(null),
	qty: yup.number().min(0, 'Stok tidak boleh negatif').nullable().default(0)
});

export type ItemSchema = typeof itemSchema;
