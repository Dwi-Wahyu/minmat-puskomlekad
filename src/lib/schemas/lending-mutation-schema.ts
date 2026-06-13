import * as yup from 'yup';
import { lendingPurposeLabel } from '$lib/enums/lending-enum';

export const lendingMutationSchema = yup.object({
	targetOrgId: yup.string().required('Organisasi tujuan harus ditentukan'),
	unit: yup.string().required('Unit peminjam wajib diisi'),
	purpose: yup
		.string()
		.oneOf(Object.keys(lendingPurposeLabel), 'Tujuan penggunaan tidak valid')
		.required('Tujuan penggunaan wajib diisi'),
	overrideReason: yup.string().when('purpose', {
		is: 'PERINTAH_LANGSUNG',
		then: (schema) => schema.required('Keterangan perintah langsung wajib diisi'),
		otherwise: (schema) => schema.nullable().optional()
	}),
	startDate: yup.string().required('Tanggal mulai wajib diisi'),
	endDate: yup.string().nullable().optional(),
	itemIds: yup.array().of(yup.string()).optional(),
	warehouseIds: yup.array().of(yup.string()).optional(),
	conditions: yup.array().of(yup.string()).optional(),
	qtys: yup.array().of(yup.number()).optional(),
	manualEquipmentIds: yup.array().of(yup.string()).optional(),
	attachment: yup.mixed<File>()
		.test('fileSize', 'Ukuran file maksimal 5MB', (value) => {
			if (!value || !(value instanceof File)) return true;
			return value.size <= 5 * 1024 * 1024;
		})
		.test('fileType', 'Format file harus PDF atau DOCX', (value) => {
			if (!value || !(value instanceof File)) return true;
			return [
				'application/pdf',
				'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
			].includes(value.type);
		})
		.nullable()
		.optional()
});

export type LendingMutationSchema = typeof lendingMutationSchema;
