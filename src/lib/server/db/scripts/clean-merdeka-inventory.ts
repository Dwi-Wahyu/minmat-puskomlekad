import { config } from 'dotenv';
config();

import mysql from 'mysql2/promise';
import * as schema from '../schema';
import * as authSchema from '../auth.schema';
import { drizzle } from 'drizzle-orm/mysql2';
import { eq, inArray, like, or, sql } from 'drizzle-orm';

const client = mysql.createPool(process.env.DATABASE_URL ?? '');
const db = drizzle(client, { schema: { ...schema, ...authSchema }, mode: 'default' });

const ROOT_ORG_SLUG = 'merdeka';

/**
 * Mendapatkan ID organisasi root Merdeka beserta seluruh ID organisasi bawahannya (rekursif).
 */
async function getAllMerdekaOrgIds(rootOrgId: string): Promise<string[]> {
	const allIds = new Set<string>([rootOrgId]);
	let currentLevel = [rootOrgId];

	while (currentLevel.length > 0) {
		const children = await db.query.organization.findMany({
			columns: { id: true },
			where: inArray(schema.organization.parentId, currentLevel)
		});

		const childIds = children.map((c) => c.id).filter((id) => !allIds.has(id));
		if (childIds.length === 0) break;

		for (const id of childIds) {
			allIds.add(id);
		}
		currentLevel = childIds;
	}

	return Array.from(allIds);
}

/**
 * Membersihkan seluruh data inventaris yang terkait dengan organisasi MERDEKA.
 * Menjaga organization, user, member, dan warehouse tetap utuh.
 */
export async function cleanMerdekaInventory() {
	console.log('════════════════════════════════════════════════════');
	console.log('    🧹 CLEANUP DATA INVENTARIS KESATUAN MERDEKA    ');
	console.log('════════════════════════════════════════════════════');

	// 1. Cari organisasi root "merdeka" (juga periksa kemungkinan typo "merdrka")
	let rootOrg = await db.query.organization.findFirst({
		where: or(
			eq(authSchema.organization.slug, ROOT_ORG_SLUG),
			eq(authSchema.organization.slug, 'merdrka'),
			eq(authSchema.organization.name, 'MERDEKA'),
			eq(authSchema.organization.name, 'MERDRKA')
		)
	});

	if (!rootOrg) {
		console.error(`❌ Organisasi MERDEKA tidak ditemukan di database.`);
		return;
	}

	// Koreksi nama dan slug jika masih berstatus typo "merdrka"
	if (rootOrg.name === 'MERDRKA' || rootOrg.slug === 'merdrka') {
		console.log(`🔧 Memperbaiki nama & slug organisasi dari ${rootOrg.name}/${rootOrg.slug} ke MERDEKA/merdeka...`);
		await db
			.update(authSchema.organization)
			.set({ name: 'MERDEKA', slug: 'merdeka' })
			.where(eq(authSchema.organization.id, rootOrg.id));
		rootOrg = { ...rootOrg, name: 'MERDEKA', slug: 'merdeka' };
		console.log('  ✅ Organisasi root berhasil diperbarui.');
	}

	console.log(`📍 Root Organization: ${rootOrg.name} (${rootOrg.id}) [slug: ${rootOrg.slug}]`);

	// 2. Kumpulkan semua ID organisasi Merdeka (root + bawahan)
	const orgIds = await getAllMerdekaOrgIds(rootOrg.id);
	console.log(`🏢 Total Organisasi Terkait: ${orgIds.length}`);

	// 3. Kumpulkan semua ID gudang milik organisasi-organisasi tersebut
	const warehouses =
		orgIds.length > 0
			? await db.query.warehouse.findMany({
					columns: { id: true },
					where: inArray(schema.warehouse.organizationId, orgIds)
				})
			: [];
	const warehouseIds = warehouses.map((w) => w.id);
	console.log(`🏭 Total Gudang Terkait: ${warehouseIds.length}`);

	// 4. Kumpulkan ID Equipment milik Merdeka / Gudang Terkait / Prefix MDK-EQP-
	const equipmentWhereConditions = [];
	if (orgIds.length > 0) {
		equipmentWhereConditions.push(inArray(schema.equipment.organizationId, orgIds));
	}
	if (warehouseIds.length > 0) {
		equipmentWhereConditions.push(inArray(schema.equipment.warehouseId, warehouseIds));
	}
	equipmentWhereConditions.push(like(schema.equipment.id, 'MDK-EQP-%'));

	const equipments = await db.query.equipment.findMany({
		columns: { id: true },
		where: or(...equipmentWhereConditions)
	});
	const equipmentIds = equipments.map((e) => e.id);
	console.log(`🔧 Total Equipment Terkait: ${equipmentIds.length}`);

	// 5. Deletions dalam transaksi
	await db.transaction(async (tx) => {
		// A. Kumpulkan ID transaksi (Lending, Distribution, Maintenance) untuk menghapus Approval
		const lendings =
			orgIds.length > 0
				? await tx.query.lending.findMany({
						columns: { id: true },
						where: inArray(schema.lending.organizationId, orgIds)
					})
				: [];
		const lendingIds = lendings.map((l) => l.id);

		const distributions =
			orgIds.length > 0
				? await tx.query.distribution.findMany({
						columns: { id: true },
						where: or(
							inArray(schema.distribution.fromOrganizationId, orgIds),
							inArray(schema.distribution.toOrganizationId, orgIds)
						)
					})
				: [];
		const distIds = distributions.map((d) => d.id);

		const maintenances =
			equipmentIds.length > 0
				? await tx.query.maintenance.findMany({
						columns: { id: true },
						where: inArray(schema.maintenance.equipmentId, equipmentIds)
					})
				: [];
		const maintenanceIds = maintenances.map((m) => m.id);

		const refIdsForApproval = [...lendingIds, ...distIds, ...maintenanceIds];
		if (refIdsForApproval.length > 0) {
			await tx
				.delete(schema.approval)
				.where(inArray(schema.approval.referenceId, refIdsForApproval));
			console.log(`  ✅ ${refIdsForApproval.length} Approval transaksi dibersihkan.`);
		}

		// B. Movement (Riwayat Pergerakan Barang)
		const movementConditions = [like(schema.movement.id, 'MDK-MOV-%')];
		if (orgIds.length > 0) {
			movementConditions.push(inArray(schema.movement.organizationId, orgIds));
		}
		if (warehouseIds.length > 0) {
			movementConditions.push(inArray(schema.movement.toWarehouseId, warehouseIds));
			movementConditions.push(inArray(schema.movement.fromWarehouseId, warehouseIds));
		}
		if (equipmentIds.length > 0) {
			movementConditions.push(inArray(schema.movement.equipmentId, equipmentIds));
		}

		await tx.delete(schema.movement).where(or(...movementConditions));
		console.log('  ✅ Movement dibersihkan.');

		// C. Lending (Peminjaman)
		if (equipmentIds.length > 0) {
			await tx
				.delete(schema.lendingItem)
				.where(inArray(schema.lendingItem.equipmentId, equipmentIds));
		}
		if (lendingIds.length > 0) {
			await tx
				.delete(schema.lendingItem)
				.where(inArray(schema.lendingItem.lendingId, lendingIds));
			await tx.delete(schema.lending).where(inArray(schema.lending.id, lendingIds));
		}
		if (orgIds.length > 0) {
			await tx.delete(schema.lending).where(inArray(schema.lending.organizationId, orgIds));
		}
		console.log('  ✅ Peminjaman (Lending) dibersihkan.');

		// D. Distribution (Distribusi)
		if (equipmentIds.length > 0) {
			await tx
				.delete(schema.distributionEquipment)
				.where(inArray(schema.distributionEquipment.equipmentId, equipmentIds));
		}
		if (warehouseIds.length > 0) {
			await tx
				.delete(schema.distributionConsumable)
				.where(inArray(schema.distributionConsumable.fromWarehouseId, warehouseIds));
		}
		if (distIds.length > 0) {
			await tx
				.delete(schema.distributionEquipment)
				.where(inArray(schema.distributionEquipment.distributionId, distIds));
			await tx
				.delete(schema.distributionConsumable)
				.where(inArray(schema.distributionConsumable.distributionId, distIds));
			await tx.delete(schema.distribution).where(inArray(schema.distribution.id, distIds));
		}
		console.log('  ✅ Distribusi dibersihkan.');

		// E. Maintenance (Pemeliharaan)
		if (equipmentIds.length > 0) {
			await tx
				.delete(schema.maintenance)
				.where(inArray(schema.maintenance.equipmentId, equipmentIds));
		}
		console.log('  ✅ Maintenance dibersihkan.');

		// F. Equipment Component & Equipment
		if (equipmentIds.length > 0) {
			await tx
				.delete(schema.equipmentComponent)
				.where(inArray(schema.equipmentComponent.equipmentId, equipmentIds));
			await tx.delete(schema.equipment).where(inArray(schema.equipment.id, equipmentIds));
		}
		if (orgIds.length > 0 || warehouseIds.length > 0) {
			const eqOrConditions = [];
			if (orgIds.length > 0) eqOrConditions.push(inArray(schema.equipment.organizationId, orgIds));
			if (warehouseIds.length > 0)
				eqOrConditions.push(inArray(schema.equipment.warehouseId, warehouseIds));
			await tx.delete(schema.equipment).where(or(...eqOrConditions));
		}
		console.log('  ✅ Equipment & Komponen dibersihkan.');

		// G. Stock (Stok Consumables / Barang di Gudang)
		if (warehouseIds.length > 0) {
			await tx.delete(schema.stock).where(inArray(schema.stock.warehouseId, warehouseIds));
		}
		console.log('  ✅ Stock dibersihkan.');

		// H. Items khusus Merdeka (MDK-ITM-%) jika ada
		const mdkItems = await tx.query.item.findMany({
			columns: { id: true },
			where: like(schema.item.id, 'MDK-ITM-%')
		});
		const mdkItemIds = mdkItems.map((i) => i.id);
		if (mdkItemIds.length > 0) {
			await tx
				.delete(schema.itemUnitConversion)
				.where(inArray(schema.itemUnitConversion.itemId, mdkItemIds));
			await tx.delete(schema.item).where(inArray(schema.item.id, mdkItemIds));
			console.log(`  ✅ ${mdkItemIds.length} Items katalog Merdeka (MDK-ITM-*) dibersihkan.`);
		}

		// I. Reports & Logs tambahan
		if (orgIds.length > 0) {
			await tx
				.delete(schema.reportBtk16)
				.where(inArray(schema.reportBtk16.organizationId, orgIds));
			await tx.delete(schema.importLog).where(inArray(schema.importLog.organizationId, orgIds));
			await tx
				.delete(schema.notification)
				.where(inArray(schema.notification.organizationId, orgIds));
			console.log('  ✅ Laporan BTK16, Import Log, dan Notifikasi dibersihkan.');
		}
	});

	console.log('\n✨ Pembersihan data inventaris MERDEKA selesai!');
}

if (import.meta.main || process.argv[1]?.endsWith('clean-merdeka-inventory.ts')) {
	cleanMerdekaInventory()
		.then(() => process.exit(0))
		.catch((err) => {
			console.error('\n❌ Pembersihan data gagal:', err);
			process.exit(1);
		});
}
