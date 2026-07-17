import React, { useState } from 'react';
import { Button, Modal } from '../common';

const ParticipantCard = ({ participant, onCheckOut }) => {
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [isCheckingOut, setIsCheckingOut] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState('digital');

  // Get initials for avatar
  const getInitials = (name) => {
    return name
      .split(' ')
      .map(word => word[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  // Handle check out confirmation
  const handleCheckOut = async () => {
    try {
      setIsCheckingOut(true);
      await onCheckOut(participant.ticket_id, paymentMethod);
      setShowConfirmModal(false);
    } catch (error) {
      console.error('Check out failed:', error);
    } finally {
      setIsCheckingOut(false);
    }
  };

  return (
    <>
      <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
        {/* Participant Info */}
        <div className="flex items-center space-x-3">
          {/* Avatar */}
          <div 
            className="w-10 h-10 rounded-full flex items-center justify-center text-white font-medium text-sm"
            style={{ backgroundColor: participant.avatar_color }}
          >
            {getInitials(participant.participant_name)}
          </div>
          
          {/* Details */}
          <div>
            <h4 className="font-medium text-gray-900">{participant.participant_name}</h4>
            <p className="text-sm text-gray-600">
              Vehicle: {participant.vehicle_reg_no} • Lot {participant.parkinglot_id} • {participant.duration}
            </p>
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center space-x-2">
          {/* Warning icon (optional - for long sessions) */}
          {participant.duration.includes('3h') && (
            <div className="w-6 h-6 bg-yellow-100 rounded-full flex items-center justify-center">
              <svg className="w-4 h-4 text-yellow-600" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
              </svg>
            </div>
          )}
          
          {/* Check Out Button */}
          <Button
            variant="danger"
            size="sm"
            onClick={() => setShowConfirmModal(true)}
            className="!p-2"
            title="Check Out Vehicle"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </Button>
        </div>
      </div>

      {/* Custom Checkout Modal */}
      <Modal
        isOpen={showConfirmModal}
        onClose={() => setShowConfirmModal(false)}
        title="Check Out Vehicle"
        size="sm"
      >
        <div className="text-center">
          {/* Warning Icon */}
          <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-yellow-100 mb-4">
            <svg
              className="h-6 w-6 text-yellow-600"
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z"
              />
            </svg>
          </div>

          {/* Message */}
          <p className="text-sm text-gray-600 mb-4">
            Are you sure you want to check out <strong>{participant.participant_name}</strong>'s vehicle ({participant.vehicle_reg_no})?
          </p>

          {/* Payment Method Selection */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Payment Method
            </label>
            <select
              value={paymentMethod}
              onChange={(e) => setPaymentMethod(e.target.value)}
              className="block text-gray-950 w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
              disabled={isCheckingOut}
            >
              <option value="digital">Digital Payment</option>
              <option value="cash">Cash</option>
              <option value="card">Card</option>
            </select>
          </div>

          {/* Action Buttons */}
          <div className="flex space-x-3 justify-center">
            <Button
              variant="outline"
              onClick={() => setShowConfirmModal(false)}
              disabled={isCheckingOut}
            >
              Cancel
            </Button>
            <Button
              variant="danger"
              onClick={handleCheckOut}
              loading={isCheckingOut}
              disabled={isCheckingOut}
            >
              Check Out
            </Button>
          </div>
        </div>
      </Modal>
    </>
  );
};

export default ParticipantCard;