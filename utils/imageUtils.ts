import type { ImageData } from '../types';

const dataUrlToBase64 = (dataUrl: string): string => dataUrl.split(',')[1];

export const blobToBase64 = (blob: Blob): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(blob);
    reader.onload = () => resolve(dataUrlToBase64(reader.result as string));
    reader.onerror = error => reject(error);
  });
};

export const urlToImageData = async (url: string, name: string): Promise<ImageData> => {
  console.log(`🔄 Attempting to fetch image from: ${url}`);
  
  // Try direct fetch first
  try {
    console.log("📡 Trying direct fetch...");
    const directResponse = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
      }
    });
    
    if (directResponse.ok) {
      console.log("✅ Direct fetch successful");
      const blob = await directResponse.blob();
      const base64 = await blobToBase64(blob);
      return {
        base64,
        mimeType: blob.type,
        name,
      };
    }
    console.log(`❌ Direct fetch failed with status: ${directResponse.status}`);
  } catch (directError) {
    console.log("❌ Direct fetch failed with error:", directError);
  }

  // Try with allorigins proxy
  try {
    console.log("📡 Trying allorigins proxy...");
    const proxyUrl = `https://api.allorigins.win/raw?url=${encodeURIComponent(url)}`;
    const response = await fetch(proxyUrl);
    
    if (response.ok) {
      console.log("✅ Proxy fetch successful");
      const blob = await response.blob();
      const base64 = await blobToBase64(blob);
      return {
        base64,
        mimeType: blob.type || 'image/jpeg',
        name,
      };
    }
    console.log(`❌ Proxy fetch failed with status: ${response.status}`);
  } catch (proxyError) {
    console.log("❌ Proxy fetch failed with error:", proxyError);
  }

  // Try with thingproxy as final fallback
  try {
    console.log("📡 Trying thingproxy as final fallback...");
    const fallbackUrl = `https://thingproxy.freeboard.io/fetch/${url}`;
    const response = await fetch(fallbackUrl);
    
    if (response.ok) {
      console.log("✅ Fallback proxy successful");
      const blob = await response.blob();
      const base64 = await blobToBase64(blob);
      return {
        base64,
        mimeType: blob.type || 'image/jpeg',
        name,
      };
    }
    console.log(`❌ Fallback proxy failed with status: ${response.status}`);
  } catch (fallbackError) {
    console.log("❌ Fallback proxy failed with error:", fallbackError);
  }

  // All methods failed
  console.error("💥 All fetch methods failed for URL:", url);
  throw new Error("Could not load image from the provided URL. Please check the link and try again.");
};

export const generateFilename = (userName: string, hatName: string): string => {
  const sanitize = (text: string) => text
    .replace(/[^a-zA-Z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-');

  const hatNameMatch = hatName.match(/“([^”]+)”|'([^']+)'|"([^"]+)"/);
  const cleanHatName = hatNameMatch ? (hatNameMatch[1] || hatNameMatch[2] || hatNameMatch[3]) : hatName;

  return `Kathryn-Lee-Millinery-${sanitize(userName)}-wearing-${sanitize(cleanHatName)}.jpeg`;
};

export const compressImage = (base64: string, mimeType: string, targetSizeKB: number): Promise<string> => {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.src = `data:${mimeType};base64,${base64}`;

    img.onload = () => {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        return reject(new Error('Could not get canvas context for image compression.'));
      }

      canvas.width = img.width;
      canvas.height = img.height;
      
      ctx.drawImage(img, 0, 0);

      const getSizedBase64 = (quality: number): { base64: string; sizeKB: number } => {
        const dataUrl = canvas.toDataURL('image/jpeg', quality);
        const newBase64 = dataUrl.split(',')[1];
        const sizeKB = atob(newBase64).length / 1024;
        return { base64: newBase64, sizeKB };
      };
      
      let quality = 0.9;
      let result = getSizedBase64(quality);

      while (result.sizeKB > targetSizeKB && quality > 0.1) {
        quality -= 0.1;
        result = getSizedBase64(quality);
      }

      resolve(result.base64);
    };

    img.onerror = () => {
      console.warn("Image failed to load for compression, using original.");
      resolve(base64);
    };
  });
};

export const applyWatermark = (
  sourceBase64: string,
  sourceMimeType: string,
  watermark: ImageData
): Promise<string> => {
  return new Promise((resolve, reject) => {
    const sourceImage = new Image();
    const watermarkImage = new Image();

    let sourceLoaded = false;
    let watermarkLoaded = false;

    const tryDrawing = () => {
      if (!sourceLoaded || !watermarkLoaded) return;

      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        return reject(new Error('Could not get canvas context for watermarking.'));
      }

      canvas.width = sourceImage.width;
      canvas.height = sourceImage.height;

      ctx.drawImage(sourceImage, 0, 0);
      
      const logoHeight = watermarkImage.naturalHeight;
      const logoWidth = watermarkImage.naturalWidth;
      
      const barHeight = logoHeight;
      const barWidth = canvas.width;
      
      const positionFromBottom = canvas.height / 4;
      const barY = canvas.height - positionFromBottom - barHeight;
      const barX = 0;

      const logoX = (canvas.width - logoWidth) / 2; 
      const logoY = barY;

      ctx.fillStyle = 'rgba(0, 0, 0, 0.3)';
      ctx.fillRect(barX, barY, barWidth, barHeight);

      ctx.drawImage(watermarkImage, logoX, logoY);

      const dataUrl = canvas.toDataURL('image/jpeg', 0.95);
      resolve(dataUrl.split(',')[1]);
    };

    sourceImage.onload = () => {
      sourceLoaded = true;
      tryDrawing();
    };
    sourceImage.onerror = () => reject(new Error('Failed to load source image for watermarking.'));

    watermarkImage.onload = () => {
      watermarkLoaded = true;
      tryDrawing();
    };
    watermarkImage.onerror = () => reject(new Error('Failed to load watermark image.'));

    sourceImage.src = `data:${sourceMimeType};base64,${sourceBase64}`;
    watermarkImage.src = `data:${watermark.mimeType};base64,${watermark.base64}`;
  });
};

export const createReferenceSheet = async (
  personImage: ImageData,
  hatImages: ImageData[]
): Promise<ImageData> => {
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Could not create canvas context');

  const loadImg = (data: ImageData): Promise<HTMLImageElement> => {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => resolve(img);
      img.onerror = () => reject(new Error(`Failed to load image: ${data.name}`));
      img.src = `data:${data.mimeType};base64,${data.base64}`;
    });
  };

  const personImgEl = await loadImg(personImage);
  const hatImgEls = await Promise.all(hatImages.slice(0, 3).map(loadImg));

  while (hatImgEls.length < 3) {
    if (hatImgEls.length > 0) {
      hatImgEls.push(hatImgEls[hatImgEls.length - 1]);
    } else {
      hatImgEls.push(personImgEl);
    }
  }

  canvas.width = 1080;
  canvas.height = 1350;
  
  ctx.fillStyle = '#111';
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  const quadWidth = canvas.width / 2;
  const quadHeight = canvas.height / 2;

  const drawImageInQuadrant = (img: HTMLImageElement, x: number, y: number) => {
    const quadAspectRatio = quadWidth / quadHeight;
    const imgAspectRatio = img.width / img.height;

    let sx = 0, sy = 0, sWidth = img.width, sHeight = img.height;

    if (imgAspectRatio > quadAspectRatio) {
      sWidth = img.height * quadAspectRatio;
      sx = (img.width - sWidth) / 2;
    } else if (imgAspectRatio < quadAspectRatio) {
      sHeight = img.width / quadAspectRatio;
      sy = (img.height - sHeight) / 2;
    }
    
    ctx.drawImage(img, sx, sy, sWidth, sHeight, x, y, quadWidth, quadHeight);
  };

  drawImageInQuadrant(personImgEl, 0, 0);
  drawImageInQuadrant(hatImgEls[0], quadWidth, 0);
  drawImageInQuadrant(hatImgEls[1], 0, quadHeight);
  drawImageInQuadrant(hatImgEls[2], quadWidth, quadHeight);

  const dataUrl = canvas.toDataURL('image/jpeg', 0.95);
  return {
    base64: dataUrl.split(',')[1],
    mimeType: 'image/jpeg',
    name: 'reference-sheet.jpeg'
  };
};

export const processOptionalImage = (imageData: ImageData): Promise<ImageData> => {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'Anonymous';
    img.onload = () => {
      const targetWidth = 1080;
      const targetHeight = 1350;
      const targetAspectRatio = targetWidth / targetHeight;

      const canvas = document.createElement('canvas');
      canvas.width = targetWidth;
      canvas.height = targetHeight;
      const ctx = canvas.getContext('2d');
      if (!ctx) return reject(new Error('Canvas context failed'));

      ctx.fillStyle = '#CCCCCC'; // Neutral gray background
      ctx.fillRect(0, 0, targetWidth, targetHeight);

      const imgAspectRatio = img.width / img.height;
      let drawWidth = targetWidth;
      let drawHeight = targetHeight;
      let x = 0;
      let y = 0;

      if (imgAspectRatio > targetAspectRatio) {
        drawWidth = targetHeight * imgAspectRatio;
        x = (targetWidth - drawWidth) / 2;
      } else {
        drawHeight = targetWidth / imgAspectRatio;
        y = (targetHeight - drawHeight) / 2;
      }
      ctx.drawImage(img, x, y, drawWidth, drawHeight);

      const imageDataCtx = ctx.getImageData(0, 0, targetWidth, targetHeight * 0.15);
      const data = imageDataCtx.data;
      let skinTonePixels = 0;
      for (let i = 0; i < data.length; i += 4) {
        const r = data[i];
        const g = data[i + 1];
        const b = data[i + 2];
        if (r > 95 && g > 40 && b > 20 && r > g && r > b && Math.abs(r - g) > 15 && (Math.max(r, g, b) - Math.min(r, g, b) > 15)) {
          skinTonePixels++;
        }
      }

      if (skinTonePixels / (data.length / 4) > 0.005) {
          const blurCanvas = document.createElement('canvas');
          blurCanvas.width = targetWidth;
          blurCanvas.height = targetHeight;
          const blurCtx = blurCanvas.getContext('2d');
          if(blurCtx){
              blurCtx.filter = 'blur(30px)';
              blurCtx.drawImage(canvas, 0, 0);

              const faceHeight = targetHeight * 0.20;
              const faceWidth = faceHeight * 0.75;
              ctx.save();
              ctx.beginPath();
              ctx.ellipse(targetWidth / 2, faceHeight / 1.5, faceWidth / 2, faceHeight / 2, 0, 0, 2 * Math.PI);
              ctx.clip();
              
              ctx.drawImage(blurCanvas, 0, 0);

              ctx.restore();
          }
      }

      const dataUrl = canvas.toDataURL('image/jpeg', 0.9);
      resolve({
        base64: dataUrl.split(',')[1],
        mimeType: 'image/jpeg',
        name: `processed-${imageData.name}`,
      });
    };
    img.onerror = () => reject(new Error('Failed to load image for processing.'));
    img.src = `data:${imageData.mimeType};base64,${imageData.base64}`;
  });
};