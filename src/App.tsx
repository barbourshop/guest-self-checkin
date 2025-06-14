import React, { useEffect } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { Check } from 'lucide-react';
import { Customer, adaptCustomer } from './types';
import { checkWaiverStatus, searchCustomers, logCheckIn, fetchCustomerNames } from './api';
import { setCustomerNames } from './store';

import { SearchBar } from './SearchBar';
import { CustomerList } from './CustomerList';
import { CustomerDetail } from './CustomerDetail';

// Define the Redux state type
export interface RootState {
  customers: Customer[];
  isLoading: boolean;
  error: string | null;
  selectedCustomer: Customer | null;
  guestCount: number;
  showWaiver: boolean;
  showConfirmation: boolean;
  searchQuery: string;
  searchType: 'email' | 'phone' | 'lot' | 'name';
  customerNames: { id: string; name: string }[];
}

// Action creators
const setCustomers = (customers: Customer[]) => ({ type: 'SET_CUSTOMERS', payload: customers });
const setLoading = (isLoading: boolean) => ({ type: 'SET_LOADING', payload: isLoading });
const setError = (error: string | null) => ({ type: 'SET_ERROR', payload: error });
const setSelectedCustomer = (customer: Customer | null) => ({ type: 'SET_SELECTED_CUSTOMER', payload: customer });
const setGuestCount = (count: number) => ({ type: 'SET_GUEST_COUNT', payload: count });
const setShowWaiver = (show: boolean) => ({ type: 'SET_SHOW_WAIVER', payload: show });
const setShowConfirmation = (show: boolean) => ({ type: 'SET_SHOW_CONFIRMATION', payload: show });
const setSearchQuery = (query: string) => ({ type: 'SET_SEARCH_QUERY', payload: query });
const resetState = () => ({ type: 'RESET_STATE' });

function App() {
  const dispatch = useDispatch();
  const customers = useSelector((state: RootState) => state.customers);
  const isLoading = useSelector((state: RootState) => state.isLoading);
  const error = useSelector((state: RootState) => state.error);
  const selectedCustomer = useSelector((state: RootState) => state.selectedCustomer);
  const guestCount = useSelector((state: RootState) => state.guestCount);
  const showConfirmation = useSelector((state: RootState) => state.showConfirmation);
  const searchQuery = useSelector((state: RootState) => state.searchQuery);
  const searchType = useSelector((state: RootState) => state.searchType);
  const customerNames = useSelector((state: RootState) => state.customerNames);

  const USE_MOCK_API = import.meta.env.VITE_USE_MOCK_API === 'true';

  // Fetch all customer names at launch
  useEffect(() => {
    fetchCustomerNames()
      .then((names) => dispatch(setCustomerNames(names)))
      .catch((err) => console.error('Failed to fetch customer names', err));
  }, [dispatch]);

  // Add useEffect to handle auto-dismiss of confirmation banner
  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (showConfirmation) {
      timer = setTimeout(() => {
        dispatch(resetState());
      }, 3000);
    }
    return () => {
      if (timer) clearTimeout(timer);
    };
  }, [showConfirmation, dispatch]);

  const handleSearch = async (query: string, type: 'email' | 'phone' | 'lot' | 'name') => {
    if (!query.trim()) {
      dispatch(setCustomers([]));
      return;
    }

    dispatch(setLoading(true));
    dispatch(setError(null));
    dispatch(setSearchQuery(query));

    try {
      // Local search for all types
      let results = customerNames.filter(c => {
        if (type === 'name') {
          return (`${c.given_name} ${c.family_name}`.toLowerCase().includes(query.toLowerCase()));
        } else if (type === 'email') {
          return c.email_address && c.email_address.toLowerCase().includes(query.toLowerCase());
        } else if (type === 'phone') {
          return c.phone_number && c.phone_number.toLowerCase().includes(query.toLowerCase());
        } else if (type === 'lot') {
          return c.reference_id && c.reference_id.toLowerCase().includes(query.toLowerCase());
        }
        return false;
      });
      // Adapt to Customer type and derive membershipType
      const adaptedResults = await Promise.all(results.map(async c => {
        const membershipType = c.segment_ids && c.segment_ids.includes('gv2:TVR6JXEM4N5XQ2XV51GBKFDN74') ? 'Member' : 'Non-Member';
        let hasSignedWaiver = false;
        try {
          hasSignedWaiver = await checkWaiverStatus(c.id);
        } catch {}
        return {
          id: c.id,
          firstName: c.given_name,
          lastName: c.family_name,
          email: c.email_address,
          phone: c.phone_number,
          lotNumber: c.reference_id,
          membershipType,
          hasSignedWaiver
        };
      }));
      dispatch(setCustomers(adaptedResults));
    } catch (err) {
      dispatch(setError('Unable to search customers. Please try again.'));
      dispatch(setCustomers([]));
    } finally {
      dispatch(setLoading(false));
    }
  };

  const handleCheckIn = async () => {
    console.log('handleCheckIn called with:', { selectedCustomer, guestCount });
    if (selectedCustomer && guestCount > 0) {
      try {
        console.log('Attempting to log check-in with:', {
          id: selectedCustomer.id,
          guestCount,
          firstName: selectedCustomer.firstName,
          lastName: selectedCustomer.lastName,
          lotNumber: selectedCustomer.lotNumber
        });
        
        // Log the check-in with customer information
        await logCheckIn(
          selectedCustomer.id, 
          guestCount, 
          selectedCustomer.firstName, 
          selectedCustomer.lastName, 
          selectedCustomer.lotNumber
        );
        
        console.log('Check-in logged successfully');
        
        // Show confirmation
        dispatch(setShowConfirmation(true));
      } catch (error) {
        console.error('Failed to log check-in:', error);
        // Still show confirmation even if logging fails
        dispatch(setShowConfirmation(true));
      }
    } else {
      console.log('Invalid check-in attempt:', { selectedCustomer, guestCount });
      dispatch(setShowConfirmation(true));
    }
  };

  const handleWaiverResponse = (accepted: boolean) => {
    if (accepted) {
      // Don't automatically show confirmation dialog
      // dispatch(setShowConfirmation(true));
    } else {
      dispatch(resetState());
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-primary-600 text-white py-6 px-4 shadow-lg">
        <div className="max-w-3xl mx-auto">
          <h1 className="text-3xl font-bold">Big Trees Village Rec Center Check In</h1>
          <p className="mt-2 text-primary-100">Please check in using your phone number, email, or lot number</p>
          {USE_MOCK_API && (
            <div className="mt-1 px-2 py-1 bg-yellow-500 text-white text-xs inline-block rounded">
              Demo Mode: Using Mock Data
            </div>
          )}
        </div>
      </header>

      <main className="max-w-3xl mx-auto p-4 mt-6">
        {showConfirmation ? (
          <div className="bg-green-50 rounded-lg p-8 text-center">
            <div 
            data-testid="green-checkmark"
            className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <Check className="h-8 w-8 text-green-600" />
            </div>
            <h2 className="text-2xl font-bold text-green-900 mb-2">All Set!</h2>
            <p className="text-green-700">You're checked in and ready to go. Enjoy your visit!</p>
          </div>
        ) : selectedCustomer ? (
          <CustomerDetail
            customer={selectedCustomer}
            guestCount={guestCount}
            showWaiver={selectedCustomer ? !selectedCustomer.hasSignedWaiver : false}
            onGuestCountChange={(count) => dispatch(setGuestCount(count))}
            onCheckIn={handleCheckIn}
            onWaiverResponse={handleWaiverResponse}
            onShowWaiver={() => dispatch(setShowWaiver(true))}
            onReset={resetState}
          />
        ) : (
          <>
            <SearchBar onSearch={handleSearch} isLoading={isLoading} />
            <div className="bg-white rounded-lg shadow-md">
              <CustomerList
                customers={customers}
                onSelectCustomer={(customer) => dispatch(setSelectedCustomer(customer))}
                isLoading={isLoading}
                error={error}
                searchQuery={searchQuery}
              />
            </div>
          </>
        )}
      </main>
    </div>
  );
}

export default App;