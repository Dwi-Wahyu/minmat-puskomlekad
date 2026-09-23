import { db } from '$lib/server/db';
import { session } from '$lib/server/db/schema';
import { eq } from 'drizzle-orm';
import { error, redirect, fail } from '@sveltejs/kit';
import { auth } from '$lib/server/auth';
import type { PageServerLoad, Actions } from './$types';

export const load: PageServerLoad = async ({ locals, params }) => {
	const currentUser = locals.user;
	const { userId, org_slug } = params;

	if (!currentUser) throw redirect(302, '/');

	const isSuperAdmin = currentUser.role === 'superadmin';
	const userOrgId = currentUser.organization?.id;

	// Ambil data member user ini beserta organisasinya
	const memberData = await db.query.member.findFirst({
		where: (member, { eq }) => eq(member.userId, userId),
		with: {
			user: true,
			organization: true
		}
	});

	// Jika bukan Superadmin, cegah akses ke pengguna dari kesatuan/organisasi lain
	if (!isSuperAdmin) {
		if (!memberData || memberData.organizationId !== userOrgId) {
			throw error(403, 'Anda tidak memiliki akses ke pengguna dari kesatuan lain.');
		}
	}

	let targetUser = memberData?.user || null;

	if (!targetUser) {
		targetUser =
			(await db.query.user.findFirst({
				where: (u, { eq }) => eq(u.id, userId)
			})) || null;
	}

	if (!targetUser) {
		throw error(404, 'Pengguna tidak ditemukan.');
	}

	// Ambil sesi aktif untuk user ini
	const activeSessions = await db.query.session.findMany({
		where: (session, { eq }) => eq(session.userId, userId),
		orderBy: (session, { desc }) => [desc(session.createdAt)]
	});

	// Ambil riwayat login dari audit_log
	const loginHistory = await db.query.auditLog.findMany({
		where: (auditLog, { and, eq }) =>
			and(eq(auditLog.userId, userId), eq(auditLog.action, 'LOGIN')),
		orderBy: (auditLog, { desc }) => [desc(auditLog.createdAt)],
		limit: 20
	});

	return {
		targetUser,
		targetMember: memberData || {
			id: '',
			role: 'user',
			organizationId: '',
			userId: targetUser.id,
			warehouseHeadType: null,
			createdAt: new Date(),
			organization: null
		},
		sessions: activeSessions,
		loginHistory: loginHistory.map((log) => ({
			...log,
			data: log.newValue ? JSON.parse(log.newValue) : {}
		})),
		isSuperAdmin,
		orgSlug: org_slug
	};
};

export const actions: Actions = {
	revokeSession: async ({ request, locals }) => {
		const currentUser = locals.user;
		if (!currentUser) return fail(401, { message: 'Unauthorized' });

		const formData = await request.formData();
		const token = formData.get('token')?.toString();

		if (!token) return fail(400, { message: 'Token tidak ditemukan' });

		try {
			// Hapus sesi langsung dari database menggunakan token
			await db.delete(session).where(eq(session.token, token));

			// Jika admin menghapus sesinya sendiri, arahkan ke login
			if (token === locals.session?.token) {
				throw redirect(302, '/');
			}

			return { success: true, message: 'Sesi berhasil dihapus' };
		} catch (err) {
			if (err instanceof Error && 'status' in err && err.status === 302) throw err;
			console.error('Error revoking session:', err);
			return fail(500, { message: 'Gagal menghapus sesi' });
		}
	},

	changePassword: async ({ request, locals }) => {
		const currentUser = locals.user;
		if (!currentUser) return fail(401, { message: 'Unauthorized' });

		const formData = await request.formData();
		const currentPassword = formData.get('currentPassword')?.toString();
		const newPassword = formData.get('newPassword')?.toString();
		const confirmPassword = formData.get('confirmPassword')?.toString();

		if (!currentPassword || currentPassword.length < 3) {
			return fail(400, { message: 'Password minimal 3 karakter' });
		}

		if (!newPassword || newPassword.length < 3) {
			return fail(400, { message: 'Password minimal 3 karakter' });
		}

		if (newPassword !== confirmPassword) {
			return fail(400, { message: 'Konfirmasi password tidak cocok' });
		}
		try {
			await auth.api.changePassword({
				body: {
					currentPassword,
					newPassword
				},
				headers: request.headers
			});

			return { success: true, message: 'Password berhasil diubah' };
		} catch (err) {
			console.error(err);
			return fail(500, { message: 'Gagal mengubah password' });
		}
	}
};
