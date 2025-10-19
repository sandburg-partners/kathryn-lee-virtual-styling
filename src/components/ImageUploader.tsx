import React, { useCallback, useRef, useState } from 'react';
import type { ImageData } from '../types';
import { UploadIcon, TrashIcon, CameraIcon } from './icons';
import { CameraCapture } from './CameraCapture';
import { detectInAppBrowser, BrowserType } from '../utils/environment';

interface ImageUploaderProps {
  id: string;
  multiple?: boolean;
  maxFiles?: number;
  onFileUpload: (file: ImageData | ImageData[]) => void;
  onFileRemove: (index?: number) => void;
  currentFile?: ImageData | null;
  currentFiles?: ImageData[];
  allowCamera?: boolean;
  previewMarginClass?: string;
  buttonText?: string;
}

const fileToBase64 = (file: File): Promise<ImageData> => {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = () => {
            const base64String = (reader.result as string).split(',')[1];
            resolve({ base64: base64String, mimeType: file.type, name: file.name });
        };
        reader.onerror = error => reject(error);
    });
};

export const ImageUploader: React.FC<ImageUploaderProps> = ({ id, multiple = false, maxFiles = 1, onFileUpload, onFileRemove, currentFile, currentFiles, allowCamera = false, previewMarginClass, buttonText }) => {
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [isCameraOpen, setIsCameraOpen] = useState(false);
    const [browserInfo, setBrowserInfo] = useState<{ isInApp: boolean, browserType: BrowserType }>({isInApp: false, browserType: 'other'});

    const handleFileChange = useCallback(async (event: React.ChangeEvent<HTMLInputElement>) => {
        if (!event.target.files) return;
        
        const files = Array.from(event.target.files);
        const processedFiles = await Promise.all(files.map(fileToBase64));
        
        if (multiple) {
            onFileUpload(processedFiles);
        } else if (processedFiles.length > 0) {
            onFileUpload(processedFiles[0]);
        }
    }, [multiple, onFileUpload]);
    
    const openFileDialog = () => fileInputRef.current?.click();

    const handlePhotoCapture = (imageData: ImageData) => {
        onFileUpload(imageData);
        setIsCameraOpen(false);
    }
    
    const handleCameraOpen = () => {
        setBrowserInfo(detectInAppBrowser());
        setIsCameraOpen(true);
    };

    const renderPreview = (file: ImageData, index?: number) => (
        <div key={index ?? 0} className="relative w-24 h-24 border rounded-md overflow-hidden group">
            <img src={`data:${file.mimeType};base64,${file.base64}`} alt={file.name} className="w-full h-full object-cover" />
            <button
                type="button"
                onClick={() => onFileRemove(index)}
                className="absolute inset-0 bg-black/60 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
            >
                <TrashIcon className="w-6 h-6 text-white" />
            </button>
        </div>
    );

    const hasFiles = multiple ? currentFiles && currentFiles.length > 0 : currentFile;
    const canUploadMore = multiple ? !currentFiles || currentFiles.length < maxFiles : !currentFile;
    const finalButtonText = buttonText ?? (multiple ? 'Upload Images' : 'Upload Image');


    return (
        <div>
            <div className={`flex flex-wrap gap-2 ${previewMarginClass ?? 'mb-2'}`}>
                {multiple && currentFiles?.map(renderPreview)}
                {!multiple && currentFile && renderPreview(currentFile)}
            </div>
            {canUploadMore && (
                <>
                    <input
                        type="file"
                        id={id}
                        ref={fileInputRef}
                        multiple={multiple}
                        accept="image/jpeg, image/png, image/webp"
                        onChange={handleFileChange}
                        className="hidden"
                    />
                    <div className={`grid ${allowCamera ? 'grid-cols-2' : 'grid-cols-1'} gap-2`}>
                        {allowCamera && (
                             <button
                                type="button"
                                onClick={handleCameraOpen}
                                className="w-full h-[42px] flex items-center justify-center gap-2 px-4 py-2 bg-white border border-gray-300 rounded-md text-base text-gray-600 hover:border-brand-accent hover:text-brand-accent focus:ring-brand-accent focus:border-brand-accent transition"
                            >
                                <CameraIcon className="w-5 h-5" />
                                <span>Take a Photo</span>
                            </button>
                        )}
                        <button
                            type="button"
                            onClick={openFileDialog}
                            className="w-full h-[42px] flex items-center justify-center gap-2 px-4 py-2 bg-white border border-gray-300 rounded-md text-base text-gray-600 hover:border-brand-accent hover:text-brand-accent focus:ring-brand-accent focus:border-brand-accent transition"
                        >
                        <UploadIcon className="w-5 h-5" />
                            <span>{finalButtonText}</span>
                        </button>
                    </div>
                </>
            )}
            {isCameraOpen && <CameraCapture onCapture={handlePhotoCapture} onClose={() => setIsCameraOpen(false)} isInAppBrowser={browserInfo.isInApp} browserType={browserInfo.browserType} />}
        </div>
    );
};