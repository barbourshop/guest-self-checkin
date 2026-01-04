import { mockCustomers, mockDelays } from './mocks/mockData';

const API_BASE_URL = 'http://localhost:3000/api';

// Pull from environment variable with fallback to false
export const USE_MOCK_API = import.meta.env.VITE_USE_MOCK_API === 'true';

/**
 * Unified search - auto-detects search type
 * @param {string} query - Search query
 * @returns {Promise<{type: string, results: Array<any>}>} Search results
 */
export async function unifiedSearch(query: string): Promise<{type: string, results: any[]}> {
  // Always call backend API - backend handles mock vs real data
  try {
    const response = await fetch(`${API_BASE_URL}/customers/search`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ query, isQRMode: false }),
    });

    if (!response.ok) {
      throw new Error('Failed to search');
    }

    return await response.json();
  } catch (error) {
    console.error('Error in unified search:', error);
    throw error;
  }
}

/**
 * Validate QR code (order ID)
 * @param {string} orderId - Order ID from QR code
 * @returns {Promise<{valid: boolean, order?: any, customerId?: string, hasMembership?: boolean, reason?: string}>}
 */
export async function validateQRCode(orderId: string): Promise<{valid: boolean, order?: any, customerId?: string, hasMembership?: boolean, reason?: string}> {
  if (USE_MOCK_API) {
    // Simulate network delay
    await new Promise(resolve => setTimeout(resolve, mockDelays.search));
    
    // Mock: accept any order ID that looks valid
    const isValid = /^[A-Z0-9]{10,}$/i.test(orderId);
    return {
      valid: isValid,
      order: isValid ? { id: orderId } : undefined,
      customerId: isValid ? 'MOCK_CUSTOMER_1' : undefined,
      hasMembership: isValid,
      reason: isValid ? undefined : 'Invalid QR code'
    };
  }

  try {
    const response = await fetch(`${API_BASE_URL}/customers/validate-qr`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ orderId }),
    });

    if (!response.ok) {
      throw new Error('Failed to validate QR code');
    }

    return await response.json();
  } catch (error) {
    console.error('Error validating QR code:', error);
    return {
      valid: false,
      reason: 'An issue with check-in, please see the manager on duty'
    };
  }
}

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
    
    // Filter customers based on search type and query
    return mockCustomers.filter(customer => {
      const searchValue = type === 'email' ? customer.email_address :
                         type === 'phone' ? customer.phone_number :
                         customer.reference_id;
      
      // For phone numbers, use exact matching
      if (type === 'phone') {
        return searchValue === query;
      }
      
      // For other types, use partial matching
      return searchValue.toLowerCase().includes(query.toLowerCase());
    });
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
 * Log a customer check-in
 * Supports both manual check-in (customerId) and QR code check-in (orderId)
 * @param {string} customerId - Customer ID (for manual check-in)
 * @param {number} guestCount - Number of guests
 * @param {string} firstName - Customer first name
 * @param {string} lastName - Customer last name
 * @param {string} lotNumber - Lot number
 * @param {string} orderId - Order ID (for QR code check-in)
 * @returns {Promise<{success: boolean, queued?: boolean, message?: string}>} Result object
 */
export async function logCheckIn(
  customerId: string,
  guestCount: number,
  firstName: string,
  lastName: string,
  lotNumber?: string,
  orderId?: string
): Promise<{success: boolean, queued?: boolean, message?: string}> {
  // Always call backend - backend handles mock vs real Square service
  // USE_MOCK_API should not bypass backend for check-ins (unlike search which can use local mock data)

  try {
    const requestBody = {
      customerId,
      orderId,
      guestCount,
      firstName,
      lastName,
      lotNumber,
    };
    
    // #region agent log
    fetch('http://127.0.0.1:7242/ingest/acecdc2a-4ddf-494f-864e-6a97e8023377',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'api.ts:logCheckIn:before-fetch',message:'About to send check-in request',data:{requestBody,url:`${API_BASE_URL}/customers/check-in`},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'J'})}).catch(()=>{});
    // #endregion
    
    const response = await fetch(`${API_BASE_URL}/customers/check-in`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(requestBody),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error || 'Failed to log check-in');
    }

    const data = await response.json();
    return {
      success: data.success || true,
      queued: data.queued || false,
      message: data.message
    };
  } catch (error) {
    console.error('Error logging check-in:', error);
    return {
      success: false,
      message: error instanceof Error ? error.message : 'An issue with check-in, please see the manager on duty'
    };
  }
}

/**
 * Fetch all customer data for local search
 * @returns {Promise<Array<{id: string, given_name: string, family_name: string, email_address: string, phone_number: string, reference_id: string, segment_ids: string[] }>>}
 */
export async function fetchCustomerNames(): Promise<Array<{id: string, given_name: string, family_name: string, email_address: string, phone_number: string, reference_id: string, segment_ids: string[]}>> {
  if (USE_MOCK_API) {
    // Map mockCustomers to the expected structure
    const MEMBERSHIP_SEGMENT_ID = 'gv2:TVR6JXEM4N5XQ2XV51GBKFDN74';
    return mockCustomers.map(c => ({
      id: c.id,
      given_name: c.given_name,
      family_name: c.family_name,
      email_address: c.email_address,
      phone_number: c.phone_number,
      reference_id: c.reference_id,
      segment_ids: c.membershipType === 'Member' ? [MEMBERSHIP_SEGMENT_ID] : []
    }));
  }
  try {
    const response = await fetch(`${API_BASE_URL}/customers/names`);
    if (!response.ok) {
      throw new Error('Failed to fetch customer names');
    }
    return await response.json();
  } catch (error) {
    console.error('Error fetching customer names:', error);
    throw error;
  }
}

/**
 * Get database contents for admin view
 * @returns {Promise<{membershipCache: Array<any>, checkinQueue: Array<any>, checkinLog: Array<any>}>}
 */
export async function getDatabaseContents(): Promise<{membershipCache: any[], checkinQueue: any[], checkinLog: any[]}> {
  try {
    const response = await fetch(`${API_BASE_URL}/admin/database`);

    if (!response.ok) {
      throw new Error('Failed to fetch database contents');
    }

    return await response.json();
  } catch (error) {
    console.error('Error fetching database contents:', error);
    throw error;
  }
}