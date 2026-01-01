'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
import { Product } from '@/types';
import ProductItem from '@/components/ProductItem';

interface ProductListProps {
  products: Product[];
  onRemove: (id: string) => void;
  onUpdate?: (id: string, updates: Partial<Product>) => void;
}

export default function ProductList({ products, onRemove, onUpdate }: ProductListProps) {
  // Sorting states
  const [sortField, setSortField] = useState<string>('lastChecked');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');
  
  // Filter states
  const [selectedPlatform, setSelectedPlatform] = useState<string>('All');
  const [selectedStatus, setSelectedStatus] = useState<string>('All');
  const [searchQuery, setSearchQuery] = useState<string>('');
  
  // Pagination states
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [itemsPerPage, setItemsPerPage] = useState<number>(96);

  // Get unique platforms for filter options
  const platforms = ['All', ...new Set(products.map(product => product.ecommercePlatform || 'Unknown'))].filter(Boolean);

  // Calculate stats
  const totalProducts = products.length;
  const priceDrops = products.filter(product => product.isBelow).length;
  const scannedProducts = products.filter(product => product.lastChecked !== undefined).length;
  const productsWithOffers = products.filter(product => product.offers && product.offers.length > 0).length;

  useEffect(() => {
    // Reset pagination when filters change
    setCurrentPage(1);
  }, [selectedPlatform, selectedStatus, searchQuery]);
  
  // Filter products based on selected criteria
  const filterProducts = useCallback((productsToFilter: Product[]) => {
    let filtered = productsToFilter;
    
    // Filter by platform
    if (selectedPlatform !== 'All') {
      filtered = filtered.filter(product => product.ecommercePlatform === selectedPlatform);
    }
    
    // Filter by status
    if (selectedStatus === 'Price Drops') {
      filtered = filtered.filter(product => product.isBelow);
    } else if (selectedStatus === 'Waiting') {
      filtered = filtered.filter(product => product.isBelow === false && product.lastChecked);
    } else if (selectedStatus === 'Not Scanned') {
      filtered = filtered.filter(product => product.lastChecked === undefined);
    } else if (selectedStatus === 'With Offers') {
      filtered = filtered.filter(product => product.offers && product.offers.length > 0);
    }

    // Filter by search query (search in name, brand, and URL)
    if (searchQuery.trim() !== '') {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(product => 
        (product.name && product.name.toLowerCase().includes(query)) ||
        (product.brand && product.brand.toLowerCase().includes(query)) ||
        (product.url && product.url.toLowerCase().includes(query))
      );
    }
    
    return filtered;
  }, [selectedPlatform, selectedStatus, searchQuery]);

  // Calculate price drop percentage for a product
  const calculatePriceDropPercentage = useCallback((product: Product): number => {
    if (!product.currentPrice || !product.desiredPrice || product.currentPrice >= product.desiredPrice) {
      return 0;
    }
    
    const priceDifference = product.desiredPrice - product.currentPrice;
    const percentage = (priceDifference / product.desiredPrice) * 100;
    return parseFloat(percentage.toFixed(2));
  }, []);

  // Calculate percentage gap between current price and target price (useful for sorting)
  const calculatePriceGapPercentage = useCallback((product: Product): number => {
    if (!product.currentPrice || !product.desiredPrice) {
      return 100; // Maximum gap if price is not available
    }
    
    const priceDifference = Math.abs(product.desiredPrice - product.currentPrice);
    const percentage = (priceDifference / product.desiredPrice) * 100;
    return parseFloat(percentage.toFixed(2));
  }, []);

  // Sort products based on the selected field and direction
  const sortProducts = useCallback((productsToSort: Product[]) => {
    return [...productsToSort].sort((a, b) => {
      // Special case for price drop percentage
      if (sortField === 'priceDropPercentage') {
        const aPercentage = calculatePriceDropPercentage(a);
        const bPercentage = calculatePriceDropPercentage(b);
        
        if (aPercentage === bPercentage) return 0;
        return sortDirection === 'asc' 
          ? aPercentage - bPercentage 
          : bPercentage - aPercentage;
      }
      
      // Special case for price gap percentage
      if (sortField === 'priceGapPercentage') {
        const aPercentage = calculatePriceGapPercentage(a);
        const bPercentage = calculatePriceGapPercentage(b);
        
        if (aPercentage === bPercentage) return 0;
        return sortDirection === 'asc' 
          ? aPercentage - bPercentage 
          : bPercentage - aPercentage;
      }
      
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      let aValue: any = a[sortField as keyof Product];
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      let bValue: any = b[sortField as keyof Product];
      
      // Handle undefined values
      if (aValue === undefined) return sortDirection === 'asc' ? -1 : 1;
      if (bValue === undefined) return sortDirection === 'asc' ? 1 : -1;
      
      // Convert to numbers for numeric fields
      if (sortField === 'currentPrice' || sortField === 'desiredPrice') {
        aValue = Number(aValue) || 0;
        bValue = Number(bValue) || 0;
      }
      
      // Convert dates to timestamps
      if (sortField === 'lastChecked') {
        aValue = aValue ? new Date(aValue).getTime() : 0;
        bValue = bValue ? new Date(bValue).getTime() : 0;
      }
      
      // Compare values
      if (aValue < bValue) return sortDirection === 'asc' ? -1 : 1;
      if (aValue > bValue) return sortDirection === 'asc' ? 1 : -1;
      return 0;
    });
  }, [sortField, sortDirection, calculatePriceDropPercentage, calculatePriceGapPercentage]);

  // Handle sorting when a column header is clicked
  const handleSort = (field: string) => {
    if (field === sortField) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  // Apply filters and sorting
  const filteredProducts = useMemo(() => filterProducts(products), 
    [products, filterProducts]);
  const sortedProducts = useMemo(() => sortProducts(filteredProducts), 
    [filteredProducts, sortProducts]);
  
  // Apply pagination
  const paginatedProducts = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    // If itemsPerPage is 0, show all products
    if (itemsPerPage === 0) {
      return sortedProducts;
    }
    const endIndex = startIndex + itemsPerPage;
    return sortedProducts.slice(startIndex, endIndex);
  }, [sortedProducts, currentPage, itemsPerPage]);

  // Calculate pagination information
  const totalPages = itemsPerPage === 0 ? 1 : Math.ceil(sortedProducts.length / itemsPerPage);
  const startItem = itemsPerPage === 0 ? 1 : (currentPage - 1) * itemsPerPage + 1;
  const endItem = itemsPerPage === 0 ? sortedProducts.length : Math.min(currentPage * itemsPerPage, sortedProducts.length);

  // Pagination controls
  const handlePageChange = (page: number) => {
    setCurrentPage(page);
    // Scroll to top of list when page changes
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // Handle items per page change
  const handleItemsPerPageChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setItemsPerPage(Number(e.target.value));
    setCurrentPage(1);
  };
  
  // Handle empty state
  if (products.length === 0) {
    return (
      <div className="bg-white p-6 rounded-lg shadow-md text-center">
        <h2 className="text-xl font-semibold mb-4">Your Products</h2>
        <div className="py-8">
          <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" />
          </svg>
          <h3 className="mt-2 text-sm font-medium text-gray-900">No products</h3>
          <p className="mt-1 text-sm text-gray-500">Get started by adding a product to track.</p>
        </div>
      </div>
    );
  }
  
  return (
    <div className="space-y-4">
      {/* Search Bar */}
      <div className="bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden p-4">
        <div className="relative">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <svg className="h-5 w-5 text-gray-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
              <path fillRule="evenodd" d="M8 4a4 4 0 100 8 4 4 0 000-8zM2 8a6 6 0 1110.89 3.476l4.817 4.817a1 1 0 01-1.414 1.414l-4.816-4.816A6 6 0 012 8z" clipRule="evenodd" />
            </svg>
          </div>
          <input
            type="text"
            className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md leading-5 bg-white placeholder-gray-500 focus:outline-none focus:placeholder-gray-400 focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
            placeholder="Search products by name, brand, or URL..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
      </div>

      {/* Filter controls */}
      <div className="bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden">
        <div className="px-4 sm:px-6 py-4 sm:py-5 border-b border-gray-200">
          <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
            {/* Status filter */}
            <div className="w-full sm:w-auto">
              <div className="flex items-center mb-2 sm:mb-0">
                <span className="text-sm font-medium text-gray-700 mr-3">Status:</span>
                
                {/* Mobile Dropdown */}
                <div className="block sm:hidden w-full">
                  <select 
                    className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 font-medium shadow-sm focus:border-indigo-500 focus:ring-indigo-500 focus:outline-none appearance-none"
                    value={selectedStatus}
                    onChange={(e) => setSelectedStatus(e.target.value)}
                    style={{ backgroundImage: "url(\"data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 20 20'%3e%3cpath stroke='%236b7280' stroke-linecap='round' stroke-linejoin='round' stroke-width='1.5' d='M6 8l4 4 4-4'/%3e%3c/svg%3e\")", backgroundPosition: "right 0.5rem center", backgroundRepeat: "no-repeat", backgroundSize: "1.5em 1.5em", paddingRight: "2.5rem" }}
                  >
                    <option value="All">All ({totalProducts})</option>
                    <option value="Price Drops">Price Drops ({priceDrops})</option>
                    <option value="Waiting">Waiting ({scannedProducts - priceDrops})</option>
                    <option value="Not Scanned">Not Scanned ({totalProducts - scannedProducts})</option>
                    <option value="With Offers">With Offers ({productsWithOffers})</option>
                  </select>
                </div>
                
                {/* Desktop Buttons */}
                <div className="hidden sm:flex flex-wrap gap-2">
                  <button
                    onClick={() => setSelectedStatus('All')}
                    className={`px-3 py-1.5 rounded-md text-sm font-medium ${
                      selectedStatus === 'All'
                        ? 'bg-indigo-100 text-indigo-700'
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                  >
                    All <span className="text-xs ml-1 text-gray-500">({totalProducts})</span>
                  </button>
                  <button
                    onClick={() => setSelectedStatus('Price Drops')}
                    className={`px-3 py-1.5 rounded-md text-sm font-medium ${
                      selectedStatus === 'Price Drops'
                        ? 'bg-green-100 text-green-700'
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                  >
                    Price Drops <span className="text-xs ml-1 text-gray-500">({priceDrops})</span>
                  </button>
                  <button
                    onClick={() => setSelectedStatus('Waiting')}
                    className={`px-3 py-1.5 rounded-md text-sm font-medium ${
                      selectedStatus === 'Waiting'
                        ? 'bg-yellow-100 text-yellow-700'
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                  >
                    Waiting <span className="text-xs ml-1 text-gray-500">({scannedProducts - priceDrops})</span>
                  </button>
                  <button
                    onClick={() => setSelectedStatus('Not Scanned')}
                    className={`px-3 py-1.5 rounded-md text-sm font-medium ${
                      selectedStatus === 'Not Scanned'
                        ? 'bg-gray-100 text-blue-700'
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                  >
                    Not Scanned <span className="text-xs ml-1 text-gray-300">({totalProducts - scannedProducts})</span>
                  </button>
                  <button
                    onClick={() => setSelectedStatus('With Offers')}
                    className={`px-3 py-1.5 rounded-md text-sm font-medium ${
                      selectedStatus === 'With Offers'
                        ? 'bg-orange-100 text-orange-700'
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                  >
                    With Offers <span className="text-xs ml-1 text-gray-500">({productsWithOffers})</span>
                  </button>
                </div>
              </div>
            </div>
            
            {/* Platform filter */}
            <div className="w-full sm:w-auto">
              <div className="flex items-center">
                <span className="text-sm font-medium text-gray-700 mr-3">Platform:</span>
                
                {/* Mobile Dropdown */}
                <div className="block sm:hidden w-full">
                  <select 
                    className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 font-medium shadow-sm focus:border-indigo-500 focus:ring-indigo-500 focus:outline-none appearance-none"
                    value={selectedPlatform}
                    onChange={(e) => setSelectedPlatform(e.target.value)}
                    style={{ backgroundImage: "url(\"data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 20 20'%3e%3cpath stroke='%236b7280' stroke-linecap='round' stroke-linejoin='round' stroke-width='1.5' d='M6 8l4 4 4-4'/%3e%3c/svg%3e\")", backgroundPosition: "right 0.5rem center", backgroundRepeat: "no-repeat", backgroundSize: "1.5em 1.5em", paddingRight: "2.5rem" }}
                  >
                    {platforms.map(platform => (
                      <option key={platform} value={platform}>{platform}</option>
                    ))}
                  </select>
                </div>
                
                {/* Desktop Buttons */}
                <div className="hidden sm:flex flex-wrap gap-2">
                  {platforms.map(platform => (
                    <button
                      key={platform}
                      onClick={() => setSelectedPlatform(platform)}
                      className={`px-3 py-1.5 rounded-md text-sm font-medium ${
                        selectedPlatform === platform
                          ? 'bg-indigo-100 text-indigo-700'
                          : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                      }`}
                    >
                      {platform}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Sort Options */}
      <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-3 flex flex-wrap items-center justify-between">
        <div className="flex items-center">
          <span className="text-sm font-medium text-gray-700 mr-3">Sort By:</span>
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => handleSort('priceDropPercentage')}
              className={`px-3 py-1.5 rounded-md text-xs font-medium ${
                sortField === 'priceDropPercentage' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              Price Drop % {sortField === 'priceDropPercentage' && (sortDirection === 'asc' ? '↑' : '↓')}
            </button>
            <button
              onClick={() => handleSort('priceGapPercentage')}
              className={`px-3 py-1.5 rounded-md text-xs font-medium ${
                sortField === 'priceGapPercentage' ? 'bg-purple-100 text-purple-700' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              Price Difference % {sortField === 'priceGapPercentage' && (sortDirection === 'asc' ? '↑' : '↓')}
            </button>
          </div>
        </div>
      </div>

      {/* Products Grid */}
      <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-6">
        {paginatedProducts.length === 0 ? (
          <div className="py-12 text-center text-gray-500">
            <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <h3 className="mt-2 text-sm font-medium text-gray-900">No products match your filter criteria</h3>
            <p className="mt-1 text-sm text-gray-500">Try adjusting your search or filter parameters.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-2 xl:grid-cols-3 gap-3 sm:gap-5">
            {paginatedProducts.map(product => (
              <ProductItem 
                key={product.id}
                product={product}
                variant="card"
                onRemove={onRemove}
                onUpdate={onUpdate}
              />
            ))}
          </div>
        )}
      </div>
      
      {/* Pagination info and controls */}
      <div className="px-4 py-3 bg-white border border-gray-200 rounded-lg shadow-sm flex flex-col sm:flex-row sm:items-center sm:justify-between">
        <div className="mb-4 sm:mb-0">
          <p className="text-sm text-gray-800 font-medium">
            Showing <span className="font-semibold">{startItem}</span> to <span className="font-semibold">{endItem}</span> of <span className="font-semibold">{sortedProducts.length}</span> products
          </p>
        </div>
        
        <div className="flex items-center space-x-4">
          <div>
            <label htmlFor="itemsPerPage" className="mr-2 text-sm text-gray-800 font-medium">Show:</label>
            <select
              id="itemsPerPage"
              className="rounded border-gray-300 text-sm text-gray-900 focus:ring-indigo-500 focus:border-indigo-500"
              value={itemsPerPage}
              onChange={handleItemsPerPageChange}
            >
              <option value="24">24</option>
              <option value="96">96</option>
              <option value="0">All</option>
            </select>
          </div>
          
          <div className="flex items-center space-x-2">
            <button
              onClick={() => handlePageChange(1)}
              disabled={currentPage === 1}
              className={`p-1 rounded hover:bg-gray-100 ${currentPage === 1 ? 'opacity-50 cursor-not-allowed' : ''}`}
              aria-label="First page"
            >
              <svg className="h-5 w-5 text-gray-500" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M15.707 15.707a1 1 0 01-1.414 0l-5-5a1 1 0 010-1.414l5-5a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 010 1.414zM6.707 15.707a1 1 0 01-1.414 0l-5-5a1 1 0 010-1.414l5-5a1 1 0 011.414 1.414L2.414 10l4.293 4.293a1 1 0 010 1.414z" clipRule="evenodd" />
              </svg>
            </button>
            <button
              onClick={() => handlePageChange(currentPage - 1)}
              disabled={currentPage === 1}
              className={`p-1 rounded hover:bg-gray-100 ${currentPage === 1 ? 'opacity-50 cursor-not-allowed' : ''}`}
              aria-label="Previous page"
            >
              <svg className="h-5 w-5 text-gray-500" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M12.707 5.293a1 1 0 010 1.414L9.414 10l3.293 3.293a1 1 0 01-1.414 1.414l-4-4a1 1 0 010-1.414l4-4a1 1 0 011.414 0z" clipRule="evenodd" />
              </svg>
            </button>
            
            <span className="px-3 py-1 text-sm font-medium text-gray-700">
              Page <span className="font-semibold">{currentPage}</span> of <span className="font-semibold">{totalPages}</span>
            </span>
            
            <button
              onClick={() => handlePageChange(currentPage + 1)}
              disabled={currentPage === totalPages}
              className={`p-1 rounded hover:bg-gray-100 ${currentPage === totalPages ? 'opacity-50 cursor-not-allowed' : ''}`}
              aria-label="Next page"
            >
              <svg className="h-5 w-5 text-gray-500" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clipRule="evenodd" />
              </svg>
            </button>
            <button
              onClick={() => handlePageChange(totalPages)}
              disabled={currentPage === totalPages}
              className={`p-1 rounded hover:bg-gray-100 ${currentPage === totalPages ? 'opacity-50 cursor-not-allowed' : ''}`}
              aria-label="Last page"
            >
              <svg className="h-5 w-5 text-gray-500" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M10.293 15.707a1 1 0 010-1.414L14.586 10l-4.293-4.293a1 1 0 111.414-1.414l5 5a1 1 0 010 1.414l-5 5a1 1 0 01-1.414 0z" clipRule="evenodd" />
                <path fillRule="evenodd" d="M4.293 15.707a1 1 0 010-1.414L8.586 10 4.293 5.707a1 1 0 011.414-1.414l5 5a1 1 0 010 1.414l-5 5a1 1 0 01-1.414 0z" clipRule="evenodd" />
              </svg>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}