<script>
	import { resolve } from '$app/paths';

	const { data } = $props();

	console.log(data.user);
</script>

<h1>hals</h1>

<a href={resolve('/logout')}> Sign out </a>
