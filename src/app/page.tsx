'use client';

import { useState, useEffect } from 'react';
import { Product } from '@/types';
import Link from 'next/link';

export default function Dashboard() {
  const [stats, setStats] = useState({
    totalProducts: 0,
    priceDrop: 0,
    myntraCount: 0,
    amazonCount: 0,
    flipkartCount: 0,
    totalSavings: 0,
    savingsPercentage: 0,
    averageDiscount: 0
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [topDropProducts, setTopDropProducts] = useState<Product[]>([]);
  const [recentlyScanned, setRecentlyScanned] = useState<Product[]>([]);

  // Load products to calculate statistics
  useEffect(() => {
    const fetchStats = async () => {
      try {
        setLoading(true);
        const response = await fetch('/api/products');
        
        if (!response.ok) {
          throw new Error('Failed to fetch products');
        }
        
        const data = await response.json();
        const products: Product[] = data.products;

        // Calculate total savings
        let totalSavings = 0;
        let potentialSavings = 0;
        
        products.forEach(product => {
          if (product.isBelow && product.currentPrice && product.desiredPrice) {
            totalSavings += (product.desiredPrice - product.currentPrice);
          }
          if (product.currentPrice && product.desiredPrice) {
            potentialSavings += product.desiredPrice;
          }
        });

        // Get top price drops (products with biggest difference between desired and current price)
        const productsWithDrops = products
          .filter(p => p.isBelow && p.currentPrice && p.desiredPrice)
          .sort((a, b) => {
            const aSavings = a.desiredPrice - (a.currentPrice || 0);
            const bSavings = b.desiredPrice - (b.currentPrice || 0);
            return bSavings - aSavings;
          })
          .slice(0, 5);
        
        // Get most recently scanned products
        const recentProducts = [...products]
          .filter(p => p.lastChecked)
          .sort((a, b) => {
            const dateA = a.lastChecked ? new Date(a.lastChecked).getTime() : 0;
            const dateB = b.lastChecked ? new Date(b.lastChecked).getTime() : 0;
            return dateB - dateA;
          })
          .slice(0, 5);

        // Calculate statistics
        const totalProducts = products.length;
        const priceDrop = products.filter(p => p.isBelow).length;
        const myntraCount = products.filter(p => p.ecommercePlatform?.toLowerCase() === 'myntra').length;
        const amazonCount = products.filter(p => p.ecommercePlatform?.toLowerCase() === 'amazon').length;
        const flipkartCount = products.filter(p => p.ecommercePlatform?.toLowerCase() === 'flipkart').length;
        
        // Calculate average discount percentage
        const productsWithPrices = products.filter(p => p.isBelow && p.currentPrice && p.desiredPrice);
        const avgDiscount = productsWithPrices.length > 0 
          ? productsWithPrices.reduce((sum, p) => sum + ((p.desiredPrice - (p.currentPrice || 0)) / p.desiredPrice), 0) / productsWithPrices.length * 100
          : 0;

        // Calculate savings percentage
        const savingsPercentage = potentialSavings > 0 ? (totalSavings / potentialSavings) * 100 : 0;

        setStats({
          totalProducts,
          priceDrop,
          myntraCount,
          amazonCount,
          flipkartCount,
          totalSavings,
          savingsPercentage,
          averageDiscount: avgDiscount
        });
        
        setTopDropProducts(productsWithDrops);
        setRecentlyScanned(recentProducts);
        
        setError(null);
      } catch (error) {
        console.error('Error loading products:', error);
        setError('Failed to load statistics. Please refresh the page.');
      } finally {
        setLoading(false);
      }
    };
    
    fetchStats();
  }, []);

  // Format currency
  const formatCurrency = (amount: number) => {
    return `₹${amount.toFixed(2)}`;
  };

  // Format percentage
  const formatPercentage = (percentage: number) => {
    return `${percentage.toFixed(1)}%`;
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

  return (
    <div className="max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8">
      {/* Header with welcome message and overview */}
      <div className="mb-8">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Price Monitoring Dashboard</h1>
            <p className="mt-2 text-sm text-gray-600">
              Track your product prices across Myntra, Amazon, and Flipkart
            </p>
          </div>
          <div className="mt-4 md:mt-0 flex space-x-3">
            <Link 
              href="/products" 
              className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
            >
              <svg className="-ml-1 mr-2 h-5 w-5" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M10 5a1 1 0 011 1v3h3a1 1 0 110 2h-3v3a1 1 0 11-2 0v-3H6a1 1 0 110-2h3V6a1 1 0 011-1z" clipRule="evenodd" />
              </svg>
              Add Product
            </Link>
            <Link 
              href="/scanner" 
              className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500"
            >
              <svg className="-ml-1 mr-2 h-5 w-5" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M4 5a2 2 0 00-2 2v8a2 2 0 002 2h12a2 2 0 002-2V7a2 2 0 00-2-2h-1.586a1 1 0 01-.707-.293l-1.121-1.121A2 2 0 0011.172 3H8.828a2 2 0 00-1.414.586L6.293 4.707A1 1 0 015.586 5H4zm6 9a3 3 0 100-6 3 3 0 000 6z" clipRule="evenodd" />
              </svg>
              Scan Prices
            </Link>
          </div>
        </div>
      </div>

      {loading ? (
        <div className="flex flex-col items-center justify-center py-12">
          <div className="animate-spin rounded-full h-16 w-16 border-t-4 border-indigo-500 border-opacity-75"></div>
          <p className="mt-4 text-gray-600">Loading your dashboard...</p>
        </div>
      ) : error ? (
        <div className="bg-red-50 border-l-4 border-red-500 p-4 mb-6">
          <div className="flex">
            <div className="flex-shrink-0">
              <svg className="h-5 w-5 text-red-500" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
              </svg>
            </div>
            <div className="ml-3">
              <p className="text-sm text-red-700">{error}</p>
            </div>
          </div>
        </div>
      ) : (
        <div className="space-y-8">
          {/* Stats Overview */}
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {/* Total Products Card */}
            <div className="bg-white overflow-hidden shadow rounded-lg">
              <div className="p-5">
                <div className="flex items-center">
                  <div className="flex-shrink-0 bg-blue-500 rounded-md p-3">
                    <svg className="h-6 w-6 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
                    </svg>
                  </div>
                  <div className="ml-5 w-0 flex-1">
                    <dl>
                      <dt className="text-sm font-medium text-gray-500 truncate">Total Products</dt>
                      <dd>
                        <div className="text-lg font-bold text-gray-900">{stats.totalProducts}</div>
                      </dd>
                    </dl>
                  </div>
                </div>
              </div>
            </div>

            {/* Price Drop Card */}
            <div className="bg-white overflow-hidden shadow rounded-lg">
              <div className="p-5">
                <div className="flex items-center">
                  <div className="flex-shrink-0 bg-green-500 rounded-md p-3">
                    <svg className="h-6 w-6 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                    </svg>
                  </div>
                  <div className="ml-5 w-0 flex-1">
                    <dl>
                      <dt className="text-sm font-medium text-gray-500 truncate">Price Drops</dt>
                      <dd>
                        <div className="text-lg font-bold text-gray-900">{stats.priceDrop}</div>
                        <div className="text-sm text-green-600">
                          {stats.totalProducts > 0 ? `${((stats.priceDrop / stats.totalProducts) * 100).toFixed(1)}% of products` : '0%'}
                        </div>
                      </dd>
                    </dl>
                  </div>
                </div>
              </div>
            </div>

            {/* Total Savings Card */}
            <div className="bg-white overflow-hidden shadow rounded-lg">
              <div className="p-5">
                <div className="flex items-center">
                  <div className="flex-shrink-0 bg-amber-500 rounded-md p-3">
                    <svg className="h-6 w-6 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                  <div className="ml-5 w-0 flex-1">
                    <dl>
                      <dt className="text-sm font-medium text-gray-500 truncate">Total Savings</dt>
                      <dd>
                        <div className="text-lg font-bold text-gray-900">{formatCurrency(stats.totalSavings)}</div>
                        <div className="text-sm text-amber-600">
                          {formatPercentage(stats.savingsPercentage)} of potential cost
                        </div>
                      </dd>
                    </dl>
                  </div>
                </div>
              </div>
            </div>

            {/* Average Discount Card */}
            <div className="bg-white overflow-hidden shadow rounded-lg">
              <div className="p-5">
                <div className="flex items-center">
                  <div className="flex-shrink-0 bg-purple-500 rounded-md p-3">
                    <svg className="h-6 w-6 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 12l3-3 3 3 4-4M8 21l4-4 4 4M3 4h18M4 4h16v12a1 1 0 01-1 1H5a1 1 0 01-1-1V4z" />
                    </svg>
                  </div>
                  <div className="ml-5 w-0 flex-1">
                    <dl>
                      <dt className="text-sm font-medium text-gray-500 truncate">Average Discount</dt>
                      <dd>
                        <div className="text-lg font-bold text-gray-900">{formatPercentage(stats.averageDiscount)}</div>
                        <div className="text-sm text-purple-600">
                          On products below target
                        </div>
                      </dd>
                    </dl>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Platform Distribution and Status */}
          <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
            {/* Platform Distribution */}
            <div className="bg-white shadow rounded-lg overflow-hidden">
              <div className="px-5 py-4 border-b border-gray-200 flex justify-between items-center">
                <h3 className="text-lg font-medium text-gray-900">Platform Distribution</h3>
              </div>
              <div className="p-5">
                <div className="space-y-6">
                  {/* Myntra */}
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <div className="flex items-center">
                        <span className="w-3 h-3 bg-pink-500 rounded-full mr-2"></span>
                        <span className="text-sm font-medium text-gray-700">Myntra</span>
                      </div>
                      <span className="text-sm font-medium text-gray-900">{stats.myntraCount} products</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div 
                        className="bg-pink-500 h-2 rounded-full" 
                        style={{ 
                          width: `${stats.totalProducts > 0 ? (stats.myntraCount / stats.totalProducts * 100) : 0}%` 
                        }}
                      ></div>
                    </div>
                  </div>
                  
                  {/* Amazon */}
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <div className="flex items-center">
                        <span className="w-3 h-3 bg-yellow-500 rounded-full mr-2"></span>
                        <span className="text-sm font-medium text-gray-700">Amazon</span>
                      </div>
                      <span className="text-sm font-medium text-gray-900">{stats.amazonCount} products</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div 
                        className="bg-yellow-500 h-2 rounded-full" 
                        style={{ 
                          width: `${stats.totalProducts > 0 ? (stats.amazonCount / stats.totalProducts * 100) : 0}%` 
                        }}
                      ></div>
                    </div>
                  </div>
                  
                  {/* Flipkart */}
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <div className="flex items-center">
                        <span className="w-3 h-3 bg-blue-500 rounded-full mr-2"></span>
                        <span className="text-sm font-medium text-gray-700">Flipkart</span>
                      </div>
                      <span className="text-sm font-medium text-gray-900">{stats.flipkartCount} products</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div 
                        className="bg-blue-500 h-2 rounded-full" 
                        style={{ 
                          width: `${stats.totalProducts > 0 ? (stats.flipkartCount / stats.totalProducts * 100) : 0}%` 
                        }}
                      ></div>
                    </div>
                  </div>
                  
                  {/* Other */}
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <div className="flex items-center">
                        <span className="w-3 h-3 bg-gray-500 rounded-full mr-2"></span>
                        <span className="text-sm font-medium text-gray-700">Other</span>
                      </div>
                      <span className="text-sm font-medium text-gray-900">
                        {stats.totalProducts - (stats.myntraCount + stats.amazonCount + stats.flipkartCount)} products
                      </span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div 
                        className="bg-gray-500 h-2 rounded-full" 
                        style={{ 
                          width: `${stats.totalProducts > 0 ? 
                            ((stats.totalProducts - (stats.myntraCount + stats.amazonCount + stats.flipkartCount)) / stats.totalProducts * 100) : 0}%` 
                        }}
                      ></div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Status Distribution */}
            <div className="bg-white shadow rounded-lg overflow-hidden">
              <div className="px-5 py-4 border-b border-gray-200 flex justify-between items-center">
                <h3 className="text-lg font-medium text-gray-900">Price Status</h3>
              </div>
              <div className="p-5">
                <div className="space-y-6">
                  {/* Below Target */}
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <div className="flex items-center">
                        <span className="w-3 h-3 bg-green-500 rounded-full mr-2"></span>
                        <span className="text-sm font-medium text-gray-700">Below Target</span>
                      </div>
                      <span className="text-sm font-medium text-green-600">{stats.priceDrop} products</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div 
                        className="bg-green-500 h-2 rounded-full" 
                        style={{ 
                          width: `${stats.totalProducts > 0 ? (stats.priceDrop / stats.totalProducts * 100) : 0}%` 
                        }}
                      ></div>
                    </div>
                  </div>
                  
                  {/* Above Target */}
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <div className="flex items-center">
                        <span className="w-3 h-3 bg-amber-500 rounded-full mr-2"></span>
                        <span className="text-sm font-medium text-gray-700">Above Target</span>
                      </div>
                      <span className="text-sm font-medium text-amber-600">
                        {stats.totalProducts - stats.priceDrop} products
                      </span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div 
                        className="bg-amber-500 h-2 rounded-full" 
                        style={{ 
                          width: `${stats.totalProducts > 0 ? ((stats.totalProducts - stats.priceDrop) / stats.totalProducts * 100) : 0}%` 
                        }}
                      ></div>
                    </div>
                  </div>
                  
                  {/* Quick Actions */}
                  <div className="mt-6 pt-4 border-t border-gray-200">
                    <h4 className="text-sm font-medium text-gray-700 mb-3">Quick Actions</h4>
                    <div className="grid grid-cols-2 gap-3">
                      <Link 
                        href="/scanner" 
                        className="inline-flex justify-center items-center px-3 py-2 border border-transparent text-sm leading-4 font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                      >
                        Scan Prices
                      </Link>
                      <Link 
                        href="/products" 
                        className="inline-flex justify-center items-center px-3 py-2 border border-transparent text-sm leading-4 font-medium rounded-md text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500"
                      >
                        Add Product
                      </Link>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Top Price Drops and Recent Scans */}
          <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
            {/* Top Price Drops */}
            <div className="bg-white shadow rounded-lg overflow-hidden">
              <div className="px-5 py-4 border-b border-gray-200 bg-green-50">
                <div className="flex items-center">
                  <svg className="h-5 w-5 text-green-600 mr-2" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                  </svg>
                  <h3 className="text-lg font-medium text-green-900">Top Price Drops</h3>
                </div>
              </div>
              <div className="overflow-x-auto">
                {topDropProducts.length > 0 ? (
                  <div className="min-w-full">
                    <div className="bg-gray-50 grid grid-cols-12 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      <div className="col-span-5 px-6 py-3">Product</div>
                      <div className="col-span-2 px-6 py-3">Platform</div>
                      <div className="col-span-2 px-6 py-3">Current</div>
                      <div className="col-span-3 px-6 py-3">Savings</div>
                    </div>
                    <div className="divide-y divide-gray-200">
                      {topDropProducts.map((product) => {
                        const savings = product.desiredPrice - (product.currentPrice || 0);
                        const savingsPercent = (savings / product.desiredPrice) * 100;
                        
                        return (
                          <div key={product.id} className="grid grid-cols-12 hover:bg-gray-50">
                            <div className="col-span-5 px-6 py-4">
                              <div className="text-sm font-medium text-gray-900 truncate max-w-xs">
                                <Link href={`/products/${product.id}`} className="hover:text-indigo-600">
                                  {product.name || 'Unknown Product'}
                                </Link>
                              </div>
                            </div>
                            <div className="col-span-2 px-6 py-4">
                              <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                                product.ecommercePlatform?.toLowerCase() === 'myntra' 
                                  ? 'bg-pink-100 text-pink-800'
                                  : product.ecommercePlatform?.toLowerCase() === 'amazon'
                                    ? 'bg-yellow-100 text-yellow-800'
                                    : 'bg-blue-100 text-blue-800'
                              }`}>
                                {product.ecommercePlatform || 'Unknown'}
                              </span>
                            </div>
                            <div className="col-span-2 px-6 py-4">
                              <span className="text-sm font-bold text-green-600">
                                ₹{(product.currentPrice || 0).toFixed(2)}
                              </span>
                            </div>
                            <div className="col-span-3 px-6 py-4">
                              <div className="flex flex-col">
                                <span className="text-sm font-medium text-green-600">
                                  ₹{savings.toFixed(2)}
                                </span>
                                <span className="text-xs text-green-800">
                                  ({savingsPercent.toFixed(1)}% off)
                                </span>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ) : (
                  <div className="px-6 py-8 text-center text-sm text-gray-500">
                    No price drops found yet. Keep scanning for price changes!
                  </div>
                )}
              </div>
            </div>

            {/* Recently Scanned Products */}
            <div className="bg-white shadow rounded-lg overflow-hidden">
              <div className="px-5 py-4 border-b border-gray-200 bg-blue-50">
                <div className="flex items-center">
                  <svg className="h-5 w-5 text-blue-600 mr-2" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <h3 className="text-lg font-medium text-blue-900">Recently Scanned Products</h3>
                </div>
              </div>
              <div className="overflow-x-auto">
                {recentlyScanned.length > 0 ? (
                  <div className="min-w-full">
                    <div className="bg-gray-50 grid grid-cols-12 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      <div className="col-span-4 px-6 py-3">Product</div>
                      <div className="col-span-2 px-6 py-3">Platform</div>
                      <div className="col-span-2 px-6 py-3">Price</div>
                      <div className="col-span-2 px-6 py-3">Status</div>
                      <div className="col-span-2 px-6 py-3">Scanned</div>
                    </div>
                    <div className="divide-y divide-gray-200">
                      {recentlyScanned.map((product) => (
                        <div key={product.id} className="grid grid-cols-12 hover:bg-gray-50">
                          <div className="col-span-4 px-6 py-4">
                            <div className="text-sm font-medium text-gray-900 truncate max-w-xs">
                              <Link href={`/products/${product.id}`} className="hover:text-indigo-600">
                                {product.name || 'Unknown Product'}
                              </Link>
                            </div>
                          </div>
                          <div className="col-span-2 px-6 py-4">
                            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                              product.ecommercePlatform?.toLowerCase() === 'myntra' 
                                ? 'bg-pink-100 text-pink-800'
                                : product.ecommercePlatform?.toLowerCase() === 'amazon'
                                  ? 'bg-yellow-100 text-yellow-800'
                                  : 'bg-blue-100 text-blue-800'
                            }`}>
                              {product.ecommercePlatform || 'Unknown'}
                            </span>
                          </div>
                          <div className="col-span-2 px-6 py-4">
                            {product.currentPrice 
                              ? <span className={`text-sm font-bold ${product.isBelow ? 'text-green-600' : 'text-amber-600'}`}>
                                  ₹{product.currentPrice.toFixed(2)}
                                </span>
                              : <span className="text-sm text-gray-400">Not scanned</span>
                            }
                          </div>
                          <div className="col-span-2 px-6 py-4">
                            {product.currentPrice ? (
                              product.isBelow 
                                ? <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                                    Below Target
                                  </span>
                                : <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-amber-100 text-amber-800">
                                    Above Target
                                  </span>
                            ) : (
                              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                                Unknown
                              </span>
                            )}
                          </div>
                          <div className="col-span-2 px-6 py-4">
                            <span className="text-xs text-gray-500">
                              {formatDate(product.lastChecked)}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : (
                  <div className="px-6 py-8 text-center text-sm text-gray-500">
                    No products have been scanned yet. Use the scanner to check prices!
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
