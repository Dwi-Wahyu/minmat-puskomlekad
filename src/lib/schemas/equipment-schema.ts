import * as yup from 'yup';

export const componentSchema = yup.object({
	id: yup.string().optional(),
	name: yup.string().required('Nama komponen wajib diisi'),
	brand: yup.string().nullable().default(null),
	condition: yup
		.string()
		.oneOf(['BAIK', 'RUSAK_RINGAN', 'RUSAK_BERAT', 'RUSAK_TOTAL'])
		.default('BAIK'),
	isRequired: yup.boolean().default(true)
});

export const equipmentSchema = yup.object({
	itemName: yup.string().required('Nama Alat harus diisi'),
	baseUnit: yup.string().default('UNIT'),
	isSet: yup.boolean().default(false),
	serialNumber: yup.string().nullable().default(null),
	brand: yup.string().nullable().default(null),
	warehouseId: yup.string().nullable().default(null),
	condition: yup
		.string()
		.oneOf(['BAIK', 'RUSAK_RINGAN', 'RUSAK_BERAT', 'RUSAK_TOTAL'])
		.default('BAIK'),
	status: yup
		.string()
		.oneOf(['READY', 'IN_USE', 'TRANSIT', 'MAINTENANCE', 'DISPOSED'])
		.default('READY'),
	classification: yup.string().nullable().default(null),
	categoryId: yup.string().optional().default(undefined),
	newCategoryName: yup.string().nullable().default(null),
	parentCategoryId: yup.string().nullable().default(null),
	categoryMode: yup.string().oneOf(['select', 'new']).default('select'),
	components: yup.array().of(componentSchema).default([]),
	image: yup
		.mixed<File>()
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
export type ComponentSchema = typeof componentSchema;
