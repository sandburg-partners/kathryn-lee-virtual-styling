import React, { useState, useRef, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import type { ImageData } from '../types';
import { RotateIcon, XCircleIcon } from './icons';
import type { BrowserType } from '../utils/environment';

interface CameraCaptureProps {
  onCapture: (imageData: ImageData) => void;
  onClose: () => void;
  isInAppBrowser: boolean;
  browserType: BrowserType;
}

export const CameraCapture: React.FC<CameraCaptureProps> = ({ onCapture, onClose, isInAppBrowser, browserType }) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [facingMode, setFacingMode] = useState<'user' | 'environment'>('user');
  const [hasMultipleCameras, setHasMultipleCameras] = useState(false);

  const startCamera = useCallback(async () => {
    // Reset previous state
    setError(null);
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
    }

    try {
      const devices = await navigator.mediaDevices.enumerateDevices();
      const videoDevices = devices.filter(device => device.kind === 'videoinput');
      
      setHasMultipleCameras(videoDevices.length > 1);
      
      if (videoDevices.length === 0) {
        setError("No camera found on this device. Please ensure a camera is connected and enabled.");
        return;
      }

      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode } });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
    } catch (err: any) {
      console.error("Error initializing camera:", err);
      let message = "Could not access camera. Please check your browser/OS permissions.";
      if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
        message = "Camera access was denied. Please allow camera access in your browser settings and reload the page.";
      } else if (err.name === 'NotReadableError') {
        message = "The camera is currently in use by another application. Please close the other application and try again.";
      } else if (err.name === 'NotFoundError' || err.name === 'DevicesNotFoundError') {
        message = "No camera found on this device. Please ensure a camera is connected and enabled.";
      } else if (err.name === 'OverconstrainedError' && facingMode === 'environment') {
        console.warn("Could not access rear camera, falling back to front camera.");
        setFacingMode('user');
        return;
      }
      setError(message);
    }
  }, [facingMode]);

  useEffect(() => {
    if (isInAppBrowser) {
        let browserName = 'this in-app';
        if (browserType === 'instagram') browserName = 'the Instagram';
        if (browserType === 'facebook') browserName = 'the Facebook';
        
        setError(`Camera access is often blocked in ${browserName} browser. For best results, please open this page in your phone's main browser (like Safari or Chrome).`);
        return; // Don't try to start the camera
    }

    if (!capturedImage) {
        startCamera();
    }
    return () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
      }
    };
  }, [startCamera, capturedImage, isInAppBrowser, browserType]);

  // Prevent background scrolling when modal is open
  useEffect(() => {
    const originalBodyOverflow = document.body.style.overflow;
    const originalHtmlOverflow = document.documentElement.style.overflow;
    document.body.style.overflow = 'hidden';
    document.documentElement.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = originalBodyOverflow;
      document.documentElement.style.overflow = originalHtmlOverflow;
    };
  }, []);

  const handleCapture = () => {
    if (videoRef.current && canvasRef.current) {
      const video = videoRef.current;
      const canvas = canvasRef.current;
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      const context = canvas.getContext('2d');
      if (context) {
        if (facingMode === 'user') {
            context.translate(video.videoWidth, 0);
            context.scale(-1, 1);
        }
        context.drawImage(video, 0, 0, video.videoWidth, video.videoHeight);
        const dataUrl = canvas.toDataURL('image/jpeg');
        setCapturedImage(dataUrl);

        if (streamRef.current) {
          streamRef.current.getTracks().forEach(track => track.stop());
        }
      }
    }
  };

  const handleUsePhoto = () => {
    if (capturedImage) {
      const base64 = capturedImage.split(',')[1];
      const imageData: ImageData = {
        base64,
        mimeType: 'image/jpeg',
        name: `webcam-photo-${new Date().toISOString()}.jpg`,
      };
      onCapture(imageData);
    }
  };

  const handleRetake = () => {
    setCapturedImage(null);
  };
  
  const handleSwitchCamera = () => {
    setFacingMode(prev => prev === 'user' ? 'environment' : 'user');
  };

  const modalContent = (
    <div
        className="fixed inset-0 bg-black/80 z-50 flex items-start justify-center pt-[70px] px-4 pb-4 overflow-y-auto"
    >
        <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl text-center p-6 space-y-4 relative max-h-full overflow-y-auto">
            <button 
                type="button" 
                onClick={onClose} 
                className="absolute top-5 right-5 text-gray-500 hover:text-brand-primary transition-colors"
                aria-label="Close camera"
            >
                <XCircleIcon className="w-8 h-8" />
            </button>
            <h2 className="text-3xl font-serif text-brand-primary">Take a Photo</h2>
            
            {error && <p className="text-red-600 font-semibold p-4 bg-red-50 rounded-md">{error}</p>}
            
            {!error && (
              <>
                <div className="relative w-full aspect-square bg-gray-200 rounded-md overflow-hidden">
                  {capturedImage ? (
                    <img src={capturedImage} alt="Captured preview" className="w-full h-full object-contain" />
                  ) : (
                    <video ref={videoRef} autoPlay playsInline className={`w-full h-full object-cover ${facingMode === 'user' ? 'transform scale-x-[-1]' : ''}`}></video>
                  )}
                   <canvas ref={canvasRef} className="hidden"></canvas>
                </div>
                
                <div className="flex justify-center items-center gap-4 h-20">
                  {capturedImage ? (
                    <>
                      <button type="button" onClick={handleRetake} className="px-6 py-2 border border-gray-400 text-gray-700 rounded-md hover:bg-gray-100 transition">Retake</button>
                      <button type="button" onClick={handleUsePhoto} className="px-6 py-2 bg-brand-accent/80 text-white rounded-md hover:bg-brand-accent focus:ring-4 focus:outline-none focus:ring-brand-accent/50 transition">Use Photo</button>
                    </>
                  ) : (
                    <div className="relative w-full flex justify-center items-center">
                        <button type="button" onClick={handleCapture} className="w-20 h-20 bg-white rounded-full border-4 border-brand-accent hover:bg-brand-secondary transition flex items-center justify-center" aria-label="Take picture">
                            <div className="w-16 h-16 bg-brand-accent rounded-full"></div>
                        </button>
                        {hasMultipleCameras && (
                             <button
                                type="button"
                                onClick={handleSwitchCamera}
                                className="absolute right-4 md:right-8 p-3 rounded-full bg-black/40 text-white hover:bg-black/60 transition"
                                aria-label="Switch camera"
                                title="Switch camera"
                            >
                                <RotateIcon className="w-8 h-8" />
                            </button>
                        )}
                    </div>
                  )}
                </div>
              </>
            )}
        </div>
    </div>
  );

  return createPortal(modalContent, document.getElementById('modal-root')!);
};