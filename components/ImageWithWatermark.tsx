import React from 'react';

interface ImageWithWatermarkProps {
  src: string;
  alt: string;
}

export const ImageWithWatermark: React.FC<ImageWithWatermarkProps> = ({ src, alt }) => {
  return (
    <img
      src={src}
      alt={alt}
      className="w-full h-auto block object-contain"
    />
  );
};