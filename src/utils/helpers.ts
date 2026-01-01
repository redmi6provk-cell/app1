// Generate a unique ID for products
export const generateId = (): string => {
  return Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
};

// Format price as Indian Rupees
export const formatPrice = (price: number): string => {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0
  }).format(price);
};

// Extract domain from URL
export const extractDomain = (url: string): string => {
  try {
    const domain = new URL(url).hostname.replace('www.', '');
    return domain;
  } catch (_error) {
    return '';
  }
};

// Detect e-commerce platform from URL
export function detectPlatform(url: string): 'Myntra' | 'Amazon' | 'Flipkart' | 'Unknown' {
  const domain = extractDomain(url);
  if (!domain) return 'Unknown';

  if (domain.includes('myntra.com')) {
    return 'Myntra';
  } else if (domain.includes('amazon.') || domain.includes('amzn.')) {
    return 'Amazon';
  } else if (domain.includes('flipkart.com')) {
    return 'Flipkart';
  }
  
  return 'Unknown';
} 