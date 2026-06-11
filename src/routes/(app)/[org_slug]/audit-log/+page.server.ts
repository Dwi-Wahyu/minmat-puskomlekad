import { error } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';
import { getAuditLogData } from './audit-log.remote';

export const load: PageServerLoad = async ({ locals, url, fetch }) => {
	// 1. Otorisasi: Hanya superadmin yang bisa melihat audit log
	if (!locals.user || !['superadmin', 'kakomlek'].includes(locals.user.role)) {
		throw error(403, 'Forbidden: Akses khusus Superadmin');
	}

	const search = url.searchParams.get('search') || '';
	const startDate = url.searchParams.get('start_date') || '';
	const endDate = url.searchParams.get('end_date') || '';
	const page = parseInt(url.searchParams.get('page') || '1');
	const limit = parseInt(url.searchParams.get('limit') || '10');

	return {
		filters: {
			search,
			startDate,
			endDate
		},
		lazy: {
			logsData: getAuditLogData({ search, start_date: startDate, end_date: endDate, page, limit })
		}
	};
};
