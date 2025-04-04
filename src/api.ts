import { mockCustomers, mockWaiverStatus, mockDelays } from './mocks/mockData';

const API_BASE_URL = 'http://localhost:3000/api';

// Pull from environment variable with fallback to false
export const USE_MOCK_API = import.meta.env.VITE_USE_MOCK_API === 'true';

/**
 * Searches for customers by email, phone, or lot.
 * 
 * @param {('email' | 'phone' | 'lot')} type - The type of search
 * @param {string} query - The search query
 * @returns {Promise<APICustomer[]>} - A promise that resolves to an array of APICustomer objects.
 * @throws Will throw an error if the search fails.
 */
export async function searchCustomers(type: 'email' | 'phone' | 'lot', value: string) {
  if (USE_MOCK_API) {
    // Simulate network delay
    await new Promise(resolve => setTimeout(resolve, mockDelays.search));
    
    // Mock search implementation
    const normalizedValue = value.toLowerCase();
    const results = mockCustomers.filter(customer => {
      if (type === 'email') return customer.email_address.toLowerCase().includes(normalizedValue);
      if (type === 'phone') return customer.phone_number.replace(/\D/g, '').includes(normalizedValue.replace(/\D/g, ''));
      if (type === 'lot') return customer.reference_id.toLowerCase().includes(normalizedValue);
      return false;
    });

    return results;
  }
  
  // Original implementation for real API
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
  if (USE_MOCK_API) {
    // Simulate network delay
    await new Promise(resolve => setTimeout(resolve, mockDelays.waiverCheck));
    
    // Return mock waiver status or default to false if not found
    return mockWaiverStatus[customerId] || false;
  }
  
  // Original implementation for real API
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

export const signWaiver = async (customerId: string): Promise<boolean> => {
  if (USE_MOCK_API) {
    // Simulate network delay
    await new Promise(resolve => setTimeout(resolve, mockDelays.waiverSign));
    
    // Update mock waiver status
    mockWaiverStatus[customerId] = true;
    console.log(`Mock waiver signed for customer ${customerId}`);
    return true;
  }
  
  // Original implementation for real API
  const response = await fetch(`${API_BASE_URL}/waivers/set-waiver/${customerId}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    }
  });

  if (!response.ok) {
    throw new Error('Failed to sign waiver');
  }

  return true;
};