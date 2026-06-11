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
	manualEquipmentIds: yup.array().of(yup.string()).optional()
});

export type LendingMutationSchema = typeof lendingMutationSchema;
