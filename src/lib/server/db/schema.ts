import {
	mysqlTable,
	varchar,
	text,
	timestamp,
	int,
	mysqlEnum,
	index
} from 'drizzle-orm/mysql-core';
import { relations } from 'drizzle-orm';
import { organization, user } from './auth.schema';

export const warehouse = mysqlTable('warehouse', {
	id: varchar('id', { length: 36 }).primaryKey(),
	name: varchar('name', { length: 255 }).notNull(),
	location: text('location'),
	category: mysqlEnum('category', ['KOMUNITY', 'TRANSITO', 'BALKIR']).notNull(),
	createdAt: timestamp('created_at').defaultNow().notNull(),
	organizationId: varchar('organization_id', { length: 36 }).references(() => organization.id, {
		onDelete: 'restrict'
	})
});

export const equipment = mysqlTable(
	'equipment',
	{
		id: varchar('id', { length: 36 }).primaryKey(),
		name: varchar('name', { length: 255 }).notNull(),
		serialNumber: varchar('serial_number', { length: 100 }).unique(),
		brand: varchar('brand', { length: 100 }),

		warehouseId: varchar('warehouse_id', { length: 36 }).references(() => warehouse.id),

		type: mysqlEnum('type', ['ALKOMLEK', 'PERNIKA_LEK']).notNull(),

		category: varchar('category', { length: 100 }).notNull(),

		condition: mysqlEnum('condition', ['BAIK', 'RUSAK_RINGAN', 'RUSAK_BERAT'])
			.default('BAIK')
			.notNull(),

		createdAt: timestamp('created_at').defaultNow().notNull(),
		updatedAt: timestamp('updated_at').onUpdateNow()
	},
	(table) => [
		index('equipment_type_idx').on(table.type),
		index('equipment_condition_idx').on(table.condition)
	]
);

export const maintenance = mysqlTable('maintenance', {
	id: varchar('id', { length: 36 }).primaryKey(),
	equipmentId: varchar('equipment_id', { length: 36 }).references(() => equipment.id, {
		onDelete: 'cascade'
	}),

	maintenanceType: mysqlEnum('maintenance_type', ['PERAWATAN', 'PERBAIKAN']).notNull(),
	description: text('description').notNull(),
	scheduledDate: timestamp('scheduled_date').notNull(),
	completionDate: timestamp('completion_date'),

	status: mysqlEnum('status', ['PENDING', 'IN_PROGRESS', 'COMPLETED']).default('PENDING').notNull(),
	technicianId: varchar('technician_id', { length: 36 }).references(() => user.id), // Relasi ke user dari auth.schema

	createdAt: timestamp('created_at').defaultNow().notNull()
});

export const lending = mysqlTable('lending', {
	id: varchar('id', { length: 36 }).primaryKey(),
	equipmentId: varchar('equipment_id', { length: 36 }).references(() => equipment.id, {
		onDelete: 'cascade'
	}),

	purpose: mysqlEnum('purpose', ['OPERASI_MILITER', 'LATIHAN_MILITER']).notNull(),
	purposeDetail: text('purpose_detail'),

	borrowerName: varchar('borrower_name', { length: 255 }).notNull(),
	unit: varchar('unit', { length: 100 }).notNull(),

	departureDate: timestamp('departure_date').notNull(),
	expectedReturnDate: timestamp('expected_return_date').notNull(),
	actualReturnDate: timestamp('actual_return_date'),

	status: mysqlEnum('status', ['DIPINJAM', 'KEMBALI', 'TERLAMBAT']).default('DIPINJAM').notNull(),

	createdAt: timestamp('created_at').defaultNow().notNull()
});

export const warehouseRelations = relations(warehouse, ({ many, one }) => ({
	equipments: many(equipment),
	organization: one(organization)
}));

export const equipmentRelations = relations(equipment, ({ many, one }) => ({
	warehouse: one(warehouse, { fields: [equipment.warehouseId], references: [warehouse.id] }),
	maintenances: many(maintenance),
	lendings: many(lending)
}));

export const maintenanceRelations = relations(maintenance, ({ one }) => ({
	equipment: one(equipment, {
		fields: [maintenance.equipmentId],
		references: [equipment.id]
	})
}));

export const lendingRelations = relations(lending, ({ one }) => ({
	equipment: one(equipment, {
		fields: [lending.equipmentId],
		references: [equipment.id]
	})
}));

export * from './auth.schema';
