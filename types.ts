

export interface ImageData {
  base64: string;
  mimeType: string;
  name: string;
}

export interface Hat {
  id: number;
  name: string;
  imageUrls: string[];
  productUrl: string;
  hatSlug: string;
  // FIX: Added optional properties to support Shopify data.
  availableForSale?: boolean;
  tags?: string[];
}

export interface LoadedHat extends Hat {
  imageData: ImageData; // The primary/thumbnail image
  allImageData: ImageData[]; // All loaded images for this hat
}

export type Height = 'Short' | 'Average' | 'Tall';
export type BodyType = 'Slim' | 'Average' | 'Athletic' | 'Muscular' | 'Curvy';
export type Bust = 'Small' | 'Medium' | 'Large' | 'Extra Large';
export type Face = 'Exact' | 'Model-fy me!';


export interface TryOnInputs {
  selectedHat: LoadedHat | null;
  personImage: ImageData | null;
  wardrobeImages: ImageData[];
  clothingText: string;
  shoesImages: ImageData[];
  shoesText: string;
  accessoriesImages: ImageData[];
  accessoriesText: string;
  sceneImage: ImageData | null;
  sceneText: string;
  controlsText: string;
  negativePrompt: string;
  consent: boolean;
  name: string;
  email: string;
  height: Height;
  bodyType: BodyType;
  bust: Bust;
  face: Face;
}

export interface CompositeResult {
  mainImage: string; // base64 string
  mimeType: string; // e.g., 'image/jpeg'
  metadata: {
    hat_image_url: string;
    warnings: string[];
  };
}
