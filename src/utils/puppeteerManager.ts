/**
 * Puppeteer Manager Utility
 * 
 * This utility centralizes puppeteer browser management to prevent memory leaks
 * and reduce resource consumption by reusing browser instances when possible.
 */

import puppeteer, { Browser, Page, HTTPRequest } from 'puppeteer';
import { detectPlatform } from './helpers';
import { getPuppeteerCookies, areAmazonCookiesValid } from './amazonAuth';

// Set process max listeners once at module level
if (typeof process !== 'undefined') {
  process.setMaxListeners(20);
}

// Maintain at most one browser instance
let browserInstance: Browser | null = null;
let activePages = 0;
const MAX_PAGES_PER_BROWSER = 8;

// Lock to prevent concurrent browser recycling
let isRecyclingBrowser = false;
let pendingBrowserRequests: Array<{
  resolve: (browser: Browser) => void;
  reject: (error: Error) => void;
}> = [];

// Initialize browser with a possible reuse of existing instance
export const initBrowser = async (): Promise<Browser> => {
  // If we're already recycling, queue this request
  if (isRecyclingBrowser) {
    console.log('Browser is currently being recycled, queuing this request...');
    return new Promise<Browser>((resolve, reject) => {
      pendingBrowserRequests.push({ resolve, reject });
    });
  }

  // If we have too many active pages, recycle the browser
  if (browserInstance && activePages >= MAX_PAGES_PER_BROWSER) {
    try {
      console.log(`Reached maximum pages per browser (${MAX_PAGES_PER_BROWSER}), recycling browser instance...`);
      isRecyclingBrowser = true;
      await closeBrowser();
    } catch (error) {
      console.error('Error during browser recycling:', error);
    } finally {
      isRecyclingBrowser = false;
    }
  }
  
  // Create a new browser instance if needed
  if (!browserInstance) {
    try {
      console.log('Creating new browser instance...');
      browserInstance = await puppeteer.launch({
        headless: "new",
        args: [
          '--no-sandbox',
          '--disable-setuid-sandbox',
          '--disable-dev-shm-usage',
          '--disable-gpu',
          '--disable-web-security',
          '--disable-features=IsolateOrigins,site-per-process',
          '--disable-site-isolation-trials',
          '--window-size=1920,1080'
        ]
      });
      
      // Reset active pages counter
      activePages = 0;
      
      // Handle browser disconnection
      browserInstance.on('disconnected', () => {
        console.log('Browser was disconnected');
        browserInstance = null;
        activePages = 0;
      });
      
      // Resolve any pending browser requests
      if (pendingBrowserRequests.length > 0) {
        console.log(`Resolving ${pendingBrowserRequests.length} pending browser requests`);
        // Make a copy to avoid issues if the array is modified during iteration
        const requests = [...pendingBrowserRequests];
        pendingBrowserRequests = [];
        
        for (const request of requests) {
          request.resolve(browserInstance);
        }
      }
    } catch (error) {
      console.error('Error creating browser instance:', error);
      
      // Reject any pending browser requests
      if (pendingBrowserRequests.length > 0) {
        const requests = [...pendingBrowserRequests];
        pendingBrowserRequests = [];
        
        for (const request of requests) {
          request.reject(error as Error);
        }
      }
      
      throw error;
    }
  }
  
  return browserInstance;
};

// Close the browser instance if it exists
export const closeBrowser = async (): Promise<void> => {
  if (browserInstance) {
    try {
      console.log('Closing browser instance...');
      // Remove all event listeners to prevent leaks
      browserInstance.removeAllListeners();
      await browserInstance.close();
    } catch (error) {
      console.error('Error closing browser:', error);
    } finally {
      browserInstance = null;
      activePages = 0;
    }
  }
};

// Create a new page with proper setup
export const createPage = async (browser: Browser): Promise<Page> => {
  // Increment active pages counter
  activePages++;
  console.log(`Creating new page (${activePages} active pages)`);
  
  const page = await browser.newPage();
  
  // Configure page defaults
  await page.setViewport({ width: 1920, height: 1080 });
  await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/96.0.4664.110 Safari/537.36');
  
  return page;
};

// Set authentication cookies for Amazon if needed
export const setupAmazonAuth = async (page: Page, url: string): Promise<void> => {
  const platform = detectPlatform(url);
  
  if (platform === 'Amazon' && areAmazonCookiesValid()) {
    try {
      console.log('Setting Amazon authentication cookies...');
      const cookies = getPuppeteerCookies();
      await page.setCookie(...cookies);
      console.log(`Successfully set ${cookies.length} Amazon cookies`);
    } catch (error) {
      console.error('Error setting Amazon cookies:', error);
    }
  }
};

// Configure resource blocking
export const setupResourceBlocking = async (page: Page): Promise<() => Promise<void>> => {
  // Store handler for cleanup
  const requestHandler = (req: HTTPRequest) => {
    const resourceType = req.resourceType();
    if (['document', 'xhr', 'fetch', 'script', 'stylesheet'].includes(resourceType)) {
      req.continue();
    } else {
      req.abort();
    }
  };
  
  await page.setRequestInterception(true);
  page.on('request', requestHandler);
  
  // Return cleanup function
  return async () => {
    try {
      // Check if page is still valid before removing listener
      if (!page.isClosed()) {
        page.removeListener('request', requestHandler);
      }
    } catch (err) {
      console.error('Error removing request listener:', err);
    }
  };
};

// Clean up a page properly
export const closePage = async (page: Page, cleanupFn?: () => Promise<void>): Promise<void> => {
  try {
    // Call the cleanup function if provided
    if (cleanupFn) {
      await cleanupFn();
    }
    
    // Remove all listeners and close
    await page.removeAllListeners();
    await page.close();
    
    // Decrement active pages counter
    activePages = Math.max(0, activePages - 1);
    console.log(`Closed page (${activePages} active pages remaining)`);
  } catch (error) {
    console.error('Error closing page:', error);
  }
};

// Use this function to wrap page operations to ensure proper cleanup
export const withPage = async <T>(fn: (page: Page) => Promise<T>, url?: string): Promise<T> => {
  const browser = await initBrowser();
  const page = await createPage(browser);
  let cleanupFn: (() => Promise<void>) | undefined;
  
  try {
    // Set up Amazon cookies if URL is provided and it's an Amazon URL
    if (url) {
      await setupAmazonAuth(page, url);
    }
    
    cleanupFn = await setupResourceBlocking(page);
    return await fn(page);
  } finally {
    await closePage(page, cleanupFn);
  }
};
