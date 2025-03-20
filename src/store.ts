import { createStore, combineReducers, applyMiddleware, Store } from 'redux';
import {thunk} from 'redux-thunk';
import { composeWithDevTools } from 'redux-devtools-extension';
import { AnyAction } from 'redux';

// Initial state
const initialState = {
  customers: [],
  isLoading: false,
  error: null,
  selectedCustomer: null,
  guestCount: 1,
  showWaiver: false,
  showConfirmation: false,
  searchQuery: '',
  searchType: 'email', // Default to 'email'
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

// Reducers
const customersReducer = (state = initialState.customers, action: AnyAction) => {
  switch (action.type) {
    case SET_CUSTOMERS:
      return action.payload;
    default:
      return state;
  }
};

const loadingReducer = (state = initialState.isLoading, action: AnyAction) => {
  switch (action.type) {
    case SET_LOADING:
      return action.payload;
    default:
      return state;
  }
};

const errorReducer = (state = initialState.error, action: AnyAction) => {
  switch (action.type) {
    case SET_ERROR:
      return action.payload;
    default:
      return state;
  }
};

const selectedCustomerReducer = (state = initialState.selectedCustomer, action: AnyAction) => {
  switch (action.type) {
    case SET_SELECTED_CUSTOMER:
      return action.payload;
    default:
      return state;
  }
};

const guestCountReducer = (state = initialState.guestCount, action: AnyAction) => {
  switch (action.type) {
    case SET_GUEST_COUNT:
      return action.payload;
    default:
      return state;
  }
};

const showWaiverReducer = (state = initialState.showWaiver, action: AnyAction) => {
  switch (action.type) {
    case SET_SHOW_WAIVER:
      return action.payload;
    default:
      return state;
  }
};

const showConfirmationReducer = (state = initialState.showConfirmation, action: AnyAction) => {
  switch (action.type) {
    case SET_SHOW_CONFIRMATION:
      return action.payload;
    default:
      return state;
  }
};

const searchQueryReducer = (state = initialState.searchQuery, action: AnyAction) => {
  switch (action.type) {
    case SET_SEARCH_QUERY:
      return action.payload;
    default:
      return state;
  }
};

const searchTypeReducer = (state = initialState.searchType, action: AnyAction) => {
  switch (action.type) {
    case SET_SEARCH_TYPE:
      return action.payload;
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

// Create store
const store = createStore(
  rootReducer,
  composeWithDevTools(
    applyMiddleware(thunk)
  )
);

export default store; 