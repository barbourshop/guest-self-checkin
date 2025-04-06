// Mock customer data for demonstration purposes that matches your APICustomer format
export const mockCustomers = [
    {
      id: 'cust_001',
      created_at: '2023-05-15T14:32:00Z',
      updated_at: '2024-02-10T09:45:00Z',
      given_name: 'John',
      family_name: 'Doe',
      email_address: 'john.doe@example.com',
      phone_number: '5551111111',  // testmember_phoneNumber - Regular member with waiver
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
      phone_number: '5552222222',  // checkinmember_phoneNumber - Member for check-in tests
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
      phone_number: '5553333333',  // waiversigned_member_phoneNumber - Member with signed waiver
      preferences: {},
      creation_source: 'THIRD_PARTY',
      version: 1,
      reference_id: 'C789',
      membershipStatus: 'Member',
      custom_attributes: {
        membership_status: {
          value: 'active'
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
      phone_number: '5554444444',  // nowaiversigned_member_phoneNumber - Member without waiver
      preferences: {},
      creation_source: 'THIRD_PARTY',
      version: 1,
      reference_id: 'D012',
      membershipStatus: 'Member',
      custom_attributes: {
        membership_status: {
          value: 'active'
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
      phone_number: '5555555555',  // nonmember_phoneNumber - Regular non-member
      preferences: {},
      creation_source: 'THIRD_PARTY',
      version: 1,
      reference_id: 'E345',
      custom_attributes: {
        membership_status: {
          value: 'inactive'
        }
      }
    },
    {
      id: 'cust_006',
      created_at: '2023-10-15T11:20:00Z',
      updated_at: '2024-03-05T14:30:00Z',
      given_name: 'Sarah',
      family_name: 'Davis',
      email_address: 'sarah.d@example.com',
      phone_number: '5556666666',  // waiversigned_nonmember_phoneNumber - Non-member with signed waiver
      preferences: {},
      creation_source: 'THIRD_PARTY',
      version: 1,
      reference_id: 'F678',
      custom_attributes: {
        membership_status: {
          value: 'inactive'
        }
      }
    },
    {
      id: 'cust_007',
      created_at: '2023-11-20T09:45:00Z',
      updated_at: '2024-02-20T16:15:00Z',
      given_name: 'David',
      family_name: 'Wilson',
      email_address: 'david.w@example.com',
      phone_number: '5557777777',  // nowaiversigned_nonmember_phoneNumber - Non-member without waiver
      preferences: {},
      creation_source: 'THIRD_PARTY',
      version: 1,
      reference_id: 'G901',
      custom_attributes: {
        membership_status: {
          value: 'inactive'
        }
      }
    }
  ];
  
  // Mock waiver status data
  export const mockWaiverStatus: { [key: string]: boolean } = {
    'cust_001': true,   // testmember_phoneNumber - Regular member with waiver
    'cust_002': true,   // checkinmember_phoneNumber - Member for check-in tests
    'cust_003': true,   // waiversigned_member_phoneNumber - Member with signed waiver
    'cust_004': false,  // nowaiversigned_member_phoneNumber - Member without waiver
    'cust_005': false,  // nonmember_phoneNumber - Regular non-member
    'cust_006': true,   // waiversigned_nonmember_phoneNumber - Non-member with signed waiver
    'cust_007': false   // nowaiversigned_nonmember_phoneNumber - Non-member without waiver
  };
  
  // Mock delays to simulate network latency (in milliseconds)
  export const mockDelays = {
    search: 500,
    waiverCheck: 300,
    waiverSign: 300
  };