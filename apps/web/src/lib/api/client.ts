import { env } from '$env/dynamic/public';
import type { SearchRequestPayload, PassValidationPayload, PassValidationResponse, SearchResult, CustomerOrdersResponse } from '../types';

// Use relative paths for API calls (proxied by Vite to http://localhost:3000/api)
const API_BASE_URL = env.PUBLIC_API_BASE_URL ?? '/api';
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

export async function getCustomerOrders(customerId: string, catalogItemId?: string): Promise<CustomerOrdersResponse> {
	const params = new URLSearchParams();
	if (catalogItemId) {
		params.append('catalogItemId', catalogItemId);
	}
	const queryString = params.toString();
	const path = `/customers/${customerId}/orders${queryString ? `?${queryString}` : ''}`;
	return request<CustomerOrdersResponse>(path, {
		method: 'GET'
	});
}

/**
 * Get customer by ID and transform to SearchResult format
 * Uses the admin endpoint which returns raw customer data, then transforms it
 */
export async function getCustomerById(customerId: string): Promise<SearchResult | null> {
	try {
		// Get raw customer data from admin endpoint
		const customer = await request<any>(`/customers/admin/${customerId}`, {
			method: 'GET'
		});

		if (!customer || !customer.id) {
			return null;
		}

		// Transform Square customer format to SearchResult format
		const givenName = customer.given_name || '';
		const familyName = customer.family_name || '';
		const displayName = `${givenName} ${familyName}`.trim() || 'Unknown';

		return {
			customerId: customer.id,
			displayName,
			contact: {
				email: customer.email_address || undefined,
				phone: customer.phone_number || undefined,
				lotNumber: customer.reference_id || undefined
			},
			membership: {
				type: customer.membershipType || 'Non-Member',
				segmentId: '',
				lastVerifiedAt: new Date().toISOString()
			},
			customerHash: ''
		};
	} catch (error) {
		console.error('Error fetching customer by ID:', error);
		return null;
	}
}

