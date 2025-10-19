import React, { useState, useRef, useCallback, useEffect, useMemo } from 'react';
import { Header } from './components/Header';
import { InputForm } from './components/InputForm';
import { ResultDisplay } from './components/ResultDisplay';
import { RefineControls } from './components/RefineControls';
import { generateComposite, refineComposite } from './services/geminiService';
import { fetchShopifyHats } from './services/shopifyService';
import type { TryOnInputs, CompositeResult, ImageData, LoadedHat, Hat } from './types';
import { DEFAULT_NEGATIVE_PROMPT } from './constants';
import { hats as localHats } from './data/hats';
import { generateFilename, compressImage, urlToImageData, applyWatermark, createReferenceSheet, processOptionalImage } from './utils/imageUtils';

const INITIAL_INPUTS: TryOnInputs = {
  selectedHat: null,
  personImage: null,
  wardrobeImages: [],
  clothingText: '',
  shoesImages: [],
  shoesText: '',
  accessoriesImages: [],
  accessoriesText: '',
  sceneImage: null,
  sceneText: '',
  controlsText: '',
  negativePrompt: DEFAULT_NEGATIVE_PROMPT,
  consent: false,
  name: '',
  email: '',
  height: 'Average',
  bodyType: 'Average',
  bust: 'Medium',
  face: 'Exact',
};

const sendEmailWithAttachment = async (
    recipientEmail: string,
    name: string,
    hatTitle: string,
    hatSlug: string,
    hatUrl: string,
    base64: string,
    mimeType: string,
    filename: string
) => {
    const endpoint = 'https://email-proxy-gw-q4c0ofp.ts.gateway.dev/send-email?key=AIzaSyBtttorFtbSCz3kjblYlSgyTfdtkDCID3A';
    const body = JSON.stringify({
        name,
        userEmail: recipientEmail, // This is always the 'to' address and the user's email for the body
        hatTitle,
        hatSlug,
        hatUrl,
        imageBase64: `data:${mimeType};base64,${base64}`,
        filename,
    });

    const response = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body,
    });

    if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Failed to send email: ${errorText}`);
    }
};

const fetchImageFromUrl = async (url: string): Promise<ImageData | null> => {
    try {
        const endpoint = `https://email-proxy-gw-q4c0ofp.ts.gateway.dev/fetch-image-from-url`;
        const body = JSON.stringify({ url });

        const response = await fetch(endpoint, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body,
        });
        
        if (!response.ok) {
            const errorData = await response.json().catch(() => ({ details: `Server returned status ${response.status}. Please check the link.` }));
            console.error(`Failed to fetch image from URL: ${url}. Status: ${response.status}. Details: ${errorData.details}`);
            throw new Error(errorData.details || `Server returned status ${response.status}`);
        }

        const data = await response.json();
        return {
            base64: data.base64,
            mimeType: data.mimeType,
            name: 'image-from-url.jpg'
        };
    } catch (error: any) {
        console.error("Error calling fetchImageFromUrl endpoint:", error);
        if (error instanceof Error) {
          throw error;
        }
        throw new Error('A network error occurred. Please check your connection.');
    }
};


function App() {
  const [inputs, setInputs] = useState<TryOnInputs>(INITIAL_INPUTS);
  const [result, setResult] = useState<CompositeResult | null>(null);
  const [rawResult, setRawResult] = useState<CompositeResult | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isRefining, setIsRefining] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastFailedAction, setLastFailedAction] = useState<{ type: 'submit' | 'refine', prompt?: string } | null>(null);
  const [emailStatus, setEmailStatus] = useState<'idle' | 'sending' | 'sent' | 'error'>('idle');
  const [openAccordionIds, setOpenAccordionIds] = useState<string[]>(['1']);
  const [shuffledHats, setShuffledHats] = useState<LoadedHat[]>([]);
  const [watermarkImage, setWatermarkImage] = useState<ImageData | null>(null);
  const [areAssetsLoaded, setAreAssetsLoaded] = useState(false);
  const [isFetchingExtraImages, setIsFetchingExtraImages] = useState(false);
  const [isDesktop, setIsDesktop] = useState(window.innerWidth >= 1024);
  const [urlLoadingStates, setUrlLoadingStates] = useState<Record<string, boolean>>({});
  const [urlErrorStates, setUrlErrorStates] = useState<Record<string, string | null>>({});

  const [showInStockOnly, setShowInStockOnly] = useState(false);
  const [hatSource, setHatSource] = useState<'local' | 'shopify'>('local');

  const resultRef = useRef<HTMLDivElement>(null);
  const formRef = useRef<HTMLDivElement>(null);

  const handleUpdate = useCallback(async <K extends keyof TryOnInputs>(key: K, value: TryOnInputs[K]) => {
    // Immediately clear the error for a URL field when the user starts typing in it again.
    const urlTextFields: (keyof TryOnInputs)[] = ['clothingText', 'shoesText', 'accessoriesText', 'sceneText'];
    if (urlTextFields.includes(key)) {
      setUrlErrorStates(prev => ({ ...prev, [key]: null }));
    }
    setInputs(prev => ({ ...prev, [key]: value }));
  }, []);

  const handleToggleAccordion = (id: string) => {
    setOpenAccordionIds(prev =>
      prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
    );
  };

  const handleAddImages = useCallback(async (key: 'wardrobeImages' | 'shoesImages' | 'accessoriesImages', newImages: ImageData[]) => {
    try {
        setIsLoading(true);
        const processedImages = await Promise.all(newImages.map(processOptionalImage));
        
        setInputs(prev => {
          const limits = {
            wardrobeImages: 2,
            shoesImages: 1,
            accessoriesImages: 3,
          };
          const newKeyInputs = {
            ...prev,
            [key]: [...prev[key], ...processedImages].slice(0, limits[key]),
          };
          if (key === 'wardrobeImages') newKeyInputs.clothingText = '';
          if (key === 'shoesImages') newKeyInputs.shoesText = '';
          if (key === 'accessoriesImages') newKeyInputs.accessoriesText = '';
          return newKeyInputs;
        });
    } catch (error) {
        console.error("Error processing optional images:", error);
        setError("There was an error processing one of your images. Please try a different one.");
    } finally {
        setIsLoading(false);
    }
  }, []);

  const handleRemoveImage = useCallback((key: keyof TryOnInputs, index?: number) => {
    setInputs(prev => {
      if (typeof index === 'number' && Array.isArray(prev[key])) {
        const currentImages = prev[key] as ImageData[];
        return { ...prev, [key]: currentImages.filter((_, i) => i !== index) };
      }
      return { ...prev, [key]: null };
    });
  }, []);
  
  const handleUrlFetch = useCallback(async (textField: 'clothingText' | 'shoesText' | 'accessoriesText' | 'sceneText') => {
    const textValue = inputs[textField];
    const urlRegex = /(https?:\/\/[^\s]+|www\.[^\s]+)/g;
    const match = textValue.match(urlRegex);

    if (!match || match.length === 0) return;

    let url = match[0];
    if (url.startsWith('www.')) {
      url = `https://${url}`;
    }
    
    const imageFieldMap = {
      clothingText: 'wardrobeImages',
      shoesText: 'shoesImages',
      accessoriesText: 'accessoriesImages',
      sceneText: 'sceneImage'
    };
    const imageField = imageFieldMap[textField] as keyof TryOnInputs;

    setUrlLoadingStates(prev => ({ ...prev, [textField]: true }));
    setUrlErrorStates(prev => ({ ...prev, [textField]: null }));

    try {
      const fetchedImage = await fetchImageFromUrl(url);
      if (fetchedImage) {
        const processedImage = await processOptionalImage(fetchedImage);
        
        setInputs(prev => {
          const newInputs = { ...prev, [textField]: '' }; // Clear text field
          if (imageField === 'sceneImage') {
            (newInputs as any)[imageField] = processedImage;
          } else if (Array.isArray(newInputs[imageField])) {
            const currentImages = newInputs[imageField] as ImageData[];
            const maxImages = { clothingText: 2, shoesText: 1, accessoriesText: 3, sceneText: 1 };
            (newInputs[imageField] as ImageData[]) = [...currentImages, processedImage].slice(0, maxImages[textField]);
          }
          return newInputs;
        });
      } else {
        throw new Error("Could not fetch a valid image from this link.");
      }
    } catch (error: any) {
      console.error(`Failed to fetch image from ${url}:`, error);
      setUrlErrorStates(prev => ({ ...prev, [textField]: error.message || "Failed to fetch. Please paste image link, or upload image file." }));
    } finally {
      setUrlLoadingStates(prev => ({ ...prev, [textField]: false }));
    }
  }, [inputs]);
  
  const scrollToResult = () => {
    setTimeout(() => {
        resultRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 100);
  };
  
  const processAndSetResult = async (apiResult: CompositeResult): Promise<CompositeResult> => {
      let processedResult = { ...apiResult };

      if (watermarkImage) {
        processedResult.mainImage = await applyWatermark(
            processedResult.mainImage,
            processedResult.mimeType,
            watermarkImage
        );
        processedResult.mimeType = 'image/jpeg';
      }

      const compressedBase64 = await compressImage(processedResult.mainImage, processedResult.mimeType, 500);
      processedResult = {
        ...processedResult,
        mainImage: compressedBase64,
        mimeType: 'image/jpeg',
      };
      
      setResult(processedResult);
      return processedResult;
  };

  const handleSubmit = async () => {
    setOpenAccordionIds([]); // Collapse accordions immediately on submit
    setIsLoading(true);
    setResult(null);
    setRawResult(null);
    setError(null);
    setLastFailedAction(null);
    setEmailStatus('idle');
    scrollToResult();

    try {
      if (!inputs.personImage || !inputs.selectedHat) {
        throw new Error("Missing person image or selected hat.");
      }
      
      const referenceSheet = await createReferenceSheet(inputs.personImage, inputs.selectedHat.allImageData);

      const apiResult = await generateComposite(referenceSheet, inputs);
      setRawResult(apiResult);
      
      const finalImageResult = await processAndSetResult(apiResult);
      
      setEmailStatus('sending');
      try {
        const hatTitle = inputs.selectedHat?.name || 'hat';
        const hatSlug = inputs.selectedHat?.hatSlug || '';
        const hatUrl = inputs.selectedHat?.productUrl || '';
        const filename = generateFilename(inputs.name, hatTitle);
        await sendEmailWithAttachment(
            inputs.email,
            inputs.name,
            hatTitle,
            hatSlug,
            hatUrl,
            finalImageResult.mainImage,
            finalImageResult.mimeType,
            filename
        );
        setEmailStatus('sent');
      } catch (emailError) {
        console.error("Error sending email:", emailError);
        setEmailStatus('error');
      }

    } catch (err: any) {
      const errorMessage = err.message || 'An unexpected error occurred during image generation.';
      setError(errorMessage);
      setLastFailedAction({ type: 'submit' });
    } finally {
      setIsLoading(false);
    }
  };

  const handleRefine = async (prompt: string) => {
    if (!rawResult || !inputs.selectedHat) return;
    setIsRefining(true);
    setError(null);
    setLastFailedAction(null);
    setEmailStatus('idle');
    scrollToResult();

    try {
      const apiResult = await refineComposite(rawResult, prompt);
      setRawResult(apiResult);
      
      const finalImageResult = await processAndSetResult(apiResult);
      setIsRefining(false); 
      
      // Send email in the background without blocking the UI
      setEmailStatus('sending');
      try {
        const hatTitle = `${inputs.selectedHat?.name || 'hat'} (Refined)`;
        const hatSlug = inputs.selectedHat?.hatSlug || '';
        const hatUrl = inputs.selectedHat?.productUrl || '';
        const filename = generateFilename(inputs.name, `${inputs.selectedHat?.name || 'hat'}-refined`);
        await sendEmailWithAttachment(
          inputs.email, 
          inputs.name,
          hatTitle,
          hatSlug,
          hatUrl,
          finalImageResult.mainImage,
          finalImageResult.mimeType,
          filename
        );
        setEmailStatus('sent');
        console.log('Refined image sent to customer and BCCed for tracking.');
      } catch (emailError) {
        setEmailStatus('error');
        console.error("Error sending refined image:", emailError);
      }

    } catch (err: any) {
      const errorMessage = err.message || 'An unexpected error occurred during image refinement.';
      setError(errorMessage);
      setLastFailedAction({ type: 'refine', prompt });
      setIsRefining(false); 
    }
  };

  const handleRetry = () => {
    if (!lastFailedAction) return;
    setError(null); 
    if (lastFailedAction.type === 'submit') {
      handleSubmit();
    } else if (lastFailedAction.type === 'refine' && lastFailedAction.prompt) {
      handleRefine(lastFailedAction.prompt);
    }
  };

  const handleStartOver = () => {
    setInputs(prev => ({
      ...INITIAL_INPUTS,
      name: prev.name,
      email: prev.email,
    }));
    setResult(null);
    setRawResult(null);
    setError(null);
    setLastFailedAction(null);
    setIsLoading(false);
    setIsRefining(false);
    setEmailStatus('idle');
    setOpenAccordionIds(['1']);
    // Do not reset the shuffle on Start Over, only on page reload.
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };
  
  const handleHatSelect = useCallback(async (hat: LoadedHat) => {
    handleUpdate('selectedHat', hat);
    
    const maxImages = isDesktop ? 5 : 3;

    if (hat.allImageData.length < hat.imageUrls.length && hat.allImageData.length < maxImages) {
      setIsFetchingExtraImages(true);
      try {
        const extraImageUrls = hat.imageUrls.slice(1, maxImages);
        const extraImagePromises = extraImageUrls.map(url => urlToImageData(url, hat.name));
        const loadedExtraImages = await Promise.all(extraImagePromises);
        
        setShuffledHats(prevHats => {
            const newHats = [...prevHats];
            const hatIndex = newHats.findIndex(h => h.id === hat.id);
            if (hatIndex !== -1) {
                const updatedHat = { ...newHats[hatIndex], allImageData: [newHats[hatIndex].imageData, ...loadedExtraImages]};
                newHats[hatIndex] = updatedHat;
                // Update the selected hat in the main state as well
                setInputs(prevInputs => {
                    if (prevInputs.selectedHat?.id === updatedHat.id) {
                        return { ...prevInputs, selectedHat: updatedHat };
                    }
                    return prevInputs;
                });
            }
            return newHats;
        });

      } catch (error) {
        console.error(`Failed to load extra images for ${hat.name}:`, error);
      } finally {
        setIsFetchingExtraImages(false);
      }
    }
  }, [handleUpdate, isDesktop]);

  useEffect(() => {
    const handleResize = () => {
        setIsDesktop(window.innerWidth >= 1024);
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => {
      if (result?.metadata?.warnings && result.metadata.warnings.length > 0) {
          const warningText = result.metadata.warnings.join(' ');
          console.warn("Informational text from API:", warningText);
      }
  }, [result]);
  
  useEffect(() => {
    const loadHatData = async () => {
      try {
        const WATERMARK_URL = 'https://cdn.shopify.com/s/files/1/0433/3784/2847/files/AI-Powered_Virtual_Styling_at_Kathryn_Lee_Millinery.png?v=1757898632';
        const watermarkPromise = urlToImageData(WATERMARK_URL, 'watermark');
        
        let hatsToLoad: Hat[] = localHats;
        console.log("Attempting to fetch hats from Shopify...");
        const shopifyHats = await fetchShopifyHats();

        if (shopifyHats && shopifyHats.length > 0) {
          console.log("Successfully fetched hats from Shopify.");
          hatsToLoad = shopifyHats;
          setHatSource('shopify');
        } else {
          console.log("Shopify fetch failed or returned no hats. Falling back to local data.");
          setHatSource('local');
        }

        const hatPromises = hatsToLoad.map(hat => urlToImageData(hat.imageUrls[0], hat.name));
        
        const [loadedHatThumbnails, watermarkData] = await Promise.all([
          Promise.all(hatPromises),
          watermarkPromise
        ]);

        const allHatsWithImages = hatsToLoad.map((hat, index) => ({
          ...hat,
          imageData: loadedHatThumbnails[index],
          allImageData: [loadedHatThumbnails[index]], 
        }));
        
        // Shuffle immediately after loading
        const shuffled = [...allHatsWithImages];
        for (let i = shuffled.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
        }

        setShuffledHats(shuffled);
        setWatermarkImage(watermarkData);
        setAreAssetsLoaded(true);
      } catch (error) {
        console.error("Failed to preload assets:", error);
        setError("Failed to load required assets. Please refresh the page.");
      }
    };
    loadHatData();
  }, []);

  const displayedHats = useMemo(() => {
    if (hatSource === 'shopify' && showInStockOnly) {
      return shuffledHats.filter(h => h.availableForSale);
    }
    return shuffledHats;
  }, [shuffledHats, showInStockOnly, hatSource]);

  return (
    <div className="bg-brand-secondary min-h-screen font-sans text-gray-800">
      <Header />
      <main className="w-full p-2.5">
        <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-2 lg:gap-12">
          {/* Left Column */}
          <div className="relative z-10">
            <InputForm
              ref={formRef}
              inputs={inputs}
              hats={displayedHats}
              areAssetsLoaded={areAssetsLoaded}
              onUpdate={handleUpdate}
              onAddImages={handleAddImages}
              onRemoveImage={handleRemoveImage}
              onSubmit={handleSubmit}
              isLoading={isLoading}
              isRefining={isRefining}
              isFetchingExtraImages={isFetchingExtraImages}
              onHatSelect={handleHatSelect}
              openAccordionIds={openAccordionIds}
              onToggleAccordion={handleToggleAccordion}
              isDesktop={isDesktop}
              onUrlFetch={handleUrlFetch}
              urlLoadingStates={urlLoadingStates}
              urlErrorStates={urlErrorStates}
              hatSource={hatSource}
              showInStockOnly={showInStockOnly}
              onInStockToggle={setShowInStockOnly}
            />
            {/* Refine Controls for DESKTOP */}
            <div className="hidden lg:block">
              {result && !isLoading && (
                <RefineControls
                  result={result}
                  isRefining={isRefining}
                  onRefine={handleRefine}
                  onStartOver={handleStartOver}
                  onRedo={handleSubmit}
                  isLoading={isLoading}
                  inputs={inputs}
                />
              )}
            </div>
          </div>
           {/* Right Column */}
          <div className="mt-2.5 lg:mt-0">
            <ResultDisplay
              ref={resultRef}
              result={result}
              isLoading={isLoading}
              isRefining={isRefining}
              error={error}
              onRetry={handleRetry}
              onStartOver={handleStartOver}
              inputs={inputs}
            />
            {/* Refine Controls for MOBILE */}
            <div className="lg:hidden">
              {result && !isLoading && (
                <RefineControls
                  result={result}
                  isRefining={isRefining}
                  onRefine={handleRefine}
                  onStartOver={handleStartOver}
                  onRedo={handleSubmit}
                  isLoading={isLoading}
                  inputs={inputs}
                />
              )}
            </div>
          </div>
        </div>
      </main>
      <footer className="text-center py-2.5 lg:py-6 border-t mt-2.5 lg:mt-8 max-w-7xl mx-auto px-2.5">
        <p className="text-[15px] text-gray-700 mb-1">
          Built by <a href="https://www.sandburgpartners.com/?utm_source=klm" target="_blank" rel="noopener noreferrer" className="text-brand-accent hover:underline">Sandburg Partners</a>.
        </p>
        <p className="text-[13px] text-gray-700">&copy; {new Date().getFullYear()} Kathryn Lee Millinery. All Rights Reserved.</p>
      </footer>
    </div>
  );
}

export default App;
