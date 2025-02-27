import { APICustomer } from './types';

const API_BASE_URL = 'http://localhost:3000/api';

/**
 * Searches for customers by email or phone.
 * 
 * @param {('email' | 'phone')} type - The type of search, either 'email' or 'phone'.
 * @param {string} query - The search query, either an email address or phone number.
 * @returns {Promise<APICustomer[]>} - A promise that resolves to an array of APICustomer objects.
 * @throws Will throw an error if the search fails.
 */
// api.ts
type SearchType = 'email' | 'phone' | 'lot';

export async function searchCustomers(type: SearchType, value: string) {
  const endpoint = `${API_BASE_URL}/customers/search/${type}`;
  const payload = type === 'email' 
    ? { email: value } 
    : type === 'phone' 
      ? { phone: value }
      : { lot: value };
      
  const response = await fetch(endpoint, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || 'Failed to search customers');
  }

  return response.json();
}

export async function checkWaiverStatus(customerId: string): Promise<boolean> {
  try {
    const response = await fetch(
      `${API_BASE_URL}/waivers/check-waiver/${customerId}`,
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

export const signWaiver = (customerId: string): void => {
  fetch(`${API_BASE_URL}/waivers/set-waiver/${customerId}`, {
    method: 'POST',
  })
  .catch(error => console.error('Error signing waiver:', error));
};