'use client';

import { useState, useEffect } from 'react';
import { Product } from '@/types';
import ImageUpload from '@/components/ImageUpload';

interface ProductEditModalProps {
  product: Product;
  isOpen: boolean;
  onClose: () => void;
  onUpdate: (id: string, updates: Partial<Product>) => void;
}

export default function ProductEditModal({ 
  product, 
  isOpen, 
  onClose, 
  onUpdate 
}: ProductEditModalProps) {
  const [formData, setFormData] = useState({
    url: product.url || '',
    desiredPrice: product.desiredPrice,
    imageUrl: product.imageUrl || null
  });
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Update state when product changes
  useEffect(() => {
    setFormData({
      url: product.url || '',
      desiredPrice: product.desiredPrice,
      imageUrl: product.imageUrl || null
    });
  }, [product]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleImageChange = (url: string | null) => {
    setFormData(prev => ({ ...prev, imageUrl: url }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    const priceValue = parseFloat(formData.desiredPrice.toString());
    if (isNaN(priceValue) || priceValue <= 0) {
      setError('Please enter a valid price');
      return;
    }

    setIsSubmitting(true);

    try {
      // Prepare updates
      const updates: Partial<Product> = {
        url: formData.url,
        desiredPrice: priceValue,
        imageUrl: formData.imageUrl || undefined
      };

      // Update the product
      await onUpdate(product.id, updates);
      onClose();
    } catch (_error) {
      setError('Failed to update product. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex items-center justify-center min-h-screen px-4 pt-4 pb-20 text-center sm:block sm:p-0">
        {/* Background overlay */}
        <div 
          className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity" 
          onClick={onClose}
          aria-hidden="true"
        ></div>

        {/* Modal panel */}
        <div className="inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full">
          <div className="bg-gradient-to-r from-indigo-600 to-purple-600 px-6 py-4">
            <div className="flex justify-between items-center">
              <h3 className="text-lg font-medium text-white flex items-center">
                <span className="mr-2">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M4 2a1 1 0 011 1v2.101a7.002 7.002 0 0111.601 2.566 1 1 0 11-1.885.666A5.002 5.002 0 005.999 7H9a1 1 0 010 2H4a1 1 0 01-1-1V3a1 1 0 011-1zm.008 9.057a1 1 0 011.276.61A5.002 5.002 0 0014.001 13H11a1 1 0 110-2h5a1 1 0 011 1v5a1 1 0 11-2 0v-2.101a7.002 7.002 0 01-11.601-2.566 1 1 0 01.61-1.276z" clipRule="evenodd" />
                  </svg>
                </span>
                Edit Product
              </h3>
              <button
                type="button"
                className="bg-transparent rounded-md text-white hover:text-gray-200 focus:outline-none"
                onClick={onClose}
              >
                <svg className="h-6 w-6" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <p className="text-sm text-indigo-100 mt-1">Update your product details</p>
          </div>
          
          <div className="p-6 space-y-6">
            <form onSubmit={handleSubmit} className="space-y-5">
              <div className="sm:flex sm:items-start">
                <div className="mt-3 text-center sm:mt-0 sm:ml-4 sm:text-left w-full">
                  <h3 className="text-lg leading-6 font-medium text-gray-900">
                    Edit Product
                  </h3>
                  <div className="mt-4 space-y-4">
                    <div>
                      <label htmlFor="url" className="block text-sm font-medium text-gray-700">
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
                          id="url"
                          name="url"
                          value={formData.url}
                          onChange={handleInputChange}
                          className="focus:ring-indigo-500 focus:border-indigo-500 block w-full pl-12 pr-16 py-3 text-base border-gray-300 rounded-md text-gray-900 placeholder-gray-500 shadow-sm"
                          placeholder="https://www.myntra.com/product-url or amazon.in"
                          required
                        />
                      </div>
                    </div>
                    
                    <div>
                      <label htmlFor="desiredPrice" className="block text-sm font-medium text-gray-700">
                        Desired Price
                      </label>
                      <div className="relative rounded-md shadow-sm">
                        <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                          <span className="text-indigo-600 font-medium text-lg">₹</span>
                        </div>
                        <input
                          type="number"
                          id="desiredPrice"
                          name="desiredPrice"
                          value={formData.desiredPrice}
                          onChange={handleInputChange}
                          className="focus:ring-indigo-500 focus:border-indigo-500 block w-full pl-10 pr-16 py-3 text-base border-gray-300 rounded-md text-gray-900 placeholder-gray-500 shadow-sm"
                          placeholder="0.00"
                          min="0"
                          step="0.01"
                          required
                        />
                        <div className="absolute inset-y-0 right-0 pr-4 flex items-center pointer-events-none">
                          <span className="text-gray-700 font-medium bg-gray-100 px-2 py-1 rounded text-sm">INR</span>
                        </div>
                      </div>
                    </div>
                    
                    {/* Image Upload Component */}
                    <ImageUpload
                      currentImageUrl={formData.imageUrl || undefined}
                      onImageChange={handleImageChange}
                    />
                  </div>
                </div>
              </div>

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

              <div className="mt-8 flex justify-end space-x-4">
                <button
                  type="button"
                  onClick={onClose}
                  className="bg-white py-3 px-6 border border-gray-300 rounded-md shadow-sm text-base font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 transition-colors"
                >
                  Cancel
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
                      Updating...
                    </>
                  ) : (
                    <>
                      <svg className="mr-2 h-5 w-5" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                      </svg>
                      Save Changes
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
} 