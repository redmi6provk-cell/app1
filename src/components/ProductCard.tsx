'use client';

import { Product } from '@/types';
import { formatPrice } from '@/utils/helpers';
import Image from 'next/image';
import { useState } from 'react';

interface ProductCardProps {
  product: Product;
  onRemove: (id: string) => void;
  onUpdate?: (id: string, updates: Partial<Product>) => void;
}

export default function ProductCard({ product, onRemove, onUpdate }: ProductCardProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editedPrice, setEditedPrice] = useState(product.desiredPrice.toString());
  const [isUpdating, setIsUpdating] = useState(false);
  
  const {
    id,
    name,
    brand,
    imageUrl,
    desiredPrice,
    currentPrice,
    isBelow,
    lastChecked
  } = product;

  // Determine price status
  const isPriceAboveTarget = currentPrice !== undefined && !isBelow && currentPrice > desiredPrice;

  // Format dates for display
  const formattedDate = lastChecked
    ? new Date(lastChecked).toLocaleString()
    : 'Not checked yet';

  // Get platform icon and badge color based on platform
  const getPlatformBadge = () => {
    const platform = product.ecommercePlatform || 'Unknown';
    
    switch (platform) {
      case 'Myntra':
        return {
          color: 'bg-pink-100 text-pink-800',
          icon: (
            <svg className="w-3 h-3 mr-1" viewBox="0 0 24 24" fill="currentColor">
              <path d="M14.8 5.2L6 14.9c-1.2 1.2-1.2 3.1 0 4.2 1.2 1.2 3.1 1.2 4.2 0L21 8.4c1.4-1.4 1.4-3.6 0-4.9-1.4-1.4-3.6-1.4-4.9 0L4.3 15.3l-.7 3.2 3.2-.7L18.6 6.1">
              </path>
            </svg>
          )
        };
      case 'Amazon':
        return {
          color: 'bg-yellow-100 text-yellow-800',
          icon: (
            <svg className="w-3 h-3 mr-1" viewBox="0 0 24 24" fill="currentColor">
              <path d="M15.1,15.7c-2.3,1.7-5.6,2.5-8.5,2.5C3.4,18.3,0,16.2,0,16.2c-0.4-0.3-0.3-0.7,0.2-0.5c2.8,1.6,6,2.6,9.4,2.6 c2.3,0,4.8-0.5,7.1-1.5C17.1,16.5,15.5,15.3,15.1,15.7z"></path>
              <path d="M16.5,14.1c-0.3-0.4-3,0.2-4.2,0.4c-0.4,0.1-0.4-0.3-0.1-0.5c2-1.4,5.4-1,5.8-0.5c0.4,0.5-0.1,3.6-1.9,5.1 c-0.3,0.2-0.6,0.1-0.4-0.2C16.1,17.3,16.7,14.4,16.5,14.1z"></path>
              <path d="M14.1,7.1V5.6c0-0.2,0.2-0.4,0.4-0.4h7.1c0.2,0,0.4,0.2,0.4,0.4v1.3c0,0.2-0.2,0.5-0.5,0.9l-3.7,5.3 c1.4,0,2.8,0.2,4,0.9c0.3,0.2,0.3,0.4,0.1,0.6l-1.5,1.3c-0.2,0.2-0.5,0.2-0.8,0c-1.1-0.9-2.5-1.3-4.1-1.3H14c-0.2,0-0.4-0.2-0.3-0.5 l4.3-6.1h-3.7C14.2,7.5,14.1,7.3,14.1,7.1z"></path>
              <path d="M5.1,10.4c0-0.2,0.2-0.4,0.4-0.4H7c0.2,0,0.4,0.2,0.4,0.4v2.2h3.7c0.2,0,0.4,0.2,0.4,0.4v1.5c0,0.2-0.2,0.4-0.4,0.4 H7.4c-0.2,0-0.4-0.2-0.4-0.4v-2.2H5.5c-0.2,0-0.4-0.2-0.4-0.4V10.4z"></path>
            </svg>
          )
        };
      default:
        return {
          color: 'bg-gray-100 text-gray-800',
          icon: (
            <svg className="w-3 h-3 mr-1" viewBox="0 0 24 24" fill="currentColor">
              <path d="M3.9 12c0-1.71 1.39-3.1 3.1-3.1h4V7H7c-2.76 0-5 2.24-5 5s2.24 5 5 5h4v-1.9H7c-1.71 0-3.1-1.39-3.1-3.1zM8 13h8v-2H8v2zm9-6h-4v1.9h4c1.71 0 3.1 1.39 3.1 3.1s-1.39 3.1-3.1 3.1h-4V17h4c2.76 0 5-2.24 5-5s-2.24-5-5-5z"></path>
            </svg>
          )
        };
    }
  };

  const platformBadge = getPlatformBadge();
  
  const handleEditSubmit = async () => {
    if (!onUpdate) return;
    
    try {
      setIsUpdating(true);
      const newPrice = parseFloat(editedPrice);
      
      if (isNaN(newPrice) || newPrice <= 0) {
        alert('Please enter a valid price');
        return;
      }
      
      await onUpdate(id, { desiredPrice: newPrice });
      setIsEditing(false);
    } catch (error) {
      console.error('Failed to update product:', error);
      alert('Failed to update product. Please try again.');
    } finally {
      setIsUpdating(false);
    }
  };

  return (
    <div className="border border-gray-200 rounded-lg overflow-hidden shadow-sm hover:shadow-md transition-shadow duration-200">
      {/* Product header with platform badge */}
      <div className="p-4 border-b border-gray-100">
        <div className="flex justify-between items-start">
          <div>
            <h3 className="text-lg font-medium text-gray-900 line-clamp-1">
              {name || 'Product Name Not Available'}
              {isBelow && (
                <span className="ml-2 bg-green-100 text-green-800 text-xs font-medium py-0.5 px-1.5 rounded-full">
                  Price Drop!
                </span>
              )}
            </h3>
            <p className="text-sm text-gray-600 line-clamp-1">
              {brand || 'Brand Not Available'}
            </p>
          </div>
          <div className={`flex items-center text-xs px-2 py-1 rounded-full ${platformBadge.color}`}>
            {platformBadge.icon}
            {product.ecommercePlatform || 'Unknown'}
          </div>
        </div>
      </div>

      {/* Product details */}
      <div className="p-4">
        <div className="flex items-start space-x-4">
          {/* Product image (placeholder if not available) */}
          <div className="flex-shrink-0 w-20 h-20 bg-gray-100 rounded overflow-hidden">
            {imageUrl ? (
              <Image
                src={imageUrl}
                alt={name || 'Product Image'}
                width={80}
                height={80}
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-gray-400">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-10 w-10" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M4 3a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V5a2 2 0 00-2-2H4zm12 12H4l4-8 3 6 2-4 3 6z" clipRule="evenodd" />
                </svg>
              </div>
            )}
          </div>
          
          {/* Price comparison */}
          <div className="flex-1 min-w-0">
            <div className="space-y-2">
              <div>
                <span className="text-sm text-gray-500">Current Price:</span>
                <div className="text-lg font-medium text-gray-900">
                  {currentPrice !== undefined ? (
                    <span className={isBelow ? 'text-green-600' : isPriceAboveTarget ? 'text-red-600' : ''}>
                      {formatPrice(currentPrice)}
                    </span>
                  ) : (
                    <span className="text-gray-400">Not scanned yet</span>
                  )}
                </div>
              </div>
              
              <div>
                <span className="text-sm text-gray-500">Target Price:</span>
                {isEditing ? (
                  <div className="flex items-center mt-1">
                    <input
                      type="number"
                      value={editedPrice}
                      onChange={(e) => setEditedPrice(e.target.value)}
                      className="border border-gray-300 rounded px-2 py-1 text-sm w-24 mr-2"
                      min="0"
                      step="1"
                    />
                    <button
                      onClick={handleEditSubmit}
                      disabled={isUpdating}
                      className="text-white bg-blue-600 hover:bg-blue-700 rounded px-2 py-1 text-xs font-medium mr-1"
                    >
                      {isUpdating ? 'Saving...' : 'Save'}
                    </button>
                    <button
                      onClick={() => setIsEditing(false)}
                      disabled={isUpdating}
                      className="text-gray-600 hover:text-gray-800 rounded px-2 py-1 text-xs font-medium"
                    >
                      Cancel
                    </button>
                  </div>
                ) : (
                  <div className="flex items-center">
                    <div className="text-lg font-medium text-gray-900">
                      {formatPrice(desiredPrice)}
                    </div>
                    {onUpdate && (
                      <button
                        onClick={() => setIsEditing(true)}
                        className="ml-2 text-gray-400 hover:text-blue-600"
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                        </svg>
                      </button>
                    )}
                  </div>
                )}
              </div>
              
              {/* Status badges */}
              {isBelow && (
                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                  <svg className="-ml-0.5 mr-1.5 h-2 w-2 text-green-400" fill="currentColor" viewBox="0 0 8 8">
                    <circle cx="4" cy="4" r="3" />
                  </svg>
                  Below Target Price!
                </span>
              )}
              
              {isPriceAboveTarget && (
                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
                  <svg className="-ml-0.5 mr-1.5 h-2 w-2 text-red-400" fill="currentColor" viewBox="0 0 8 8">
                    <circle cx="4" cy="4" r="3" />
                  </svg>
                  Above Target Price
                </span>
              )}
              
              {currentPrice !== undefined && (
                <div className="text-sm">
                  {isPriceAboveTarget ? (
                    <span className="text-red-600">
                      {formatPrice(currentPrice - desiredPrice)} above target
                    </span>
                  ) : isBelow ? (
                    <span className="text-green-600">
                      {formatPrice(desiredPrice - currentPrice)} below target
                    </span>
                  ) : (
                    <span className="text-gray-600">
                      At target price
                    </span>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
        
        {/* Last checked and actions */}
        <div className="mt-4 flex items-center justify-between">
          <div className="text-xs text-gray-500">
            {lastChecked ? (
              <>Last checked: {formattedDate}</>
            ) : (
              <>Not checked yet</>
            )}
          </div>
          
          <div className="flex items-center space-x-4">
            <button
              onClick={() => onRemove(id)}
              className="text-red-600 hover:text-red-800 text-sm font-medium transition-colors"
            >
              Remove
            </button>
          </div>
        </div>
      </div>
    </div>
  );
} 