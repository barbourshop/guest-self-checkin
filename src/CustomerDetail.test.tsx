import { render, screen, fireEvent } from '@testing-library/react';
import { CustomerDetail } from './CustomerDetail';
import { signWaiver } from './api';

// Mock the api module
jest.mock('./api', () => ({
  signWaiver: jest.fn(),
}));

describe('CustomerDetail', () => {
  const mockCustomer = {
    id: '123',
    firstName: 'John',
    lastName: 'Doe',
    email: 'john@example.com',
    phone: '555-1234'
  };

  const defaultProps = {
    customer: mockCustomer,
    guestCount: 1,
    showWaiver: false,
    onGuestCountChange: jest.fn(),
    onCheckIn: jest.fn(),
    onWaiverResponse: jest.fn(),
    onShowWaiver: jest.fn(),
    onReset: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Initial Render', () => {
    it('displays welcome message with customer name', () => {
      render(<CustomerDetail {...defaultProps} />);
      expect(screen.getByText(`Welcome, ${mockCustomer.firstName}!`)).toBeInTheDocument();
    });

    it('shows guest count input with initial value', () => {
      render(<CustomerDetail {...defaultProps} />);
      const input = screen.getByTestId('checkin-input') as HTMLInputElement;
      expect(input.value).toBe('1');
    });
  });

  describe('Waiver Not Signed', () => {
    it('disables check-in button when waiver needs to be signed', () => {
      render(<CustomerDetail {...defaultProps} showWaiver={true} />);
      const checkInButton = screen.getByTestId('checkin-button');
      expect(checkInButton).toBeDisabled();
      expect(checkInButton).toHaveTextContent('Please Sign Waiver First');
    });

    it('displays waiver text and accept/decline buttons when waiver needs signing', () => {
      render(<CustomerDetail {...defaultProps} showWaiver={true} />);
      expect(screen.getByText('Liability Waiver')).toBeInTheDocument();
      expect(screen.getByText('Accept')).toBeInTheDocument();
      expect(screen.getByText('Decline')).toBeInTheDocument();
    });

    it('calls appropriate functions when accepting waiver', () => {
      render(<CustomerDetail {...defaultProps} showWaiver={true} />);
      fireEvent.click(screen.getByText('Accept'));
      expect(signWaiver).toHaveBeenCalledWith(mockCustomer.id);
      expect(defaultProps.onWaiverResponse).toHaveBeenCalledWith(true);
    });

    it('calls appropriate functions when declining waiver', () => {
      render(<CustomerDetail {...defaultProps} showWaiver={true} />);
      fireEvent.click(screen.getByText('Decline'));
      expect(defaultProps.onWaiverResponse).toHaveBeenCalledWith(false);
    });
  });

  describe('Waiver Already Signed', () => {
    it('shows waiver signed message when waiver is already signed', () => {
      render(<CustomerDetail {...defaultProps} showWaiver={false} />);
      expect(screen.getByTestId('signwaiver-text')).toHaveTextContent('Waiver Already Signed');
    });

    it('enables check-in button when waiver is signed', () => {
      render(<CustomerDetail {...defaultProps} showWaiver={false} />);
      const checkInButton = screen.getByTestId('checkin-button');
      expect(checkInButton).not.toBeDisabled();
      expect(checkInButton).toHaveTextContent('Check In Now');
    });
  });

  describe('Guest Count Functionality', () => {
    it('updates guest count when input changes', () => {
      render(<CustomerDetail {...defaultProps} />);
      const input = screen.getByTestId('checkin-input');
      fireEvent.change(input, { target: { value: '3' } });
      expect(defaultProps.onGuestCountChange).toHaveBeenCalledWith(3);
    });

    it('prevents guest count from going below 1', () => {
      render(<CustomerDetail {...defaultProps} />);
      const input = screen.getByTestId('checkin-input');
      fireEvent.change(input, { target: { value: '0' } });
      expect(defaultProps.onGuestCountChange).toHaveBeenCalledWith(1);
    });
  });

  describe('Reset Functionality', () => {
    it('calls onReset when clicking the close button', () => {
      render(<CustomerDetail {...defaultProps} />);
      const closeButton = screen.getByRole('button', { name: '' }); // X button has no text
      fireEvent.click(closeButton);
      expect(defaultProps.onReset).toHaveBeenCalled();
    });
  });
});