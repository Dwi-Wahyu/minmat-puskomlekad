import type { Handle } from '@sveltejs/kit';
import { error, redirect } from '@sveltejs/kit';
import { building } from '$app/environment';
import { auth } from '$lib/server/auth';
import { svelteKitHandler } from 'better-auth/svelte-kit';

export const handle: Handle = async ({ event, resolve }) => {
	const session = await auth.api.getSession({
		headers: event.request.headers
	});

	if (session) {
		event.locals.session = session.session;
		event.locals.user = session.user as any;
	} else {
		event.locals.session = null;
		event.locals.user = null;
	}

	// 1. Otorisasi org_slug jika event.params.org_slug terdefinisi
	const orgSlug = event.params.org_slug;
	if (orgSlug) {
		// Pastikan user sudah login untuk semua halaman/API di bawah /[org_slug]
		if (!event.locals.user) {
			if (event.url.pathname.startsWith('/api')) {
				return new Response(JSON.stringify({ error: 'Unauthorized: Silakan login terlebih dahulu' }), {
					status: 401,
					headers: { 'Content-Type': 'application/json' }
				});
			}
			throw redirect(302, '/login');
		}

		const user = event.locals.user;

		// Pengecekan Akses Organisasi:
		// - superadmin bisa mengakses organisasi apa pun
		// - Organisasi dengan parentId === null (Pusat) bisa mengakses organisasi apa pun
		// - Organisasi daerah/jajaran hanya bisa mengakses organisasinya sendiri (slug harus cocok)
		if (user.role !== 'superadmin' && user.organization) {
			const isCentralOrg = user.organization.parentId === null;
			if (!isCentralOrg && user.organization.slug !== orgSlug) {
				throw error(403, 'Forbidden: Anda tidak memiliki izin untuk mengakses organisasi ini.');
			}
		}

		// Pengecekan Operator: hanya bisa membuat mutasi inventaris dan pergerakan
		const isOperator = ['operatorPusatDanDaerah', 'operatorBinmatDanBekharrah'].includes(user.role);
		const isWriteRequest = ['POST', 'PUT', 'PATCH', 'DELETE'].includes(event.request.method);

		if (isOperator && isWriteRequest) {
			const path = event.url.pathname;
			
			// Cek apakah route ini diperbolehkan untuk mutasi/movement oleh operator
			// Route yang diperbolehkan:
			// - Mutasi alat: [org_slug]/alat/[type]/mutate/[id]
			// - Batch mutasi alat: [org_slug]/alat/batch-mutate
			// - Mutasi barang: [org_slug]/barang/mutate/[id]
			// - Batch mutasi barang: [org_slug]/barang/batch-mutate
			// - Distribusi (validate, ship, receive): [org_slug]/distribusi/[id]
			// - Profil / Logout
			const isAllowedOperatorWrite = 
				path.includes('/mutate/') || 
				path.includes('/batch-mutate') || 
				path.includes('/distribusi/') || 
				path.includes('/profil') || 
				path.includes('/logout') || 
				path.startsWith('/api/notifications');

			if (!isAllowedOperatorWrite) {
				throw error(403, 'Forbidden: Operator hanya diizinkan untuk membuat mutasi dan pergerakan inventaris');
			}
		}
	}

	return svelteKitHandler({ event, resolve, auth, building });
};

