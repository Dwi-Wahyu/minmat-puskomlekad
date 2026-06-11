import { query } from '$app/server';
import { db } from '$lib/server/db';
import { auditLog, user, type AuditLog } from '$lib/server/db/schema';
import { desc, eq, and, gte, lte, or, ilike } from 'drizzle-orm';
import { requireAuth } from '$lib/server/auth.utils';
import * as v from 'valibot';
import { error } from '@sveltejs/kit';

const auditLogSchema = v.object({
	search: v.optional(v.string(), ''),
	start_date: v.optional(v.string(), ''),
	end_date: v.optional(v.string(), '')
});

export type AuditLogListData = {
	logs: AuditLog[];
};

export const getAuditLogData = query(auditLogSchema, async (args): Promise<AuditLogListData> => {
	const { user: currentUser } = requireAuth();

	if (!['superadmin', 'kakomlek'].includes(currentUser.role)) {
		throw error(403, 'Forbidden: Akses khusus Superadmin');
	}

	const { search, start_date, end_date } = args;
	const filters = [];

	if (search) {
		filters.push(
			or(ilike(auditLog.action, `%${search}%`), ilike(auditLog.tableName, `%${search}%`))
		);
	}

	if (start_date) {
		filters.push(gte(auditLog.createdAt, new Date(start_date)));
	}

	if (end_date) {
		const end = new Date(end_date);
		end.setHours(23, 59, 59, 999);
		filters.push(lte(auditLog.createdAt, end));
	}

	const logs = await db
		.select({
			id: auditLog.id,
			action: auditLog.action,
			tableName: auditLog.tableName,
			recordId: auditLog.recordId,
			oldValue: auditLog.oldValue,
			newValue: auditLog.newValue,
			createdAt: auditLog.createdAt,
			userName: user.name,
			userEmail: user.email
		})
		.from(auditLog)
		.leftJoin(user, eq(auditLog.userId, user.id))
		.where(filters.length > 0 ? and(...filters) : undefined)
		.orderBy(desc(auditLog.createdAt))
		.limit(100);

	return { logs };
});
