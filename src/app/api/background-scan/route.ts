import { NextRequest, NextResponse } from "next/server";
import fs from 'fs';
import path from 'path';
import { Product } from '@/types';
import { detectPlatform } from '@/utils/helpers';
import { getScannerState, setScannerState, generateScanId } from '@/utils/scannerState';

// Increase the default maximum listeners limit to avoid warnings
// This should be done only once at the module level
if (typeof process !== 'undefined') {
  // Set a higher limit based on the batch size and potential parallel processing
  process.setMaxListeners(20);
}

// Data directory path
const DATA_DIR = path.join(process.cwd(), 'data');
const LOG_FILE = path.join(DATA_DIR, 'background_scan_log.json');

// Telegram configuration
const TELEGRAM_BOT_TOKEN = '7586562921:AAEzhl8Bk1RpAVxoHAmDxVMfX3g4vVqRsyg';
const TELEGRAM_CHAT_ID = '624131550';

// Flag to indicate if a scan is currently in progress
let scanInProgress = false;

// Flag to indicate if stop was requested
let stopRequested = false;

// Function to get the current scan in progress status
export const getScanInProgressStatus = (): boolean => {
  return scanInProgress;
};

// Function to request scanner to stop
export const requestScannerStop = (): void => {
  if (scanInProgress) {
    console.log('Stop requested for running scan');
    stopRequested = true;
  }
};

// File locking mechanism to prevent concurrent operations
const fileLocks: Record<string, boolean> = {};

// Acquire a lock
const acquireLock = async (lockKey: string, maxWaitMs = 10000, intervalMs = 100): Promise<boolean> => {
  const startTime = Date.now();
  
  while (Date.now() - startTime < maxWaitMs) {
    if (!fileLocks[lockKey]) {
      fileLocks[lockKey] = true;
      return true;
    }
    
    await new Promise(resolve => setTimeout(resolve, intervalMs));
  }
  
  console.error(`Failed to acquire lock for ${lockKey} after ${maxWaitMs}ms`);
  return false;
};

// Release a lock
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
      
      // Read the current saved products to detect additions/deletions
      // that happened while the scan was running
      let currentProducts: Product[] = [];
      if (fs.existsSync(filePath)) {
        const data = fs.readFileSync(filePath, 'utf8');
        currentProducts = JSON.parse(data);
      }
      
      // Create maps for easier lookup
      const productMap = new Map(products.map(p => [p.id, p]));
      const currentProductMap = new Map(currentProducts.map(p => [p.id, p]));
      
      // Merged products will:
      // 1. Keep all products in the current file (preserving manual deletions)
      // 2. Update those products with new data from the scan
      const mergedProducts: Product[] = [];
      
      // Add all current products that weren't deleted
      for (const [id, currentProduct] of currentProductMap.entries()) {
        // If this product was also scanned, use the updated version
        if (productMap.has(id)) {
          mergedProducts.push(productMap.get(id)!);
          // Remove from productMap so we don't add it twice
          productMap.delete(id);
        } else {
          // This product wasn't in the scan but is in current file
          // (which means it's a new product added during scan)
          mergedProducts.push(currentProduct);
        }
      }
      
      // Add any remaining products from the scan (would be rare)
      // These would be products added before the scan started
      // but not saved to the file yet
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      for (const [_id, product] of productMap.entries()) {
        mergedProducts.push(product);
      }
      
      // Write to a temp file first to prevent corruption
      const tempFilePath = `${filePath}.temp`;
      fs.writeFileSync(tempFilePath, JSON.stringify(mergedProducts, null, 2), 'utf8');
      
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

// Log background scan activity
const logScanActivity = async (data: unknown) => {
  try {
    ensureDataDir();
    
    let logData = [];
    if (fs.existsSync(LOG_FILE)) {
      const existingData = fs.readFileSync(LOG_FILE, 'utf8');
      try {
        logData = JSON.parse(existingData);
      } catch (_e) {
        logData = [];
      }
    }
    
    // Keep only the last 50 logs to avoid the file growing too large
    if (Array.isArray(logData)) {
      logData = [...logData.slice(-49), data];
    } else {
      logData = [data];
    }
    
    fs.writeFileSync(LOG_FILE, JSON.stringify(logData, null, 2), 'utf8');
  } catch (error) {
    console.error('Error logging scan activity:', error);
  }
};

// Format price as Indian Rupees
const formatPrice = (price: number): string => {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0
  }).format(price);
};

// Send notification via Telegram
const sendTelegramNotification = async (message: string): Promise<boolean> => {
  try {
    console.log(`Sending Telegram notification: ${message}`);
    
    const response = await fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        chat_id: TELEGRAM_CHAT_ID,
        text: message,
        parse_mode: 'HTML'
      }),
    });
    
    if (!response.ok) {
      const errorData = await response.json();
      console.error('Telegram API error:', errorData);
      return false;
    }
    
    return true;
  } catch (error) {
    console.error('Error sending Telegram notification:', error);
    return false;
  }
};

// Check if a date is today - improved with more precise comparison
const isToday = (dateString: string): boolean => {
  if (!dateString) return false;
  
  try {
    const date = new Date(dateString);
    const today = new Date();
    
    // Check if valid date
    if (isNaN(date.getTime())) return false;
    
    // Compare date components
    return date.getDate() === today.getDate() &&
           date.getMonth() === today.getMonth() &&
           date.getFullYear() === today.getFullYear();
  } catch (error) {
    console.error('Error parsing date:', error);
    return false;
  }
};

// Process product for notifications
const processNotifications = async (product: Product, previousProduct: Product): Promise<Product> => {
  console.log(`Processing notifications for product: ${product.id || product.url}`);
  
  // Skip notification logic if product doesn't have required fields
  if (!product.name || !product.currentPrice || !product.desiredPrice) {
    console.log('Skipping notification - missing required fields');
    return product;
  }

  // If price is now above desired price, clear notification data and return
  if (!product.isBelow) {
    console.log('Price is above desired price, clearing notification data');
    return {
      ...product,
      lastNotifiedPrice: undefined,
      lastNotifiedDate: undefined
    };
  }

  // Get current date as ISO string
  const today = new Date().toISOString();
  
  // Check if it's a new day compared to last notification
  const isNewDay = !product.lastNotifiedDate || !isToday(product.lastNotifiedDate);
  
  // Check if price actually changed since last check
  const priceUnchanged = previousProduct.currentPrice === product.currentPrice;
  
  // If price is unchanged AND it's not a new day, preserve existing notification data
  if (priceUnchanged && !isNewDay) {
    console.log('Price unchanged, preserving existing notification data');
    return {
      ...product,
      lastNotifiedPrice: previousProduct.lastNotifiedPrice,
      lastNotifiedDate: previousProduct.lastNotifiedDate
    };
  }
  
  console.log(`Current price: ${product.currentPrice}, Previous price: ${previousProduct.currentPrice}`);
  console.log(`Last notified date: ${product.lastNotifiedDate || 'never'}, Is today: ${product.lastNotifiedDate ? isToday(product.lastNotifiedDate) : false}`);
  
  // Calculate discount percentage
  const discountPercentage = ((product.desiredPrice - product.currentPrice) / product.desiredPrice) * 100;
  
  // Format product description with brand if available
  const productDescription = product.brand 
    ? `${product.brand} - ${product.name}`
    : product.name;
  
  // Case 1: Price unchanged but it's a new day since last notification
  if (priceUnchanged && isNewDay) {
    console.log('Price unchanged but sending new day notification');
    const message = `🔄 <b>Daily Price Update</b>\n\n<b>${productDescription}</b>\n\nThe price remains at ${formatPrice(product.currentPrice)}, which is <b>${discountPercentage.toFixed(1)}%</b> below your target of ${formatPrice(product.desiredPrice)}!\n\n${product.ecommercePlatform ? `<i>Platform: ${product.ecommercePlatform}</i>\n\n` : ''}<a href="${product.url}">View Product</a>`;
    
    const success = await sendTelegramNotification(message);
    if (success) {
      console.log('Successfully sent new day notification');
      return {
        ...product,
        lastNotifiedPrice: product.currentPrice,
        lastNotifiedDate: today
      };
    } else {
      console.error('Failed to send new day notification');
    }
  }
  // Case 2: Never notified before OR price changed and not notified today
  else if (!product.lastNotifiedDate || (product.currentPrice !== product.lastNotifiedPrice && !isToday(product.lastNotifiedDate))) {
    console.log('Sending initial price alert notification');
    const message = `🎉 <b>Price Alert!</b>\n\n<b>${productDescription}</b>\n\nThe price is now ${formatPrice(product.currentPrice)}, which is <b>${discountPercentage.toFixed(1)}%</b> below your target of ${formatPrice(product.desiredPrice)}!\n\n${product.ecommercePlatform ? `<i>Platform: ${product.ecommercePlatform}</i>\n\n` : ''}<a href="${product.url}">View Product</a>`;
    
    const success = await sendTelegramNotification(message);
    if (success) {
      console.log('Successfully sent initial notification');
      return {
        ...product,
        lastNotifiedPrice: product.currentPrice,
        lastNotifiedDate: today
      };
    } else {
      console.error('Failed to send initial notification');
    }
  } 
  // Case 3: Already notified today BUT price dropped further
  else if (
    product.lastNotifiedPrice && 
    product.currentPrice < product.lastNotifiedPrice
  ) {
    const priceDrop = product.lastNotifiedPrice - product.currentPrice;
    const dropPercentage = (priceDrop / product.lastNotifiedPrice) * 100;
    
    // Only notify if the drop is significant (at least 1%)
    if (dropPercentage >= 1.0) {
      console.log(`Sending further price drop notification (${dropPercentage.toFixed(1)}% drop)`);
      const message = `📉 <b>Further Price Drop!</b>\n\n<b>${productDescription}</b>\n\nPrice dropped from ${formatPrice(product.lastNotifiedPrice)} to ${formatPrice(product.currentPrice)}\n\n<b>Additional ${dropPercentage.toFixed(1)}% savings!</b>\n\nYour target price: ${formatPrice(product.desiredPrice)}\nTotal discount: ${discountPercentage.toFixed(1)}%\n\n${product.ecommercePlatform ? `<i>Platform: ${product.ecommercePlatform}</i>\n\n` : ''}<a href="${product.url}">View Product</a>`;
      
      const success = await sendTelegramNotification(message);
      if (success) {
        console.log('Successfully sent further price drop notification');
        return {
          ...product,
          lastNotifiedPrice: product.currentPrice,
          lastNotifiedDate: today
        };
      } else {
        console.error('Failed to send further price drop notification');
      }
    } else {
      console.log(`Price drop (${dropPercentage.toFixed(1)}%) too small to send another notification`);
    }
  } else if (product.lastNotifiedPrice && product.currentPrice > product.lastNotifiedPrice) {
    console.log('Price increased since last notification, but still below target. Not sending notification.');
  } else {
    console.log('No notification condition met');
  }
  
  // Return original product if no notification was sent
  // Preserve the existing notification data
  return {
    ...product,
    lastNotifiedPrice: product.lastNotifiedPrice || undefined,
    lastNotifiedDate: product.lastNotifiedDate || undefined
  };
};

// Define interface for scraped data
interface ScrapedProductData {
  productName: string;
  brand?: string;
  price: number;
  mrp?: number;
  ecommercePlatform: string;
}

// Scrape a single product
const scrapeProduct = async (url: string, isFirstProduct: boolean = false): Promise<ScrapedProductData> => {
  const platform = detectPlatform(url);
  if (platform === 'Unknown') {
    throw new Error('Unsupported platform');
  }
  
  // Use the scrape API instead of direct scraping
  const apiUrl = `${process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'}/api/scrape`;
  const response = await fetch(apiUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ url, isFirstProduct })
  });
  
  if (!response.ok) {
    throw new Error(`Failed to scrape product: ${response.statusText}`);
  }
  
  const result = await response.json();
  if (!result.success || !result.data) {
    throw new Error('Invalid scrape result or missing data');
  }
  
  return result.data as ScrapedProductData; // Add type assertion
};

// Process a single product with retry logic
const processSingleProduct = async (product: Product, isFirstProduct: boolean = false): Promise<Product> => {
  // If stop was requested, return the original product without processing
  if (stopRequested) {
    return product;
  }
  
  // Keep a copy of the original product for comparison
  const originalProduct = { ...product };
  const maxRetries = 2; // Try up to 3 times total (initial + 2 retries)
  
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    // Check again if stop was requested before each attempt
    if (stopRequested) {
      return product;
    }
    
    try {
      // Add a small delay between retries to avoid overwhelming the server
      if (attempt > 0) {
        await new Promise(resolve => setTimeout(resolve, 1000 * attempt)); // Progressive backoff
        console.log(`Retry attempt ${attempt} for ${product.url}`);
      }
      
      const scrapedData = await scrapeProduct(product.url, isFirstProduct);
      
      // For Amazon products, preserve previous values if the scrape returned invalid data
      if (product.ecommercePlatform?.toLowerCase() === 'amazon') {
        // If price is missing or zero, this might be Amazon blocking the scraper
        if (!scrapedData.price || scrapedData.price === 0) {
          console.log(`Invalid price data for Amazon product: ${product.name || product.id}, keeping previous values`);
          return product; // Return original product unchanged
        }
      }
      
      // Update product with scraped data, but preserve offers field from original product
      let updatedProduct: Product = {
        ...product,
        name: scrapedData.productName,
        brand: scrapedData.brand,
        currentPrice: scrapedData.price,
        mrp: scrapedData.mrp || product.mrp,
        isBelow: scrapedData.price > 0 && scrapedData.price <= product.desiredPrice,
        lastChecked: new Date().toISOString(),
        ecommercePlatform: scrapedData.ecommercePlatform,
        imageUrl: product.imageUrl, // Explicitly preserve the imageUrl field
        // Preserve offers field from the original product if it exists
        // No assignment for offers, which keeps the original value due to the ...product spread
      };
      
      // Process notifications based on price changes
      updatedProduct = await processNotifications(updatedProduct, originalProduct);
      
      return updatedProduct;
    } catch (error) {
      if (attempt === maxRetries) {
        // If we've exhausted retries, log the error
        console.error(`Failed to process ${product.url} after ${maxRetries + 1} attempts:`, error);
        
        // Special handling for Amazon products - preserve all previous values
        if (product.ecommercePlatform?.toLowerCase() === 'amazon') {
          console.log(`Preserving previous values for Amazon product: ${product.name || product.id}`);
          // For Amazon products, we return the original product WITHOUT updating lastChecked
          // This keeps it in the same category (above/below desired price) it was before
          return product;
        }
        
        // For other platforms, update the lastChecked timestamp
        return {
          ...product,
          lastChecked: new Date().toISOString()
        };
      }
      
      // Otherwise, continue to the next retry attempt
      console.warn(`Error processing ${product.url} (attempt ${attempt + 1}/${maxRetries + 1}):`, error);
    }
  }
  
  // This should never be reached due to the return in the catch block, but TypeScript requires it
  return {
    ...product,
    lastChecked: new Date().toISOString()
  };
};

// Helper function to clean up old products that haven't been checked in a long time
const cleanupOldProducts = async () => {
  const DAYS_THRESHOLD = 60; // Products not checked for 60 days will be considered for cleanup
  const now = new Date();
  const platforms = ['myntra', 'amazon', 'flipkart', 'unknown'];
  let removedCount = 0;
  
  for (const platform of platforms) {
    const products = loadProducts(platform);
    
    // Filter out the products that haven't been checked in a long time
    const activeProducts = products.filter(product => {
      if (!product.lastChecked) {
        // If a product has never been checked, keep it if it was added less than 30 days ago
        if (product.addedAt) {
          const addedDate = new Date(product.addedAt);
          const daysSinceAdded = Math.floor((now.getTime() - addedDate.getTime()) / (1000 * 60 * 60 * 24));
          return daysSinceAdded <= 30;
        }
        return true; // Keep products without lastChecked or addedAt for now
      }
      
      const lastCheckedDate = new Date(product.lastChecked);
      const daysSinceLastCheck = Math.floor((now.getTime() - lastCheckedDate.getTime()) / (1000 * 60 * 60 * 24));
      
      // Keep products that have been checked recently or have price drops
      return daysSinceLastCheck <= DAYS_THRESHOLD || product.isBelow === true;
    });
    
    // Save the filtered list if products were removed
    if (activeProducts.length < products.length) {
      removedCount += (products.length - activeProducts.length);
      await saveProducts(platform, activeProducts);
    }
  }
  
  return removedCount;
};

// Background scan handler
export async function GET(_request: NextRequest) { // Prefixed unused request
  // Declare variables outside try block to be accessible in catch
  let scanId: string | undefined = generateScanId();
  let isContinuousScan: boolean = false;
  let startTime: number = 0;

  // If a scan is already in progress, don't start another one
  if (scanInProgress) {
    return NextResponse.json({ 
      success: false, 
      message: 'A background scan is already in progress' 
    });
  }
  
  // Check if continuous scanning is enabled
  const scannerState = getScannerState();
  isContinuousScan = scannerState.isScanning; // Assign value
  scanId = generateScanId(); // Assign value
  
  // Set scan in progress flag
  scanInProgress = true;
  
  try {
    startTime = Date.now();
    console.log(`Background scan started at ${new Date(startTime).toISOString()}`);
    
    // Get all products
    const products = getAllProducts();
    
    if (products.length === 0) {
      const logEntry = {
        timestamp: new Date().toISOString(),
        status: 'completed',
        message: 'No products to scan',
        productsScanned: 0,
        duration: 0,
        scanId,
        isContinuous: isContinuousScan
      };
      
      await logScanActivity(logEntry);
      
      // Reset flag
      scanInProgress = false;
      
      // If continuous scanning is enabled, trigger another scan after a short delay
      if (isContinuousScan) {
        setTimeout(async () => {
          try {
            // Check if continuous scanning is still enabled before starting a new scan
            const currentState = getScannerState();
            if (currentState.isScanning) {
              await fetch(`${process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'}/api/background-scan`);
            }
          } catch (error) {
            console.error('Error triggering next continuous scan:', error);
          }
        }, 5000); // 5 second delay
      }
      
      return NextResponse.json({ 
        success: true, 
        message: 'No products to scan',
        isContinuous: isContinuousScan
      });
    }
    
    // Process products in batches to avoid memory issues
    // Use a smaller batch size to reduce pressure on browser instances
    const BATCH_SIZE = 5; // Reduced from 4 to 3 for better stability
    const THROTTLE_DELAY = 1000; // Add a delay between batches to prevent overwhelming the browser
    const productsByPlatform: Record<string, Product[]> = {};
    
    // Organize products by platform
    for (const product of products) {
      const platform = (product.ecommercePlatform || 'unknown').toLowerCase();
      
      if (!productsByPlatform[platform]) {
        productsByPlatform[platform] = [];
      }
      
      productsByPlatform[platform].push(product);
    }
    
    let successCount = 0;
    let failureCount = 0;
    let notificationCount = 0;
    
    // Process platforms sequentially instead of in parallel to reduce contention
    for (const [platform, platformProducts] of Object.entries(productsByPlatform)) {
      // Check if stop was requested
      if (stopRequested) {
        console.log('Scan stop requested, terminating scan');
        break;
      }
      
      console.log(`Processing ${platformProducts.length} products for platform: ${platform}`);
      const updatedProducts: Product[] = [];
      
      // Process in batches
      for (let i = 0; i < platformProducts.length; i += BATCH_SIZE) {
        // Check if stop was requested
        if (stopRequested) {
          console.log('Scan stop requested, terminating batch processing');
          break;
        }
        
        const batch = platformProducts.slice(i, i + BATCH_SIZE);
        
        console.log(`Processing batch ${Math.floor(i / BATCH_SIZE) + 1}/${Math.ceil(platformProducts.length / BATCH_SIZE)} for ${platform}`);
        
        // Process batch concurrently
        const results = await Promise.allSettled(batch.map(product => processSingleProduct(product, i === 0 && platform === Object.keys(productsByPlatform)[0])));
        
        // Handle results
        for (let j = 0; j < results.length; j++) {
          const result = results[j];
          
          if (result.status === 'fulfilled') {
            const updatedProduct = result.value;
            updatedProducts.push(updatedProduct);
            
            // Count notifications by comparing lastNotifiedDate between original and updated product
            const originalProduct = batch[j];
            
            // Check if this was a new notification in this specific scan
            if (updatedProduct.lastNotifiedDate && 
                (!originalProduct.lastNotifiedDate || 
                 originalProduct.lastNotifiedDate !== updatedProduct.lastNotifiedDate)) {
              
              console.log(`New notification detected for ${updatedProduct.name || updatedProduct.url}`);
              notificationCount++;
            }
          } else {
            // On failure, keep the original product
            updatedProducts.push(batch[j]);
            failureCount++;
            console.error(`Failed to process product ${batch[j].url}:`, result.reason);
          }
        }
        
        // Update progress counts
        successCount += results.filter(r => r.status === 'fulfilled').length;
        
        // Add a delay between batches to prevent overwhelming the browser
        if (i + BATCH_SIZE < platformProducts.length) {
          console.log(`Throttling for ${THROTTLE_DELAY}ms before next batch`);
          await new Promise(resolve => setTimeout(resolve, THROTTLE_DELAY));
        }
      }
      
      // Only save updated products if we have any and stop wasn't requested
      if (updatedProducts.length > 0 && !stopRequested) {
        // Save updated products for this platform
        await saveProducts(platform, updatedProducts);
      }
      
      console.log(`Completed processing for platform: ${platform}`);
    }
    
    const scanEndTime = new Date();
    const durationMs = scanEndTime.getTime() - startTime;
    
    // Different log message if scan was stopped
    const status = stopRequested ? 'stopped' : 'completed';
    
    const logEntry = {
      timestamp: scanEndTime.toISOString(),
      status: status,
      productsScanned: products.length,
      successCount,
      failureCount,
      notificationCount,
      duration: durationMs,
      durationFormatted: `${Math.round(durationMs / 1000)}s`,
      scanId,
      isContinuous: isContinuousScan,
      stoppedManually: stopRequested
    };
    
    await logScanActivity(logEntry);
    
    // Send a summary notification if there were notifications (even if stopped)
    if (notificationCount > 0) {
      await sendTelegramNotification(`📊 <b>Scan Summary</b>\n\n${notificationCount} price alert${notificationCount !== 1 ? 's' : ''} sent.\n\nTotal products scanned: ${products.length}\nScan duration: ${Math.round(durationMs / 1000)}s${stopRequested ? '\n\n⚠️ Scan was stopped manually' : ''}`);
    }
    
    // Only run cleanup if scan wasn't stopped
    let removedCount = 0;
    if (!stopRequested) {
      // Run cleanup of old products after scan completes
      removedCount = await cleanupOldProducts();
      if (removedCount > 0) {
        console.log(`Cleaned up ${removedCount} old products that hadn't been checked in a long time`);
      }
    }
    
    // Reset scan in progress flag and stop requested flag
    scanInProgress = false;
    stopRequested = false;
    
    // If continuous scanning is enabled AND stop wasn't requested, trigger another scan after a short delay
    if (isContinuousScan) {
      setTimeout(async () => {
        try {
          // Check if continuous scanning is still enabled before starting a new scan
          const currentState = getScannerState();
          if (currentState.isScanning) {
            await fetch(`${process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'}/api/background-scan`);
          }
        } catch (error) {
          console.error('Error triggering next continuous scan:', error);
        }
      }, 5000); // 5 second delay
    }
    
    return NextResponse.json({
      success: true,
      message: `Background scan completed. Success: ${successCount}, Failed: ${failureCount}, Notifications: ${notificationCount}`,
      timestamp: new Date().toISOString(),
      duration: durationMs,
      notificationCount,
      cleanupCount: removedCount,
      isContinuous: isContinuousScan
    });
  } catch (error: unknown) { // Changed any to unknown
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('Background scan error:', error);
    
    // Use variables declared outside try block (might be undefined if error happened early)
    const logEntry = {
      timestamp: new Date().toISOString(),
      status: 'error',
      error: errorMessage, // Use extracted message
      scanId: scanId || 'init-error', // Fallback scanId
      isContinuous: isContinuousScan // Use value (defaults to false)
    };
    
    await logScanActivity(logEntry);
    
    // Reset scan in progress flag
    scanInProgress = false;
    
    return NextResponse.json(
      { error: `Background scan failed: ${errorMessage}` },
      { status: 500 }
    );
  }
}

// Controller for toggling the scanner state
export async function POST(request: NextRequest) {
  try {
    const { isScanning } = await request.json();
    
    if (typeof isScanning !== 'boolean') {
      return NextResponse.json(
        { error: 'isScanning parameter must be a boolean' },
        { status: 400 }
      );
    }
    
    // Update scanner state
    setScannerState(isScanning);
    
    // If turning scanning on, trigger a scan if none is in progress
    if (isScanning && !scanInProgress) {
      // Trigger a scan after a short delay
      setTimeout(async () => {
        await fetch(`${process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'}/api/background-scan`);
      }, 1000);
    }
    
    return NextResponse.json({
      success: true,
      isScanning
    });
  } catch (error: unknown) { // Changed any to unknown
    console.error('Error updating scanner state:', error);
    const message = error instanceof Error ? error.message : 'Failed to update scanner state';
    return NextResponse.json(
      { error: message }, // Use extracted message
      { status: 500 }
    );
  }
} 