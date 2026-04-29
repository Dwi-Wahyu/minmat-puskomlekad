import { db } from '$lib/server/db';
import { movement, equipment, item } from '$lib/server/db/schema';
import { eq, desc, and } from 'drizzle-orm';
import type { PageServerLoad, Actions } from './$types';
import { fail } from '@sveltejs/kit';

export const load: PageServerLoad = async ({ url, locals }) => {
	const userOrg = locals.user.organization;
	if (!userOrg?.id) {
		return { movements: [], organizations: [], isMabes: false, selectedOrgId: '', filters: { search: '', type: '', category: '' } };
	}

	const isMabes = userOrg.parentId === null;
	const selectedOrgId = url.searchParams.get('orgId') || userOrg.id;
	
	// Filter Params
	const searchQuery = url.searchParams.get('search') || '';
	const typeFilter = url.searchParams.get('type') || '';
	const categoryFilter = url.searchParams.get('category') || '';

	// Fetch all organizations if user is Mabes
	const orgs = isMabes ? await db.query.organization.findMany() : [];

	const movements = await db.query.movement.findMany({
		where: and(
			eq(movement.classification, 'BALKIR'),
			eq(movement.organizationId, selectedOrgId)
		),
		with: {
			equipment: {
				with: {
					item: true,
					warehouse: true
				}
			},
			organization: {
				columns: { name: true }
			},
			fromWarehouse: {
				columns: { name: true }
			},
			item: true
		},
		orderBy: [desc(movement.createdAt)]
	});

	// Filter and Grouping logic
	const filtered = movements.filter((m) => {
		const itemData = m.equipment?.item || m.item;
		if (!itemData) return false;

		// Data Terbaru check: Jika Asset, pastikan masih di sistem (warehouseId null = ISSUE)
		if (m.equipment && m.equipment.warehouseId === null && m.eventType === 'ISSUE') {
			return false;
		}

		// Search Filter
		if (searchQuery) {
			const nameMatch = itemData.name.toLowerCase().includes(searchQuery.toLowerCase());
			const snMatch = m.equipment?.serialNumber?.toLowerCase().includes(searchQuery.toLowerCase());
			if (!nameMatch && !snMatch) return false;
		}

		// Type Filter
		if (typeFilter && itemData.type !== typeFilter) return false;

		// Category Filter
		if (categoryFilter && itemData.equipmentType !== categoryFilter) return false;

		return true;
	});

	// Mapping & Grouping
	const mappedMovements = filtered.map((m) => {
		const displayOrgName =
			m.organizationId === userOrg.id ? 'Internal' : (m.organization?.name ?? 'Unknown');

		if (m.equipment) {
			return {
				id: m.id,
				equipmentId: m.equipment.id,
				type: 'asset' as const,
				nama: m.equipment.item.name,
				tipe: m.equipment.item.type,
				kategori: m.equipment.item.equipmentType,
				sn: m.equipment.serialNumber,
				qty: 1,
				satuan: m.equipment.item.baseUnit,
				kondisi: m.equipment.condition,
				lokasi: m.specificLocationName,
				tglMasuk: m.createdAt,
				organizationName: displayOrgName,
				fromWarehouse: m.fromWarehouse?.name || 'Pusat/Luar',
				classification: m.classification
			};
		}

		return {
			id: m.id,
			itemId: m.item?.id,
			type: 'consumable' as const,
			nama: m.item?.name || 'Unknown',
			tipe: m.item?.type || 'CONSUMABLE',
			kategori: null,
			sn: null,
			qty: Number(m.qty),
			satuan: m.item?.baseUnit,
			kondisi: null,
			lokasi: m.specificLocationName,
			tglMasuk: m.createdAt,
			organizationName: displayOrgName,
			fromWarehouse: m.fromWarehouse?.name || 'Pusat/Luar',
			classification: m.classification
		};
	});

	// Terapkan Grouping untuk Consumables
	const finalMovements: any[] = [];
	const consumableGroups = new Map<string, any>();

	for (const m of mappedMovements) {
		if (m.type === 'consumable' && m.itemId) {
			const key = `${m.itemId}-${m.lokasi}-${m.organizationName}-${m.fromWarehouse}`;
			const existing = consumableGroups.get(key);
			if (existing) {
				existing.qty += m.qty;
				if (new Date(m.tglMasuk) > new Date(existing.tglMasuk)) {
					existing.tglMasuk = m.tglMasuk;
				}
			} else {
				consumableGroups.set(key, { ...m });
			}
		} else {
			finalMovements.push(m);
		}
	}

	finalMovements.push(...Array.from(consumableGroups.values()));
	
	// Sort by latest date again
	finalMovements.sort((a, b) => new Date(b.tglMasuk).getTime() - new Date(a.tglMasuk).getTime());

	return {
		movements: finalMovements,
		organizations: orgs,
		isMabes: isMabes,
		selectedOrgId: selectedOrgId,
		filters: {
			search: searchQuery,
			type: typeFilter,
			category: categoryFilter
		}
	};
};

export const actions: Actions = {
	delete: async ({ request, locals }) => {
		const { user } = locals;
		if (!user) return fail(401);

		const formData = await request.formData();
		const movementId = formData.get('id') as string;

		try {
			await db.transaction(async (tx) => {
				const currentMovement = await tx.query.movement.findFirst({
					where: eq(movement.id, movementId),
					with: {
						equipment: true
					}
				});

				if (!currentMovement) throw new Error('Data mutasi tidak ditemukan');

				if (currentMovement.equipmentId) {
					await tx
						.update(equipment)
						.set({
							warehouseId: null,
							status: 'READY'
						})
						.where(eq(equipment.id, currentMovement.equipmentId));

					await tx.insert(movement).values({
						id: crypto.randomUUID(),
						equipmentId: currentMovement.equipmentId,
						organizationId: user.organization.id,
						eventType: 'ISSUE',
						classification: null,
						qty: '1.0000',
						fromWarehouseId: currentMovement.toWarehouseId || currentMovement.fromWarehouseId,
						notes: 'Penghapusan permanen dari Gudang Balkir',
						picId: user.id,
						createdAt: new Date()
					});
				}

				await tx
					.update(movement)
					.set({ classification: null })
					.where(eq(movement.id, movementId));
			});

			return { success: true, message: 'Barang berhasil dihapus permanen dari sistem' };
		} catch (error) {
			console.error('Error deleting from balkir:', error);
			return fail(500, { message: 'Gagal memproses penghapusan barang' });
		}
	}
};
