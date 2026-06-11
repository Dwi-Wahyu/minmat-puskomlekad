import * as yup from 'yup';

export const maintenanceMutationSchema = yup.object({
	equipmentIds: yup
		.array()
		.of(yup.string().uuid('Pilih peralatan yang valid'))
		.min(1, 'Pilih minimal satu peralatan')
		.required('Pilih minimal satu peralatan'),
	maintenanceType: yup
		.string()
		.oneOf(['PERAWATAN', 'PERBAIKAN'], 'Pilih tipe pemeliharaan')
		.required('Pilih tipe pemeliharaan'),
	description: yup.string().optional().nullable(),
	scheduledDate: yup.string().required('Tanggal jadwal wajib diisi'),
	completionDate: yup.string().nullable().optional(),
	status: yup.string().oneOf(['PENDING', 'IN_PROGRESS', 'COMPLETED']).default('PENDING'),
	technicianId: yup.string().uuid().nullable().optional()
});

export const maintenanceCreateSchema = yup.object({
	equipmentIds: yup
		.array()
		.of(yup.string().uuid('Pilih peralatan yang valid'))
		.min(1, 'Pilih minimal satu peralatan')
		.required('Pilih minimal satu peralatan'),
	maintenanceType: yup
		.string()
		.oneOf(['PERAWATAN', 'PERBAIKAN'], 'Pilih tipe pemeliharaan')
		.required('Pilih tipe pemeliharaan'),
	description: yup.string().optional().nullable(),
	scheduledDate: yup.string().required('Tanggal jadwal wajib diisi'),
	completionDate: yup.string().nullable().optional(),
	status: yup.string().oneOf(['PENDING', 'IN_PROGRESS', 'COMPLETED']).default('PENDING'),
	technicianId: yup.string().uuid().nullable().optional()
});

export type MaintenanceMutationSchema = typeof maintenanceMutationSchema;
export type MaintenanceCreateSchema = typeof maintenanceCreateSchema;
