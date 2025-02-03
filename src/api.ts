import { APICustomer } from './types';

const API_BASE_URL = 'http://localhost:3000';

/**
 * Searches for customers by email or phone.
 * 
 * @param {('email' | 'phone')} type - The type of search, either 'email' or 'phone'.
 * @param {string} query - The search query, either an email address or phone number.
 * @returns {Promise<APICustomer[]>} - A promise that resolves to an array of APICustomer objects.
 * @throws Will throw an error if the search fails.
 */
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

export async function checkWaiverStatus(customerId: string): Promise<boolean> {
  try {
    const response = await fetch(
      `${API_BASE_URL}/check-waiver/${customerId}`,
      {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        }
      }
    );
    
    if (!response.ok) {
      throw new Error('Failed to check waiver status');
    }

    const data = await response.json();
    return data.hasSignedWaiver;
  } catch (error) {
    console.error('Waiver check error:', error);
    throw error;
  }
}