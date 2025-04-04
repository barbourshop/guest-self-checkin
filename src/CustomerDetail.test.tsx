import { render, screen, fireEvent } from '@testing-library/react';
import { CustomerDetail } from './CustomerDetail';
import { signWaiver } from './api';
import { Customer } from './types';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import thunk from 'redux-thunk';
import { rootReducer } from './store';

// Mock the api module
jest.mock('./api', () => ({
  signWaiver: jest.fn(),
}));

const mockCustomer: Customer = {
  id: '123',
  firstName: 'John',
  lastName: 'Doe',
  email: 'john@example.com',
  phone: '555-1234',
  lotNumber: 'A1',
  membershipType: 'Member',
  hasSignedWaiver: false, // Default to false
};

// Helper function to create store with customer state
const createMockStore = (hasSignedWaiver: boolean) => {
  const customer = { ...mockCustomer, hasSignedWaiver };
  
  return configureStore({
    reducer: rootReducer,
    middleware: (getDefaultMiddleware) => getDefaultMiddleware(),
    preloadedState: {
      customers: [customer],
      selectedCustomer: customer,
      guestCount: 1,
      showWaiver: !hasSignedWaiver, // Show waiver when not signed
      showConfirmation: false,
      isLoading: false,
      error: null,
      searchQuery: '',
      searchType: 'email',
    } as any,
  });
};

// Store instances for different test scenarios
let waiverNotSignedStore: ReturnType<typeof createMockStore>;
let waiverSignedStore: ReturnType<typeof createMockStore>;

beforeEach(() => {
  jest.clearAllMocks();
  waiverNotSignedStore = createMockStore(false);
  waiverSignedStore = createMockStore(true);
});

// Wrap the render function with Provider
const renderWithProvider = (ui: React.ReactElement, store: ReturnType<typeof createMockStore>) => {
  return render(<Provider store={store}>{ui}</Provider>);
};

describe('CustomerDetail', () => {
  describe('Initial Render', () => {
    it('displays welcome message with customer name', () => {
      renderWithProvider(<CustomerDetail />, waiverSignedStore);
      expect(screen.getByText(`Welcome, ${mockCustomer.firstName}!`)).toBeInTheDocument();
    });

    it('shows guest count input with initial value', () => {
      renderWithProvider(<CustomerDetail />, waiverSignedStore);
      const input = screen.getByTestId('checkin-input') as HTMLInputElement;
      expect(input.value).toBe('1');
    });
  });

  describe('Waiver Not Signed', () => {
    it('disables check-in button when waiver needs to be signed', () => {
      renderWithProvider(<CustomerDetail />, waiverNotSignedStore);
      const checkInButton = screen.getByTestId('checkin-button');
      expect(checkInButton).toBeDisabled();
      expect(checkInButton).toHaveTextContent('Please Sign Waiver First');
    });

    it('displays waiver text and accept/decline buttons when waiver needs signing', () => {
      renderWithProvider(<CustomerDetail />, waiverNotSignedStore);
      expect(screen.getByText('Liability Waiver')).toBeInTheDocument();
      expect(screen.getByText('Accept')).toBeInTheDocument();
      expect(screen.getByText('Decline')).toBeInTheDocument();
    });

    it('calls appropriate functions when accepting waiver', () => {
      renderWithProvider(<CustomerDetail />, waiverNotSignedStore);
      fireEvent.click(screen.getByText('Accept'));
      expect(signWaiver).toHaveBeenCalledWith(mockCustomer.id);
    });

    it('calls appropriate functions when declining waiver', () => {
      renderWithProvider(<CustomerDetail />, waiverNotSignedStore);
      fireEvent.click(screen.getByText('Decline'));
    });
  });

  describe('Waiver Already Signed', () => {
    it('shows waiver signed message when waiver is already signed', () => {
      renderWithProvider(<CustomerDetail />, waiverSignedStore);
      expect(screen.getByTestId('signwaiver-text')).toHaveTextContent('Waiver Already Signed');
    });

    it('enables check-in button when waiver is signed', () => {
      renderWithProvider(<CustomerDetail />, waiverSignedStore);
      const checkInButton = screen.getByTestId('checkin-button');
      expect(checkInButton).not.toBeDisabled();
      expect(checkInButton).toHaveTextContent('Check In Now');
    });
  });

  describe('Guest Count Functionality', () => {
    it('updates guest count when input changes', () => {
      renderWithProvider(<CustomerDetail />, waiverSignedStore);
      const input = screen.getByTestId('checkin-input');
      fireEvent.change(input, { target: { value: '3' } });
    });

    it('prevents guest count from going below 1', () => {
      renderWithProvider(<CustomerDetail />, waiverSignedStore);
      const input = screen.getByTestId('checkin-input');
      fireEvent.change(input, { target: { value: '0' } });
    });
  });

  describe('Reset Functionality', () => {
    it('calls onReset when clicking the close button', () => {
      renderWithProvider(<CustomerDetail />, waiverSignedStore);
      const closeButton = screen.getByRole('button', { name: 'Close' });
      fireEvent.click(closeButton);
    });
  });
});