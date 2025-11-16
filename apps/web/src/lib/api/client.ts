import { env } from '$env/dynamic/public';
import type { SearchRequestPayload, PassValidationPayload, PassValidationResponse, SearchResult } from '../types';

const API_BASE_URL = env.PUBLIC_API_BASE_URL ?? 'http://localhost:3001/v1';
const API_KEY = env.PUBLIC_API_KEY;

async function request<T>(path: string, options: RequestInit): Promise<T> {
	const headers: Record<string, string> = {
		'content-type': 'application/json',
		...(options.headers ?? {})
	};

	// Add API key header if provided
	if (API_KEY) {
		headers['X-API-Key'] = API_KEY;
	}

	const res = await fetch(`${API_BASE_URL}${path}`, {
		...options,
		headers,
		body: options.body
	});

	if (!res.ok) {
		const error = await res.json().catch(() => ({}));
		throw new Error(error.error ?? `Request failed with ${res.status}`);
	}

	// Check if response has content
	const contentType = res.headers.get('content-type');
	if (!contentType || !contentType.includes('application/json')) {
		const text = await res.text();
		throw new Error(`Unexpected response format: ${text || 'empty response'}`);
	}

	return res.json();
}

export async function searchCustomers(payload: SearchRequestPayload): Promise<SearchResult[]> {
	const data = await request<{ results: SearchResult[] }>('/customers/search', {
		method: 'POST',
		body: JSON.stringify(payload)
	});
	return data.results;
}

export async function validatePass(payload: PassValidationPayload): Promise<PassValidationResponse> {
	return request<PassValidationResponse>('/passes/validate', {
		method: 'POST',
		body: JSON.stringify(payload)
	});
}

