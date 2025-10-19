
import React from 'react';
import { createPortal } from 'react-dom';
import { XCircleIcon } from './icons';

interface QuoteOverlayProps {
  onClose: () => void;
}

export const QuoteOverlay: React.FC<QuoteOverlayProps> = ({ onClose }) => {
  const email = 'contact@sandburgpartners.com';
  const subject = 'Quote for online styling app';
  const mailtoLink = `mailto:${email}?subject=${encodeURIComponent(subject)}`;

  const overlayContent = (
    <div 
      className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div 
        className="bg-white/10 backdrop-blur-md rounded-lg shadow-xl w-full max-w-lg text-center p-8 space-y-4 relative border border-white/20"
        onClick={(e) => e.stopPropagation()} // Prevent clicks inside the modal from closing it
      >
        <button 
          type="button" 
          onClick={onClose} 
          className="absolute top-4 right-4 text-gray-300 hover:text-white transition-colors"
          aria-label="Close"
        >
          <XCircleIcon className="w-8 h-8" />
        </button>
        <h2 className="text-3xl font-serif text-white">Want this on your website?</h2>
        <p className="text-lg text-gray-200">
          Send a message to Sandburg Partners for a quote:
        </p>
        <a
          href={mailtoLink}
          className="inline-block text-xl font-semibold text-brand-secondary hover:text-white underline transition-colors"
        >
          {email}
        </a>
      </div>
    </div>
  );

  return createPortal(overlayContent, document.getElementById('modal-root')!);
};
