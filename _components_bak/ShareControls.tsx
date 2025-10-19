import React from 'react';
import type { CompositeResult, TryOnInputs } from '../types';
import { generateFilename } from '../utils/imageUtils';
import { ShareIcon, MailIcon, DownloadIcon, InstagramIcon, FacebookIcon } from './icons';

const base64ToBlob = (base64: string, mimeType: string): Blob => {
  const byteCharacters = atob(base64);
  const byteNumbers = new Array(byteCharacters.length);
  for (let i = 0; i < byteCharacters.length; i++) {
    byteNumbers[i] = byteCharacters.charCodeAt(i);
  }
  const byteArray = new Uint8Array(byteNumbers);
  return new Blob([byteArray], { type: mimeType });
};

interface ShareControlsProps {
    result: CompositeResult;
    inputs: TryOnInputs;
    onRemoveWatermarkClick: () => void;
}

export const ShareControls: React.FC<ShareControlsProps> = ({ result, inputs, onRemoveWatermarkClick }) => {
  const filename = generateFilename(inputs.name, inputs.selectedHat?.name || 'hat');
  const appUrl = "https://kathryn-lee-millinery-virtual-styling-56858392501.us-west1.run.app/";

  const handleShare = async () => {
    try {
      const blob = base64ToBlob(result.mainImage, result.mimeType);
      const file = new File([blob], filename, { type: result.mimeType });
      const shareText = `Check out my new look! You can create your own with Kathryn Lee Millinery | Virtual Styling: ${appUrl}`;
      const shareTitle = 'Kathryn Lee Millinery | Virtual Styling';
      
      if (navigator.canShare && navigator.canShare({ files: [file] })) {
        await navigator.share({
          files: [file],
          title: shareTitle,
          text: shareText,
        });
      } else {
        await navigator.share({
          title: shareTitle,
          text: shareText,
          url: appUrl,
        });
      }
    } catch (error) {
      console.error('Error sharing:', error);
    }
  };
  
  const feedbackEmail = 'contact@sandburgpartners.com';
  const feedbackSubject = "Feedback on Kathryn Lee Millinery's Virtual Styling App";
  const feedbackMailto = `mailto:${feedbackEmail}?subject=${encodeURIComponent(feedbackSubject)}`;

  return (
    <div className="mt-4 lg:mt-6 space-y-2">
      <div className="flex items-center gap-4">
        <a 
          href={`data:${result.mimeType};base64,${result.mainImage}`}
          download={filename}
          className="w-full flex justify-center items-center gap-2 text-white bg-brand-accent/80 hover:bg-brand-accent focus:ring-4 focus:outline-none focus:ring-brand-accent/50 font-semibold rounded-lg text-lg px-5 py-2.5 text-center transition-colors"
          aria-label="Download Image"
          title="Download Image"
        >
          <DownloadIcon className="w-5 h-5" />
          <span>Download</span>
        </a>
        
        {navigator.share && (
            <button 
              type="button"
              onClick={handleShare}
              className="w-full flex justify-center items-center gap-2 text-brand-primary bg-transparent border border-brand-primary hover:bg-brand-primary/10 font-semibold rounded-lg text-lg px-5 py-2.5 text-center transition-colors"
              aria-label="Share"
              title="Share"
            >
              <span>Share</span>
               <span className="flex items-center gap-1.5 ml-1.5">
                <InstagramIcon className="w-5 h-5" />
                <FacebookIcon className="w-5 h-5" />
                <MailIcon className="w-5 h-5" />
              </span>
            </button>
        )}
      </div>
       <div className="flex items-center gap-4">
         <button 
          type="button"
          onClick={onRemoveWatermarkClick}
          className="w-full flex justify-center items-center gap-2 text-brand-primary bg-transparent border border-brand-primary hover:bg-brand-primary/10 font-semibold rounded-lg text-base px-5 py-2.5 text-center transition-colors"
          aria-label="Remove Watermark"
          title="Remove Watermark"
        >
          Remove Watermark
        </button>
        <a 
          href={feedbackMailto}
          className="w-full flex justify-center items-center gap-2 text-brand-primary bg-transparent border border-brand-primary hover:bg-brand-primary/10 font-semibold rounded-lg text-base px-5 py-2.5 text-center transition-colors"
          aria-label="Send Feedback"
          title="Send Feedback"
        >
          Send Feedback
        </a>
      </div>
    </div>
  );
};