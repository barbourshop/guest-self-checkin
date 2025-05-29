import { configureStore } from '@reduxjs/toolkit';
import { combineReducers } from 'redux';
import { AnyAction } from 'redux';
import { Customer } from './types';

// Initial state
const initialState = {
  customers: [] as Customer[],
  isLoading: false,
  error: null as string | null,
  selectedCustomer: null as Customer | null,
  guestCount: 0,
  showWaiver: false,
  showConfirmation: false,
  searchQuery: '',
  searchType: 'name' as 'email' | 'phone' | 'lot' | 'name',
  customerNames: [] as Array<{
    id: string,
    given_name: string,
    family_name: string,
    email_address: string,
    phone_number: string,
    reference_id: string,
    segment_ids: string[]
  }>,
};

// Action types
const SET_CUSTOMERS = 'SET_CUSTOMERS';
const SET_LOADING = 'SET_LOADING';
const SET_ERROR = 'SET_ERROR';
const SET_SELECTED_CUSTOMER = 'SET_SELECTED_CUSTOMER';
const SET_GUEST_COUNT = 'SET_GUEST_COUNT';
const SET_SHOW_WAIVER = 'SET_SHOW_WAIVER';
const SET_SHOW_CONFIRMATION = 'SET_SHOW_CONFIRMATION';
const SET_SEARCH_QUERY = 'SET_SEARCH_QUERY';
const SET_SEARCH_TYPE = 'SET_SEARCH_TYPE';
const RESET_STATE = 'RESET_STATE';
const UPDATE_CUSTOMER_WAIVER_STATUS = 'UPDATE_CUSTOMER_WAIVER_STATUS';
const SET_CUSTOMER_NAMES = 'SET_CUSTOMER_NAMES';

// Action creators
export const setCustomers = (customers: Customer[]) => ({
  type: SET_CUSTOMERS,
  payload: customers,
});

export const setLoading = (isLoading: boolean) => ({
  type: SET_LOADING,
  payload: isLoading,
});

export const setError = (error: string | null) => ({
  type: SET_ERROR,
  payload: error,
});

export const setSelectedCustomer = (customer: Customer | null) => ({
  type: SET_SELECTED_CUSTOMER,
  payload: customer,
});

export const setGuestCount = (guestCount: number) => ({
  type: SET_GUEST_COUNT,
  payload: guestCount,
});

export const setShowWaiver = (showWaiver: boolean) => ({
  type: SET_SHOW_WAIVER,
  payload: showWaiver,
});

export const setShowConfirmation = (showConfirmation: boolean) => ({
  type: SET_SHOW_CONFIRMATION,
  payload: showConfirmation,
});

export const setSearchQuery = (searchQuery: string) => ({
  type: SET_SEARCH_QUERY,
  payload: searchQuery,
});

export const setSearchType = (searchType: 'email' | 'phone' | 'lot' | 'name') => ({
  type: SET_SEARCH_TYPE,
  payload: searchType,
});

export const updateCustomerWaiverStatus = (customerId: string, hasSignedWaiver: boolean) => ({
  type: UPDATE_CUSTOMER_WAIVER_STATUS,
  payload: { customerId, hasSignedWaiver },
});

export const setCustomerNames = (customerNames: Array<{
  id: string,
  given_name: string,
  family_name: string,
  email_address: string,
  phone_number: string,
  reference_id: string,
  segment_ids: string[]
}>) => ({
  type: SET_CUSTOMER_NAMES,
  payload: customerNames,
});

// Reducers
const customersReducer = (state = initialState.customers, action: AnyAction) => {
  switch (action.type) {
    case SET_CUSTOMERS:
      return action.payload;
    case UPDATE_CUSTOMER_WAIVER_STATUS:
      return state.map(customer => 
        customer.id === action.payload.customerId
          ? { ...customer, hasSignedWaiver: action.payload.hasSignedWaiver }
          : customer
      );
    case RESET_STATE:
      return initialState.customers;
    default:
      return state;
  }
};

const loadingReducer = (state = initialState.isLoading, action: AnyAction) => {
  switch (action.type) {
    case SET_LOADING:
      return action.payload;
    case RESET_STATE:
      return initialState.isLoading;
    default:
      return state;
  }
};

const errorReducer = (state = initialState.error, action: AnyAction) => {
  switch (action.type) {
    case SET_ERROR:
      return action.payload;
    case RESET_STATE:
      return initialState.error;
    default:
      return state;
  }
};

const selectedCustomerReducer = (state = initialState.selectedCustomer, action: AnyAction) => {
  switch (action.type) {
    case SET_SELECTED_CUSTOMER:
      return action.payload;
    case UPDATE_CUSTOMER_WAIVER_STATUS:
      if (state && state.id === action.payload.customerId) {
        return { ...state, hasSignedWaiver: action.payload.hasSignedWaiver };
      }
      return state;
    case RESET_STATE:
      return initialState.selectedCustomer;
    default:
      return state;
  }
};

const guestCountReducer = (state = initialState.guestCount, action: AnyAction) => {
  switch (action.type) {
    case SET_GUEST_COUNT:
      return action.payload;
    case RESET_STATE:
      return initialState.guestCount;
    default:
      return state;
  }
};

const showWaiverReducer = (state = initialState.showWaiver, action: AnyAction) => {
  switch (action.type) {
    case SET_SHOW_WAIVER:
      return action.payload;
    case RESET_STATE:
      return initialState.showWaiver;
    default:
      return state;
  }
};

const showConfirmationReducer = (state = initialState.showConfirmation, action: AnyAction) => {
  switch (action.type) {
    case SET_SHOW_CONFIRMATION:
      return action.payload;
    case RESET_STATE:
      return initialState.showConfirmation;
    default:
      return state;
  }
};

const searchQueryReducer = (state = initialState.searchQuery, action: AnyAction) => {
  switch (action.type) {
    case SET_SEARCH_QUERY:
      return action.payload;
    case RESET_STATE:
      return initialState.searchQuery;
    default:
      return state;
  }
};

const searchTypeReducer = (state = initialState.searchType, action: AnyAction) => {
  switch (action.type) {
    case SET_SEARCH_TYPE:
      return action.payload;
    case RESET_STATE:
      return initialState.searchType;
    default:
      return state;
  }
};

const customerNamesReducer = (state = initialState.customerNames, action: AnyAction) => {
  switch (action.type) {
    case SET_CUSTOMER_NAMES:
      return action.payload;
    case RESET_STATE:
      return initialState.customerNames;
    default:
      return state;
  }
};

// Combine reducers
const rootReducer = combineReducers({
  customers: customersReducer,
  isLoading: loadingReducer,
  error: errorReducer,
  selectedCustomer: selectedCustomerReducer,
  guestCount: guestCountReducer,
  showWaiver: showWaiverReducer,
  showConfirmation: showConfirmationReducer,
  searchQuery: searchQueryReducer,
  searchType: searchTypeReducer,
  customerNames: customerNamesReducer,
});

// Create store using configureStore
const store = configureStore({
  reducer: rootReducer,
  middleware: (getDefaultMiddleware) => getDefaultMiddleware(),
  devTools: process.env.NODE_ENV !== 'production', // Enable Redux DevTools in development
});

export default store;
export { rootReducer }; 