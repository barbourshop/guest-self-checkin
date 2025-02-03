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

  const handleSearch = async (query: string, type: 'email' | 'phone') => {
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
          <h1 className="text-3xl font-bold">Welcome to the Rec Center</h1>
          <p className="mt-2 text-blue-100">Please check in using your phone number or email</p>
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
            showWaiver={showWaiver}
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