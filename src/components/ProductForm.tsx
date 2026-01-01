'use client';

import { useState, FormEvent, useEffect } from 'react';
import { nanoid } from 'nanoid';
import { Product } from '@/types';
import { detectPlatform } from '@/utils/helpers';
import ImageUpload from '@/components/ImageUpload';
import CsvImportModal from '@/components/CsvImportModal';

interface ProductFormProps {
  onAddProduct: (product: Product | Product[]) => void;
  products: Product[]; // Add existing products to check for duplicates
}

export default function ProductForm({ onAddProduct, products }: ProductFormProps) {
  const [url, setUrl] = useState('');
  const [desiredPrice, setDesiredPrice] = useState('');
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [detectedPlatform, setDetectedPlatform] = useState('');
  const [isCsvModalOpen, setIsCsvModalOpen] = useState(false);

  // Update detected platform when URL changes
  useEffect(() => {
    if (url.trim()) {
      const platform = detectPlatform(url);
      setDetectedPlatform(platform);
    } else {
      setDetectedPlatform('');
    }
  }, [url]);

  const handleImageChange = (newImageUrl: string | null) => {
    setImageUrl(newImageUrl);
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');

    // Validate inputs
    if (!url.trim()) {
      setError('Please enter a product URL');
      return;
    }

    const platform = detectPlatform(url);
    if (platform === 'Unknown') {
      setError('Currently only Myntra, Amazon and Flipkart URLs are supported');
      return;
    }

    // Check for duplicate URL
    const normalizedUrl = url.trim().toLowerCase();
    const isDuplicate = products.some(product => 
      product.url.toLowerCase() === normalizedUrl
    );

    if (isDuplicate) {
      setError('This product is already being tracked');
      return;
    }

    const priceValue = parseFloat(desiredPrice);
    if (isNaN(priceValue) || priceValue <= 0) {
      setError('Please enter a valid price');
      return;
    }

    setIsSubmitting(true);

    try {
      // Create a new product
      const newProduct: Product = {
        id: nanoid(),
        url: url.trim(),
        desiredPrice: priceValue,
        ecommercePlatform: platform,
        imageUrl: imageUrl || undefined
      };

      // Add the product
      onAddProduct(newProduct);

      // Reset form
      setUrl('');
      setDesiredPrice('');
      setImageUrl(null);
    } catch (_error) {
      setError('Failed to add product. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCsvImport = (importedProducts: Product[]) => {
    // Pass all imported products to the onAddProduct function
    onAddProduct(importedProducts);
  };

  return (
    <>
      <form onSubmit={handleSubmit} className="space-y-5">
        <div>
          <label htmlFor="url" className="block text-sm font-medium text-gray-700 mb-2">
            Product URL
          </label>
          <div className="relative rounded-md shadow-sm">
            <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
              <svg className="h-5 w-5 text-indigo-500" viewBox="0 0 20 20" fill="currentColor">
                <path d="M11 3a1 1 0 100 2h2.586l-6.293 6.293a1 1 0 101.414 1.414L15 6.414V9a1 1 0 102 0V4a1 1 0 00-1-1h-5z" />
                <path d="M5 5a2 2 0 00-2 2v8a2 2 0 002 2h8a2 2 0 002-2v-3a1 1 0 10-2 0v3H5V7h3a1 1 0 000-2H5z" />
              </svg>
            </div>
            <input
              type="url"
              name="url"
              id="url"
              className="focus:ring-indigo-500 focus:border-indigo-500 block w-full pl-12 pr-16 py-3 text-base border-gray-300 rounded-md text-gray-900 placeholder-gray-500 shadow-sm"
              placeholder="https://www.myntra.com/product-url or amazon.in"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              required
            />
            <div className="absolute inset-y-0 right-0 pr-4 flex items-center pointer-events-none">
              {detectedPlatform ? (
                <span className={`text-sm font-medium px-2 py-1 rounded ${
                  detectedPlatform === 'Myntra' 
                    ? 'bg-pink-100 text-pink-800'
                    : detectedPlatform === 'Amazon' 
                      ? 'bg-yellow-100 text-yellow-800'
                      : detectedPlatform === 'Flipkart'
                        ? 'bg-blue-100 text-blue-800'
                        : 'bg-gray-100 text-gray-800'
                }`}>
                  {detectedPlatform}
                </span>
              ) : (
                <span className="text-gray-700 font-medium bg-gray-100 px-2 py-1 rounded text-sm">URL</span>
              )}
            </div>
          </div>
          <p className="mt-2 text-sm text-gray-600">
            Currently supporting Myntra.com, Amazon.in, and Flipkart.com product URLs
          </p>
        </div>

        <div>
          <label htmlFor="desiredPrice" className="block text-sm font-medium text-gray-700 mb-2">
            Desired Price
          </label>
          <div className="relative rounded-md shadow-sm">
            <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
              <span className="text-indigo-600 font-medium text-lg">₹</span>
            </div>
            <input
              type="number"
              name="desiredPrice"
              id="desiredPrice"
              className="focus:ring-indigo-500 focus:border-indigo-500 block w-full pl-10 pr-16 py-3 text-base border-gray-300 rounded-md text-gray-900 placeholder-gray-500 shadow-sm"
              placeholder="0.00"
              min="0"
              step="0.01"
              value={desiredPrice}
              onChange={(e) => setDesiredPrice(e.target.value)}
              required
            />
            <div className="absolute inset-y-0 right-0 pr-4 flex items-center pointer-events-none">
              <span className="text-gray-700 font-medium bg-gray-100 px-2 py-1 rounded text-sm">INR</span>
            </div>
          </div>
          <p className="mt-2 text-sm text-gray-600">
            We&apos;ll notify you when the price drops below this amount
          </p>
        </div>

        {/* Image Upload Component */}
        <ImageUpload
          currentImageUrl={imageUrl || undefined}
          onImageChange={handleImageChange}
        />

        {error && (
          <div className="bg-red-50 border border-red-200 rounded-md p-4 mt-2">
            <div className="flex">
              <svg className="h-5 w-5 text-red-400 mr-3" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
              </svg>
              <p className="text-sm text-red-700 font-medium">
                {error}
              </p>
            </div>
          </div>
        )}

        <div className="mt-8 flex justify-end space-x-3">
          <button 
            type="button" 
            onClick={() => setIsCsvModalOpen(true)}
            className="flex items-center justify-center bg-white border-2 border-indigo-500 text-indigo-600 py-3 px-6 rounded-md hover:bg-indigo-50 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 transition-all text-base font-medium"
          >
            <svg className="mr-2 h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
            </svg>
            Import CSV
          </button>
          <button
            type="submit"
            disabled={isSubmitting}
            className="flex items-center justify-center bg-gradient-to-r from-indigo-600 to-purple-600 text-white py-3 px-6 rounded-md hover:from-indigo-700 hover:to-purple-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 disabled:opacity-50 transition-all text-base font-medium"
          >
            {isSubmitting ? (
              <>
                <svg className="animate-spin -ml-1 mr-2 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Adding...
              </>
            ) : (
              <>
                <svg className="mr-2 h-5 w-5" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z" clipRule="evenodd" />
                </svg>
                Add Product
              </>
            )}
          </button>
        </div>
      </form>

      {/* CSV Import Modal */}
      <CsvImportModal
        isOpen={isCsvModalOpen}
        onClose={() => setIsCsvModalOpen(false)}
        onImport={handleCsvImport}
        existingProducts={products}
      />
    </>
  );
}