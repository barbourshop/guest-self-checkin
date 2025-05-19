import React, { useEffect, useRef, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { X, Users, FileText, Settings } from 'lucide-react';
import { RootState } from './App'; // Assuming RootState is exported from App.tsx
import { Customer } from './types';
import { signWaiver } from './api';
import { WAIVER_TEXT } from './constants';
import { AdminView } from './AdminView';

// Action creators
const setGuestCount = (count: number) => ({ type: 'SET_GUEST_COUNT', payload: count });
const setShowConfirmation = (show: boolean) => ({ type: 'SET_SHOW_CONFIRMATION', payload: show });
const setShowWaiver = (show: boolean) => ({ type: 'SET_SHOW_WAIVER', payload: show });
const updateCustomerWaiverStatus = (customerId: string, hasSignedWaiver: boolean) => ({
  type: 'UPDATE_CUSTOMER_WAIVER_STATUS',
  payload: { customerId, hasSignedWaiver }
});
const resetState = () => ({ type: 'RESET_STATE' });

type CustomerDetailProps = {
  customer: Customer;
  guestCount: number;
  showWaiver: boolean;
  onGuestCountChange: (count: number) => void;
  onCheckIn: () => void;
  onWaiverResponse: (accepted: boolean) => void;
  onShowWaiver: () => void;
  onReset: () => void;
};

export const CustomerDetail = ({
  customer,
  guestCount,
  showWaiver,
  onGuestCountChange,
  onCheckIn,
  onWaiverResponse,
  onShowWaiver,
  onReset,
}: CustomerDetailProps) => {
  const dispatch = useDispatch();
  const guestCountInputRef = useRef<HTMLInputElement>(null);
  const [isOtherSelected, setIsOtherSelected] = useState(false);
  const [customGuestCount, setCustomGuestCount] = useState('');
  const [hasSelected, setHasSelected] = useState(false);
  const [showAdmin, setShowAdmin] = useState(false);

  // Initialize hasSelected based on guestCount
  useEffect(() => {
    setHasSelected(guestCount > 0);
  }, [guestCount]);

  return (
    <div className="bg-white rounded-lg shadow-md p-6">
      <div className="flex justify-between items-start mb-6">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">
            Hi, {customer.firstName}
          </h2>
        </div>
        <div className="flex space-x-2">
          <button
            onClick={() => setShowAdmin(true)}
            className="p-2 text-gray-500 hover:text-gray-700"
            title="Admin View"
          >
            <Settings className="h-5 w-5" />
          </button>
          <button
            onClick={() => {
              dispatch(resetState());
              onReset();
            }}
            className="p-2 text-gray-500 hover:text-gray-700"
            data-testid="close-details"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
      </div>

      {showAdmin && (
        <AdminView
          customer={customer}
          onClose={() => setShowAdmin(false)}
        />
      )}

      <div className="grid md:grid-cols-2 gap-6">
        <div className="bg-gray-50 p-6 rounded-lg">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Check In</h3>
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-4">
              Number of guests (including you)
            </label>
            <div className="flex flex-col items-center mb-6">
              <div className="text-7xl font-bold text-primary mb-2">
                {hasSelected ? guestCount : '-'}
              </div>
              <div className="text-sm text-gray-500 mb-4">Total Guests</div>
            </div>
            <button
              data-testid="checkin-button"
              onClick={() => onCheckIn()}
              disabled={showWaiver || !hasSelected}
              className={`w-full py-3 rounded-lg flex items-center justify-center gap-2 mb-6 ${
                !showWaiver && hasSelected
                  ? 'bg-primary text-white hover:bg-primary/90' 
                  : 'bg-gray-300 text-gray-500 cursor-not-allowed'
              }`}
            >
              <Users className="h-5 w-5" />
              <span>
                {showWaiver 
                  ? 'Please Sign Waiver First' 
                  : !hasSelected 
                    ? 'Please Select Number of Guests' 
                    : 'Check In Now'}
              </span>
            </button>
            {showWaiver && (
              <p 
                data-testid="nowaiver-cant-checkin" 
                className="mt-2 text-sm text-red-600 mb-6"
              >
                You must sign the waiver before checking in
              </p>
            )}
            <div className="relative w-full mb-4">
              <select
                data-testid="guest-count-select"
                value={isOtherSelected ? 'other' : (hasSelected ? guestCount.toString() : '')}
                onChange={(e) => {
                  const value = e.target.value;
                  if (value === 'other') {
                    setIsOtherSelected(true);
                    setCustomGuestCount('');
                    setHasSelected(false);
                  } else {
                    setIsOtherSelected(false);
                    const numValue = parseInt(value);
                    dispatch(setGuestCount(numValue));
                    setHasSelected(true);
                  }
                }}
                className="w-full px-3 py-2 border border-gray-300 rounded-md text-center text-lg appearance-none bg-white"
              >
                <option value="" disabled selected>Select number of guests</option>
                <option value="1">1 Guest</option>
                <option value="2">2 Guests</option>
                <option value="3">3 Guests</option>
                <option value="4">4 Guests</option>
                <option value="5">5 Guests</option>
                <option value="6">6 Guests</option>
                <option value="7">7 Guests</option>
                <option value="8">8 Guests</option>
                <option value="9">9 Guests</option>
                <option value="10">10 Guests</option>
                <option value="other">Other</option>
              </select>
              <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
                <svg className="h-5 w-5 text-gray-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
                </svg>
              </div>
            </div>
            {isOtherSelected && (
              <div className="relative w-full">
                <input
                  data-testid="checkin-input"
                  ref={guestCountInputRef}
                  type="number"
                  min="1"
                  value={customGuestCount}
                  onChange={(e) => {
                    const value = e.target.value;
                    setCustomGuestCount(value);
                    if (value) {
                      const numValue = parseInt(value);
                      if (!isNaN(numValue) && numValue >= 1) {
                        dispatch(setGuestCount(numValue));
                        setHasSelected(true);
                      } else {
                        setHasSelected(false);
                      }
                    } else {
                      setHasSelected(false);
                    }
                  }}
                  onBlur={(e) => {
                    // Ensure the value is valid when focus is lost
                    const value = e.target.value;
                    if (value) {
                      const numValue = parseInt(value);
                      if (isNaN(numValue) || numValue < 1) {
                        setCustomGuestCount('');
                        setHasSelected(false);
                      }
                    } else {
                      setCustomGuestCount('');
                      setHasSelected(false);
                    }
                  }}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md text-center text-lg"
                  placeholder="Enter number of guests"
                />
              </div>
            )}
          </div>
        </div>

        <div className="bg-gray-50 p-6 rounded-lg">
          {showWaiver ? (
            <div>
              <h3 className="text-lg font-medium text-gray-900 mb-4">Liability Waiver</h3>
              <div className="flex flex-col items-center p-4">
                <img 
                  src="/assets/waiver-qr-code.png" 
                  alt="Waiver QR Code" 
                  className="w-48 h-48"
                  data-testid="waiver-qr-code"
                />
                <p className="mt-4 text-sm text-gray-600">
                  Scan this QR code to sign the waiver
                </p>
              </div>
              <div className="flex gap-3">
                <button
                  data-testid="accept-waiver-button"
                  onClick={async () => {
                    const success = await signWaiver(customer.id);
                    if (success) {
                      dispatch(updateCustomerWaiverStatus(customer.id, true));
                      dispatch(setShowWaiver(false));
                      onWaiverResponse(true);
                      setTimeout(() => {
                        guestCountInputRef.current?.focus();
                      }, 100);
                    }
                  }}
                  className="flex-1 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700"
                >
                  I've already signed
                </button>
              </div>
            </div>
          ) : (
            <div>
              <h3 
                data-testid="signwaiver-text"
                className="text-lg font-medium text-gray-900 mb-4"
              >
                Waiver Already Signed
              </h3>
              <p className="text-sm text-gray-600 mb-4">
                You have previously signed the liability waiver, Thank You!
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};