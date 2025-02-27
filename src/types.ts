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
  custom_attributes?: {
    [key: string]: {
      value: string | number | boolean;
    };
  };
}

export interface APIOrder {
  id: string;
  line_items?: Array<{
    catalog_object_id: string;
  }>;
}

export interface Customer {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  membershipType?: String;
  hasSignedWaiver?: boolean;
  lotNumber?: string;
}

export function adaptCustomer(data: any): Customer {
  return {
    id: data.id,
    firstName: data.given_name,
    lastName: data.family_name,
    email: data.email_address,
    phone: data.phone_number,
    membershipType: data.membershipStatus,
    hasSignedWaiver: false, // Default value until checked
    lotNumber: data.reference_id
  };
}