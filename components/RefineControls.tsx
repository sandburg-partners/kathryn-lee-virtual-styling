
import React, { useState } from 'react';
import type { CompositeResult, TryOnInputs } from '../types';
import { SubmitIcon, RotateIcon } from './icons';

interface RefinementFormProps {
  isRefining: boolean;
  onRefine: (prompt: string) => void;
}

const RefinementForm: React.FC<RefinementFormProps> = ({ isRefining, onRefine }) => {
  const [prompt, setPrompt] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!prompt.trim() || isRefining) return;
    onRefine(prompt.trim());
    setPrompt('');
  };

  return (
    <div>
      <h3 className="text-xl font-serif text-brand-primary mb-2">
        Refine Your Image
      </h3>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label htmlFor="refinePrompt" className="block text-lg font-semibold mb-2 text-gray-700 sr-only">Refinement Prompt</label>
          <input
            id="refinePrompt"
            type="text"
            placeholder="Describe your changes here..."
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-brand-accent focus:border-brand-accent transition placeholder:text-gray-500"
          />
        </div>
        <button
          type="submit"
          disabled={isRefining || !prompt.trim()}
          className="w-full flex justify-center items-center gap-2 text-white bg-brand-accent/80 hover:bg-brand-accent focus:ring-4 focus:outline-none focus:ring-brand-accent/50 font-semibold rounded-lg text-lg px-5 py-2.5 text-center transition-colors disabled:bg-gray-400 disabled:cursor-not-allowed"
        >
          {isRefining ? 'Refining...' : 'Refine'}
          {!isRefining && <SubmitIcon />}
        </button>
      </form>
    </div>
  );
};


interface RefineControlsProps {
  result: CompositeResult | null;
  isRefining: boolean;
  onRefine: (prompt: string) => void;
  onStartOver: () => void;
  onRedo: () => void;
  isLoading: boolean;
  inputs: TryOnInputs;
}

export const RefineControls: React.FC<RefineControlsProps> = ({ result, isRefining, onRefine, onStartOver, onRedo, isLoading, inputs }) => {
  if (!result || isLoading) {
    return null;
  }

  return (
    <div className="mt-2.5 lg:mt-5 bg-white/80 backdrop-blur-sm shadow-lg space-y-4 p-2.5 lg:p-5 rounded-lg border border-white/30">
        <RefinementForm
            isRefining={isRefining}
            onRefine={onRefine}
        />
        
        <div className="flex items-center gap-4 pt-2 border-t border-gray-200">
          <button
            type="button"
            onClick={onRedo}
            disabled={isLoading || isRefining}
            className="w-full flex justify-center items-center gap-2 text-white bg-brand-accent/80 hover:bg-brand-accent focus:ring-4 focus:outline-none focus:ring-brand-accent/50 font-semibold rounded-lg text-lg px-5 py-2.5 text-center transition-colors disabled:bg-gray-400 disabled:cursor-not-allowed"
            aria-label="Redo initial generation with the same settings"
          >
            <SubmitIcon className="w-5 h-5" />
            Redo
          </button>
          <button
              type="button"
              onClick={onStartOver}
              className="w-full flex justify-center items-center gap-2 text-brand-primary bg-transparent border border-brand-primary hover:bg-brand-primary/10 font-semibold rounded-lg text-lg px-5 py-2.5 text-center transition-colors"
              aria-label="Start over with a new creation"
            >
              <RotateIcon className="w-5 h-5" />
              Start Over
          </button>
        </div>
    </div>
  );
};
