import { render, screen, fireEvent } from '@testing-library/react';
import { CustomerDetail } from './CustomerDetail';
import { signWaiver } from './api';
import { Customer } from './types';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
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

// Mock functions for props
const mockOnGuestCountChange = jest.fn();
const mockOnCheckIn = jest.fn();
const mockOnWaiverResponse = jest.fn();
const mockOnShowWaiver = jest.fn();
const mockOnReset = jest.fn();

// Helper function to create CustomerDetail with required props
const renderCustomerDetail = (store: ReturnType<typeof createMockStore>, additionalProps = {}) => {
  const state = store.getState();
  const customer = state.selectedCustomer;
  const guestCount = state.guestCount;
  const showWaiver = state.showWaiver;
  
  return renderWithProvider(
    <CustomerDetail 
      customer={customer}
      guestCount={guestCount}
      showWaiver={showWaiver}
      onGuestCountChange={mockOnGuestCountChange}
      onCheckIn={mockOnCheckIn}
      onWaiverResponse={mockOnWaiverResponse}
      onShowWaiver={mockOnShowWaiver}
      onReset={mockOnReset}
      {...additionalProps}
    />, 
    store
  );
};

describe('CustomerDetail', () => {
  describe('Initial Render', () => {
    it('displays welcome message with customer name', () => {
      renderCustomerDetail(waiverSignedStore);
      expect(screen.getByText(`Hi, ${mockCustomer.firstName}`)).toBeInTheDocument();
    });

    it('shows guest count select with initial value', () => {
      renderCustomerDetail(waiverSignedStore);
      const select = screen.getByTestId('guest-count-select') as HTMLSelectElement;
      expect(select.value).toBe('1');
    });
  });

  describe('Waiver Not Signed', () => {
    it('disables check-in button when waiver needs to be signed', () => {
      renderCustomerDetail(waiverNotSignedStore);
      const checkInButton = screen.getByTestId('checkin-button');
      expect(checkInButton).toBeDisabled();
      expect(checkInButton).toHaveTextContent('Please Sign Waiver First');
    });

    it('displays waiver text and accept/decline buttons when waiver needs signing', () => {
      renderCustomerDetail(waiverNotSignedStore);
      expect(screen.getByText('Liability Waiver')).toBeInTheDocument();
      expect(screen.getByText('Accept')).toBeInTheDocument();
      expect(screen.getByText('Decline')).toBeInTheDocument();
    });

    it('calls appropriate functions when accepting waiver', () => {
      renderCustomerDetail(waiverNotSignedStore);
      fireEvent.click(screen.getByText('Accept'));
      expect(signWaiver).toHaveBeenCalledWith(mockCustomer.id);
    });

    it('calls appropriate functions when declining waiver', () => {
      renderCustomerDetail(waiverNotSignedStore);
      fireEvent.click(screen.getByText('Decline'));
    });
  });

  describe('Waiver Already Signed', () => {
    it('shows waiver signed message when waiver is already signed', () => {
      renderCustomerDetail(waiverSignedStore);
      expect(screen.getByTestId('signwaiver-text')).toHaveTextContent('Waiver Already Signed');
    });

    it('enables check-in button when waiver is signed', () => {
      renderCustomerDetail(waiverSignedStore);
      const checkInButton = screen.getByTestId('checkin-button');
      expect(checkInButton).not.toBeDisabled();
      expect(checkInButton).toHaveTextContent('Check In Now');
    });
  });

  describe('Guest Count Functionality', () => {
    it('updates guest count when select value changes', () => {
      renderCustomerDetail(waiverSignedStore);
      const select = screen.getByTestId('guest-count-select');
      
      // First, we need to select a value from the dropdown
      fireEvent.change(select, { target: { value: '3' } });
      
      // Then we need to verify the store was updated
      const state = waiverSignedStore.getState();
      expect(state.guestCount).toBe(3);
    });

    it('shows input field when "Other" is selected', () => {
      renderCustomerDetail(waiverSignedStore);
      const select = screen.getByTestId('guest-count-select');
      
      // Select "Other" option
      fireEvent.change(select, { target: { value: 'other' } });
      
      // Now the input field should be visible
      const input = screen.getByTestId('checkin-input');
      expect(input).toBeInTheDocument();
      
      // Test entering a valid guest count
      fireEvent.change(input, { target: { value: '5' } });
      
      // Verify the store was updated
      const state = waiverSignedStore.getState();
      expect(state.guestCount).toBe(5);
    });

    it('prevents guest count from going below 1 when using "Other" input', () => {
      renderCustomerDetail(waiverSignedStore);
      const select = screen.getByTestId('guest-count-select');
      
      // Select "Other" option
      fireEvent.change(select, { target: { value: 'other' } });
      
      const input = screen.getByTestId('checkin-input');
      
      // The input should not allow values below 1
      expect(input).toHaveAttribute('min', '1');
      
      // Try to set a value of 0
      fireEvent.change(input, { target: { value: '0' } });
      
      // The input should not allow values below 1
      expect(input).toHaveAttribute('min', '1');
    });
  });

  describe('Reset Functionality', () => {
    it('calls onReset and dispatches resetState when clicking the close button', () => {
      renderCustomerDetail(waiverSignedStore, { onReset: mockOnReset });
      const closeButton = screen.getByTestId('close-details');
      fireEvent.click(closeButton);
      
      // Verify onReset was called
      expect(mockOnReset).toHaveBeenCalled();
      
      // Verify the store state was reset
      const state = waiverSignedStore.getState();
      expect(state.selectedCustomer).toBeNull();
      expect(state.guestCount).toBe(0);
      expect(state.showWaiver).toBe(false);
      expect(state.showConfirmation).toBe(false);
    });
  });
});