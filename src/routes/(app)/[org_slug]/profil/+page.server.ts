import { db } from '$lib/server/db';
import { session, auditLog, account } from '$lib/server/db/schema';
import { eq, and, desc, count } from 'drizzle-orm';
import { error, redirect, fail } from '@sveltejs/kit';
import { auth } from '$lib/server/auth';
import type { PageServerLoad, Actions } from './$types';
import { verifyPassword } from 'better-auth/crypto';

export const load: PageServerLoad = async ({ locals, params, url }) => {
	const currentUser = locals.user;
	const { org_slug } = params;

	if (!currentUser) throw redirect(302, '/');

	const userId = currentUser.id;

	// Check if using default password (role in lowercase)
	const acc = await db.query.account.findFirst({
		where: and(eq(account.userId, userId), eq(account.providerId, 'credential'))
	});

	let isDefaultPassword = false;
	if (acc?.password && currentUser.role) {
		const usernameMapping: Record<string, string> = {
			operatorPusatDanDaerah: 'operatorpd',
			operatorBinmatDanBekharrah: 'operatorbb'
		};
		const defaultPassStr = usernameMapping[currentUser.role] || currentUser.role;
		isDefaultPassword = await verifyPassword({ hash: acc.password, password: defaultPassStr });
	}

	// Pagination setup
	const sessionPage = Number(url.searchParams.get('session_page')) || 1;
	const historyPage = Number(url.searchParams.get('history_page')) || 1;
	const limit = 5;

	const sessionOffset = (sessionPage - 1) * limit;
	const historyOffset = (historyPage - 1) * limit;

	// Total counts for pagination
	const [{ count: totalSessions }] = await db
		.select({ count: count() })
		.from(session)
		.where(eq(session.userId, userId));

	const [{ count: totalHistory }] = await db
		.select({ count: count() })
		.from(auditLog)
		.where(and(eq(auditLog.userId, userId), eq(auditLog.action, 'LOGIN')));

	// Ambil sesi aktif untuk user ini (Paginated)
	const activeSessions = await db.query.session.findMany({
		where: eq(session.userId, userId),
		orderBy: [desc(session.createdAt)],
		limit,
		offset: sessionOffset
	});

	// Ambil riwayat login dari audit_log (Paginated)
	const loginHistory = await db.query.auditLog.findMany({
		where: and(eq(auditLog.userId, userId), eq(auditLog.action, 'LOGIN')),
		orderBy: [desc(auditLog.createdAt)],
		limit,
		offset: historyOffset
	});

	return {
		isDefaultPassword,
		sessions: {
			data: activeSessions,
			pagination: {
				page: sessionPage,
				limit,
				total: Number(totalSessions),
				totalPages: Math.ceil(Number(totalSessions) / limit)
			}
		},
		loginHistory: {
			data: loginHistory.map((log) => ({
				...log,
				data: log.newValue ? JSON.parse(log.newValue) : {}
			})),
			pagination: {
				page: historyPage,
				limit,
				total: Number(totalHistory),
				totalPages: Math.ceil(Number(totalHistory) / limit)
			}
		},
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
			// Pastikan sesi yang dihapus adalah milik user tersebut
			const sess = await db.query.session.findFirst({
				where: and(eq(session.token, token), eq(session.userId, currentUser.id))
			});

			if (!sess) return fail(403, { message: 'Forbidden' });

			await db.delete(session).where(eq(session.token, token));

			// Jika user menghapus sesinya sendiri, arahkan ke login
			if (token === locals.session?.token) {
				throw redirect(302, '/');
			}

			return { success: true, message: 'Sesi berhasil dihapus' };
		} catch (err) {
			if (err instanceof Error && 'status' in err && (err.status === 302 || err.status === 303))
				throw err;
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
					newPassword,
					revokeOtherSessions: true
				},
				headers: request.headers
			});

			return { success: true, message: 'Password berhasil diubah. Sesi lain telah dihapus.' };
		} catch (err: any) {
			console.error(err);
			return fail(400, { message: err.message || 'Gagal mengubah password' });
		}
	}
};
