import { render, screen, fireEvent } from '@testing-library/react';
import { CustomerDetail } from './CustomerDetail';
import { signWaiver } from './api';
import { Customer } from './types';
import { Provider } from 'react-redux';
import configureStore from 'redux-mock-store';
import thunk, { ThunkMiddleware } from 'redux-thunk';
import { RootState } from './store';

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
  hasSignedWaiver: false,
};

const mockStore = configureStore<Partial<RootState>, any>([thunk as ThunkMiddleware<Partial<RootState>, any>]);

let store: ReturnType<typeof mockStore>;

beforeEach(() => {
  store = mockStore(initialState);
  jest.clearAllMocks();
});

// Wrap the render function with Provider
const renderWithProvider = (ui: React.ReactElement) => {
  return render(<Provider store={store}>{ui}</Provider>);
};

describe('CustomerDetail', () => {
  describe('Initial Render', () => {
    it('displays welcome message with customer name', () => {
      renderWithProvider(<CustomerDetail />);
      expect(screen.getByText(`Welcome, ${mockCustomer.firstName}!`)).toBeInTheDocument();
    });

    it('shows guest count input with initial value', () => {
      renderWithProvider(<CustomerDetail />);
      const input = screen.getByTestId('checkin-input') as HTMLInputElement;
      expect(input.value).toBe('1');
    });
  });

  describe('Waiver Not Signed', () => {
    it('disables check-in button when waiver needs to be signed', () => {
      renderWithProvider(<CustomerDetail />);
      const checkInButton = screen.getByTestId('checkin-button');
      expect(checkInButton).toBeDisabled();
      expect(checkInButton).toHaveTextContent('Please Sign Waiver First');
    });

    it('displays waiver text and accept/decline buttons when waiver needs signing', () => {
      renderWithProvider(<CustomerDetail />);
      expect(screen.getByText('Liability Waiver')).toBeInTheDocument();
      expect(screen.getByText('Accept')).toBeInTheDocument();
      expect(screen.getByText('Decline')).toBeInTheDocument();
    });

    it('calls appropriate functions when accepting waiver', () => {
      renderWithProvider(<CustomerDetail />);
      fireEvent.click(screen.getByText('Accept'));
      expect(signWaiver).toHaveBeenCalledWith(mockCustomer.id);
    });

    it('calls appropriate functions when declining waiver', () => {
      renderWithProvider(<CustomerDetail />);
      fireEvent.click(screen.getByText('Decline'));
    });
  });

  describe('Waiver Already Signed', () => {
    it('shows waiver signed message when waiver is already signed', () => {
      renderWithProvider(<CustomerDetail />);
      expect(screen.getByTestId('signwaiver-text')).toHaveTextContent('Waiver Already Signed');
    });

    it('enables check-in button when waiver is signed', () => {
      renderWithProvider(<CustomerDetail />);
      const checkInButton = screen.getByTestId('checkin-button');
      expect(checkInButton).not.toBeDisabled();
      expect(checkInButton).toHaveTextContent('Check In Now');
    });
  });

  describe('Guest Count Functionality', () => {
    it('updates guest count when input changes', () => {
      renderWithProvider(<CustomerDetail />);
      const input = screen.getByTestId('checkin-input');
      fireEvent.change(input, { target: { value: '3' } });
    });

    it('prevents guest count from going below 1', () => {
      renderWithProvider(<CustomerDetail />);
      const input = screen.getByTestId('checkin-input');
      fireEvent.change(input, { target: { value: '0' } });
    });
  });

  describe('Reset Functionality', () => {
    it('calls onReset when clicking the close button', () => {
      renderWithProvider(<CustomerDetail />);
      const closeButton = screen.getByRole('button', { name: '' }); // X button has no text
      fireEvent.click(closeButton);
    });
  });
});

// Update tests to use renderWithProvider without props
renderWithProvider(<CustomerDetail />);