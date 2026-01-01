import { NextResponse } from "next/server";
import puppeteer, { Page, Browser, CDPSession, HTTPRequest } from 'puppeteer';
import { loadProducts, saveProducts } from '../../../utils/productStorage';
import { detectPlatform } from '../../../utils/helpers';
import { getScanInProgressStatus } from '@/app/api/background-scan/route';

export async function POST(_request: Request) {
  // Check if a scan is in progress
  if (getScanInProgressStatus()) {
    return NextResponse.json(
      { error: 'Cannot sync offers while a scan is in progress' },
      { status: 409 }
    );
  }

  let browser: Browser | null = null;
  let page: Page | null = null;
  
  // Add a watchdog timer to prevent infinite hanging
  const processStartTime = Date.now();
  const maxProcessingTime = 30 * 60 * 1000; // 30 minutes max
  const watchdogTimer = setTimeout(() => {
    console.error('Process exceeded maximum allowed time, forcing shutdown');
    // Force cleanup and return
    if (browser) browser.close().catch(() => {});
    return new NextResponse(
      JSON.stringify({ error: 'Process timed out after 30 minutes' }),
      { status: 504 }
    );
  }, maxProcessingTime);
  
  try {
    // Create a new browser instance for this session
    browser = await puppeteer.launch({
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-accelerated-2d-canvas',
        '--disable-gpu',
        '--window-size=1280,720',
      ],
      headless: 'new',
    });

    // Create a new page
    page = await browser.newPage();

    // Set up request interception
    await page.setRequestInterception(true);
    
    page.on('request', (request: HTTPRequest) => {
      const resourceType = request.resourceType();
      if (['image', 'stylesheet', 'font', 'media'].includes(resourceType)) {
        request.abort();
      } else {
        request.continue();
      }
    });

    const BATCH_SIZE = 5;
    const platforms = ['Myntra', 'Amazon', 'Flipkart', 'Unknown'];
    let totalUpdatedCount = 0;
    
    // Process each platform sequentially
    for (const platform of platforms) {
      try {
        const platformProducts = loadProducts(platform.toLowerCase());
        
        if (platformProducts.length === 0) {
          console.log(`No products found for platform: ${platform}`);
          continue;
        }
        
        console.log(`Processing ${platformProducts.length} products for ${platform}`);
        
        // Process in batches sequentially
        for (let i = 0; i < platformProducts.length; i += BATCH_SIZE) {
          const batch = platformProducts.slice(i, i + BATCH_SIZE);
          let batchUpdatedCount = 0;
          
          console.log(`Processing batch ${Math.floor(i/BATCH_SIZE) + 1} of ${Math.ceil(platformProducts.length/BATCH_SIZE)} for ${platform}`);
          
          // Reset page after every 5 batches to prevent memory issues
          if (i > 0 && i % (BATCH_SIZE * 5) === 0 && page) {
            console.log('Refreshing page to prevent memory issues');
            try {
              await page.close();
              page = await browser.newPage();
              await page.setRequestInterception(true);
              page.on('request', (request: HTTPRequest) => {
                const resourceType = request.resourceType();
                if (['image', 'stylesheet', 'font', 'media'].includes(resourceType)) {
                  request.abort();
                } else {
                  request.continue();
                }
              });
            } catch (refreshError) {
              console.error('Error refreshing page:', refreshError);
              // Create a new page if refresh fails
              page = await browser.newPage();
              await page.setRequestInterception(true);
            }
          }
          
          // Process each product in the batch sequentially
          for (let j = 0; j < batch.length; j++) {
            const product = batch[j];
            const productStartTime = Date.now();
            const maxProductTime = 45000; // 45 seconds max per product
            
            try {
              // Process product with timeout
              const offers = await Promise.race([
                extractOffersOnly(product.url, page!),
                new Promise<undefined>((_, reject) => 
                  setTimeout(() => reject(new Error(`Product processing timeout after ${maxProductTime/1000}s`)), maxProductTime)
                )
              ]);
              
              if (offers && offers.length > 0) {
                batchUpdatedCount++;
                platformProducts[i + j] = { ...product, offers };
              } else {
                // Remove offers field if no offers found
                // eslint-disable-next-line @typescript-eslint/no-unused-vars
                const { offers, ...productWithoutOffers } = platformProducts[i + j];
                platformProducts[i + j] = productWithoutOffers;
              }
            } catch (error) {
              console.error(`Error syncing offers for ${product.url}:`, error);
              // More aggressive cleanup on error
              try {
                // Force stop any pending requests
                await page!.evaluate(() => {
                  window.stop();
                  document.documentElement.innerHTML = '';
                  if (window.gc) window.gc();
                });
                
                // Navigate to blank page to ensure clean state
                await page!.goto('about:blank', { waitUntil: 'domcontentloaded', timeout: 5000 })
                  .catch(() => {}); // Ignore navigation errors
              } catch (cleanupError) {
                console.warn('Error during emergency cleanup:', cleanupError);
              }
            } finally {
              // Log product processing time
              const productProcessingTime = Date.now() - productStartTime;
              if (productProcessingTime > 30000) { // Log if it took more than 30s
                console.warn(`Processing ${product.url} took ${productProcessingTime/1000}s`);
              }
              
              // Always ensure page is in a clean state between products
              await clearPageContent(page!).catch(() => {});
              
              // Brief pause between products
              await new Promise(resolve => setTimeout(resolve, 200));
            }
          }
          
          totalUpdatedCount += batchUpdatedCount;
          
          if (batchUpdatedCount > 0) {
            console.log(`Saving ${batchUpdatedCount} updated products for ${platform} (batch ${Math.floor(i/BATCH_SIZE) + 1})`);
            await saveProducts(platform.toLowerCase(), platformProducts);
          }
          
          // Add a small delay between batches
          await new Promise(resolve => setTimeout(resolve, 1000));
        }
      } catch (error) {
        console.error(`Error processing platform ${platform}:`, error);
      }
    }
    
    return NextResponse.json({
      success: true,
      message: `Offers synced for ${totalUpdatedCount} products`
    });
  } catch (error: unknown) {
    console.error('Error syncing offers:', error);
    const message = error instanceof Error ? error.message : 'Failed to sync offers';
    return NextResponse.json(
      { error: message },
      { status: 500 }
    );
  } finally {
    // Clear the watchdog timer
    clearTimeout(watchdogTimer);
    
    // Clean up resources at the end
    try {
      if (page) {
        await clearPageContent(page).catch(() => {});
        await page.removeAllListeners();
        await page.close().catch(() => {});
      }
      if (browser) {
        await browser.close().catch(() => {});
      }
    } catch (e) {
      console.warn('Error during cleanup:', e);
    }
    
    // Log total processing time
    const totalTime = (Date.now() - processStartTime) / 1000;
    console.log(`Total processing time: ${totalTime.toFixed(2)} seconds`);
  }
}

// Helper function to clear page content
async function clearPageContent(page: Page): Promise<void> {
  try {
    await page.evaluate(() => {
      window.stop(); // Stop any pending requests
      document.documentElement.innerHTML = '';
      if (window.gc) window.gc();
    });
  } catch (e) {
    console.warn('Error clearing page content:', e);
  }
}

// Modified to accept page parameter instead of creating new one
async function extractOffersOnly(url: string, page: Page): Promise<string[] | undefined> {
  let client: CDPSession | null = null;
  
  try {
    const platform = detectPlatform(url);
    
    if (!platform || platform === 'Unknown') {
      console.log(`Skipping unknown platform for URL: ${url}`);
      return undefined;
    }
    
    // Set user agent to avoid blocking
    await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36');
    
    // Set CSS media to reduce network traffic
    try {
      client = await page.target().createCDPSession();
      await client.send('Network.setBlockedURLs', {
        urls: [
          '*.jpg', '*.jpeg', '*.png', '*.gif', '*.webp', 
          '*.css', '*.woff', '*.woff2', '*.ttf', '*.otf',
          '*.mp4', '*.webm', '*.ogg', '*.mp3', '*.wav',
          '*facebook*', '*google-analytics*', '*doubleclick*'
        ]
      });
    } catch (cdpError) {
      console.warn('Failed to set up CDP session:', cdpError);
    }
    
    // Enhanced navigation with retry logic
    let retries = 0;
    const maxRetries = 2;
    let pageLoaded = false;
    const navigationTimeout = 10000; // Reduced from 15000 to 10000
    
    while (retries <= maxRetries && !pageLoaded) {
      try {
        await page.goto(url, { 
          waitUntil: 'domcontentloaded',
          timeout: navigationTimeout
        });
        pageLoaded = true;
      } catch (navError: unknown) {
        retries++;
        console.warn(`Navigation retry ${retries}/${maxRetries} for ${url}: ${navError instanceof Error ? navError.message : String(navError)}`);
        
        if (retries > maxRetries) {
          throw navError;
        }
        
        await page.waitForTimeout(1000);
      }
    }
    
    // Handle common challenges by platform with timeout
    try {
      if (platform === 'Flipkart') {
        await Promise.race([
          handleFlipkartChallenges(page),
          new Promise((_, reject) => setTimeout(() => reject(new Error('Platform challenges timeout')), 5000))
        ]);
      } else if (platform === 'Amazon') {
        await Promise.race([
          handleAmazonChallenges(page),
          new Promise((_, reject) => setTimeout(() => reject(new Error('Platform challenges timeout')), 5000))
        ]);
      }
    } catch (challengeError) {
      console.warn(`Challenge handling timed out for ${url}: ${challengeError}`);
      // Continue anyway
    }
    
    // More intelligent waiting for content with shorter timeouts
    try {
      // Wait for some content to be visible based on platform
      if (platform === 'Myntra') {
        await Promise.race([
          page.waitForSelector('.pdp-offers-offer', { timeout: 3000 }),
          page.waitForSelector('.pdp-offer', { timeout: 3000 }),
          page.waitForTimeout(3000)  // Fallback timeout - reduced from 5000
        ]);
      } else if (platform === 'Amazon') {
        await Promise.race([
          page.waitForSelector('.a-truncate-full', { timeout: 3000 }),
          page.waitForSelector('#benefits-list', { timeout: 3000 }),
          page.waitForTimeout(3000)  // Fallback timeout - reduced from 5000
        ]);
      } else if (platform === 'Flipkart') {
        await Promise.race([
          page.waitForSelector('.XUp0WS', { timeout: 3000 }),
          page.waitForSelector('._16eBzU', { timeout: 3000 }),
          page.waitForTimeout(3000)  // Fallback timeout - reduced from 5000
        ]);
      }
    } catch (_e) {
      // Just continue if selectors aren't found
      console.log(`Wait for selectors timed out for ${url}, continuing anyway`);
    }
    
    // Dynamic scroll with timeout
    try {
      await Promise.race([
        page.evaluate(() => {
          const pageHeight = document.body.scrollHeight;
          window.scrollBy(0, Math.min(500, pageHeight * 0.3)); // Scroll 30% or 500px, whichever is less
        }),
        new Promise((_, reject) => setTimeout(() => reject(new Error('Scroll timeout')), 3000))
      ]);
    } catch (scrollError) {
      console.warn(`Scroll error on ${url}: ${scrollError}`);
      // Continue anyway
    }
    
    // Reduced wait time
    await page.waitForTimeout(500); // Reduced from 1000
    
    // Extract offers based on platform with timeout
    let offers;
    
    try {
      if (platform === 'Myntra') {
        offers = await Promise.race([
          extractMyntraOffers(page),
          new Promise<undefined>((_, reject) => setTimeout(() => reject(new Error('Offer extraction timeout')), 5000))
        ]);
      } else if (platform === 'Amazon') {
        offers = await Promise.race([
          extractAmazonOffers(page),
          new Promise<undefined>((_, reject) => setTimeout(() => reject(new Error('Offer extraction timeout')), 5000))
        ]);
      } else if (platform === 'Flipkart') {
        offers = await Promise.race([
          extractFlipkartOffers(page),
          new Promise<undefined>((_, reject) => setTimeout(() => reject(new Error('Offer extraction timeout')), 5000))
        ]);
      }
    } catch (extractError) {
      console.error(`Error extracting offers from ${url}: ${extractError}`);
      return undefined;
    }
    
    if (offers && offers.length > 0) {
      console.log(`Found ${offers.length} offers for ${url}`);
    } else {
      console.log(`No offers found for ${url}`);
    }
    
    return offers;
  } catch (error) {
    console.error(`Error scraping offers from ${url}:`, error);
    return undefined;
  } finally {
    // Clean up CDP session
    try {
      if (client) {
        await client.send('Network.setBlockedURLs', { urls: [] });
        await client.detach();
      }
    } catch (_cdpError) {
      // Ignore if setting blocked URLs failed initially
    }
    
    // Clear page content after each product
    await clearPageContent(page);
  }
}

// Handle Flipkart-specific challenges
async function handleFlipkartChallenges(page: Page): Promise<void> {
  try {
    // Handle login popup, location popup, and other common interruptions
    const popupSelectors = [
      'button._2KpZ6l._2doB4z', // Login popup
      'button[class*="_2KpZ6l"]', // Generic button class
      'button.No',               // Generic No button
      '._2CXpG3 ._2Q-Vvl'       // Location popup close
    ];
    
    for (const selector of popupSelectors) {
      try {
        const popupCloseButton = await page.$(selector);
        if (popupCloseButton) {
          await popupCloseButton.click();
          await page.waitForTimeout(500);
        }
      } catch (_e) {
        // Ignore individual popup errors
      }
    }
    
    // Sometimes we need to click a button to show offers
    try {
      const viewOffersButton = await page.$('button:has-text("View Offers"), button:has-text("See Details")');
      if (viewOffersButton) {
        await viewOffersButton.click();
        await page.waitForTimeout(1000);
      }
    } catch (_e) {
      // Ignore if offer button not found
    }
  } catch (error) {
    console.warn('Error handling Flipkart challenges:', error);
  }
}

// Handle Amazon-specific challenges
async function handleAmazonChallenges(page: Page): Promise<void> {
  try {
    // Click to expand any collapsed offer sections
    try {
      const expandButtons = await page.$$('span.a-expander-prompt');
      for (const button of expandButtons) {
        await button.click();
        await page.waitForTimeout(300);
      }
    } catch (_e) {
      // Ignore if no expander found
    }
    
    // Handle region/location popups
    try {
      const locationPopup = await page.$('#glow-ingress-block');
      if (locationPopup) {
        await locationPopup.click();
        await page.waitForTimeout(500);
        
        const doneButton = await page.$('#GLUXConfirmClose');
        if (doneButton) {
          await doneButton.click();
        }
      }
    } catch (_e) {
      // Ignore location popup errors
    }
  } catch (error) {
    console.warn('Error handling Amazon challenges:', error);
  }
}

// Extract Myntra offers
async function extractMyntraOffers(page: Page): Promise<string[] | undefined> {
  return await page.evaluate(() => {
    // More comprehensive set of selectors for Myntra offers
    const myntraSelectors = [
      '.pdp-offers-container div.pdp-offers-offer div'
      // Other selectors remain commented out
    ];
    
    // Look for Best Price offer only
    let bestPriceValue: string | null = null;
    
    // Try all selectors
    for (const selector of myntraSelectors) {
      const elements = document.querySelectorAll(selector);
      
      for (const element of elements) {
        if (element && element.textContent) {
          const offerText = element.textContent.trim();
          
          // Skip empty text or very short text (likely not offers)
          if (!offerText || offerText.length < 5) continue;
          
          // Check if this is a Best Price offer
          if (offerText.toLowerCase().includes('best price')) {
            // Extract the price value using regex
            const match = offerText.match(/Best Price:\s*Rs\.\s*(\d+(\.\d+)?)/i);
            if (match && match[1]) {
              bestPriceValue = match[1];
              break; // Found what we need, exit the loop
            }
          }
        }
      }
      
      if (bestPriceValue) break; // Exit if we found the best price
    }
    
    // Return only the best price as a single item in the array, or undefined if not found
    return bestPriceValue ? [`Rs. ${bestPriceValue}`] : undefined;
  });
}

// Extract Amazon offers
async function extractAmazonOffers(page: Page): Promise<string[] | undefined> {
  return await page.evaluate(() => {
    // Helper function to parse and clean Amazon offers
    function parseAmazonOffers(offers: string[]): string[] {
      if (!offers || offers.length === 0) return [];
      
      const cleanedOffers: string[] = [];
      const seenOfferTexts = new Set<string>();
      
      // Process each offer
      for (const offer of offers) {
        // Skip empty offers
        if (!offer || offer.length < 5) continue;
        
        // Clean up the offer text
        const cleanedOffer = offer
          .replace(/\s+/g, ' ')  // Replace multiple spaces with single space
          .replace(/See\s+Details/gi, '')  // Remove "See Details" text
          .replace(/See\s+more/gi, '')     // Remove "See more" text
          .trim();
        
        // Skip if too short after cleaning
        if (cleanedOffer.length < 5) continue;
        
        // Skip duplicates
        if (seenOfferTexts.has(cleanedOffer.toLowerCase())) continue;
        
        seenOfferTexts.add(cleanedOffer.toLowerCase());
        cleanedOffers.push(cleanedOffer);
      }
      
      return cleanedOffers;
    }
    
    // More comprehensive set of selectors for Amazon offers
    const amazonSelectors = [
      '.a-truncate-full'
    ];
    
    // Extract offers
    const offers: string[] = [];
    const seenOffers = new Set(); // To track unique offers
    
    // Try all selectors
    for (const selector of amazonSelectors) {
      const elements = document.querySelectorAll(selector);
      
      for (const element of elements) {
        if (element && element.textContent) {
          const offerText = element.textContent.trim();
          
          // Skip empty text or very short text (likely not offers)
          if (!offerText || offerText.length < 5) continue;
          
          // Skip if this exact offer was already seen
          if (seenOffers.has(offerText)) continue;
          
          seenOffers.add(offerText);
          offers.push(offerText);
        }
      }
    }
    
    return offers.length > 0 ? parseAmazonOffers(offers) : undefined;
  });
}

// Extract Flipkart offers
async function extractFlipkartOffers(page: Page): Promise<string[] | undefined> {
  return await page.evaluate(() => {
    // Helper function to parse and clean Flipkart offers
    function parseFlipkartOffers(offers: string[]): string[] {
      if (!offers || offers.length === 0) return [];
      
      const cleanedOffers: string[] = [];
      const seenOfferTexts = new Set<string>();
      
      // Common separators and phrases to split by
      const separatorRegex = /(Bank Offer|Partner Offer|Special Price|No Cost EMI|EMI starting|Combo Offer)/g;
      
      for (const offer of offers) {
        if (!offer || offer.length < 5) continue;
        
        // Clean and normalize the offer text
        const normalizedOffer = offer
          .replace(/\s+/g, ' ')
          .replace(/T&C Apply|Terms and Conditions Apply/gi, '')
          .replace(/View Plans|View Details|View T&C/gi, '')
          .trim();
        
        if (normalizedOffer.length < 5) continue;
        
        // Try to split multi-offers into individual ones
        if (normalizedOffer.length > 50 && separatorRegex.test(normalizedOffer)) {
          const parts: string[] = [];
          let lastMatchEnd = 0;
          let match;
          
          // Reset the regex state for the new search
          separatorRegex.lastIndex = 0;
          
          while ((match = separatorRegex.exec(normalizedOffer)) !== null) {
            // If this isn't the first match, add the previous segment
            if (match.index > 0 && lastMatchEnd > 0) {
              const segment = normalizedOffer.substring(lastMatchEnd, match.index).trim();
              if (segment.length > 5) parts.push(segment);
            }
            
            // Update the last match end position
            lastMatchEnd = match.index;
          }
          
          // Add the last segment
          if (lastMatchEnd < normalizedOffer.length) {
            const lastSegment = normalizedOffer.substring(lastMatchEnd).trim();
            if (lastSegment.length > 5) parts.push(lastSegment);
          }
          
          // If we successfully split the offer, add each part
          if (parts.length > 0) {
            for (const part of parts) {
              if (part.length > 5 && !seenOfferTexts.has(part.toLowerCase())) {
                seenOfferTexts.add(part.toLowerCase());
                cleanedOffers.push(part);
              }
            }
            continue; // Skip adding the original offer
          }
        }
        
        // If we couldn't split it or it's a simple offer, add as is
        if (!seenOfferTexts.has(normalizedOffer.toLowerCase())) {
          seenOfferTexts.add(normalizedOffer.toLowerCase());
          cleanedOffers.push(normalizedOffer);
        }
      }
      
      return cleanedOffers;
    }
    
    // More comprehensive set of selectors for Flipkart offers
    const flipkartSelectors = [
      // Original selectors
      '.f\\+WmCe',
      '._16eBzU',
      '.XUp0WS',
      '.QPOxbz',
      '._3Ay6Sb',
      '.WT_FyS',
      // New/updated selectors
      '._3TT44I',                  // Bank offers
      '._3IFQ6r',                  // Main offer container
      '._2-n-Lg',                  // Offer grid items
      '.dyC3Xc',                   // Special price offers
      '.JDLK74',                   // EMI offers
      '.QNqrxC',                   // Partner offers
      '.WT_FyS',                   // Generic offers
      '[data-testid="offer-list"]', // Offer list by test ID
      '[id*="offer"]',             // Elements with "offer" in ID
      '[class*="offer"]',          // Elements with "offer" in class
      '[class*="discount"]',       // Elements with "discount" in class
      '.P3J15B div',               // Another offer container
      '.KxGGM8'                    // Another offer element
    ];
    
    // Extract offers
    const offers: string[] = [];
    const seenOffers = new Set<string>(); // To track unique offers
    
    // Try all selectors
    for (const selector of flipkartSelectors) {
      try {
        const elements = document.querySelectorAll(selector);
        
        for (const element of elements) {
          if (element && element.textContent) {
            const offerText = element.textContent.trim();
            
            // Skip empty text or very short text (likely not offers)
            if (!offerText || offerText.length < 5) continue;
            
            // Skip if this exact offer was already seen
            if (seenOffers.has(offerText)) continue;
            
            seenOffers.add(offerText);
            offers.push(offerText);
          }
        }
      } catch (_e) {
        // Ignore selector errors - some may be invalid in different page structures
      }
    }
    
    return offers.length > 0 ? parseFlipkartOffers(offers) : undefined;
  });
}