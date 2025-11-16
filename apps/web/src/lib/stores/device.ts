import { writable } from 'svelte/store';

const DEVICE_STORAGE_KEY = 'gsci-device-id';

function generateDeviceId() {
	if (crypto.randomUUID) {
		return crypto.randomUUID();
	}
	return Math.random().toString(36).slice(2) + Date.now().toString(36);
}

function initDeviceId() {
	if (typeof localStorage === 'undefined') {
		return generateDeviceId();
	}
	const existing = localStorage.getItem(DEVICE_STORAGE_KEY);
	if (existing) {
		return existing;
	}
	const id = generateDeviceId();
	localStorage.setItem(DEVICE_STORAGE_KEY, id);
	return id;
}

const initialId = typeof window !== 'undefined' ? initDeviceId() : 'server-device-id';

export const deviceIdStore = writable(initialId);

deviceIdStore.subscribe((value) => {
	if (typeof localStorage === 'undefined') return;
	localStorage.setItem(DEVICE_STORAGE_KEY, value);
});

