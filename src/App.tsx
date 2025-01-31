import React, { useState } from 'react';
import { Search, Mail, Phone, Loader2, User } from 'lucide-react';
import { Customer, APICustomer, adaptCustomer } from './types';
import { searchCustomers } from './api';

function App() {
  const [searchType, setSearchType] = useState<'email' | 'phone'>('phone');
  const [searchQuery, setSearchQuery] = useState('');
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSearch = async () => {
    if (!searchQuery.trim()) {
      setCustomers([]);
      return;
    }
  
    setIsLoading(true);
    setError(null);
  
    try {
      const response = await searchCustomers(searchType, searchQuery);
      console.log("\nRAW Response:\n", response);
      
      if (!Array.isArray(response)) {
        throw new Error('Invalid response format: expected an array');
      }
      
      const adaptedCustomers = response.map(adaptCustomer);
      console.log("\nMapped Customers:\n", adaptedCustomers);
      
      setCustomers(adaptedCustomers);
    } catch (err) {
      console.error('Search error details:', err);
      setError('Unable to search customers. Please try again.');
      setCustomers([]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchQuery(e.target.value);
  };

  const handleKeyPress = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      handleSearch();
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-blue-600 text-white py-6 px-4 shadow-lg">
        <div className="max-w-3xl mx-auto">
          <h1 className="text-3xl font-bold">Welcome to the Big Trees Village Rec Center</h1>
          <p className="mt-2 text-blue-100">Please check in using your phone number or email</p>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-3xl mx-auto p-4 mt-6">
        {/* Search Type Toggle */}
        <div className="bg-white rounded-lg shadow-md p-4 mb-6">
          <div className="flex gap-4 mb-4">
            <button
              onClick={() => setSearchType('phone')}
              className={`flex-1 py-3 px-4 rounded-lg flex items-center justify-center gap-2 ${
                searchType === 'phone'
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 text-gray-600'
              }`}
            >
              <Phone size={20} />
              <span>Phone</span>
            </button>
            <button
              onClick={() => setSearchType('email')}
              className={`flex-1 py-3 px-4 rounded-lg flex items-center justify-center gap-2 ${
                searchType === 'email'
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 text-gray-600'
              }`}
            >
              <Mail size={20} />
              <span>Email</span>
            </button>
          </div>

          {/* Search Input and Button */}
          <div className="flex gap-3">
            <div className="relative flex-1">
              <div className="absolute inset-y-0 left-3 flex items-center pointer-events-none">
                <Search className="h-5 w-5 text-gray-400" />
              </div>
              <input
                type={searchType === 'email' ? 'email' : 'tel'}
                placeholder={searchType === 'email' ? 'Enter your email' : 'Enter your phone number'}
                className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                value={searchQuery}
                onChange={handleInputChange}
                onKeyPress={handleKeyPress}
              />
            </div>
            <button
              onClick={handleSearch}
              disabled={isLoading}
              className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            >
              {isLoading ? (
                <>
                  <Loader2 className="h-5 w-5 animate-spin" />
                  <span>Searching...</span>
                </>
              ) : (
                <>
                  <Search className="h-5 w-5" />
                  <span>Search</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* Results Section */}
        <div className="bg-white rounded-lg shadow-md">
          {isLoading ? (
            <div className="p-8 text-center text-gray-500">
              <Loader2 className="h-8 w-8 animate-spin mx-auto mb-2" />
              <p>Searching...</p>
            </div>
          ) : error ? (
            <div className="p-8 text-center text-red-500">
              <p>{error}</p>
            </div>
          ) : customers.length > 0 ? (
            <ul className="divide-y divide-gray-200">
              {customers.map((customer) => (
                <li key={customer.id} className="p-4 hover:bg-gray-50">
                  <div className="flex items-center gap-4">
                    <div className="bg-blue-100 p-3 rounded-full">
                      <User className="h-6 w-6 text-blue-600" />
                    </div>
                    <div className="flex-1">
                      <h3 className="font-medium text-gray-900">
                        {customer.firstName} {customer.lastName}
                      </h3>
                      <p className="text-sm text-gray-500">{customer.email}</p>
                      <p className="text-sm text-gray-500">{customer.phone}</p>
                      {customer.membershipType && (
                        <span className="inline-block mt-1 px-2 py-1 text-xs font-medium bg-green-100 text-green-800 rounded">
                          {customer.membershipType}
                        </span>
                      )}
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          ) : searchQuery ? (
            <div className="p-8 text-center text-gray-500">
              <p>No customers found</p>
            </div>
          ) : (
            <div className="p-8 text-center text-gray-500">
              <p>Enter your search to find your profile</p>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}

export default App;