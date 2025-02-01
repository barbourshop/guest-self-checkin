import React, { useState } from 'react';
import { Search, Mail, Phone, Loader2, User, X, Users, FileText, Check } from 'lucide-react';
import { Customer, adaptCustomer } from './types';
import { searchCustomers } from './api';

const WAIVER_TEXT = `RELEASE AND WAIVER OF LIABILITY

By signing this waiver, I acknowledge the inherent risks of using recreational facilities and equipment. I voluntarily agree to assume all risks of personal injury, illness, or death.

1. I understand that using exercise equipment and participating in recreational activities involves risks.
2. I agree to follow all safety rules and instructions.
3. I certify that I am in good physical condition to participate in recreational activities.
4. I waive any right to make claims against the facility for injuries or damages.

This waiver shall be binding on my heirs, successors, and assigns.`;

function App() {
  const [searchType, setSearchType] = useState<'email' | 'phone'>('phone');
  const [searchQuery, setSearchQuery] = useState('');
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [guestCount, setGuestCount] = useState(1);
  const [showWaiver, setShowWaiver] = useState(false);
  const [showConfirmation, setShowConfirmation] = useState(false);

  const handleSearch = async () => {
    if (!searchQuery.trim()) {
      setCustomers([]);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const results = await searchCustomers(searchType, searchQuery);
      const adaptedCustomers = results.map(adaptCustomer);
      console.log("\nMapped Customers:\n", adaptedCustomers);
      
      setCustomers(adaptedCustomers);
    } catch (err) {
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

  const resetState = () => {
    setSelectedCustomer(null);
    setShowWaiver(false);
    setShowConfirmation(false);
    setGuestCount(1);
    setSearchQuery('');
    setCustomers([]);
  };

  const handleCheckIn = () => {
    // Here you would typically make an API call to record the check-in
    setShowConfirmation(true);
    setTimeout(resetState, 3000); // Reset after showing confirmation
  };

  const handleWaiverResponse = (accepted: boolean) => {
    if (accepted) {
      // Here you would typically make an API call to record the waiver acceptance
      setShowConfirmation(true);
      setTimeout(resetState, 3000);
    } else {
      resetState();
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-blue-600 text-white py-6 px-4 shadow-lg">
        <div className="max-w-3xl mx-auto">
          <h1 className="text-3xl font-bold">Welcome to the Rec Center</h1>
          <p className="mt-2 text-blue-100">Please check in using your phone number or email</p>
        </div>
      </header>

      {/* Main Content */}
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
          <div className="bg-white rounded-lg shadow-md p-6">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-semibold text-gray-900">
                Welcome, {selectedCustomer.firstName}!
              </h2>
              <button
                onClick={resetState}
                className="p-2 text-gray-400 hover:text-gray-600"
              >
                <X className="h-6 w-6" />
              </button>
            </div>
            
            <div className="grid md:grid-cols-2 gap-6">
              {/* Check-in Column */}
              <div className="bg-gray-50 p-6 rounded-lg">
                <h3 className="text-lg font-medium text-gray-900 mb-4">Check In</h3>
                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Number of guests (including you)
                  </label>
                  <input
                    data-testid="checkin-input"
                    type="number"
                    min="1"
                    max="10"
                    value={guestCount}
                    onChange={(e) => setGuestCount(Math.max(1, parseInt(e.target.value) || 1))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md"
                  />
                </div>
                <button
                  data-testid="checkin-button"
                  onClick={handleCheckIn}
                  className="w-full py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center justify-center gap-2"
                >
                  <Users className="h-5 w-5" />
                  <span>Check In Now</span>
                </button>
              </div>

              {/* Waiver Column */}
              <div className="bg-gray-50 p-6 rounded-lg">
                {showWaiver ? (
                  <div>
                    <h3 className="text-lg font-medium text-gray-900 mb-4">Liability Waiver</h3>
                    <div className="bg-white p-4 rounded-md mb-4 h-48 overflow-y-auto text-sm text-gray-600">
                      {WAIVER_TEXT}
                    </div>
                    <div className="flex gap-3">
                      <button
                        onClick={() => handleWaiverResponse(true)}
                        className="flex-1 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700"
                      >
                        Accept
                      </button>
                      <button
                        onClick={() => handleWaiverResponse(false)}
                        className="flex-1 py-3 bg-red-600 text-white rounded-lg hover:bg-red-700"
                      >
                        Decline
                      </button>
                    </div>
                  </div>
                ) : (
                  <div>
                    <h3 
                    data-testid="signwaiver-text"
                    className="text-lg font-medium text-gray-900 mb-4">Sign Waiver</h3>
                    <p className="text-sm text-gray-600 mb-4">
                      Please review and sign our liability waiver before proceeding.
                    </p>
                    <button
                      data-testid="signwaiver-button"
                      onClick={() => setShowWaiver(true)}
                      className="w-full py-3 bg-gray-600 text-white rounded-lg hover:bg-gray-700 flex items-center justify-center gap-2"
                    >
                      <FileText className="h-5 w-5" />
                      <span>View Waiver</span>
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        ) : (
          <>
            {/* Search Type Toggle */}
            <div className="bg-white rounded-lg shadow-md p-4 mb-6">
              <div className="flex gap-4 mb-4">
                <button
                  data-testid="phone-search"
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
                  data-testid="email-search"
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
                    data-testid="search-input"
                    type={searchType === 'email' ? 'email' : 'tel'}
                    placeholder={searchType === 'email' ? 'Enter your email' : 'Enter your phone number'}
                    className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    value={searchQuery}
                    onChange={handleInputChange}
                    onKeyPress={handleKeyPress}
                  />
                </div>
                <button
                  data-testid="search-button"
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
                    <li
                      key={customer.id}
                      className="p-4 hover:bg-gray-50 cursor-pointer member-item"
                      onClick={() => setSelectedCustomer(customer)}
                    >
                      <div className="flex items-center gap-4">
                        <div className="bg-blue-100 p-3 rounded-full">
                          <User className="h-6 w-6 text-blue-600" />
                        </div>
                        <div 
                        className="flex-1">
                          <h3 className="font-medium text-gray-900">
                            {customer.firstName} {customer.lastName}
                          </h3>
                          <p className="text-sm text-gray-500">{customer.email}</p>
                          <p className="text-sm text-gray-500">{customer.phone}</p>
                          {customer.membershipType && (
                            <span 
                            data-testid="membership-type"
                            className="inline-block mt-1 px-2 py-1 text-xs font-medium bg-green-100 text-green-800 rounded">
                              {customer.membershipType}
                            </span>
                          )}
                        </div>
                      </div>
                    </li>
                  ))}
                </ul>
              ) : searchQuery ? (
                <div 
                data-testid="member-not-found"
                className="p-8 text-center text-gray-500">
                  <p>No customers found</p>
                </div>
              ) : (
                <div className="p-8 text-center text-gray-500">
                  <p>Enter your search to find your profile</p>
                </div>
              )}
            </div>
          </>
        )}
      </main>
    </div>
  );
}

export default App;