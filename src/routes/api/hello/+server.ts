import { json } from '@sveltejs/kit';

export async function GET({ url }: any) {
	const name = url.searchParams.get('name') || 'World';
	return json({ message: `Hello, ${name}!` });
}
