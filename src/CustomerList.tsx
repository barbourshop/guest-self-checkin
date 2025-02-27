import { User, Loader2 } from 'lucide-react';
import { Customer } from './types';

type CustomerListProps = {
  customers: Customer[];
  onSelectCustomer: (customer: Customer) => void;
  isLoading: boolean;
  error: string | null;
  searchQuery: string;
};

export const CustomerList = ({
  customers,
  onSelectCustomer,
  isLoading,
  error,
  searchQuery
}: CustomerListProps) => {
  if (isLoading) return (
    <div className="p-8 text-center text-gray-500">
      <Loader2 className="h-8 w-8 animate-spin mx-auto mb-2" />
      <p>Searching...</p>
    </div>
  );

  if (error) return (
    <div className="p-8 text-center text-red-500">
      <p>{error}</p>
    </div>
  );

  if (!customers.length) return (
    <div data-testid="member-not-found" className="p-8 text-center text-gray-500">
      <p>{searchQuery ? 'No customers found' : 'Enter in 3 or more characters then search'}</p>
    </div>
  );

  return (
    <ul className="divide-y divide-gray-200">
      {customers.map((customer) => (
        <li
          key={customer.id}
          className="p-4 hover:bg-gray-50 cursor-pointer member-item"
          onClick={() => onSelectCustomer(customer)}
        >
          <div className="flex items-center gap-4">
            <div className="bg-blue-100 p-3 rounded-full">
              <User className="h-6 w-6 text-blue-600" />
            </div>
            <div className="flex-1">
              <h3 className="font-medium text-gray-900">
                {customer.firstName} {customer.lastName}
              </h3>
              {/* <p className="text-sm text-gray-500">{customer.email}</p> */}
              {/* <p className="text-sm text-gray-500">{customer.phone}</p> */}
              <p className="text-sm text-gray-500">{customer.lotNumber}</p>
              {/* Always show the status badges */}
              <div className="flex gap-2 mt-1">
                <span
                  data-testid="membership-type"
                  className={`inline-block px-2 py-1 text-xs font-medium rounded ${
                  customer.membershipType && customer.membershipType !== 'Non-Member'
                    ? 'bg-green-100 text-green-800'
                    : 'bg-yellow-100 text-yellow-800'
                  }`}
                >
                  {customer.membershipType || 'Non-Member'}
                </span>
                <span
                  data-testid="waiver-status"
                  className={`inline-block px-2 py-1 text-xs font-medium rounded ${
                    customer.hasSignedWaiver
                      ? 'bg-green-100 text-green-800'
                      : 'bg-yellow-100 text-yellow-800'
                  }`}
                >
                  {customer.hasSignedWaiver ? 'Waiver Signed' : 'No Waiver'}
                </span>
              </div>
            </div>
          </div>
        </li>
      ))}
    </ul>
  );
};