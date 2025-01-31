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

export interface Customer {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  membershipType?: string;
}

export function adaptCustomer(apiCustomer: APICustomer): Customer {
  return {
    id: apiCustomer.id,
    firstName: apiCustomer.given_name,
    lastName: apiCustomer.family_name,
    email: apiCustomer.email_address,
    phone: apiCustomer.phone_number,
    membershipType: 'Member' // Default value
  };
}