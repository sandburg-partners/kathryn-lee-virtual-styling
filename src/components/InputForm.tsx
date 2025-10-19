import React, { forwardRef, useRef, useState, useEffect } from 'react';
import type { TryOnInputs, ImageData, LoadedHat, Height, BodyType, Bust, Face } from '../types';
import { Accordion } from './Accordion';
import { ImageUploader } from './ImageUploader';
import { SubmitIcon, CheckCircleIcon, XCircleIcon } from './icons';
import { HatSelector } from './HatSelector';
import { StyledSelect } from './StyledSelect';

interface InputFormProps {
  inputs: TryOnInputs;
  hats: LoadedHat[];
  areAssetsLoaded: boolean;
  onUpdate: <K extends keyof TryOnInputs>(key: K, value: TryOnInputs[K]) => void;
  onHatSelect: (hat: LoadedHat) => void;
  isFetchingExtraImages: boolean;
  onAddImages: (key: 'wardrobeImages' | 'shoesImages' | 'accessoriesImages', files: ImageData[]) => void;
  onRemoveImage: (key: keyof TryOnInputs, index?: number) => void;
  onSubmit: () => void;
  isLoading: boolean;
  isRefining: boolean;
  openAccordionIds: string[];
  onToggleAccordion: (id: string) => void;
  isDesktop: boolean;
  onUrlFetch: (textField: 'clothingText' | 'shoesText' | 'accessoriesText' | 'sceneText') => void;
  urlLoadingStates: Record<string, boolean>;
  urlErrorStates: Record<string, string | null>;
  hatSource: 'local' | 'shopify';
  showInStockOnly: boolean;
  onInStockToggle: (checked: boolean) => void;
}

const extractHatName = (fullName: string): string => {
    const match = fullName.match(/“([^”]+)”|'([^']+)'|"([^"]+)"/);
    if (match) {
      return match[1] || match[2] || match[3];
    }
    return fullName;
};

// A new stateful component to fix the typing bug and add the "use link" button.
const UrlInput = ({
  value,
  onUpdate,
  onFetch,
  isLoading,
  error,
}: {
  field: 'clothingText' | 'shoesText' | 'accessoriesText' | 'sceneText';
  value: string;
  onUpdate: (value: string) => void;
  onFetch: () => void;
  isLoading: boolean;
  error: string | null;
}) => {
  const [localValue, setLocalValue] = useState(value);

  // Sync local state if the parent state changes (e.g., cleared after fetch)
  useEffect(() => {
    if (value !== localValue) {
      setLocalValue(value);
    }
  }, [value]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value;
    setLocalValue(newValue);
    onUpdate(newValue); // Keep parent in sync
  };
  
  const isLink = localValue.startsWith('http') || localValue.startsWith('www');
  const showIcon = !!error || (isLink && !isLoading);

  return (
    <div className="w-full">
      <div className="relative">
        <input
          type="text"
          placeholder="Describe or paste link..."
          value={localValue}
          onChange={handleChange}
          onBlur={onFetch}
          disabled={isLoading}
          className={`w-full h-[42px] px-3 ${showIcon ? 'pr-10' : ''} py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-brand-accent focus:border-brand-accent transition placeholder:text-gray-600 bg-white ${isLoading ? 'bg-gray-50' : ''}`}
        />
        {error ? (
          <button
            type="button"
            onClick={() => onUpdate('')}
            className="absolute inset-y-0 right-0 flex items-center pr-3 text-red-500 hover:text-red-700 transition-colors"
            aria-label="Clear input and error"
            title="Clear input and error"
          >
            <XCircleIcon className="w-6 h-6" />
          </button>
        ) : isLink && !isLoading ? (
            <button
              type="button"
              onClick={onFetch}
              className="absolute inset-y-0 right-0 flex items-center pr-3 text-gray-400 hover:text-green-600 transition-colors"
              aria-label="Use this link"
              title="Use this link"
            >
              <CheckCircleIcon className="w-6 h-6" />
            </button>
        ) : null}
      </div>
      {isLoading && <p className="text-gray-600 text-sm mt-1">Fetching image from URL...</p>}
      {error && <p className="text-red-600 text-sm mt-1">{error}</p>}
    </div>
  );
};


export const InputForm = forwardRef<HTMLDivElement, InputFormProps>(({ inputs, hats, onUpdate, onHatSelect, isFetchingExtraImages, onAddImages, onRemoveImage, onSubmit, isLoading, isRefining, openAccordionIds, onToggleAccordion, areAssetsLoaded, isDesktop, onUrlFetch, urlLoadingStates, urlErrorStates, hatSource, showInStockOnly, onInStockToggle }, ref) => {
  
  const submitButtonRef = useRef<HTMLButtonElement>(null);
  const [isWardrobeUnlocked, setIsWardrobeUnlocked] = useState(false);

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  const isSubmitDisabled = !inputs.selectedHat || !inputs.personImage || !inputs.consent || !inputs.name || !inputs.email || !emailRegex.test(inputs.email) || isLoading || !areAssetsLoaded || isRefining || Object.values(urlLoadingStates).some(loading => loading);
  
  const scrollSubmitIntoView = () => {
    setTimeout(() => {
      submitButtonRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
    }, 100);
  };

  const handleConsentChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const isChecked = e.target.checked;
    onUpdate('consent', isChecked);
    if (isChecked) {
      scrollSubmitIntoView();
    }
  };

  const renderHatPreviews = () => {
    if (!inputs.selectedHat) return null;

    const maxImages = isDesktop ? 5 : 3;
    const imagesToDisplay = inputs.selectedHat.allImageData.slice(0, maxImages);
    const shortName = extractHatName(inputs.selectedHat.name);

    return (
      <div className="mt-2">
        <div className="flex flex-wrap gap-2">
          {imagesToDisplay.map((img, index) => (
             <div key={index} className="relative w-24 h-24 rounded-md overflow-hidden border border-gray-200">
                <img
                    src={`data:${img.mimeType};base64,${img.base64}`}
                    alt={`${img.name} view ${index + 1}`}
                    className="w-full h-full object-cover"
                />
            </div>
          ))}
          {isFetchingExtraImages && (
            <div className="w-24 h-24 rounded-md bg-gray-200 flex items-center justify-center">
               <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-brand-accent"></div>
            </div>
          )}
        </div>
        <p className="mt-2 text-gray-700 [font-size:14px]">
          Shop <a href={inputs.selectedHat.productUrl} target="_blank" rel="noopener noreferrer" className="text-brand-accent hover:underline">“{shortName}”</a> online.
        </p>
      </div>
    );
  };

  return (
    <div ref={ref} className="bg-white/50 rounded-lg shadow-lg p-2.5 lg:p-5 border border-white/30">
      <h2 className="hidden text-4xl font-serif text-brand-primary mb-6 text-center lg:text-left">Create Your Look</h2>
      <form onSubmit={(e) => { e.preventDefault(); onSubmit(); }} noValidate className="mb-0">
        
        <div className="mb-6">
            <h3 className="text-[22px] font-semibold text-brand-primary mb-2">Step 1: Select a Hat</h3>
            <HatSelector
                hats={hats}
                onSelect={onHatSelect}
                selectedHatName={inputs.selectedHat?.name || null}
                disabled={!areAssetsLoaded}
                hatSource={hatSource}
                showInStockOnly={showInStockOnly}
                onInStockToggle={onInStockToggle}
            />
            {renderHatPreviews()}
        </div>
        
        <div className="mb-6">
            <h3 className="text-[22px] font-semibold text-brand-primary">Step 2: Take or Upload a Photo</h3>
            <ImageUploader 
                onFileUpload={(file) => onUpdate('personImage', file as ImageData)}
                onFileRemove={() => onRemoveImage('personImage')}
                currentFile={inputs.personImage}
                id="person-uploader"
                allowCamera={true}
            />
            <p className="text-[14px] text-gray-700 mt-2 text-left">Kathryn Lee Millinery does not keep or store your image.</p>
        </div>
        
        <div className="my-6">
            <h3 className="text-[22px] font-semibold text-brand-primary mb-2">Step 3: Wardrobe, Styling & Body</h3>
            <Accordion
              title={<span className="text-[18px]">(Coming Soon)</span>}
              isOpen={openAccordionIds.includes('3')}
              onToggle={() => onToggleAccordion('3')}
            >
              <div className="relative">
                 {!isWardrobeUnlocked && (
                    <>
                        <div className="absolute inset-0 bg-black/20 flex items-center justify-center z-10 rounded-b-md">
                            <h2 className="text-4xl font-serif text-white drop-shadow-lg">Coming Soon</h2>
                        </div>
                        <button
                            type="button"
                            onClick={() => setIsWardrobeUnlocked(true)}
                            className="absolute top-2 right-2 z-20 text-gray-500/20 hover:text-gray-500/40 transition-colors"
                            aria-label="Unlock experimental features"
                        >
                            <span className="text-2xl font-mono" aria-hidden="true">&times;</span>
                        </button>
                    </>
                 )}
               <div className={`space-y-4 p-2.5 lg:p-4 ${!isWardrobeUnlocked ? 'pointer-events-none' : ''}`}>
                  <div>
                    <label className="block text-lg font-semibold mb-1 text-gray-700">Clothing (up to 2 images)</label>
                    <div className="grid grid-cols-2 gap-2 items-start">
                        {!inputs.clothingText && (
                            <div className={inputs.wardrobeImages.length > 0 ? 'col-span-2' : 'col-span-1'}>
                                <ImageUploader 
                                    onFileUpload={(files) => onAddImages('wardrobeImages', files as ImageData[])}
                                    onFileRemove={(index) => onRemoveImage('wardrobeImages', index)}
                                    currentFiles={inputs.wardrobeImages}
                                    id="wardrobe-uploader"
                                    multiple
                                    maxFiles={2}
                                    previewMarginClass="mb-0"
                                />
                            </div>
                        )}
                        {inputs.wardrobeImages.length === 0 && (
                            <div className={inputs.clothingText ? 'col-span-2' : 'col-span-1'}>
                                <UrlInput 
                                  field="clothingText"
                                  value={inputs.clothingText}
                                  onUpdate={(val) => onUpdate('clothingText', val)}
                                  onFetch={() => onUrlFetch('clothingText')}
                                  isLoading={urlLoadingStates.clothingText || false}
                                  error={urlErrorStates.clothingText || null}
                                />
                            </div>
                        )}
                    </div>
                  </div>
                   <div>
                    <label className="block text-lg font-semibold mb-1 text-gray-700">Shoes (1 image)</label>
                    <div className="grid grid-cols-2 gap-2 items-start">
                       {!inputs.shoesText && (
                            <div className={inputs.shoesImages.length > 0 ? 'col-span-2' : 'col-span-1'}>
                                <ImageUploader 
                                    onFileUpload={(files) => onAddImages('shoesImages', files as ImageData[])}
                                    onFileRemove={(index) => onRemoveImage('shoesImages', index)}
                                    currentFiles={inputs.shoesImages}
                                    id="shoes-uploader"
                                    maxFiles={1}
                                    previewMarginClass="mb-0"
                                    buttonText="Upload Image"
                                />
                            </div>
                        )}
                        {inputs.shoesImages.length === 0 && (
                            <div className={inputs.shoesText ? 'col-span-2' : 'col-span-1'}>
                                <UrlInput 
                                  field="shoesText"
                                  value={inputs.shoesText}
                                  onUpdate={(val) => onUpdate('shoesText', val)}
                                  onFetch={() => onUrlFetch('shoesText')}
                                  isLoading={urlLoadingStates.shoesText || false}
                                  error={urlErrorStates.shoesText || null}
                                />
                            </div>
                        )}
                    </div>
                  </div>
                  <div>
                    <label className="block text-lg font-semibold mb-1 text-gray-700">Accessories (up to 3 images)</label>
                     <div className="grid grid-cols-2 gap-2 items-start">
                        {!inputs.accessoriesText && (
                            <div className={inputs.accessoriesImages.length > 0 ? 'col-span-2' : 'col-span-1'}>
                                <ImageUploader 
                                    onFileUpload={(files) => onAddImages('accessoriesImages', files as ImageData[])}
                                    onFileRemove={(index) => onRemoveImage('accessoriesImages', index)}
                                    currentFiles={inputs.accessoriesImages}
                                    id="accessories-uploader"
                                    multiple
                                    maxFiles={3}
                                    previewMarginClass="mb-0"
                                />
                            </div>
                        )}
                        {inputs.accessoriesImages.length === 0 && (
                             <div className={inputs.accessoriesText ? 'col-span-2' : 'col-span-1'}>
                                <UrlInput
                                  field="accessoriesText"
                                  value={inputs.accessoriesText}
                                  onUpdate={(val) => onUpdate('accessoriesText', val)}
                                  onFetch={() => onUrlFetch('accessoriesText')}
                                  isLoading={urlLoadingStates.accessoriesText || false}
                                  error={urlErrorStates.accessoriesText || null}
                                />
                            </div>
                        )}
                    </div>
                  </div>
                  
                  <div>
                    <label className="block text-lg font-semibold mb-1 text-gray-700">Scene (1 image)</label>
                    <div className="grid grid-cols-2 gap-2 items-start">
                        {!inputs.sceneText && (
                           <div className={inputs.sceneImage ? 'col-span-2' : 'col-span-1'}>
                                <ImageUploader 
                                  onFileUpload={(file) => onUpdate('sceneImage', file as ImageData)}
                                  onFileRemove={() => onUpdate('sceneImage', null)}
                                  currentFile={inputs.sceneImage}
                                  id="scene-uploader"
                                  previewMarginClass="mb-0"
                                  buttonText="Upload Image"
                                />
                            </div>
                        )}
                        {inputs.sceneImage === null && (
                            <div className={inputs.sceneText ? 'col-span-2' : 'col-span-1'}>
                                <UrlInput
                                  field="sceneText"
                                  value={inputs.sceneText}
                                  onUpdate={(val) => onUpdate('sceneText', val)}
                                  onFetch={() => onUrlFetch('sceneText')}
                                  isLoading={urlLoadingStates.sceneText || false}
                                  error={urlErrorStates.sceneText || null}
                                />
                            </div>
                        )}
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4 pt-2">
                    <div>
                        <label htmlFor="height" className="block text-lg font-semibold mb-1 text-gray-700">Height</label>
                        <StyledSelect
                          value={inputs.height}
                          options={['Short', 'Average', 'Tall']}
                          onSelect={(val) => onUpdate('height', val as Height)}
                        />
                    </div>
                    <div>
                        <label htmlFor="bodyType" className="block text-lg font-semibold mb-1 text-gray-700">Body Type</label>
                        <StyledSelect
                          value={inputs.bodyType}
                          options={['Slim', 'Average', 'Athletic', 'Muscular', 'Curvy']}
                          onSelect={(val) => onUpdate('bodyType', val as BodyType)}
                        />
                    </div>
                     <div>
                        <label htmlFor="bust" className="block text-lg font-semibold mb-1 text-gray-700">Bust</label>
                         <StyledSelect
                          value={inputs.bust}
                          options={['Small', 'Medium', 'Large', 'Extra Large']}
                          onSelect={(val) => onUpdate('bust', val as Bust)}
                        />
                    </div>
                     <div>
                        <label htmlFor="face" className="block text-lg font-semibold mb-1 text-gray-700">Face</label>
                        <StyledSelect
                          value={inputs.face}
                          options={['Exact', 'Model-fy me!']}
                          onSelect={(val) => onUpdate('face', val as Face)}
                        />
                    </div>
                  </div>
                  
                  <div>
                    <label htmlFor="controlsText" className="block text-lg font-semibold mb-1 text-gray-700">Additional Creative Instructions</label>
                     <input
                      id="controlsText"
                      type="text"
                      placeholder="e.g., walking, dynamic pose, smiling..."
                      value={inputs.controlsText}
                      onChange={(e) => onUpdate('controlsText', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-brand-accent focus:border-brand-accent transition placeholder:text-gray-600 bg-white"
                    />
                  </div>
               </div>
              </div>
            </Accordion>
        </div>

        <div className="mb-6">
            <h3 className="text-[22px] font-semibold text-brand-primary">Step 4: Enter your Details</h3>
            <div className="space-y-4 pt-[7px]">
                <div>
                  <input
                    id="name"
                    type="text"
                    placeholder="Name"
                    value={inputs.name}
                    onChange={(e) => onUpdate('name', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-brand-accent focus:border-brand-accent transition placeholder:text-gray-600"
                    required
                  />
                </div>
               <div>
                  <input
                    id="email"
                    type="email"
                    placeholder="Email"
                    value={inputs.email}
                    onChange={(e) => onUpdate('email', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-brand-accent focus:border-brand-accent transition placeholder:text-gray-600"
                    required
                  />
                </div>
               <div className="flex items-start">
                  <input
                      id="consent"
                      type="checkbox"
                      checked={inputs.consent}
                      onChange={handleConsentChange}
                      className="h-4 w-4 text-brand-accent border-gray-300 rounded focus:ring-brand-accent mt-1"
                    />
                  <label htmlFor="consent" className="ml-3 block text-base text-gray-700">
                    I confirm I have the right to use this person's likeness and all uploaded intellectual property for this purpose.
                  </label>
               </div>
            </div>
        </div>

        <div className="pt-2.5">
           <button
              ref={submitButtonRef}
              type="button"
              onClick={onSubmit}
              disabled={isSubmitDisabled}
              className="w-full flex justify-center items-center gap-2 text-white bg-brand-accent/80 hover:bg-brand-accent focus:ring-4 focus:outline-none focus:ring-brand-accent/50 font-semibold rounded-lg text-xl px-5 py-3 text-center transition-colors disabled:bg-gray-400 disabled:cursor-not-allowed"
            >
              {isLoading || Object.values(urlLoadingStates).some(loading => loading) ? 'Generating...' : 'Create My Virtual Style'}
              {!isLoading && !Object.values(urlLoadingStates).some(loading => loading) && <SubmitIcon />}
            </button>
        </div>
      </form>
    </div>
  );
});
