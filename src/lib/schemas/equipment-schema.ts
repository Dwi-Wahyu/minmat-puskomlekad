import * as yup from 'yup';

export const equipmentSchema = yup.object({
	itemName: yup.string().required('Nama Alat harus diisi'),
	serialNumber: yup.string().nullable().default(null),
	brand: yup.string().nullable().default(null),
	warehouseId: yup.string().nullable().default(null),
	condition: yup.string().oneOf(['BAIK', 'RUSAK_RINGAN', 'RUSAK_BERAT']).default('BAIK'),
	status: yup.string().oneOf(['READY', 'IN_USE', 'TRANSIT', 'MAINTENANCE']).default('READY'),
	classification: yup.string().nullable().default(null),
	image: yup.mixed<File>()
		.test('fileSize', 'Ukuran file maksimal 5MB', (value) => {
			if (!value || !(value instanceof File)) return true;
			return value.size <= 5 * 1024 * 1024;
		})
		.test('fileType', 'Format file harus PNG, JPG, atau JPEG', (value) => {
			if (!value || !(value instanceof File)) return true;
			return ['image/png', 'image/jpeg', 'image/jpg'].includes(value.type);
		})
		.nullable()
		.optional()
});

export type EquipmentSchema = typeof equipmentSchema;
