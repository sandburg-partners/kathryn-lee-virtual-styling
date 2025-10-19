import React, { useState, useEffect, forwardRef } from 'react';
import type { CompositeResult, TryOnInputs } from '../types';
import { ImageWithWatermark } from './ImageWithWatermark';
import { ShareControls } from './ShareControls';
import { QuoteOverlay } from './QuoteOverlay';

interface ResultDisplayProps {
  result: CompositeResult | null;
  isLoading: boolean;
  isRefining: boolean;
  error: string | null;
  onRetry: () => void;
  onStartOver: () => void;
  inputs: TryOnInputs;
}

const GENERATING_MESSAGES = [
  "Analyzing your portrait...",
  "Understanding your style selections...",
  "Prepping the virtual studio...",
  "Calibrating the lighting rig...",
  "Matching the hat to your features...",
  "Building the foundational scene...",
  "Styling the outfit from the hat down...",
  "Compositing your look...",
  "Weaving digital threads...",
  "Rendering fabric textures...",
  "Accessorizing your ensemble...",
  "Adjusting the hat's perspective...",
  "Harmonizing lighting and shadows...",
  "Refining facial details...",
  "Applying subtle makeup touches...",
  "Ensuring a perfect color palette...",
  "Sculpting the final pose...",
  "Perfecting the details...",
  "Adding the final high-fashion polish...",
  "Checking for photorealism...",
  "Developing the final image...",
  "Finalizing the masterpiece...",
  "Almost ready to walk the runway...",
  "Preparing for the big reveal...",
];

const REFINING_MESSAGES = [
  "Applying your refinements...",
  "Adjusting the details...",
  "Finalizing your new look...",
];

export const ResultDisplay = forwardRef<HTMLDivElement, ResultDisplayProps>(({ result, isLoading, isRefining, error, onRetry, onStartOver, inputs }, ref) => {
  const [dynamicMessage, setDynamicMessage] = useState('');
  const [isQuoteOverlayVisible, setIsQuoteOverlayVisible] = useState(false);

  // Effect for dynamic loading messages
  useEffect(() => {
    let intervalId: ReturnType<typeof setInterval> | null = null;
    
    if (isLoading || isRefining) {
      const messages = isRefining ? REFINING_MESSAGES : GENERATING_MESSAGES;
      let messageIndex = 0;
      setDynamicMessage(messages[messageIndex]);

      intervalId = setInterval(() => {
        messageIndex = (messageIndex + 1) % messages.length;
        setDynamicMessage(messages[messageIndex]);
      }, 2500); // Change message every 2.5 seconds
    }

    return () => {
      if (intervalId) {
        clearInterval(intervalId);
      }
    };
  }, [isLoading, isRefining]);
  
  const isInitialState = isLoading || !result;

  const renderCanvasContent = () => {
    if (isLoading) {
      return (
        <div className="w-full aspect-[4/5] lg:aspect-auto lg:h-[610.75px] flex flex-col items-center justify-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-brand-accent"></div>
          <p className="mt-4 text-xl text-gray-700 text-center">{dynamicMessage}</p>
        </div>
      );
    }

    // Handle errors during initial generation (when there's no result image).
    if (error && !result) {
      return (
        <div className="w-full aspect-[4/5] lg:aspect-auto lg:h-[610.75px] flex flex-col items-center justify-center p-4 bg-red-50/80 rounded-lg">
          <h3 className="text-2xl font-serif text-red-700 mb-2">Generation Failed</h3>
          <p className="text-base text-red-600 text-center whitespace-pre-wrap">
            {error}
          </p>
          <div className="mt-4 flex w-full max-w-sm gap-2">
            <button
              type="button"
              onClick={onRetry}
              className="w-full px-6 py-2 border-2 border-brand-primary text-brand-primary rounded-md hover:bg-brand-primary/10 transition"
            >
              Retry
            </button>
             <button
              type="button"
              onClick={onStartOver}
              className="w-full px-6 py-2 border-2 border-brand-primary text-brand-primary rounded-md hover:bg-brand-primary/10 transition"
            >
              Start Over
            </button>
          </div>
        </div>
      );
    }
    
    if (result) {
      return (
        <div className="relative">
          {isQuoteOverlayVisible && <QuoteOverlay onClose={() => setIsQuoteOverlayVisible(false)} />}
          <ImageWithWatermark
            src={`data:${result.mimeType};base64,${result.mainImage}`}
            alt="AI-generated virtual try-on"
          />
          {isRefining && (
            <div className="absolute inset-0 bg-white/70 flex flex-col items-center justify-center z-10">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-brand-accent"></div>
              <p className="mt-4 text-lg text-gray-700 text-center">{dynamicMessage}</p>
            </div>
          )}
          {/* Handle errors during refinement (when there IS a result image already). */}
          {error && !isRefining && (
             <div className="absolute inset-0 bg-red-50/80 flex flex-col items-center justify-center z-10 p-4 rounded-lg">
                <h3 className="text-2xl font-serif text-red-700 mb-2">Update Failed</h3>
                <p className="text-base text-red-600 text-center whitespace-pre-wrap">
                    {error}
                </p>
                <div className="mt-4 flex w-full max-w-sm gap-2">
                    <button
                        type="button"
                        onClick={onRetry}
                        className="w-full px-6 py-2 border-2 border-brand-primary text-brand-primary rounded-md hover:bg-brand-primary/10 transition"
                    >
                        Retry
                    </button>
                     <button
                      type="button"
                      onClick={onStartOver}
                      className="w-full px-6 py-2 border-2 border-brand-primary text-brand-primary rounded-md hover:bg-brand-primary/10 transition"
                    >
                      Start Over
                    </button>
                </div>
            </div>
          )}
        </div>
      );
    }

    // Default placeholder
    return (
        <div className="w-full aspect-[4/5] lg:aspect-auto lg:h-[610.75px] flex flex-col items-center justify-center text-center border-2 border-dashed border-brand-accent rounded-lg p-4">
           <svg xmlns="http://www.w3.org/2000/svg" className="h-16 w-16 mb-4 text-gray-500 mx-auto" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
          </svg>
          <h3 className="text-2xl font-serif font-semibold text-brand-primary text-center">Your Masterpiece Awaits</h3>
          <p className="mt-2 text-lg text-gray-700 text-center">Fill out the form to generate your AI-powered virtual styling image.</p>
        </div>
    );
  };
  
  const containerClassName = `relative w-full bg-white/50 rounded-lg overflow-hidden shadow-lg border border-white/30 p-2.5 lg:p-[17.5px] ${isInitialState ? 'lg:h-[645.75px]' : ''}`;

  return (
    <div ref={ref} className="lg:sticky top-0 space-y-6">
      <div className={containerClassName}>
        {renderCanvasContent()}
        <div className="">
            {result && !isLoading && !isRefining && !error && (
            <ShareControls 
                result={result} 
                inputs={inputs} 
                onRemoveWatermarkClick={() => setIsQuoteOverlayVisible(true)}
            />
            )}
        </div>
      </div>
    </div>
  );
});