import { mockCustomers, mockWaiverStatus, mockDelays } from './mocks/mockData';

const API_BASE_URL = 'http://localhost:3000/api';

// Pull from environment variable with fallback to false
export const USE_MOCK_API = import.meta.env.VITE_USE_MOCK_API === 'true';

/**
 * Search for customers by email, phone, or lot number
 * @param {string} type - Search type (email, phone, lot)
 * @param {string} query - Search query
 * @returns {Promise<Array<any>>} Array of customer objects
 */
export async function searchCustomers(type: 'email' | 'phone' | 'lot', query: string): Promise<any[]> {
  if (USE_MOCK_API) {
    // Simulate network delay
    await new Promise(resolve => setTimeout(resolve, mockDelays.search));
    return mockCustomers;
  }

  try {
    const response = await fetch(`${API_BASE_URL}/customers/search/${type}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ [type]: query }),
    });

    if (!response.ok) {
      throw new Error('Failed to search customers');
    }

    return await response.json();
  } catch (error) {
    console.error('Error searching customers:', error);
    throw error;
  }
}

/**
 * Check if a customer has signed the waiver
 * @param {string} customerId - Customer ID
 * @returns {Promise<boolean>} True if waiver is signed
 */
export async function checkWaiverStatus(customerId: string): Promise<boolean> {
  if (USE_MOCK_API) {
    // Simulate network delay
    await new Promise(resolve => setTimeout(resolve, mockDelays.waiverCheck));
    return mockWaiverStatus[customerId] || false;
  }

  try {
    const response = await fetch(`${API_BASE_URL}/waivers/check-waiver/${customerId}`);

    if (!response.ok) {
      throw new Error('Failed to check waiver status');
    }

    const data = await response.json();
    return data.hasSignedWaiver;
  } catch (error) {
    console.error('Error checking waiver status:', error);
    return false;
  }
}

/**
 * Sign the waiver for a customer
 * @param {string} customerId - Customer ID
 * @returns {Promise<boolean>} True if successful
 */
export async function signWaiver(customerId: string): Promise<boolean> {
  if (USE_MOCK_API) {
    // Simulate network delay
    await new Promise(resolve => setTimeout(resolve, mockDelays.waiverSign));
    mockWaiverStatus[customerId] = true;
    return true;
  }

  try {
    const response = await fetch(`${API_BASE_URL}/waivers/set-waiver/${customerId}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error('Failed to sign waiver');
    }

    return true;
  } catch (error) {
    console.error('Error signing waiver:', error);
    return false;
  }
}

/**
 * Log a customer check-in
 * @param {string} customerId - Customer ID
 * @param {number} guestCount - Number of guests
 * @param {string} firstName - Customer first name
 * @param {string} lastName - Customer last name
 * @param {string} lotNumber - Lot number
 * @returns {Promise<boolean>} True if successful
 */
export async function logCheckIn(
  customerId: string,
  guestCount: number,
  firstName: string,
  lastName: string,
  lotNumber?: string
): Promise<boolean> {
  if (USE_MOCK_API) {
    // Simulate network delay
    await new Promise(resolve => setTimeout(resolve, 300));
    return true;
  }

  try {
    const response = await fetch(`${API_BASE_URL}/customers/check-in`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        customerId,
        guestCount,
        firstName,
        lastName,
        lotNumber,
      }),
    });

    if (!response.ok) {
      throw new Error('Failed to log check-in');
    }

    return true;
  } catch (error) {
    console.error('Error logging check-in:', error);
    return false;
  }
}