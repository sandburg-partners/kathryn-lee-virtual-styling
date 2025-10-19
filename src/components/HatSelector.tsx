  import React, { useState, useRef, useEffect } from 'react';
  import type { LoadedHat } from '../types';
  import { ChevronDownIcon } from './icons';

  interface HatSelectorProps {
    hats: LoadedHat[];
    onSelect: (hat: LoadedHat) => void;
    selectedHatName: string | null;
    disabled: boolean;
    hatSource: 'local' | 'shopify';
    showInStockOnly: boolean;
    onInStockToggle: (checked: boolean) => void;
  }

  const getIsMobilePortrait = () => {
      if (typeof window === 'undefined') return false;
      // Using lg breakpoint (1024px) consistent with the rest of the app for mobile detection
      return window.innerWidth < 1024 && window.innerHeight > window.innerWidth;
  };


  export const HatSelector: React.FC<HatSelectorProps> = ({ hats, onSelect, selectedHatName, disabled, hatSource, showInStockOnly, onInStockToggle }) => {
    const [isOpen, setIsOpen] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const wrapperRef = useRef<HTMLDivElement>(null);
    const searchInputRef = useRef<HTMLInputElement>(null);
    const selectedHatRef = useRef<HTMLLIElement>(null);
    const [isMobilePortrait, setIsMobilePortrait] = useState(getIsMobilePortrait);

    // Update mobile portrait status on resize
    useEffect(() => {
      const handleResize = () => {
        setIsMobilePortrait(getIsMobilePortrait());
      };
      window.addEventListener('resize', handleResize);
      return () => window.removeEventListener('resize', handleResize);
    }, []);

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
    
    // Handle focusing search on desktop, resetting search term, and scrolling to selected
    useEffect(() => {
      if (isOpen) {
          // Scroll to selected hat
          if (selectedHatRef.current) {
              const timer = setTimeout(() => {
                  selectedHatRef.current?.scrollIntoView({
                      behavior: 'auto', // Use auto for instant scroll
                      block: 'nearest'
                  });
              }, 50); // Small delay to ensure the list is rendered
              return () => clearTimeout(timer);
          }
          
          // Autofocus search on desktop
          if (window.innerWidth >= 1024) { 
              const timer = setTimeout(() => searchInputRef.current?.focus(), 100);
              return () => clearTimeout(timer);
          }
      } else {
          setSearchTerm(''); // Reset search when dropdown closes
      }
    }, [isOpen, selectedHatName]);

    const handleToggleOpen = () => {
      const nextIsOpen = !isOpen;
      setIsOpen(nextIsOpen);
      // On mobile, scroll into view immediately when opening
      if (nextIsOpen && window.innerWidth < 1024) {
        // requestAnimationFrame ensures the scroll happens smoothly after the open state is processed.
        requestAnimationFrame(() => {
          wrapperRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
        });
      }
    };
    
    const handleSelect = (hat: LoadedHat) => {
      onSelect(hat);
      setIsOpen(false);
    };

    const filteredHats = hats.filter(hat => 
      hat.name.toLowerCase().includes(searchTerm.toLowerCase())
    );
    
    const truncateName = (name: string) => {
      if (isMobilePortrait && name.length > 50) {
        return name.substring(0, 50) + '...';
      }
      return name;
    };

    const placeholderText = selectedHatName ? selectedHatName : 
      hatSource === 'shopify' ? 'Select a hat from the shop...' : 'Select a hat from the list...';

  return (
    <div className="relative" ref={wrapperRef}>
      <button
        type="button"
        disabled={disabled}
        onClick={handleToggleOpen}
        className="w-full flex justify-start items-center px-3 py-2 border border-gray-300 rounded-md bg-white focus:outline-none focus:ring-brand-accent focus:border-brand-accent transition disabled:bg-gray-100 disabled:cursor-wait"
      >
        <span className="text-lg text-gray-700 truncate flex-1 text-left">{disabled ? 'Loading hats...' : placeholderText}</span>
        <ChevronDownIcon className={`w-6 h-6 transform transition-transform flex-shrink-0 ${isOpen ? 'rotate-180' : ''}`} />
      </button>
      
      {isOpen && (
        <div className="absolute z-50 w-full mt-1 bg-white border border-gray-200 rounded-md shadow-lg flex flex-col max-h-[40rem]">
          <div className="p-2 border-b border-gray-200 sticky top-0 bg-white space-y-2">
            <input
              ref={searchInputRef}
              type="text"
              placeholder="Search by name, style, or colour..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-brand-accent focus:border-brand-accent transition placeholder:text-gray-600"
            />
            {hatSource === 'shopify' && (
              <div className="flex items-center px-1">
                <input
                  id="in-stock-checkbox"
                  type="checkbox"
                  checked={showInStockOnly}
                  onChange={(e) => onInStockToggle(e.target.checked)}
                  className="h-4 w-4 text-brand-accent border-gray-300 rounded focus:ring-brand-accent"
                />
                <label htmlFor="in-stock-checkbox" className="ml-2 block text-base text-gray-700">
                  Show In Stock Hats Only
                </label>
              </div>
            )}
          </div>
          <ul className="py-1 overflow-y-auto">
            {filteredHats.length > 0 ? (
              filteredHats.map((hat) => (
                <li
                  key={hat.id}
                  ref={hat.name === selectedHatName ? selectedHatRef : null}
                  onClick={() => handleSelect(hat)}
                  className={`flex items-center px-4 py-2 text-lg text-gray-800 hover:bg-brand-secondary cursor-pointer ${hat.name === selectedHatName ? 'bg-brand-secondary' : ''}`}
                >
                  <img src={`data:${hat.imageData.mimeType};base64,${hat.imageData.base64}`} alt={hat.name} className="w-12 h-12 object-cover mr-4 rounded-sm flex-shrink-0" />
                  <span>{truncateName(hat.name)}</span>
                </li>
              ))
            ) : (
              <li className="px-4 py-2 text-lg text-gray-700">{showInStockOnly ? 'No in-stock hats found.' : 'No hats found.'}</li>
            )}
          </ul>
        </div>
      )}
    </div>
  );
  };