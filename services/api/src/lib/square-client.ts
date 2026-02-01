import type { SearchRequest } from './types.js';

export type SquareClientConfig = {
  accessToken: string;
  apiBaseUrl: string;
  apiVersion: string;
};

/**
 * Normalize phone number to E164 format for Square API
 * Square requires E164 format: +[country code][number] (e.g., +12095551234)
 */
function normalizePhoneNumber(phone: string): string {
  // Remove all non-digit characters except +
  let normalized = phone.replace(/[^\d+]/g, '');

  // If it doesn't start with +, add +1 for US/Canada (default)
  if (!normalized.startsWith('+')) {
    // If it starts with 1 and has 11 digits, add +
    if (normalized.startsWith('1') && normalized.length === 11) {
      normalized = '+' + normalized;
    } else if (normalized.length === 10) {
      // US/Canada number without country code
      normalized = '+1' + normalized;
    } else {
      // Assume US/Canada default
      normalized = '+1' + normalized;
    }
  }

  return normalized;
}

type SquareCustomer = {
  id: string;
  given_name?: string;
  family_name?: string;
  email_address?: string;
  phone_number?: string;
  reference_id?: string;
  segment_ids?: string[];
};

export type SquareOrder = {
  id: string;
  location_id: string;
  state?: string;
  created_at?: string;
  total_money?: { amount?: number; currency?: string };
  line_items?: Array<{
    uid?: string;
    catalog_object_id?: string;
    name?: string;
    quantity?: string;
    gross_sales_money?: { amount?: number; currency?: string };
    total_money?: { amount?: number; currency?: string };
    variation_name?: string;
  }>;
};

export type SquareOrdersSearchResponse = {
  orders?: SquareOrder[];
  cursor?: string;
};

export class SquareClient {
  #config: SquareClientConfig;

  constructor(config: SquareClientConfig) {
    this.#config = config;
  }

  #headers() {
    return {
      Authorization: `Bearer ${this.#config.accessToken}`,
      'Content-Type': 'application/json',
      'Square-Version': this.#config.apiVersion
    };
  }

  /**
   * Check the token status and permissions (scopes) from Square OAuth API
   * This helps debug permission issues
   */
  async checkTokenStatus(): Promise<{ scopes?: string[]; merchantId?: string; expiresAt?: string }> {
    const response = await fetch(`${this.#config.apiBaseUrl}/oauth2/token-status`, {
      method: 'GET',
      headers: this.#headers()
    });

    if (!response.ok) {
      const errorBody = await response.text();
      throw new Error(`Token status check failed: ${response.status} ${errorBody}`);
    }

    const data = (await response.json()) as { 
      scopes?: string[];
      merchant_id?: string;
      expires_at?: string;
    };
    
    return {
      scopes: data.scopes,
      merchantId: data.merchant_id,
      expiresAt: data.expires_at
    };
  }

  async searchCustomers(input: SearchRequest['query']): Promise<SquareCustomer[]> {
    const filterKey =
      input.type === 'phone'
        ? 'phone_number'
        : input.type === 'email'
          ? 'email_address'
          : 'reference_id';

    // Normalize phone numbers to E164 format for Square API
    const searchValue = input.type === 'phone' ? normalizePhoneNumber(input.value) : input.value;

    const requestBody = {
      query: {
        filter: {
          [filterKey]: {
            [input.fuzzy ? 'fuzzy' : 'exact']: searchValue
          }
        }
      },
      limit: 5
    };

    const url = `${this.#config.apiBaseUrl}/customers/search`;
    const headers = this.#headers();
    
    // Log request details (without exposing full token)
    console.log(`Square API Request:`, {
      method: 'POST',
      url,
      apiVersion: this.#config.apiVersion,
      filterType: input.type,
      filterKey,
      originalValue: input.value,
      normalizedValue: searchValue,
      fuzzy: input.fuzzy,
      tokenPreview: `${headers.Authorization?.substring(0, 20)}...`,
      requestBody: JSON.stringify(requestBody)
    });

    const response = await fetch(url, {
      method: 'POST',
      headers,
      body: JSON.stringify(requestBody)
    });

    if (!response.ok) {
      const errorBody = await response.text();
      console.error(`Square customers search failed: ${response.status}`, {
        status: response.status,
        statusText: response.statusText,
        headers: Object.fromEntries(response.headers.entries()),
        body: errorBody,
        url,
        apiVersion: this.#config.apiVersion
      });
      throw new Error(`Square search failed: ${response.status} ${errorBody}`);
    }

    const data = (await response.json()) as { customers?: SquareCustomer[] };
    return data.customers ?? [];
  }

  async getOrder(orderId: string): Promise<SquareOrder> {
    const response = await fetch(`${this.#config.apiBaseUrl}/orders/${orderId}`, {
      method: 'GET',
      headers: this.#headers()
    });

    if (!response.ok) {
      const errorBody = await response.text();
      throw new Error(`Square order fetch failed: ${response.status} ${errorBody}`);
    }

    const data = (await response.json()) as { order: SquareOrder };
    if (!data.order) {
      throw new Error('Square order response missing order');
    }
    return data.order;
  }

  async searchOrders(customerIds: string[], locationIds: string[]): Promise<SquareOrder[]> {
    const response = await fetch(`${this.#config.apiBaseUrl}/orders/search`, {
      method: 'POST',
      headers: this.#headers(),
      body: JSON.stringify({
        query: {
          filter: {
            customer_filter: {
              customer_ids: customerIds
            }
          }
        },
        location_ids: locationIds
      })
    });

    if (!response.ok) {
      const errorBody = await response.text();
      throw new Error(`Square orders search failed: ${response.status} ${errorBody}`);
    }

    const data = (await response.json()) as SquareOrdersSearchResponse;
    const orders = data.orders ?? [];
    console.log(`Square searchOrders returned ${orders.length} orders for ${customerIds.length} customer(s)`);
    if (orders.length > 0) {
      console.log(`First order ID: ${orders[0].id}, has ${orders[0].line_items?.length ?? 0} line items`);
    }
    return orders;
  }
}

