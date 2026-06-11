import { error } from '@sveltejs/kit';
import { getRequestEvent } from '$app/server';
import { accessControl, roles } from './auth.roles';

/**
 * Memastikan user sudah login. Jika tidak, lempar error 401.
 */
export function requireAuth(locals?: App.Locals) {
	const l = locals ?? getRequestEvent()?.locals;
	if (!l || !l.session || !l.user) {
		throw error(401, 'Unauthorized: Silakan login terlebih dahulu');
	}
	return { session: l.session, user: l.user };
}

/**
 * Memastikan user memiliki role tertentu. Jika tidak, lempar error 403.
 */
export function requireRole(rolesAllowed: string | string[], locals?: App.Locals) {
	const { user } = requireAuth(locals);

	const allowedRoles = Array.isArray(rolesAllowed) ? rolesAllowed : [rolesAllowed];

	if (!allowedRoles.includes(user.role)) {
		throw error(403, `Forbidden: Anda tidak memiliki akses (${user.role} tidak diizinkan)`);
	}

	return { user };
}

/**
 * Memastikan user memiliki permission tertentu berdasarkan Access Control (RBAC).
 * Contoh: requirePermission('inventory', 'create', locals)
 */
export function requirePermission(
	resource: keyof typeof accessControl.statements,
	action: string,
	locals?: App.Locals,
	targetOrgId?: string | null
) {
	const { user } = requireAuth(locals);

	// Ambil objek role dari map
	const userRole = roles[user.role as keyof typeof roles];

	// Cek apakah role user memiliki permission untuk resource dan action tersebut
	let can = false;
	if (userRole && typeof (userRole as any).authorize === 'function') {
		const result = (userRole as any).authorize({
			[resource]: [action]
		});
		can = result.success;
	}

	if (!can) {
		throw error(
			403,
			`Forbidden: Role ${user.role} tidak memiliki izin ${String(action)} pada ${String(resource)}`
		);
	}

	// Cek batasan organisasi untuk aksi modifikasi/menulis
	const isWriteAction = [
		'create',
		'update',
		'delete',
		'approve',
		'validate',
		'ship',
		'receive'
	].includes(action);
	if (isWriteAction && user.role !== 'superadmin') {
		// Pimpinan dan Kakomlek hanya bisa memodifikasi resource organisasinya sendiri (kecuali jika organisasi pusat parentId === null)
		if (['pimpinan', 'kakomlek'].includes(user.role)) {
			const isCentralOrg = user.organization && user.organization.parentId === null;
			if (!isCentralOrg && targetOrgId && targetOrgId !== user.organization?.id) {
				throw error(
					403,
					`Forbidden: Role ${user.role} hanya dapat memodifikasi resource milik organisasinya sendiri`
				);
			}
		}

		// Operator hanya bisa membuat mutasi/movement di organisasinya sendiri
		if (['operatorPusatDanDaerah', 'operatorBinmatDanBekharrah'].includes(user.role)) {
			const isOperatorAllowed =
				(resource === 'inventory' && ['create', 'update', 'delete'].includes(action)) ||
				(resource === 'movement' && action === 'create') ||
				(resource === 'maintenance' && ['create', 'update', 'delete'].includes(action)) ||
				(resource === 'distribution' && ['validate', 'ship', 'receive'].includes(action));
			if (!isOperatorAllowed) {
				throw error(
					403,
					`Forbidden: Operator hanya diizinkan untuk mengelola inventaris, mutasi, pergerakan, dan pemeliharaan`
				);
			}

			if (targetOrgId && targetOrgId !== user.organization?.id) {
				throw error(
					403,
					`Forbidden: Operator hanya dapat membuat mutasi/pergerakan di organisasi sendiri`
				);
			}
		}
	}

	return { user };
}
