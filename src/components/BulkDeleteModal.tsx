'use client';

import { useState } from 'react';
import { Product } from '@/types';

interface BulkDeleteModalProps {
  isOpen: boolean;
  onClose: () => void;
  products: Product[];
  onBulkDelete: (platformIds: string[]) => Promise<void>;
}

export default function BulkDeleteModal({ isOpen, onClose, products, onBulkDelete }: BulkDeleteModalProps) {
  const [selectedPlatforms, setSelectedPlatforms] = useState<{
    myntra: boolean;
    amazon: boolean;
    flipkart: boolean;
    unknown: boolean;
  }>({
    myntra: false,
    amazon: false,
    flipkart: false,
    unknown: false
  });
  const [isDeleting, setIsDeleting] = useState(false);

  // Toggle platform selection
  const togglePlatform = (platform: keyof typeof selectedPlatforms) => {
    setSelectedPlatforms(prev => ({
      ...prev,
      [platform]: !prev[platform]
    }));
  };

  // Handle bulk delete
  const handleDelete = async () => {
    // Get the selected platforms
    const platforms = Object.entries(selectedPlatforms)
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      .filter(([_, isSelected]) => isSelected)
      .map(([platform]) => platform);
    
    if (platforms.length === 0) {
      alert("Please select at least one platform");
      return;
    }

    // Confirm with the user
    const confirmMessage = `Are you sure you want to delete all products from ${platforms.join(', ')}?`;
    if (!confirm(confirmMessage)) {
      return;
    }

    try {
      setIsDeleting(true);
      
      // Call the parent handler with the selected platforms
      await onBulkDelete(platforms);
      
      // Reset state
      setSelectedPlatforms({
        myntra: false,
        amazon: false,
        flipkart: false,
        unknown: false
      });
    } catch (error) {
      console.error('Error in bulk delete:', error);
    } finally {
      setIsDeleting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <>
      {/* This structure uses a more reliable approach to transparency */}
      <div 
        className="fixed inset-0 z-40 bg-gray-600 opacity-30"
        onClick={() => !isDeleting && onClose()}
        aria-hidden="true"
      ></div>
      
      <div className="fixed inset-0 z-50 overflow-y-auto flex items-center justify-center">
        <div className="relative bg-white rounded-lg shadow-xl w-full max-w-md mx-auto">
          {/* Modal header with delete icon and title */}
          <div className="bg-gradient-to-r from-red-50 to-orange-50 rounded-t-lg border-b border-red-100 px-6 py-4">
            <div className="flex justify-between items-center">
              <h2 className="text-lg font-medium text-red-800 flex items-center">
                <span className="mr-2">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z" clipRule="evenodd" />
                  </svg>
                </span>
                Bulk Delete Products
              </h2>
              <button
                type="button"
                className="bg-transparent rounded-md text-gray-400 hover:text-gray-500 focus:outline-none"
                onClick={() => !isDeleting && onClose()}
                disabled={isDeleting}
              >
                <svg className="h-6 w-6" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <p className="text-sm text-red-600 mt-1">Select platforms to delete all products from</p>
          </div>
          
          {/* Modal body */}
          <div className="p-6">
            <p className="text-sm text-gray-500 mb-4">
              This will permanently delete all products from the selected platforms. This action cannot be undone.
            </p>
            
            <div className="space-y-3 mb-6">
              {/* Platform selection checkboxes */}
              <div className="flex items-center">
                <input 
                  type="checkbox"
                  id="platform-amazon"
                  checked={selectedPlatforms.amazon}
                  onChange={() => togglePlatform('amazon')}
                  disabled={isDeleting}
                  className="h-4 w-4 text-indigo-600 border-gray-300 rounded"
                />
                <label htmlFor="platform-amazon" className="ml-2 block text-sm text-gray-700">
                  Amazon ({products.filter(p => p.ecommercePlatform?.toLowerCase() === 'amazon').length} products)
                </label>
              </div>
              
              <div className="flex items-center">
                <input 
                  type="checkbox"
                  id="platform-flipkart"
                  checked={selectedPlatforms.flipkart}
                  onChange={() => togglePlatform('flipkart')}
                  disabled={isDeleting}
                  className="h-4 w-4 text-indigo-600 border-gray-300 rounded"
                />
                <label htmlFor="platform-flipkart" className="ml-2 block text-sm text-gray-700">
                  Flipkart ({products.filter(p => p.ecommercePlatform?.toLowerCase() === 'flipkart').length} products)
                </label>
              </div>
              
              <div className="flex items-center">
                <input 
                  type="checkbox"
                  id="platform-myntra"
                  checked={selectedPlatforms.myntra}
                  onChange={() => togglePlatform('myntra')}
                  disabled={isDeleting}
                  className="h-4 w-4 text-indigo-600 border-gray-300 rounded"
                />
                <label htmlFor="platform-myntra" className="ml-2 block text-sm text-gray-700">
                  Myntra ({products.filter(p => p.ecommercePlatform?.toLowerCase() === 'myntra').length} products)
                </label>
              </div>
              
              <div className="flex items-center">
                <input 
                  type="checkbox"
                  id="platform-unknown"
                  checked={selectedPlatforms.unknown}
                  onChange={() => togglePlatform('unknown')}
                  disabled={isDeleting}
                  className="h-4 w-4 text-indigo-600 border-gray-300 rounded"
                />
                <label htmlFor="platform-unknown" className="ml-2 block text-sm text-gray-700">
                  Unknown ({products.filter(p => !p.ecommercePlatform || p.ecommercePlatform.toLowerCase() === 'unknown').length} products)
                </label>
              </div>
            </div>
            
            <div className="flex justify-end mt-5 space-x-3">
              <button
                type="button"
                className="bg-white py-2 px-4 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none"
                onClick={onClose}
                disabled={isDeleting}
              >
                Cancel
              </button>
              <button
                type="button"
                className="bg-red-600 py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white hover:bg-red-700 focus:outline-none disabled:opacity-50"
                onClick={handleDelete}
                disabled={isDeleting || !Object.values(selectedPlatforms).some(Boolean)}
              >
                {isDeleting ? (
                  <span className="flex items-center">
                    <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Deleting...
                  </span>
                ) : 'Delete Products'}
              </button>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}