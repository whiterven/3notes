import React, { useEffect, useState } from 'react';
import type { ToastMessage } from '../types';
import { CloseIcon } from './icons';

interface ToastProps extends ToastMessage {
  onClose: () => void;
}

export const Toast: React.FC<ToastProps> = ({ message, type, onClose }) => {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    // Animate in
    setVisible(true);

    const timer = setTimeout(() => {
      handleClose();
    }, 5000); // Auto-dismiss after 5 seconds

    return () => clearTimeout(timer);
  }, [message, type]); // Rerun when a new toast is shown

  const handleClose = () => {
    setVisible(false);
    // Allow time for fade-out animation before calling parent onClose
    setTimeout(onClose, 300);
  };

  const bgColor = type === 'error' ? 'bg-red-500' : 'bg-amber-700';
  
  return (
    <div
      className={`fixed bottom-5 left-1/2 -translate-x-1/2 min-w-[300px] max-w-md p-4 rounded-lg shadow-2xl text-white text-lg sm:text-xl text-center
        ${bgColor}
        transition-all duration-300 ease-in-out
        ${visible ? 'translate-y-0 opacity-100' : 'translate-y-10 opacity-0'}
      `}
      role="alert"
      aria-live="assertive"
    >
      <div className="flex items-center justify-between">
        <span>{message}</span>
        <button onClick={handleClose} className="ml-4 p-1 rounded-full hover:bg-black/20" aria-label="Dismiss">
            <CloseIcon className="w-5 h-5" />
        </button>
      </div>
    </div>
  );
};