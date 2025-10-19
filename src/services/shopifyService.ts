import type { Hat } from '../types';

// The new proxy URL.
const PROXY_URL = 'https://shopify-hats-proxy-56858392501.us-west1.run.app';
// The public API key required by the backend proxy.
const API_KEY = 'klm-public-virtual-styling-2025';

// This is the raw type returned from our backend proxy for each product.
interface ShopifyProxyProduct {
  id: string;
  name: string;
  hatSlug: string;
  productUrl: string;
  imageUrls: string[];
  tags: string[];
  totalInventory: number;
  availableForSale: boolean;
}

export async function fetchShopifyHats(): Promise<Hat[] | null> {
  if (!API_KEY) {
    console.error("KLM_PUBLIC_ACCESS_KEY is not configured.");
    return null; // Don't even attempt the fetch if the key is missing.
  }
  
  try {
    const response = await fetch(PROXY_URL, {
      headers: {
        'x-api-key': API_KEY
      }
    });

    if (!response.ok) {
      const errorBody = await response.text();
      console.error("Proxy server responded with an error:", response.status, errorBody);
      throw new Error(`Proxy server error: ${response.status}`);
    }

    const data = await response.json();

    // Detect if the proxy returned an object { hats: [...] } or a raw array
    const products: ShopifyProxyProduct[] = Array.isArray(data)
      ? data
      : data.hats || [];

    if (!products || !Array.isArray(products) || products.length === 0) {
      console.warn("No products returned from proxy.");
      return null;
    }

    // Map all products directly — no filtering
    const hats: Hat[] = products.map((product, index) => ({
      id: index + 1,
      name: product.name,
      hatSlug: product.hatSlug,
      productUrl: product.productUrl,
      imageUrls: product.imageUrls,
      availableForSale: product.availableForSale,
      tags: product.tags,
    }));

    return hats;
  } catch (error) {
    console.error("Error fetching hats from Shopify proxy:", error);
    return null;
  }
}
