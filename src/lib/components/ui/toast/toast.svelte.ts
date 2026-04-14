import { type Component } from 'svelte';

export type ToastType = 'success' | 'error' | 'info' | 'warning';

export interface Toast {
	id: string;
	title: string;
	description?: string;
	type: ToastType;
	duration?: number;
}

class ToastState {
	toasts = $state<Toast[]>([]);

	add(toast: Omit<Toast, 'id'>) {
		const id = Math.random().toString(36).substring(2, 9);
		const newToast = { ...toast, id };
		this.toasts.push(newToast);

		if (toast.duration !== 0) {
			setTimeout(() => {
				this.remove(id);
			}, toast.duration || 5000);
		}

		return id;
	}

	remove(id: string) {
		this.toasts = this.toasts.filter((t) => t.id !== id);
	}

	success(title: string, description?: string, duration?: number) {
		return this.add({ title, description, type: 'success', duration });
	}

	error(title: string, description?: string, duration?: number) {
		return this.add({ title, description, type: 'error', duration });
	}

	info(title: string, description?: string, duration?: number) {
		return this.add({ title, description, type: 'info', duration });
	}

	warning(title: string, description?: string, duration?: number) {
		return this.add({ title, description, type: 'warning', duration });
	}
}

export const toast = new ToastState();
