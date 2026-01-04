import { writable, derived } from 'svelte/store';
import type { Customer } from '../types';

// Initial state
const initialCustomers: Customer[] = [];
const initialCustomerNames: Array<{
  id: string;
  given_name: string;
  family_name: string;
  email_address: string;
  phone_number: string;
  reference_id: string;
  segment_ids: string[];
}> = [];

// Writable stores
export const customers = writable<Customer[]>(initialCustomers);
export const isLoading = writable<boolean>(false);
export const error = writable<string | null>(null);
export const selectedCustomer = writable<Customer | null>(null);
export const guestCount = writable<number>(0);
export const showWaiver = writable<boolean>(false);
export const showConfirmation = writable<boolean>(false);
export const searchQuery = writable<string>('');
export const searchType = writable<'email' | 'phone' | 'lot' | 'name'>('name');
export const customerNames = writable<Array<{
  id: string;
  given_name: string;
  family_name: string;
  email_address: string;
  phone_number: string;
  reference_id: string;
  segment_ids: string[];
}>>(initialCustomerNames);

// Helper functions to update stores (similar to Redux actions)
export const setCustomers = (newCustomers: Customer[]) => {
  customers.set(newCustomers);
};

export const setLoading = (loading: boolean) => {
  isLoading.set(loading);
};

export const setError = (err: string | null) => {
  error.set(err);
};

export const setSelectedCustomer = (customer: Customer | null) => {
  selectedCustomer.set(customer);
};

export const setGuestCount = (count: number) => {
  guestCount.set(count);
};

export const setShowWaiver = (show: boolean) => {
  showWaiver.set(show);
};

export const setShowConfirmation = (show: boolean) => {
  showConfirmation.set(show);
};

export const setSearchQuery = (query: string) => {
  searchQuery.set(query);
};

export const setSearchType = (type: 'email' | 'phone' | 'lot' | 'name') => {
  searchType.set(type);
};

export const setCustomerNames = (names: Array<{
  id: string;
  given_name: string;
  family_name: string;
  email_address: string;
  phone_number: string;
  reference_id: string;
  segment_ids: string[];
}>) => {
  customerNames.set(names);
};

export const updateCustomerWaiverStatus = (customerId: string, hasSignedWaiver: boolean) => {
  customers.update(cs => 
    cs.map(customer => 
      customer.id === customerId
        ? { ...customer, hasSignedWaiver }
        : customer
    )
  );
  
  selectedCustomer.update(customer => 
    customer && customer.id === customerId
      ? { ...customer, hasSignedWaiver }
      : customer
  );
};

export const resetState = () => {
  customers.set(initialCustomers);
  isLoading.set(false);
  error.set(null);
  selectedCustomer.set(null);
  guestCount.set(0);
  showWaiver.set(false);
  showConfirmation.set(false);
  searchQuery.set('');
  searchType.set('name');
};

