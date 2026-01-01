import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import { Product } from '@/types';
import crypto from 'crypto';

// Data directory path
const DATA_DIR = path.join(process.cwd(), 'data');

// File locking mechanism to prevent concurrent writes
const fileLocks: Record<string, boolean> = {};

// Helper to acquire a lock for a specific file
const acquireLock = async (lockKey: string, maxWaitMs = 10000, intervalMs = 100): Promise<boolean> => {
  const startTime = Date.now();
  
  while (Date.now() - startTime < maxWaitMs) {
    if (!fileLocks[lockKey]) {
      fileLocks[lockKey] = true;
      return true;
    }
    
    // Wait a bit before checking again
    await new Promise(resolve => setTimeout(resolve, intervalMs));
  }
  
  console.error(`Failed to acquire lock for ${lockKey} after ${maxWaitMs}ms`);
  return false;
};

// Helper to release a lock
const releaseLock = (lockKey: string): void => {
  fileLocks[lockKey] = false;
};

// Get file path for a specific platform
const getDataFilePath = (platform: string): string => {
  return path.join(DATA_DIR, `${platform.toLowerCase()}_products.json`);
};

// Ensure data directory exists
const ensureDataDir = () => {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
};

// Load products for a specific platform with retries
const loadProducts = (platform: string, retries = 3): Product[] => {
  let attempt = 0;
  
  while (attempt < retries) {
    try {
      ensureDataDir();
      const filePath = getDataFilePath(platform);
      
      if (!fs.existsSync(filePath)) {
        fs.writeFileSync(filePath, '[]', 'utf8');
        return [];
      }
      
      const data = fs.readFileSync(filePath, 'utf8');
      return JSON.parse(data);
    } catch (error) {
      attempt++;
      console.error(`Error loading ${platform} products (attempt ${attempt}/${retries}):`, error);
      
      if (attempt >= retries) {
        console.error(`Failed to load ${platform} products after ${retries} attempts`);
        return [];
      }
    }
  }
  
  return [];
};

// Save products for a specific platform with locking
const saveProducts = async (platform: string, products: Product[]): Promise<boolean> => {
  const lockKey = `file_${platform}`;
  let success = false;
  
  if (await acquireLock(lockKey)) {
    try {
      ensureDataDir();
      const filePath = getDataFilePath(platform);
      
      // Write to a temp file first to prevent corruption
      const tempFilePath = `${filePath}.temp`;
      fs.writeFileSync(tempFilePath, JSON.stringify(products, null, 2), 'utf8');
      
      // Rename temp file to actual file (atomic operation)
      fs.renameSync(tempFilePath, filePath);
      
      success = true;
    } catch (error) {
      console.error(`Error saving ${platform} products:`, error);
      throw error;
    } finally {
      releaseLock(lockKey);
    }
  }
  
  return success;
};

// Get all products across platforms
const getAllProducts = (): Product[] => {
  try {
    ensureDataDir();
    const platforms = ['myntra', 'amazon', 'flipkart', 'unknown'];
    
    let allProducts: Product[] = [];
    for (const platform of platforms) {
      const products = loadProducts(platform);
      allProducts = [...allProducts, ...products];
    }
    
    return allProducts;
  } catch (error) {
    console.error('Error getting all products:', error);
    return [];
  }
};

// Helper function to add products to a specific platform
const addProductsToPlatform = async (platform: string, productsToAdd: Product[]) => {
  const existingProducts = loadProducts(platform);
  
  // Check for duplicates
  const duplicateUrls: string[] = [];
  const productsToAddFiltered = productsToAdd.filter(newProduct => {
    const isDuplicate = existingProducts.some(
      existingProduct => existingProduct.url.toLowerCase() === newProduct.url.toLowerCase()
    );
    
    if (isDuplicate) {
      duplicateUrls.push(newProduct.url);
      return false;
    }
    
    return true;
  });
  
  // Add non-duplicate products
  const updatedProducts = [...existingProducts, ...productsToAddFiltered];
  await saveProducts(platform, updatedProducts);
  
  // Log duplicates if any
  if (duplicateUrls.length > 0) {
    console.log(`Skipped ${duplicateUrls.length} duplicate products for platform ${platform}`);
  }
  
  return {
    added: productsToAddFiltered.length,
    duplicates: duplicateUrls.length
  };
};

// GET handler for retrieving products
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const platform = searchParams.get('platform');
    
    let products: Product[];
    
    if (platform) {
      products = loadProducts(platform.toLowerCase());
    } else {
      products = getAllProducts();
    }
    
    return NextResponse.json({ products });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to retrieve products';
    return NextResponse.json(
      { error: message },
      { status: 500 }
    );
  }
}

// POST handler for adding new products (single or batch)
export async function POST(request: NextRequest) {
  try {
    const data = await request.json();
    
    // Check if we received an array of products (batch import) or a single product
    if (data.products && Array.isArray(data.products)) {
      // Handle batch product addition (CSV import)
      const productsToAdd = data.products;
      
      if (!productsToAdd.length) {
        return NextResponse.json(
          { error: 'No products to add' },
          { status: 400 }
        );
      }
      
      // Validate all products and organize them by platform
      const productsByPlatform: Record<string, Product[]> = {};
      const errors: string[] = [];
      
      for (const [index, product] of productsToAdd.entries()) {
        // Validate required fields
        if (!product.url || !product.desiredPrice) {
          errors.push(`Product ${index + 1}: URL and desired price are required`);
          continue;
        }
        
        const platform = (product.ecommercePlatform || 'unknown').toLowerCase();
        
        if (!productsByPlatform[platform]) {
          productsByPlatform[platform] = [];
        }
        
        // Add timestamp and ensure the product has an ID
        const currentDate = new Date().toISOString();
        product.id = product.id || crypto.randomUUID();
        product.addedAt = currentDate;
        
        productsByPlatform[platform].push(product);
      }
      
      if (errors.length > 0) {
        return NextResponse.json(
          { error: errors.join('; ') },
          { status: 400 }
        );
      }
      
      // Add products by platform
      for (const [platform, products] of Object.entries(productsByPlatform)) {
        await addProductsToPlatform(platform, products);
      }
      
      return NextResponse.json({ success: true, count: productsToAdd.length });
    }
    else {
      // Handle single product addition (form submission)
      const product: Product = data;
      
      if (!product.url || !product.desiredPrice) {
        return NextResponse.json(
          { error: 'URL and desired price are required' },
          { status: 400 }
        );
      }
      
      const platform = (product.ecommercePlatform || 'unknown').toLowerCase();
      const products = loadProducts(platform);
      
      // Check for duplicate
      const isDuplicate = products.some(p => p.url.toLowerCase() === product.url.toLowerCase());
      if (isDuplicate) {
        return NextResponse.json(
          { error: 'This product is already being tracked' },
          { status: 400 }
        );
      }
      
      // Add ID and timestamp to the product
      product.id = product.id || crypto.randomUUID();
      product.addedAt = new Date().toISOString();
      
      // Add product
      products.push(product);
      await saveProducts(platform, products);
      
      return NextResponse.json({ success: true, product });
    }
  } catch (error: unknown) {
    console.error('Error adding product(s):', error);
    const message = error instanceof Error ? error.message : 'Failed to add product(s)';
    return NextResponse.json(
      { error: message },
      { status: 500 }
    );
  }
}

// PUT handler for updating products
export async function PUT(request: NextRequest) {
  try {
    const data = await request.json();
    const productsToUpdate: Product[] = Array.isArray(data) ? data : data.products;
    
    if (!productsToUpdate || !Array.isArray(productsToUpdate)) {
      return NextResponse.json(
        { error: 'Invalid products data' },
        { status: 400 }
      );
    }
    
    console.log(`Updating ${productsToUpdate.length} products...`);
    
    // Group products by platform
    const productsByPlatform: Record<string, Product[]> = {};
    
    for (const product of productsToUpdate) {
      const platform = (product.ecommercePlatform || 'unknown').toLowerCase();
      if (!productsByPlatform[platform]) {
        productsByPlatform[platform] = [];
      }
      productsByPlatform[platform].push(product);
    }
    
    // Update each platform's file
    for (const [platform, platformProducts] of Object.entries(productsByPlatform)) {
      try {
        console.log(`Processing platform ${platform} with ${platformProducts.length} products`);
        const existingProducts = loadProducts(platform);
        
        // Create a map for faster lookups
        const productMap = new Map(existingProducts.map(p => [p.id, p]));
        
        // Update products
        for (const product of platformProducts) {
          if (!product.id) {
            console.error('Product missing ID:', product);
            continue;
          }
          productMap.set(product.id, product);
        }
        
        // Save updated products
        const updatedProducts = Array.from(productMap.values());
        console.log(`Saving ${updatedProducts.length} products for platform ${platform}`);
        await saveProducts(platform, updatedProducts);
      } catch (platformError: unknown) {
        console.error(`Error updating ${platform} products:`, platformError);
        // Continue with other platforms even if one fails
      }
    }
    
    return NextResponse.json({ success: true });
  } catch (error: unknown) {
    console.error('Product update failed:', error);
    const message = error instanceof Error ? error.message : 'Failed to update products';
    return NextResponse.json(
      { error: message },
      { status: 500 }
    );
  }
}

// DELETE handler for removing a product
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    const idsParam = searchParams.get('ids');
    
    // Handle bulk delete
    if (idsParam) {
      try {
        const ids = JSON.parse(idsParam);
        
        if (!Array.isArray(ids) || ids.length === 0) {
          return NextResponse.json(
            { error: 'Invalid product IDs format or empty array' },
            { status: 400 }
          );
        }
        
        const platforms = ['myntra', 'amazon', 'flipkart', 'unknown'];
        const results = {
          success: 0,
          failed: 0,
          total: ids.length
        };
        
        // Process deletions for each platform
        for (const platform of platforms) {
          const products = loadProducts(platform);
          let didRemoveAny = false;
          
          // Filter out products that match any of the specified IDs
          const updatedProducts = products.filter(product => {
            const shouldKeep = !ids.includes(product.id);
            if (!shouldKeep) {
              results.success++;
              didRemoveAny = true;
            }
            return shouldKeep;
          });
          
          // Only save if we actually removed products from this platform
          if (didRemoveAny) {
            await saveProducts(platform, updatedProducts);
          }
        }
        
        results.failed = ids.length - results.success;
        
        return NextResponse.json({ 
          success: true, 
          message: `Successfully deleted ${results.success} products` + (results.failed > 0 ? `, ${results.failed} failed` : '')
        });
      } catch (error) {
        console.error('Error parsing IDs for bulk delete:', error);
        return NextResponse.json(
          { error: 'Invalid product IDs format' },
          { status: 400 }
        );
      }
    }
    
    // Handle single delete (existing code)
    if (!id) {
      return NextResponse.json(
        { error: 'Product ID is required' },
        { status: 400 }
      );
    }
    
    // Find the product in all platform files
    const platforms = ['myntra', 'amazon', 'flipkart', 'unknown'];
    let found = false;
    
    for (const platform of platforms) {
      const products = loadProducts(platform);
      const index = products.findIndex(p => p.id === id);
      
      if (index !== -1) {
        // Remove the product
        products.splice(index, 1);
        await saveProducts(platform, products);
        found = true;
        break;
      }
    }
    
    if (!found) {
      return NextResponse.json(
        { error: 'Product not found' },
        { status: 404 }
      );
    }
    
    return NextResponse.json({ success: true });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to remove product';
    return NextResponse.json(
      { error: message },
      { status: 500 }
    );
  }
}

// PATCH handler for updating a single product
export async function PATCH(request: NextRequest) {
  try {
    const data = await request.json();
    const { id, updates } = data;
    
    if (!id || !updates) {
      return NextResponse.json(
        { error: 'Product ID and updates are required' },
        { status: 400 }
      );
    }
    
    // Find the product in all platform files
    const platforms = ['myntra', 'amazon', 'flipkart', 'unknown'];
    let found = false;
    let updatedProduct: Product | undefined;
    
    for (const platform of platforms) {
      const products = loadProducts(platform);
      const productIndex = products.findIndex(p => p.id === id);
      
      if (productIndex !== -1) {
        // Update the product
        const product = products[productIndex];
        updatedProduct = { ...product, ...updates } as Product;
        products[productIndex] = updatedProduct;
        
        // If platform was changed, move the product to the correct file
        if (updates.ecommercePlatform && 
            updates.ecommercePlatform.toLowerCase() !== platform) {
          // Remove from current platform
          products.splice(productIndex, 1);
          await saveProducts(platform, products);
          
          // Add to new platform
          const newPlatform = updates.ecommercePlatform.toLowerCase();
          const newPlatformProducts = loadProducts(newPlatform);
          newPlatformProducts.push(updatedProduct);
          await saveProducts(newPlatform, newPlatformProducts);
        } else {
          // Just save to current platform
          await saveProducts(platform, products);
        }
        
        found = true;
        break;
      }
    }
    
    if (!found || !updatedProduct) {
      return NextResponse.json(
        { error: 'Product not found' },
        { status: 404 }
      );
    }
    
    return NextResponse.json({ 
      success: true,
      product: updatedProduct
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to update product';
    return NextResponse.json(
      { error: message },
      { status: 500 }
    );
  }
}