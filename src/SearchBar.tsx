import React, { useState } from 'react';
import { Search, Mail, Phone, Home, Loader2 } from 'lucide-react';

type SearchBarProps = {
  onSearch: (query: string, type: 'email' | 'phone' | 'lot') => void;
  isLoading: boolean;
};

export const SearchBar = ({ onSearch, isLoading }: SearchBarProps) => {
  const [searchType, setSearchType] = useState<'email' | 'phone' | 'lot'>('lot');
  const [searchQuery, setSearchQuery] = useState('');

  const handleSearch = () => {
    onSearch(searchQuery, searchType);
  };

  return (
    <div className="bg-white rounded-lg shadow-md p-4 mb-6">
      <div className="flex gap-2 mb-4">
        <button
          data-testid="lot-search"
          onClick={() => setSearchType('lot')}
          className={`flex-1 py-3 px-2 rounded-lg flex items-center justify-center gap-1 ${
            searchType === 'lot' ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-600'
          }`}
        >
          <Home size={18} />
          <span>Lot #</span>
        </button>
        <button
          data-testid="phone-search"
          onClick={() => setSearchType('phone')}
          className={`flex-1 py-3 px-2 rounded-lg flex items-center justify-center gap-1 ${
            searchType === 'phone' ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-600'
          }`}
        >
          <Phone size={18} />
          <span>Phone</span>
        </button>
        <button
          data-testid="email-search"
          onClick={() => setSearchType('email')}
          className={`flex-1 py-3 px-2 rounded-lg flex items-center justify-center gap-1 ${
            searchType === 'email' ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-600'
          }`}
        >
          <Mail size={18} />
          <span>Email</span>
        </button>
      </div>

      <div className="flex gap-3">
        <div className="relative flex-1">
          <div className="absolute inset-y-0 left-3 flex items-center pointer-events-none">
            <Search className="h-5 w-5 text-gray-400" />
          </div>
          <input
            data-testid="search-input"
            type={searchType === 'email' ? 'email' : 'text'}
            placeholder={
              searchType === 'email' 
                ? 'Enter email address' 
                : searchType === 'phone' 
                  ? 'Enter phone number' 
                  : 'Enter lot number'
            }
            className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
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
  );
};