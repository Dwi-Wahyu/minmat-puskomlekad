export const load = async ({ locals }) => {
	return {
		user: locals.user,
		org_slug: locals.user?.organization?.slug
	};
};
