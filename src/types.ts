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
  membershipType?: string;
  hasSignedWaiver?: boolean;
}

export function adaptCustomer(data: any): Customer {
  return {
    id: data.id,
    firstName: data.given_name,
    lastName: data.family_name,
    email: data.email_address,
    phone: data.phone_number,
    membershipType: data.membershipType,
    hasSignedWaiver: false // Default value until checked
  };
}