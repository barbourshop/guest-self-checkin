import React, { useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { X, Users, FileText } from 'lucide-react';
import { RootState } from './App'; // Assuming RootState is exported from App.tsx
import { Customer } from './types';
import { signWaiver } from './api';
import { WAIVER_TEXT } from './constants';

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
  onReset
}: CustomerDetailProps) => {
  return (
    <div className="bg-white rounded-lg shadow-md p-6">
      <div className="flex justify-between items-start mb-6">
        <h2 className="text-2xl font-bold text-gray-900">
          Welcome, {customer.firstName}!
        </h2>
        <button
          onClick={() => dispatch(resetState())}
          className="text-gray-400 hover:text-gray-500"
          aria-label="Close"
        >
          <X className="h-6 w-6" />
        </button>
      </div>
      
      <div className="grid md:grid-cols-2 gap-6">
        <div className="bg-gray-50 p-6 rounded-lg">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Check In</h3>
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Number of guests (including you)
            </label>
            <input
              data-testid="checkin-input"
              type="number"
              min="1"
              max="10"
              value={guestCount}
              onChange={(e) => dispatch(setGuestCount(Math.max(1, parseInt(e.target.value) || 1)))}
              className="w-full px-3 py-2 border border-gray-300 rounded-md"
            />
          </div>
          <button
            data-testid="checkin-button"
            onClick={() => dispatch(setShowConfirmation(true))}
            disabled={showWaiver}
            className={`w-full py-3 rounded-lg flex items-center justify-center gap-2 ${
              !showWaiver 
                ? 'bg-blue-600 text-white hover:bg-blue-700' 
                : 'bg-gray-300 text-gray-500 cursor-not-allowed'
            }`}
          >
            <Users className="h-5 w-5" />
            <span>{showWaiver ? 'Please Sign Waiver First' : 'Check In Now'}</span>
          </button>
          {showWaiver && (
            <p 
              data-testid="nowaiver-cant-checkin" 
              className="mt-2 text-sm text-red-600"
            >
              You must sign the waiver before checking in
            </p>
          )}
        </div>

        <div className="bg-gray-50 p-6 rounded-lg">
          {showWaiver ? (
            <div>
              <h3 className="text-lg font-medium text-gray-900 mb-4">Liability Waiver</h3>
              <div className="bg-white p-4 rounded-md mb-4 h-48 overflow-y-auto text-sm text-gray-600">
                {WAIVER_TEXT}
              </div>
              <div className="flex gap-3">
                <button
                  data-testid="accept-waiver-button"
                  onClick={async () => {
                    const success = await signWaiver(customer.id);
                    if (success) {
                      dispatch(updateCustomerWaiverStatus(customer.id, true));
                      dispatch(setShowWaiver(false));
                      dispatch(setShowConfirmation(true));
                    }
                  }}
                  className="flex-1 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700"
                >
                  Accept
                </button>
                <button
                  data-testid="decline-waiver-button"
                  onClick={() => dispatch(resetState())}
                  className="flex-1 py-3 bg-red-600 text-white rounded-lg hover:bg-red-700"
                >
                  Decline
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
              {/* <button
                data-testid="signwaiver-button"
                onClick={() => dispatch(setShowWaiver(true))}
                className="w-full py-3 bg-gray-600 text-white rounded-lg hover:bg-gray-700 flex items-center justify-center gap-2"
              >
                <FileText className="h-5 w-5" />
                <span>View Waiver</span>
              </button> */}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};