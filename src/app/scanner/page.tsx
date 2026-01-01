'use client';

import { useState, useEffect } from 'react';
import { Product } from '@/types';
import ProductItem from '@/components/ProductItem';
import ScannerStatusWidget from '@/components/ScannerStatusWidget';
import Link from 'next/link';

export default function ScannerPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastScanned, setLastScanned] = useState<string | null>(null);
  const [syncingOffers, setSyncingOffers] = useState(false);

  // Load products from file-based API on component mount
  useEffect(() => {
    const fetchProducts = async () => {
      try {
        setLoading(true);
        const response = await fetch('/api/products');
        
        if (!response.ok) {
          throw new Error('Failed to fetch products');
        }
        
        const data = await response.json();
        setProducts(data.products);
        
        // Check for last scanned timestamp
        const lastScannedProduct = [...data.products]
          .sort((a, b) => {
            if (!a.lastChecked) return 1;
            if (!b.lastChecked) return -1;
            return new Date(b.lastChecked).getTime() - new Date(a.lastChecked).getTime();
          })[0];
          
        if (lastScannedProduct && lastScannedProduct.lastChecked) {
          const date = new Date(lastScannedProduct.lastChecked);
          setLastScanned(date.toLocaleString());
        }
        
        setError(null);
      } catch (error) {
        console.error('Error loading products:', error);
        setError('Failed to load products. Please refresh the page.');
      } finally {
        setLoading(false);
      }
    };
    
    fetchProducts();
  }, []);
  
  // Get products below desired price
  const getProductsBelowDesiredPrice = () => {
    return products.filter(product => product.isBelow === true && product.lastChecked);
  };
  
  // Get products above desired price
  const getProductsAboveDesiredPrice = () => {
    return products.filter(product => product.isBelow === false && product.lastChecked);
  };
  
  // Get products not yet scanned
  const getProductsNotScanned = () => {
    return products.filter(product => product.lastChecked === undefined);
  };

  // Function to handle syncing offers
  const handleSyncOffers = async () => {
    if (syncingOffers) return;
    
    try {
      setSyncingOffers(true);
      const response = await fetch('/api/sync-offers', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        }
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        if (response.status === 409) {
          alert('Cannot sync offers while a scan is in progress. Please try again later.');
        } else {
          throw new Error(errorData.error || 'Failed to sync offers');
        }
        return;
      }
      
      // Refresh products after syncing
      const productsResponse = await fetch('/api/products');
      if (productsResponse.ok) {
        const data = await productsResponse.json();
        setProducts(data.products);
      }
      
      // Success case - do nothing (removed alert)
    } catch (error) {
      console.error('Error syncing offers:', error);
      alert('Failed to sync offers. Please try again.');
    } finally {
      setSyncingOffers(false);
    }
  };

  return (
    <div className="max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8">
      <header className="mb-8">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Price Scanner</h1>
            <p className="mt-1 text-sm text-gray-500">View scanning status and product price updates</p>
            {lastScanned && (
              <p className="mt-2 text-sm font-medium text-green-600">
                Last scanned: {lastScanned}
              </p>
            )}
            <div className="mt-3">
              <ScannerStatusWidget />
            </div>
          </div>
          <div className="mt-4 sm:mt-0 flex space-x-3">
            <button
              onClick={handleSyncOffers}
              disabled={syncingOffers}
              className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {syncingOffers ? (
                <>
                  <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Syncing...
                </>
              ) : (
                <>
                  <svg className="-ml-1 mr-2 h-5 w-5" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M4 2a1 1 0 011 1v2.101a7.002 7.002 0 0111.601 2.566 1 1 0 11-1.885.666A5.002 5.002 0 005.999 7H9a1 1 0 010 2H4a1 1 0 01-1-1V3a1 1 0 011-1zm.008 9.057a1 1 0 011.276.61A5.002 5.002 0 0014.001 13H11a1 1 0 110-2h5a1 1 0 011 1v5a1 1 0 11-2 0v-2.101a7.002 7.002 0 01-11.601-2.566 1 1 0 01.61-1.276z" clipRule="evenodd" />
                  </svg>
                  Sync Offers
                </>
              )}
            </button>
            <Link 
              href="/admin/scanner"
              className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
            >
              <svg className="-ml-1 mr-2 h-5 w-5 text-gray-500" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M11.49 3.17c-.38-1.56-2.6-1.56-2.98 0a1.532 1.532 0 01-2.286.948c-1.372-.836-2.942.734-2.106 2.106.54.886.061 2.042-.947 2.287-1.561.379-1.561 2.6 0 2.978a1.532 1.532 0 01.947 2.287c-.836 1.372.734 2.942 2.106 2.106a1.532 1.532 0 012.287.947c.379 1.561 2.6 1.561 2.978 0a1.533 1.533 0 012.287-.947c1.372.836 2.942-.734 2.106-2.106a1.533 1.533 0 01.947-2.287c1.561-.379 1.561-2.6 0-2.978a1.532 1.532 0 01-.947-2.287c.836-1.372-.734-2.942-2.106-2.106a1.532 1.532 0 01-2.287-.947zM10 13a3 3 0 100-6 3 3 0 000 6z" clipRule="evenodd" />
              </svg>
              Scanner Settings
            </Link>
          </div>
        </div>
      </header>

      {loading ? (
        <div className="flex justify-center py-10">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-indigo-500"></div>
        </div>
      ) : error ? (
        <div className="bg-red-50 border border-red-200 rounded-md p-4 my-6">
          <div className="flex">
            <svg className="h-5 w-5 text-red-400 mr-3" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
            </svg>
            <p className="text-sm text-red-700 font-medium">{error}</p>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-8">
          {/* Price Drops Section */}
          <div className="bg-white shadow rounded-lg overflow-hidden">
            <div className="px-6 py-5 border-b border-gray-200 bg-green-50">
              <h3 className="text-lg leading-6 font-medium text-green-900">
                Price Drops! 🎉
              </h3>
              <p className="mt-1 text-sm text-green-700">
                Products below your desired price.
              </p>
            </div>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead>
                  <tr>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider bg-gray-50">Product</th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider bg-gray-50">Platform</th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider bg-gray-50">Target Price</th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider bg-gray-50">Current Price/MRP</th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider bg-gray-50">Last Updated</th>
                    <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider bg-gray-50">Actions</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {getProductsBelowDesiredPrice().length === 0 ? (
                    <tr>
                      <td colSpan={6} className="px-6 py-8 text-center text-sm text-gray-500">
                        No price drops found yet. Keep scanning!
                      </td>
                    </tr>
                  ) : (
                    getProductsBelowDesiredPrice().map(product => (
                      <ProductItem 
                        key={product.id}
                        product={product}
                        variant="table"
                        showActions={true}
                      />
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
          
          {/* Above Desired Price Section */}
          <div className="bg-white shadow rounded-lg overflow-hidden">
            <div className="px-6 py-5 border-b border-gray-200 bg-yellow-50">
              <h3 className="text-lg leading-6 font-medium text-yellow-900">
                Still Waiting
              </h3>
              <p className="mt-1 text-sm text-yellow-700">
                Products above your desired price.
              </p>
            </div>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead>
                  <tr>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider bg-gray-50">Product</th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider bg-gray-50">Platform</th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider bg-gray-50">Target Price</th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider bg-gray-50">Current Price/MRP</th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider bg-gray-50">Last Updated</th>
                    <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider bg-gray-50">Actions</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {getProductsAboveDesiredPrice().length === 0 ? (
                    <tr>
                      <td colSpan={6} className="px-6 py-8 text-center text-sm text-gray-500">
                        No products in this category.
                      </td>
                    </tr>
                  ) : (
                    getProductsAboveDesiredPrice().map(product => (
                      <ProductItem 
                        key={product.id}
                        product={product}
                        variant="table"
                        showActions={true}
                      />
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
          
          {/* Not Scanned Section */}
          <div className="bg-white shadow rounded-lg overflow-hidden">
            <div className="px-6 py-5 border-b border-gray-200 bg-gray-50">
              <h3 className="text-lg leading-6 font-medium text-gray-900">
                Not Scanned
              </h3>
              <p className="mt-1 text-sm text-gray-700">
                Products that haven&apos;t been scanned yet.
              </p>
            </div>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead>
                  <tr>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider bg-gray-50">Product</th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider bg-gray-50">Platform</th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider bg-gray-50">Target Price</th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider bg-gray-50">Current Price/MRP</th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider bg-gray-50">Last Updated</th>
                    <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider bg-gray-50">Actions</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {getProductsNotScanned().length === 0 ? (
                    <tr>
                      <td colSpan={6} className="px-6 py-8 text-center text-sm text-gray-500">
                        No products in this category.
                      </td>
                    </tr>
                  ) : (
                    getProductsNotScanned().map(product => (
                      <ProductItem 
                        key={product.id}
                        product={product}
                        variant="table"
                        showActions={true}
                      />
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}