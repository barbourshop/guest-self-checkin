export interface APICustomer {
  id: string;
  created_at: string;
  updated_at: string;
  given_name: string;
  family_name: string;
  email_address: string;
  phone_number: string;
  preferences: object;
  creation_source: string;
  version: number;
}

export interface APIOrder {
  id: string;
  line_items?: Array<{
    catalog_object_id: string;
  }>;
}

export interface APICustomerWithOrders extends APICustomer {
  orders?: APIOrder[];
  hasPoolPass?: boolean;
}

export interface Customer {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  membershipType: 'Member' | 'Non-Member';
  hasPoolPass: boolean;
  hasSignedWaiver: boolean; // Add this field
}

export function adaptCustomer(apiCustomer: APICustomerWithOrders): Customer {
  return {
    id: apiCustomer.id,
    firstName: apiCustomer.given_name,
    lastName: apiCustomer.family_name,
    email: apiCustomer.email_address,
    phone: apiCustomer.phone_number,
    membershipType: apiCustomer.hasPoolPass ? 'Member' : 'Non-Member',
    hasPoolPass: apiCustomer.hasPoolPass || false,
    hasSignedWaiver: false
  };
}