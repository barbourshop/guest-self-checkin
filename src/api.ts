import { APICustomer } from './types';

const API_BASE_URL = 'http://localhost:3000';

export async function searchCustomers(type: 'email' | 'phone', query: string): Promise<APICustomer[]> {
  try {
    const endpoint = type === 'email' ? 'search-customers-email' : 'search-customers-phone';
    const queryParam = type === 'email' ? 'email' : 'phone';

    const response = await fetch(
      `${API_BASE_URL}/${endpoint}`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          [queryParam]: query
        })
      }
    );
    
    if (!response.ok) {
      throw new Error('Search failed');
    }

    return response.json();
  } catch (error) {
    console.error('Search error:', error);
    throw error;
  }
}