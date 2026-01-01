'use client';

import { useState, useEffect } from 'react';
import { Product } from '@/types';
import ProductForm from '@/components/ProductForm';
import ProductList from '@/components/ProductList';
import BulkDeleteModal from '@/components/BulkDeleteModal';
import ScannerStatusWidget from '@/components/ScannerStatusWidget';
import Link from 'next/link';

export default function ProductsPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isProductFormOpen, setIsProductFormOpen] = useState(false);
  const [isBulkDeleteModalOpen, setIsBulkDeleteModalOpen] = useState(false);

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

  // Add a new product
  const handleAddProduct = async (productOrProducts: Product | Product[]) => {
    try {
      // Check if we're receiving a single product or an array of products
      if (Array.isArray(productOrProducts)) {
        // Handle multiple products (from CSV import)
        const products = productOrProducts;
        
        // Make sure all products have required fields
        for (const product of products) {
          if (!product.url || !product.desiredPrice) {
            throw new Error('URL and desired price are required for all products');
          }
        }
        
        // Send batch request to add multiple products
        const response = await fetch('/api/products', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ products }),
        });
        
        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || 'Failed to add products');
        }
      } else {
        // Handle single product (from form)
        const product = productOrProducts;
        
        // Make sure the product has required fields
        if (!product.url || !product.desiredPrice) {
          throw new Error('URL and desired price are required');
        }
        
        // Send request to add a single product
        const response = await fetch('/api/products', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(product),
        });
        
        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || 'Failed to add product');
        }
      }
      
      // Refresh products list
      const updatedResponse = await fetch('/api/products');
      const data = await updatedResponse.json();
      setProducts(data.products);
      
      // Close the form after adding
      setIsProductFormOpen(false);
    } catch (error: unknown) {
      console.error('Error adding product:', error);
      const message = error instanceof Error ? error.message : 'Failed to add product';
      alert(message);
    }
  };

  // Remove a product
  const handleRemoveProduct = async (id: string) => {
    try {
      const response = await fetch(`/api/products?id=${id}`, {
        method: 'DELETE',
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to remove product');
      }
      
      // Update local state - no need to refetch all products from the API
      setProducts(prevProducts => prevProducts.filter(product => product.id !== id));
    } catch (error: unknown) {
      console.error('Error removing product:', error);
      const message = error instanceof Error ? error.message : 'Failed to remove product';
      alert(message);
    }
  };

  // Update a single product
  const handleUpdateProduct = async (id: string, updates: Partial<Product>) => {
    try {
      const response = await fetch('/api/products', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ id, updates }),
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to update product');
      }
      
      const data = await response.json();
      
      // Update the product in the local state
      setProducts(prevProducts => 
        prevProducts.map(product => 
          product.id === id ? { ...product, ...updates } : product
        )
      );
      
      return data.product;
    } catch (error: unknown) {
      console.error('Error updating product:', error);
      const message = error instanceof Error ? error.message : 'Failed to update product';
      alert(message);
      throw error;
    }
  };

  // Handle bulk delete by platform
  const handleBulkDelete = async (platforms: string[]) => {
    try {
      // Get IDs of products from selected platforms
      const productIdsToDelete = products
        .filter(product => {
          const platform = (product.ecommercePlatform || 'unknown').toLowerCase();
          return platforms.includes(platform);
        })
        .map(product => product.id);
      
      if (productIdsToDelete.length === 0) {
        alert("No products found for the selected platforms");
        return;
      }

      // Use the existing DELETE endpoint with the ids parameter
      const response = await fetch(`/api/products?ids=${JSON.stringify(productIdsToDelete)}`, {
        method: 'DELETE',
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to delete products');
      }
      
      const result = await response.json();
      
      // Update local state - remove the deleted products
      setProducts(prevProducts => 
        prevProducts.filter(product => {
          const platform = (product.ecommercePlatform || 'unknown').toLowerCase();
          return !platforms.includes(platform);
        })
      );
      
      alert(`Successfully deleted ${result.message}`);
      
      // Close the modal
      setIsBulkDeleteModalOpen(false);
    } catch (error: unknown) {
      console.error('Error performing bulk delete:', error);
      const message = error instanceof Error ? error.message : 'Failed to delete products';
      alert(message);
      throw error;
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">My Products</h1>
          <p className="mt-1 text-sm text-gray-500">
            Track prices of your favorite products
          </p>
          <div className="mt-2 flex items-center space-x-3">
            <ScannerStatusWidget />
            <Link 
              href="/admin/scanner" 
              className="text-xs text-indigo-600 hover:text-indigo-800 font-medium inline-flex items-center"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3 mr-1" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M11.49 3.17c-.38-1.56-2.6-1.56-2.98 0a1.532 1.532 0 01-2.286.948c-1.372-.836-2.942.734-2.106 2.106.54.886.061 2.042-.947 2.287-1.561.379-1.561 2.6 0 2.978a1.532 1.532 0 01.947 2.287c-.836 1.372.734 2.942 2.106 2.106a1.532 1.532 0 012.287.947c.379 1.561 2.6 1.561 2.978 0a1.533 1.533 0 012.287-.947c1.372.836 2.942-.734 2.106-2.106a1.533 1.533 0 01.947-2.287c1.561-.379 1.561-2.6 0-2.978a1.532 1.532 0 01-.947-2.287c.836-1.372-.734-2.942-2.106-2.106a1.532 1.532 0 01-2.287-.947zM10 13a3 3 0 100-6 3 3 0 000 6z" clipRule="evenodd" />
              </svg>
              Configure Scanner
            </Link>
          </div>
        </div>
        <div className="mt-4 sm:mt-0 flex flex-col sm:flex-row space-y-3 sm:space-y-0 sm:space-x-3">
          <button
            type="button"
            onClick={() => setIsBulkDeleteModalOpen(true)}
            className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-red-600 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
          >
            <svg className="-ml-1 mr-2 h-5 w-5" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z" clipRule="evenodd" />
            </svg>
            Bulk Delete
          </button>
          <button
            type="button"
            onClick={() => setIsProductFormOpen(true)}
            className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
          >
            <svg className="-ml-1 mr-2 h-5 w-5" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M10 5a1 1 0 011 1v3h3a1 1 0 110 2h-3v3a1 1 0 11-2 0v-3H6a1 1 0 110-2h3V6a1 1 0 011-1z" clipRule="evenodd" />
            </svg>
            Add Product
          </button>
        </div>
      </div>

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
        <div>
          <div className="bg-white shadow rounded-lg overflow-hidden">
            <div className="px-6 py-5 border-b border-gray-200">
              <h3 className="text-lg leading-6 font-medium text-gray-900">
                Your Tracked Products
              </h3>
              <p className="mt-1 text-sm text-gray-500">
                A list of all the products you are currently tracking.
              </p>
            </div>
            <ProductList 
              products={products} 
              onRemove={handleRemoveProduct}
              onUpdate={handleUpdateProduct}
            />
          </div>
        </div>
      )}

      {/* Add Product Modal */}
      {isProductFormOpen && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex items-center justify-center min-h-screen px-4 pt-4 pb-20 text-center sm:block sm:p-0">
            {/* Background overlay */}
            <div 
              className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity" 
              onClick={() => setIsProductFormOpen(false)}
              aria-hidden="true"
            ></div>

            {/* Modal panel */}
            <div className="inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full">
              <div className="bg-gradient-to-r from-indigo-50 to-purple-50 border-b border-indigo-100 px-6 py-4">
                <div className="flex justify-between items-center">
                  <h2 className="text-lg font-medium text-indigo-800 flex items-center">
                    <span className="mr-2">
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M10 5a1 1 0 011 1v3h3a1 1 0 110 2h-3v3a1 1 0 11-2 0v-3H6a1 1 0 110-2h3V6a1 1 0 011-1z" clipRule="evenodd" />
                      </svg>
                    </span>
                    Add New Product
                  </h2>
                  <button
                    type="button"
                    className="bg-transparent rounded-md text-gray-400 hover:text-gray-500 focus:outline-none"
                    onClick={() => setIsProductFormOpen(false)}
                  >
                    <svg className="h-6 w-6" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
                <p className="text-sm text-indigo-600 mt-1">Track prices for Myntra, Amazon, and Flipkart products</p>
              </div>
              <div className="p-6">
                <ProductForm 
                  onAddProduct={handleAddProduct} 
                  products={products} 
                />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Bulk Delete Modal */}
      <BulkDeleteModal
        isOpen={isBulkDeleteModalOpen}
        onClose={() => setIsBulkDeleteModalOpen(false)}
        products={products}
        onBulkDelete={handleBulkDelete}
      />
    </div>
  );
}