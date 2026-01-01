'use client';

import { useState } from 'react';
import { Product } from '@/types';
import { extractDomain } from '@/utils/helpers';
import Image from 'next/image';
import ProductEditModal from '@/components/ProductEditModal';
import OffersModal from '@/components/OffersModal';

interface ProductItemProps {
  product: Product;
  variant?: 'table' | 'card';
  onRemove?: (id: string) => void;
  onUpdate?: (id: string, updates: Partial<Product>) => void;
  showActions?: boolean;
}

export default function ProductItem({ 
  product, 
  variant = 'card', 
  onRemove, 
  onUpdate,
  showActions = true 
}: ProductItemProps) {
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isOffersModalOpen, setIsOffersModalOpen] = useState(false);

  // Safely format image URL for Next.js Image component
  const formatImageUrl = (url?: string): string => {
    if (!url) return '/images/placeholder-product.svg';
    
    // Check if URL already starts with http/https
    if (url.startsWith('http://') || url.startsWith('https://')) {
      return url;
    }
    
    // Check if URL has double quotes (which can cause parsing errors)
    if (url.startsWith('"') || url.startsWith("'")) {
      url = url.substring(1);
    }
    if (url.endsWith('"') || url.endsWith("'")) {
      url = url.substring(0, url.length - 1);
    }
    
    // Add https if URL doesn't have a protocol
    if (!url.startsWith('http://') && !url.startsWith('https://')) {
      return `https://${url}`;
    }
    
    return url;
  };

  // Extract best price from Myntra offers
  const getBestPrice = (): string | null => {
    if (product.ecommercePlatform === 'Myntra' && product.offers && product.offers.length > 0) {
      // Since we're now storing just the numeric value directly in offers
      return product.offers[0] || null;
    }
    return null;
  };

  const bestPrice = getBestPrice();
  
  // Extract numeric value from best price (handle both old and new format)
  const bestPriceValue = bestPrice 
    ? bestPrice.startsWith('Rs.') 
      ? parseFloat(bestPrice.replace('Rs.', '').trim()) 
      : parseFloat(bestPrice)
    : null;

  // Calculate price difference and percentage
  const priceDifference = ((product.desiredPrice || 0) - (product.currentPrice || 0));
  const percentOff = product.currentPrice && product.desiredPrice 
    ? Math.round((1 - product.currentPrice / product.desiredPrice) * 100) 
    : 0;
  
  // Format price to INR
  const formatPrice = (price?: number) => {
    if (price === undefined) return '—';
    return `₹${price.toFixed(2)}`;
  };
  
  // Format date
  const formatDate = (dateString?: string) => {
    if (!dateString) return 'Not checked yet';
    
    const now = new Date();
    const date = new Date(dateString);
    const diffMs = now.getTime() - date.getTime();
    
    // Convert to seconds
    const diffSec = Math.floor(diffMs / 1000);
    
    // Less than a minute
    if (diffSec < 60) {
      return `${diffSec}s ago`;
    }
    
    // Less than an hour
    const diffMin = Math.floor(diffSec / 60);
    if (diffMin < 60) {
      return `${diffMin}m ago`;
    }
    
    // Less than a day
    const diffHour = Math.floor(diffMin / 60);
    if (diffHour < 24) {
      return `${diffHour}h ago`;
    }
    
    // Less than a week
    const diffDay = Math.floor(diffHour / 24);
    if (diffDay < 7) {
      return `${diffDay}d ago`;
    }
    
    // Less than a month (approx)
    if (diffDay < 30) {
      const diffWeek = Math.floor(diffDay / 7);
      return `${diffWeek}w ago`;
    }
    
    // Less than a year
    if (diffDay < 365) {
      const diffMonth = Math.floor(diffDay / 30);
      return `${diffMonth}mo ago`;
    }
    
    // More than a year
    const diffYear = Math.floor(diffDay / 365);
    return `${diffYear}y ago`;
  };

  // Handle edit button click
  const handleEditClick = () => {
    setIsEditModalOpen(true);
  };

  // Close edit modal
  const handleCloseModal = () => {
    setIsEditModalOpen(false);
  };

  // Handle offers button click
  const handleOffersClick = () => {
    setIsOffersModalOpen(true);
  };

  // Close offers modal
  const handleCloseOffersModal = () => {
    setIsOffersModalOpen(false);
  };

  // Table row variant
  if (variant === 'table') {
    return (
      <>
        <tr className={`hover:bg-gray-50 transition-colors ${product.isBelow ? 'bg-green-50 hover:bg-green-100' : ''}`}>
          <td className="px-6 py-4">
            <div className="flex items-center">
              {product.imageUrl && (
                <div className="flex-shrink-0 h-14 w-14 mr-3 relative rounded-md overflow-hidden">
                  <Image 
                    src={formatImageUrl(product.imageUrl)} 
                    alt={product.name || "Product"} 
                    fill
                    className="object-cover"
                    onError={(e) => {
                      (e.target as HTMLImageElement).src = '/images/placeholder-product.svg';
                    }}
                  />
                </div>
              )}
              <div className="flex flex-col">
                <div className="text-sm font-medium text-gray-900 truncate max-w-xs">
                  {product.name || extractDomain(product.url) || 'Unknown Product'}
                </div>
                <div className="text-xs text-gray-500 truncate max-w-xs">
                  {product.brand || 'No brand information'}
                </div>
                {product.ecommercePlatform === 'Myntra' && bestPrice && (
                  <div className="text-xs font-medium text-indigo-600 mt-1">
                    Best Price: ₹{bestPrice.startsWith('Rs.') ? bestPrice.replace('Rs.', '').trim() : bestPrice}
                  </div>
                )}
              </div>
            </div>
          </td>
          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
            {product.ecommercePlatform || 'Unknown'}
          </td>
          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
            {formatPrice(product.desiredPrice)}
          </td>
          <td className="px-6 py-4 whitespace-nowrap">
            {product.currentPrice ? (
              <span className={`text-sm font-medium ${product.isBelow ? 'text-green-600' : 'text-yellow-600'}`}>
                {product.isBelow ? (
                  <span className="font-bold text-base">{formatPrice(product.currentPrice)}</span>
                ) : (
                  formatPrice(product.currentPrice)
                )}
                {product.mrp && product.currentPrice < product.mrp && (
                  <div className="text-xs text-gray-500 line-through">
                    MRP: {formatPrice(product.mrp)}
                  </div>
                )}
                {product.isBelow && (
                  <div className="mt-1 flex flex-col">
                    <span className="text-xs bg-green-100 text-green-800 py-0.5 px-1.5 rounded-full inline-flex items-center">
                      <svg className="w-3 h-3 mr-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      <span className="mr-1">Save {formatPrice(priceDifference)}</span>
                      <span className="font-bold bg-green-200 text-green-800 px-1 rounded-sm">({percentOff}% off)</span>
                    </span>
                  </div>
                )}
              </span>
            ) : (
              <span className="text-sm text-gray-400">Not scanned</span>
            )}
          </td>
          <td className="px-6 py-4 whitespace-nowrap text-xs text-gray-500">
            {formatDate(product.lastChecked)}
          </td>
          {showActions && (
            <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
              <div className="flex items-center justify-end space-x-2">
                <a 
                  href={product.url} 
                  target="_blank" 
                  rel="noopener noreferrer" 
                  className="text-indigo-600 hover:text-indigo-900 px-2 py-1 rounded"
                >
                  View
                </a>
                {product.offers && product.offers.length > 0 && (
                  <button
                    onClick={handleOffersClick}
                    className="text-orange-600 hover:text-orange-900 px-2 py-1 rounded"
                  >
                    Offers
                  </button>
                )}
                {onUpdate && (
                  <button
                    onClick={handleEditClick}
                    className="text-blue-600 hover:text-blue-900 px-2 py-1 rounded"
                  >
                    Edit
                  </button>
                )}
                {onRemove && (
                  <button
                    onClick={() => onRemove(product.id)}
                    className="text-red-600 hover:text-red-900 px-2 py-1 rounded"
                  >
                    Delete
                  </button>
                )}
              </div>
            </td>
          )}
        </tr>

        {/* Edit Modal */}
        {onUpdate && isEditModalOpen && (
          <ProductEditModal 
            product={product}
            isOpen={isEditModalOpen}
            onClose={handleCloseModal}
            onUpdate={onUpdate}
          />
        )}

        {/* Offers Modal */}
        {isOffersModalOpen && (
          <OffersModal
            isOpen={isOffersModalOpen}
            onClose={handleCloseOffersModal}
            offers={product.offers}
            productName={product.name || extractDomain(product.url) || 'Unknown Product'}
          />
        )}
      </>
    );
  }

  // Card variant
  return (
    <>
      <div className={`rounded-lg border ${product.isBelow ? 'bg-green-50 border-green-100' : 'bg-white border-gray-200'} h-full shadow-sm hover:shadow transition-shadow duration-200`}>
        <div className="flex flex-col xs:flex-row p-3 xs:p-4 items-center xs:items-start">
          {/* Product Image */}
          <div className="relative h-[130px] w-[130px] xs:h-[150px] xs:w-[150px] flex-shrink-0 overflow-hidden rounded-md bg-gray-100 mb-3 xs:mb-0 xs:mr-3">
            {product.imageUrl ? (
              <Image 
                src={formatImageUrl(product.imageUrl)} 
                alt={product.name || "Product"} 
                fill
                className="object-cover"
                onError={(e) => {
                  (e.target as HTMLImageElement).src = '/images/placeholder-product.svg';
                }}
              />
            ) : (
              <div className="flex h-full w-full items-center justify-center bg-gray-200">
                <svg className="h-8 w-8 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
              </div>
            )}
            <div className="absolute top-0 right-0">
              <div className="text-xs text-white px-1 py-0.5 rounded-bl-md rounded-tr-md bg-gray-600">
                {product.ecommercePlatform || 'Unknown'}
              </div>
            </div>
          </div>

          {/* Product Details */}
          <div className="flex-1 flex flex-col min-w-0 w-full text-center xs:text-left">
            <div>
              <h3 className="text-sm xs:text-base font-medium text-gray-900 truncate">
                {product.name || extractDomain(product.url) || 'Unknown Product'}
              </h3>
              <p className="text-xs text-gray-500 truncate mt-0.5">{product.brand || 'No brand information'}</p>
              {product.ecommercePlatform === 'Myntra' && bestPrice && (
                <div className="text-xs font-medium text-indigo-600 mt-1">
                  Best Price: ₹{bestPrice.startsWith('Rs.') ? bestPrice.replace('Rs.', '').trim() : bestPrice}
                </div>
              )}
            </div>
            
            <div className="mt-2 xs:mt-3">
              {/* Price Bar Visualization */}
              <div className="relative mb-6 xs:mb-8">
                {/* Price Bar */}
                <div className="relative h-4 xs:h-5 bg-gray-200 rounded-full overflow-hidden border border-gray-300 shadow-sm">
                  {/* Current Price Gradient Bar */}
                  {product.currentPrice && (
                    <div 
                      className={`absolute inset-0 ${product.isBelow 
                        ? 'bg-gradient-to-r from-blue-600 via-blue-500 to-blue-400' 
                        : 'bg-gradient-to-r from-amber-600 via-amber-400 to-amber-300'}`}
                      style={{ width: `${(product.currentPrice / (product.mrp || product.desiredPrice)) * 100}%` }}
                    />
                  )}
                  
                  {/* Target Price Bar */}
                  <div 
                    className="absolute inset-0 bg-gradient-to-r from-purple-800 via-purple-600 to-purple-500"
                    style={{ width: `${(product.desiredPrice / (product.mrp || product.desiredPrice)) * 100}%` }}
                  />
                  
                  {/* Current Price Indicator */}
                  {product.currentPrice && (
                    <>
                      {/* Vertical Line */}
                      <div 
                        className={`absolute top-0 h-full w-1.5 ${product.isBelow ? 'bg-blue-600' : 'bg-amber-600'} shadow-sm`}
                        style={{ left: `${(product.currentPrice / (product.mrp || product.desiredPrice)) * 100}%` }}
                      />
                      
                      {/* Current Price Label */}
                      <div 
                        className={`absolute -top-6 ${product.isBelow ? 'text-blue-600' : 'text-amber-600'} text-[11px] font-bold bg-white px-1.5 py-0.5 rounded-md shadow-sm border ${product.isBelow ? 'border-blue-200' : 'border-amber-200'}`}
                        style={{ 
                          left: `${(product.currentPrice / (product.mrp || product.desiredPrice)) * 100}%`,
                          transform: 'translateX(-50%)'
                        }}
                      >
                        Current
                      </div>
                    </>
                  )}
                  
                  {/* Best Price Indicator - Only for Myntra products with best price */}
                  {product.ecommercePlatform === 'Myntra' && bestPriceValue && (
                    <>
                      {/* Vertical Line */}
                      <div 
                        className="absolute top-0 h-full w-1.5 bg-white border border-gray-300 shadow-sm"
                        style={{ left: `${(bestPriceValue / (product.mrp || product.desiredPrice)) * 100}%` }}
                      />
                      
                      {/* Best Price Label */}
                      <div 
                        className="absolute -top-6 text-white text-[11px] font-medium px-1.5 py-0.5 bg-gray-700 rounded-md shadow-sm"
                        style={{ 
                          left: `${(bestPriceValue / (product.mrp || product.desiredPrice)) * 100}%`,
                          transform: 'translateX(-50%)'
                        }}
                      >
                        Best
                      </div>
                    </>
                  )}
                  
                  {/* Target Price Indicator */}
                  <div 
                    className="absolute top-0 h-full w-1.5 bg-purple-600 shadow-md"
                    style={{ left: `${(product.desiredPrice / (product.mrp || product.desiredPrice)) * 100}%` }}
                  />
                  
                  {/* Target Price Label */}
                  <div 
                    className="absolute -top-6 text-purple-600 text-[11px] font-semibold bg-white px-1.5 py-0.5 rounded-md shadow-sm border border-purple-200"
                    style={{ 
                      left: `${(product.desiredPrice / (product.mrp || product.desiredPrice)) * 100}%`,
                      transform: 'translateX(-50%)'
                    }}
                  >
                    Target
                  </div>
                </div>
                
                {/* Status Message */}
                {product.currentPrice && (
                  <div className="mt-6 text-center">
                    <div className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium 
                      ${product.isBelow 
                        ? 'bg-green-100 text-green-800 border border-green-200' 
                        : 'bg-amber-100 text-amber-800 border border-amber-200'}`}>
                      {product.isBelow ? (
                        <>
                          <svg className="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                          </svg>
                          <span>Price is {Math.abs(percentOff)}% below your target price</span>
                        </>
                      ) : (
                        <>
                          <svg className="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                          </svg>
                          <span>Price is {Math.abs(percentOff)}% above your target price</span>
                        </>
                      )}
                    </div>
                  </div>
                )}
              </div>

              {/* Price Details Grid */}
              <div className="grid grid-cols-3 gap-1 xs:gap-2">
                {/* MRP Card */}
                <div className="flex flex-col items-center justify-between rounded-md px-2 py-1.5 xs:px-3 xs:py-2.5 border bg-gray-50 border-gray-100">
                  <div className="flex items-center">
                    <svg className="w-3 h-3 xs:w-3.5 xs:h-3.5 mr-1 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 5l4 4m0-4l-4 4M14 10h.01M12 14h.01M10 10h.01M8 14h.01M6 10h.01" />
                    </svg>
                    <p className="text-[10px] xs:text-xs font-medium text-gray-600">MRP</p>
                  </div>
                  <div className="flex flex-col mt-1 items-center">
                    <p className="text-xs xs:text-sm font-semibold text-gray-700">
                      {product.mrp ? `₹${product.mrp.toFixed(2)}` : '—'}
                    </p>
                  </div>
                </div>
                
                {/* Current Price Card */}
                <div className={`flex flex-col items-center justify-between rounded-md px-2 py-1.5 xs:px-3 xs:py-2.5 border relative ${
                  product.isBelow 
                    ? 'bg-blue-100 border-blue-200' 
                    : 'bg-amber-50 border-amber-100'
                }`}>
                  <div className="flex items-center">
                    <svg className={`w-3 h-3 xs:w-3.5 xs:h-3.5 mr-1 ${product.isBelow ? 'text-blue-600' : 'text-amber-600'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M20 12H4m16 0l-4 4m4-4l-4-4" />
                    </svg>
                    <p className="text-[10px] xs:text-xs font-medium text-gray-700">Current</p>
                  </div>
                  <div className="flex flex-col mt-1 items-center">
                    {product.currentPrice ? (
                      <>
                        <p className={`text-sm xs:text-base font-bold ${product.isBelow ? 'text-blue-800' : 'text-amber-800'}`}>
                          ₹{product.currentPrice.toFixed(2)}
                        </p>
                        {product.isBelow && (
                          <span className="text-[8px] xs:text-[10px] font-medium text-blue-600 flex items-center">
                            <svg className="w-2 h-2 xs:w-3 xs:h-3 mr-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                            </svg>
                            Good Deal!
                          </span>
                        )}
                      </>
                    ) : (
                      <p className="text-xs xs:text-sm font-semibold text-gray-400">Not scanned</p>
                    )}
                  </div>
                </div>
                
                {/* Target Price Card */}
                <div className={`flex flex-col items-center justify-between rounded-md px-2 py-1.5 xs:px-3 xs:py-2.5 border bg-purple-100 border-purple-200 shadow-sm`}>
                  <div className="flex items-center">
                    <svg className="w-3 h-3 xs:w-3.5 xs:h-3.5 mr-1 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 15l4-4h10" />
                    </svg>
                    <p className="text-[10px] xs:text-xs font-medium text-purple-700">Target</p>
                  </div>
                  <div className="flex flex-col mt-1 items-center">
                    <p className="text-xs xs:text-sm font-semibold text-purple-900">₹{product.desiredPrice.toFixed(2)}</p>
                  </div>
                </div>
              </div>
              
              {/* Savings Badge */}
              {product.isBelow && product.currentPrice && (
                <div className="mt-2 flex justify-center">
                  <span className="inline-flex items-center px-2 py-0.5 xs:px-2.5 xs:py-1 rounded-full text-[10px] xs:text-xs font-medium bg-green-50 text-green-700 border border-green-100">
                    <svg className="w-3 h-3 xs:w-3.5 xs:h-3.5 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    Save ₹{priceDifference.toFixed(2)} • <span className="font-bold bg-green-200 text-green-800 px-1 rounded-sm ml-1">{percentOff}% off</span>
                  </span>
                </div>
              )}
            </div>
            
            <div className="mt-auto pt-2 xs:pt-3 flex justify-between items-center">
              <div className="text-[10px] xs:text-xs text-gray-500 truncate">
                {formatDate(product.lastChecked)}
              </div>
              
              {showActions && (
                <div className="flex space-x-1 xs:space-x-2 flex-shrink-0">
                  <a 
                    href={product.url} 
                    target="_blank" 
                    rel="noopener noreferrer" 
                    className={`text-[10px] xs:text-xs font-medium px-1.5 py-0.5 xs:px-2 xs:py-1 rounded-md ${product.isBelow 
                      ? 'bg-green-600 hover:bg-green-700 text-white' 
                      : 'bg-indigo-600 hover:bg-indigo-700 text-white'}`}
                  >
                    {product.isBelow ? 'Buy Now' : 'View'}
                  </a>
                  
                  {product.offers && product.offers.length > 0 && (
                    <button
                      onClick={handleOffersClick}
                      className="text-[10px] xs:text-xs font-medium px-1.5 py-0.5 xs:px-2 xs:py-1 rounded-md bg-orange-100 hover:bg-orange-200 text-orange-700"
                    >
                      Offers
                    </button>
                  )}
                  
                  {onUpdate && (
                    <button
                      onClick={handleEditClick}
                      className="text-[10px] xs:text-xs font-medium px-1.5 py-0.5 xs:px-2 xs:py-1 rounded-md bg-gray-100 hover:bg-gray-200 text-gray-700"
                    >
                      Edit
                    </button>
                  )}
                  
                  {onRemove && (
                    <button
                      onClick={() => onRemove(product.id)}
                      className="text-[10px] xs:text-xs font-medium px-1.5 py-0.5 xs:px-2 xs:py-1 rounded-md bg-red-100 hover:bg-red-200 text-red-700"
                    >
                      Delete
                    </button>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Edit Modal */}
      {onUpdate && isEditModalOpen && (
        <ProductEditModal 
          product={product}
          isOpen={isEditModalOpen}
          onClose={handleCloseModal}
          onUpdate={onUpdate}
        />
      )}

      {/* Offers Modal */}
      {isOffersModalOpen && (
        <OffersModal
          isOpen={isOffersModalOpen}
          onClose={handleCloseOffersModal}
          offers={product.offers}
          productName={product.name || extractDomain(product.url) || 'Unknown Product'}
        />
      )}
    </>
  );
}