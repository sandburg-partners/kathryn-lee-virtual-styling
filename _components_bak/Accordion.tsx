
import React from 'react';
import { ChevronDownIcon } from './icons';

interface AccordionProps {
  title: React.ReactNode;
  children: React.ReactNode;
  isOpen: boolean;
  onToggle: () => void;
}

export const Accordion: React.FC<AccordionProps> = ({ title, children, isOpen, onToggle }) => {
  return (
    <div className="border border-brand-accent/20 rounded-md shadow-sm">
      <button
        type="button"
        onClick={onToggle}
        className={`w-full flex justify-between items-center p-2.5 lg:p-4 text-left transition-colors bg-brand-secondary hover:bg-brand-accent/10 ${isOpen ? 'rounded-t-md' : 'rounded-md'}`}
        aria-expanded={isOpen}
      >
        <span className="text-xl font-semibold text-brand-primary">{title}</span>
        <ChevronDownIcon className={`w-6 h-6 transform transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>
      {isOpen && <div className="bg-white/50 border-t border-brand-accent/20 rounded-b-md">{children}</div>}
    </div>
  );
};
