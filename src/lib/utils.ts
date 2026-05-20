import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
	return twMerge(clsx(inputs));
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type WithoutChild<T> = T extends { child?: any } ? Omit<T, "child"> : T;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type WithoutChildren<T> = T extends { children?: any } ? Omit<T, "children"> : T;
export type WithoutChildrenOrChild<T> = WithoutChildren<WithoutChild<T>>;
export type WithElementRef<T, U extends HTMLElement = HTMLElement> = T & { ref?: U | null };

export const equipmentStatusLabels: Record<string, string> = {
	READY: 'Ready',
	IN_USE: 'Sedang Digunakan',
	TRANSIT: 'Transit',
	MAINTENANCE: 'Maintenance'
};

export const equipmentStatusColors: Record<string, string> = {
	READY: 'bg-blue-100 text-blue-700',
	IN_USE: 'bg-purple-100 text-purple-700',
	TRANSIT: 'bg-orange-100 text-orange-700',
	MAINTENANCE: 'bg-red-100 text-red-700'
};
