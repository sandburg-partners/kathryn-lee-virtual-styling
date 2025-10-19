import React from 'react';

export const Header: React.FC = () => {
  return (
    <header className="text-center">
        <h1 className="hidden text-5xl lg:text-7xl font-serif text-brand-primary tracking-wider">Kathryn Lee Millinery</h1>
        <p className="hidden text-3xl md:text-5xl lg:text-6xl text-brand-accent mt-4">AI-Powered Virtual Styling</p>
    </header>
  );
};