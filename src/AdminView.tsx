import React, { useState } from 'react';
import { useDispatch } from 'react-redux';
import { Customer } from './types';
import { Check, X, Save, Loader2 } from 'lucide-react';
import { updateCustomerWaiverStatus } from './store';

interface AdminViewProps {
  customer: Customer;
  onClose: () => void;
}

export const AdminView: React.FC<AdminViewProps> = ({ customer, onClose }) => {
  const dispatch = useDispatch();
  const [isUpdating, setIsUpdating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const handleWaiverUpdate = async (newStatus: boolean) => {
    setIsUpdating(true);
    setError(null);
    setSuccess(null);

    try {
      const response = await fetch(`/api/waivers/set-waiver/${customer.id}?clear=${!newStatus}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-admin-action': 'true'
        }
      });

      if (!response.ok) {
        throw new Error('Failed to update waiver status');
      }

      dispatch(updateCustomerWaiverStatus(customer.id, newStatus));
      setSuccess(`Waiver status updated to ${newStatus ? 'signed' : 'unsigned'}`);
    } catch (err) {
      setError('Failed to update waiver status. Please try again.');
    } finally {
      setIsUpdating(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full">
      <div className="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-bold">Admin View</h2>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700"
          >
            <X className="h-6 w-6" />
          </button>
        </div>

        <div className="space-y-4">
          <div>
            <h3 className="font-medium text-gray-700">Customer Details</h3>
            <div className="mt-2 space-y-2">
              <p><span className="font-medium">ID:</span> {customer.id}</p>
              <p><span className="font-medium">Name:</span> {customer.firstName} {customer.lastName}</p>
              <p><span className="font-medium">Email:</span> {customer.email}</p>
              <p><span className="font-medium">Phone:</span> {customer.phone}</p>
              <p><span className="font-medium">Membership Type:</span> {customer.membershipType || 'N/A'}</p>
              <p><span className="font-medium">Lot Number:</span> {customer.lotNumber || 'N/A'}</p>
              <p><span className="font-medium">Waiver Status:</span> {customer.hasSignedWaiver ? 'Signed' : 'Not Signed'}</p>
            </div>
          </div>

          <div>
            <h3 className="font-medium text-gray-700 mb-2">Update Waiver Status</h3>
            <div className="flex space-x-2">
              <button
                onClick={() => handleWaiverUpdate(true)}
                disabled={isUpdating || customer.hasSignedWaiver}
                className={`flex-1 py-2 px-4 rounded ${
                  customer.hasSignedWaiver
                    ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                    : 'bg-green-500 text-white hover:bg-green-600'
                }`}
              >
                <Check className="h-5 w-5 mx-auto" />
              </button>
              <button
                onClick={() => handleWaiverUpdate(false)}
                disabled={isUpdating || !customer.hasSignedWaiver}
                className={`flex-1 py-2 px-4 rounded ${
                  !customer.hasSignedWaiver
                    ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                    : 'bg-red-500 text-white hover:bg-red-600'
                }`}
              >
                <X className="h-5 w-5 mx-auto" />
              </button>
            </div>
          </div>

          {isUpdating && (
            <div className="flex items-center justify-center text-gray-500">
              <Loader2 className="h-5 w-5 animate-spin mr-2" />
              <span>Updating...</span>
            </div>
          )}

          {error && (
            <div className="text-red-500 text-sm">{error}</div>
          )}

          {success && (
            <div className="text-green-500 text-sm">{success}</div>
          )}
        </div>
      </div>
    </div>
  );
}; 