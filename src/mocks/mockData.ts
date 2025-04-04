// Mock customer data for demonstration purposes that matches your APICustomer format
export const mockCustomers = [
    {
      id: 'cust_001',
      created_at: '2023-05-15T14:32:00Z',
      updated_at: '2024-02-10T09:45:00Z',
      given_name: 'John',
      family_name: 'Doe',
      email_address: 'john.doe@example.com',
      phone_number: '5551234567',
      preferences: {},
      creation_source: 'THIRD_PARTY',
      version: 1,
      reference_id: 'A123',
      membershipStatus: 'Member',
      custom_attributes: {
        membership_status: {
          value: 'active'
        }
      }
    },
    {
      id: 'cust_002',
      created_at: '2023-06-20T09:45:00Z',
      updated_at: '2024-01-15T14:30:00Z',
      given_name: 'Jane',
      family_name: 'Smith',
      email_address: 'jane.smith@example.com',
      phone_number: '5559876543',
      preferences: {},
      creation_source: 'THIRD_PARTY',
      version: 1,
      reference_id: 'B456',
      membershipStatus: 'Member',
      custom_attributes: {
        membership_status: {
          value: 'active'
        }
      }
    },
    {
      id: 'cust_003',
      created_at: '2023-07-10T16:15:00Z',
      updated_at: '2023-12-05T11:20:00Z',
      given_name: 'Michael',
      family_name: 'Johnson',
      email_address: 'michael.j@example.com',
      phone_number: '5554567890',
      preferences: {},
      creation_source: 'THIRD_PARTY',
      version: 1,
      reference_id: 'C789',
      custom_attributes: {
        membership_status: {
          value: 'inactive'
        }
      }
    },
    {
      id: 'cust_004',
      created_at: '2023-08-05T13:10:00Z',
      updated_at: '2024-03-01T16:45:00Z',
      given_name: 'Emily',
      family_name: 'Williams',
      email_address: 'emily.w@example.com',
      phone_number: '5557890123',
      preferences: {},
      creation_source: 'THIRD_PARTY',
      version: 1,
      reference_id: 'D012',
      custom_attributes: {
        membership_status: {
          value: 'inactive'
        }
      }
    },
    {
      id: 'cust_005',
      created_at: '2023-09-12T10:30:00Z',
      updated_at: '2024-02-15T09:15:00Z',
      given_name: 'Robert',
      family_name: 'Brown',
      email_address: 'robert.b@example.com',
      phone_number: '5553456789',
      preferences: {},
      creation_source: 'THIRD_PARTY',
      version: 1,
      reference_id: 'E345',
      custom_attributes: {
        membership_status: {
          value: 'inactive'
        }
      }
    }
  ];
  
  // Mock waiver status data
  export const mockWaiverStatus: { [key: string]: boolean } = {
    'cust_001': true,
    'cust_002': false,
    'cust_003': true,
    'cust_004': false,
    'cust_005': true
  };
  
  // Mock delays to simulate network latency (in milliseconds)
  export const mockDelays = {
    search: 500,
    waiverCheck: 300,
    waiverSign: 300
  };