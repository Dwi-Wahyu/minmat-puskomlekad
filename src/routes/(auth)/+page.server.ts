import { fail, redirect } from '@sveltejs/kit';
import { auth } from '$lib/server/auth';
import { APIError } from 'better-auth/api';
import type { Actions, PageServerLoad } from './$types';
import { db } from '$lib/server/db';
import { superValidate, message } from 'sveltekit-superforms';
import { yup } from 'sveltekit-superforms/adapters';
import { loginSchema } from '$lib/schemas/login-schema';

export const load: PageServerLoad = async ({ locals }) => {
	if (locals.user && locals.user.organization?.slug) {
		return redirect(302, `/${locals.user.organization.slug}/dashboard`);
	}

	const form = await superValidate(yup(loginSchema));

	return { user: locals.user, form };
};

export const actions: Actions = {
	signIn: async ({ request }) => {
		const form = await superValidate(request, yup(loginSchema));

		if (!form.valid) {
			return fail(400, { form });
		}

		const username = form.data.username;
		const password = form.data.password;

		try {
			await auth.api.signInUsername({
				body: {
					username,
					password
				}
			});
		} catch (error) {
			console.error('SignIn Error:', error);

			if (error instanceof APIError) {
				let msg = error.message;
				if (msg === 'Invalid username or password') {
					msg = 'Username atau password salah';
				}
				return message(form, msg, { status: 400 });
			}

			return message(form, 'Terjadi kesalahan sistem', { status: 500 });
		}

		const userResult = await db.query.user.findFirst({
			where: (user, { eq }) => eq(user.username, username),
			with: {
				members: {
					with: {
						organization: true
					}
				}
			}
		});

		if (!userResult || userResult.members.length === 0) {
			return message(form, 'User tidak ditemukan atau tidak memiliki organisasi', { status: 400 });
		}

		const orgSlug = userResult.members[0].organization?.slug;
		if (!orgSlug) {
			return message(form, 'Organisasi user tidak valid', { status: 400 });
		}

		return redirect(302, `/${orgSlug}/dashboard`);
	}
};
