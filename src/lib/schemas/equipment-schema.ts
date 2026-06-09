import * as yup from 'yup';

export const equipmentSchema = yup.object({
	itemName: yup.string().required('Nama Alat harus diisi'),
	serialNumber: yup.string().nullable().default(null),
	brand: yup.string().nullable().default(null),
	warehouseId: yup.string().nullable().default(null),
	condition: yup.string().oneOf(['BAIK', 'RUSAK_RINGAN', 'RUSAK_BERAT']).default('BAIK'),
	status: yup.string().oneOf(['READY', 'IN_USE', 'TRANSIT', 'MAINTENANCE']).default('READY'),
	classification: yup.string().nullable().default(null)
});

export type EquipmentSchema = typeof equipmentSchema;
