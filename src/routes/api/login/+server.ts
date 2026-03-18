import { auth } from '$lib/server/auth';
import { db } from '$lib/server/db';
import { json, error } from '@sveltejs/kit';

export async function POST({ request }) {
	const { email, password, keyName } = await request.json();

	// Verifikasi Email & Password menggunakan internal API Better Auth
	const loginResponse = await auth.api.signInEmail({
		body: {
			email,
			password
		}
	});

	if (!loginResponse || !loginResponse.user) {
		throw error(401, 'Email atau password salah');
	}

	const user = loginResponse.user;

	// Buat API Key secara manual untuk user ini
	// Kita gunakan server-side method karena kita ingin token langsung jadi
	// const newKey = await auth.api.createApiKey({
	// 	body: {
	// 		userId: user.id, // Kaitkan dengan user yang baru login
	// 		name: keyName || `Login Token - ${new Date().toLocaleDateString()}`,
	// 		expiresIn: 60 * 60 * 24 * 7 // Berlaku 7 hari
	// 	}
	// });

	const newKey = { key: '' };

	// Ambil data tambahan (Member & Organization) menggunakan Drizzle
	// Agar response lengkap dengan role dan instansi user
	const userDetails = await db.query.user.findFirst({
		where: (u, { eq }) => eq(u.id, user.id),
		with: {
			members: {
				with: {
					organization: true
				}
			}
		}
	});

	// Return Data Gabungan
	return json({
		message: 'Login Berhasil',
		token: newKey.key, // Ini adalah string 'sk_...' yang harus disimpan di Mobile/Client
		user: {
			...user,
			memberships: userDetails?.members || []
		}
	});
}
