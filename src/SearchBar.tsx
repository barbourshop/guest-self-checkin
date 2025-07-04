import React, { useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { Search, Mail, Phone, Home, Loader2, User } from 'lucide-react';
import { RootState } from './App'; // Assuming RootState is exported from App.tsx

type SearchBarProps = {
  onSearch: (query: string, type: 'email' | 'phone' | 'lot' | 'name') => void;
  isLoading: boolean;
};

// Action creators
const setSearchQuery = (query: string) => ({ type: 'SET_SEARCH_QUERY', payload: query });
const setSearchType = (type: 'email' | 'phone' | 'lot' | 'name') => ({ type: 'SET_SEARCH_TYPE', payload: type });

export const SearchBar = ({ onSearch, isLoading }: SearchBarProps) => {
  const dispatch = useDispatch();
  const searchType = useSelector((state: RootState) => state.searchType);
  const searchQuery = useSelector((state: RootState) => state.searchQuery);

  const handleSearch = () => {
    onSearch(searchQuery, searchType);
  };

  return (
    <div className="bg-white rounded-lg shadow-md p-4 mb-6">
      <div className="flex gap-2 mb-4">
        <button
          data-testid="name-search"
          onClick={() => dispatch(setSearchType('name'))}
          className={`flex-1 py-3 px-2 rounded-lg flex items-center justify-center gap-1 ${
            searchType === 'name' ? 'bg-primary-600 text-white' : 'bg-gray-100 text-gray-600'
          }`}
        >
          <User size={18} />
          <span>Name</span>
        </button>
        <button
          data-testid="lot-search"
          onClick={() => dispatch(setSearchType('lot'))}
          className={`flex-1 py-3 px-2 rounded-lg flex items-center justify-center gap-1 ${
            searchType === 'lot' ? 'bg-primary-600 text-white' : 'bg-gray-100 text-gray-600'
          }`}
        >
          <Home size={18} />
          <span>Lot #</span>
        </button>
        <button
          data-testid="phone-search"
          onClick={() => dispatch(setSearchType('phone'))}
          className={`flex-1 py-3 px-2 rounded-lg flex items-center justify-center gap-1 ${
            searchType === 'phone' ? 'bg-primary-600 text-white' : 'bg-gray-100 text-gray-600'
          }`}
        >
          <Phone size={18} />
          <span>Phone</span>
        </button>
        <button
          data-testid="email-search"
          onClick={() => dispatch(setSearchType('email'))}
          className={`flex-1 py-3 px-2 rounded-lg flex items-center justify-center gap-1 ${
            searchType === 'email' ? 'bg-primary-600 text-white' : 'bg-gray-100 text-gray-600'
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
                  : searchType === 'lot'
                    ? 'Enter lot number'
                    : 'Enter customer name'
            }
            className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
            value={searchQuery}
            onChange={(e) => dispatch(setSearchQuery(e.target.value))}
            onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
          />
        </div>
        <button
          data-testid="search-button"
          onClick={handleSearch}
          disabled={isLoading}
          className="px-6 py-3 bg-primary-600 text-white rounded-lg hover:bg-primary-700 focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
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