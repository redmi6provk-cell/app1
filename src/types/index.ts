export interface Product {
  id: string;
  url: string;
  desiredPrice: number;
  currentPrice?: number;
  mrp?: number; // Maximum Retail Price
  name?: string;
  brand?: string;
  imageUrl?: string;
  isBelow?: boolean;
  lastChecked?: string;
  ecommercePlatform?: string;
  lastNotifiedPrice?: number; // Track price at last notification
  lastNotifiedDate?: string;  // Track date of last notification
  addedAt?: string;          // Date when the product was added to tracking
  offers?: string[];         // Product offers information
}

export interface ScrapedProduct {
  productName: string;
  brand: string;
  price: number;
  mrp?: number; // Maximum Retail Price
  originalUrl: string;
  fetchTime?: number;
  priceText?: string;
  ecommercePlatform: string;
  offers?: string[]; // Product offers information extracted from the page
} 