import React, { useState, useRef, useEffect } from 'react';
import { ChevronDownIcon } from './icons';

interface StyledSelectProps {
  options: string[];
  value: string;
  onSelect: (value: string) => void;
  disabled?: boolean;
}

export const StyledSelect: React.FC<StyledSelectProps> = ({ options, value, onSelect, disabled = false }) => {
  const [isOpen, setIsOpen] = useState(false);
  const wrapperRef = useRef<HTMLDivElement>(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [wrapperRef]);
  
  const handleSelect = (option: string) => {
    onSelect(option);
    setIsOpen(false);
  };

  return (
    <div className="relative" ref={wrapperRef}>
      <button
        type="button"
        disabled={disabled}
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex justify-between items-center px-3 py-2 border border-gray-300 rounded-md bg-white focus:outline-none focus:ring-brand-accent focus:border-brand-accent transition disabled:bg-gray-100 disabled:cursor-not-allowed"
      >
        <span className="text-lg text-gray-700 truncate pr-2">{value}</span>
        <ChevronDownIcon className={`w-6 h-6 transform transition-transform flex-shrink-0 ${isOpen ? 'rotate-180' : ''}`} />
      </button>
      
      {isOpen && (
        <div className="absolute z-40 w-full mt-1 bg-white border border-gray-200 rounded-md shadow-lg flex flex-col max-h-60">
          <ul className="py-1 overflow-y-auto">
            {options.map((option) => (
              <li
                key={option}
                onClick={() => handleSelect(option)}
                className="flex items-center px-4 py-2 text-lg text-gray-800 hover:bg-brand-secondary cursor-pointer"
              >
                {option}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
};