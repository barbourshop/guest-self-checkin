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
  guestCount: 1,
  showWaiver: false,
  showConfirmation: false,
  searchQuery: '',
  searchType: 'email' as 'email' | 'phone' | 'lot',
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
      return state && state.id === action.payload.customerId
        ? { ...state, hasSignedWaiver: action.payload.hasSignedWaiver }
        : state;
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
});

// Create store using configureStore
const store = configureStore({
  reducer: rootReducer,
  middleware: (getDefaultMiddleware) => getDefaultMiddleware(),
  devTools: process.env.NODE_ENV !== 'production', // Enable Redux DevTools in development
});

export default store;
export { rootReducer }; 