import React, { useState } from 'react';
import { Check } from 'lucide-react';
import { Customer, adaptCustomer } from './types';
import { checkWaiverStatus, searchCustomers } from './api';

import { SearchBar } from './SearchBar';
import { CustomerList } from './CustomerList';
import { CustomerDetail } from './CustomerDetail';

function App() {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [guestCount, setGuestCount] = useState(1);
  const [showWaiver, setShowWaiver] = useState(false);
  const [showConfirmation, setShowConfirmation] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const USE_MOCK_API = import.meta.env.VITE_USE_MOCK_API === 'true';

  const handleSearch = async (query: string, type: 'email' | 'phone' | 'lot') => {
    if (!query.trim()) {
      setCustomers([]);
      return;
    }
  
    setIsLoading(true);
    setError(null);
    setSearchQuery(query);
  
    try {
      const results = await searchCustomers(type, query);
      const adaptedCustomers = results.map(adaptCustomer);
      
      const customersWithWaiverStatus = await Promise.all(
        adaptedCustomers.map(async (customer) => {
          try {
            const hasSignedWaiver = await checkWaiverStatus(customer.id);
            return { ...customer, hasSignedWaiver };
          } catch (error) {
            console.error(`Failed to check waiver status for customer ${customer.id}:`, error);
            return customer;
          }
        })
      );
      setCustomers(customersWithWaiverStatus);
    } catch (err) {
      setError('Unable to search customers. Please try again.');
      setCustomers([]);
    } finally {
      setIsLoading(false);
    }
  };

  const resetState = () => {
    setSelectedCustomer(null);
    setShowWaiver(false);
    setShowConfirmation(false);
    setGuestCount(1);
    setSearchQuery('');
    setCustomers([]);
  };

  const handleCheckIn = () => {
    setShowConfirmation(true);
    setTimeout(resetState, 3000);
  };

  const handleWaiverResponse = (accepted: boolean) => {
    if (accepted) {
      setShowConfirmation(true);
      setTimeout(resetState, 3000);
    } else {
      resetState();
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-blue-600 text-white py-6 px-4 shadow-lg">
        <div className="max-w-3xl mx-auto">
          <h1 className="text-3xl font-bold">Big Trees Village Rec Center Check In</h1>
          <p className="mt-2 text-blue-100">Please check in using your phone number, email, or lot number</p>
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
            onGuestCountChange={setGuestCount}
            onCheckIn={handleCheckIn}
            onWaiverResponse={handleWaiverResponse}
            onShowWaiver={() => setShowWaiver(true)}
            onReset={resetState}
          />
        ) : (
          <>
            <SearchBar onSearch={handleSearch} isLoading={isLoading} />
            <div className="bg-white rounded-lg shadow-md">
              <CustomerList
                customers={customers}
                onSelectCustomer={setSelectedCustomer}
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