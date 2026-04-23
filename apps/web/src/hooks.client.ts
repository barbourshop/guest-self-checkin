import { browser } from '$app/environment';

/**
 * Wrap fetch to log failed /api calls (Electron + browser). Logs go to DevTools console;
 * on Electron, enable with ELECTRON_OPEN_DEVTOOLS=1 or Cmd+Option+I. Helps distinguish
 * "never reached server" vs "server returned error".
 */
if (browser && typeof window !== 'undefined') {
	const w = window as Window & { __FRONT_DESK_FETCH_PATCHED__?: boolean };
	if (!w.__FRONT_DESK_FETCH_PATCHED__) {
		w.__FRONT_DESK_FETCH_PATCHED__ = true;
		const nativeFetch = window.fetch.bind(window);

		function resolveUrl(input: RequestInfo | URL): string {
			try {
				if (typeof input === 'string') return new URL(input, window.location.href).href;
				if (input instanceof URL) return input.href;
				return input.url;
			} catch {
				return String(input);
			}
		}

		window.fetch = async (input: RequestInfo | URL, init?: RequestInit) => {
			const resolved = resolveUrl(input);
			const method = (init?.method || (typeof input === 'object' && !(input instanceof URL) && 'method' in input && input.method) || 'GET') as string;
			const isApi = resolved.includes('/api/');
			const verbose =
				typeof localStorage !== 'undefined' && localStorage.getItem('DEBUG_FETCH') === '1';

			try {
				const res = await nativeFetch(input, init);
				if (verbose && isApi) {
					console.info('[fetch]', method, resolved, res.status);
				}
				return res;
			} catch (e) {
				const err = e instanceof Error ? e : new Error(String(e));
				if (isApi) {
					console.error('[fetch failed]', {
						method,
						url: resolved,
						location: window.location.href,
						message: err.message,
						name: err.name,
						electron: typeof navigator !== 'undefined' && navigator.userAgent.includes('Electron')
					});
				}
				throw e;
			}
		};
	}
}
