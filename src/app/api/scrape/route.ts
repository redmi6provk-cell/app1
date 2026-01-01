import { NextResponse } from "next/server";
import { withPage } from '@/utils/puppeteerManager';
import { detectPlatform } from '@/utils/helpers';
import fs from 'fs';
import path from 'path';
import { Page } from 'puppeteer';

// Check if screenshots directory exists
const getScreenshotsDir = (): string | null => {
  const screenshotsDir = path.join(process.cwd(), 'public', 'screenshots');
  if (fs.existsSync(screenshotsDir)) {
    return screenshotsDir;
  }
  return null;
};

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { url, isFirstProduct = false } = body;

    if (!url) {
      return NextResponse.json({ error: "URL is required" }, { status: 400 });
    }

    const platform = detectPlatform(url);
    if (platform === 'Unknown') {
      return NextResponse.json(
        { error: "Currently only Myntra, Amazon and Flipkart URLs are supported" },
        { status: 400 }
      );
    }

    // Use the puppeteerManager to handle browser/page lifecycle
    const productData = await withPage(async (page) => {
      // Navigation timeout - reduced from 10s to 8s since we're just getting basic info
      const navigationTimeout = 8000; // 8 seconds max
      
      try {
        // Check for malformed URLs that start with "http" twice
        const cleanUrl = url.startsWith('httphttp') ? url.replace('httphttp', 'http') : url;
        
        // Fast navigation
        await page.goto(cleanUrl, { 
          waitUntil: 'domcontentloaded',
          timeout: navigationTimeout
        });
        
        // Take screenshot if this is the first product AND screenshots directory exists
        if (isFirstProduct) {
          const screenshotsDir = getScreenshotsDir();
          if (screenshotsDir) {
            try {
              const timestamp = new Date().toISOString().replace(/:/g, '-');
              const screenshotPath = path.join(screenshotsDir, `scan_${platform}_${timestamp}.png`);
              await page.screenshot({ path: screenshotPath, fullPage: false });
              console.log(`Screenshot saved for first product: ${screenshotPath}`);
            } catch (screenshotError) {
              // Just log screenshot errors but continue with scraping
              console.error('Error taking screenshot:', screenshotError);
            }
          }
        }
        
        // Quick popup handling for Flipkart
        if (platform === 'Flipkart') {
          try {
            const popupSelectors = ['button._2KpZ6l._2doB4z', 'button[class*="_2KpZ6l"]', 'button.No'];
            for (const selector of popupSelectors) {
              const popupCloseButton = await page.$(selector);
              if (popupCloseButton) {
                await popupCloseButton.click();
                break;
              }
            }
          } catch (_error) {
            // Ignore popup errors
          }
        }
        
        // Extract data based on platform
        let extractedData;
        
        if (platform === 'Myntra') {
          extractedData = await extractMyntraProductData(page);
        } else if (platform === 'Amazon') {
          extractedData = await extractAmazonProductData(page);
        } else if (platform === 'Flipkart') {
          extractedData = await extractFlipkartProductData(page);
        }
        
        // Quick validation
        if (!extractedData || (extractedData.price === 0 && platform === 'Flipkart')) {
          throw new Error('Failed to extract valid product data');
        }
        
        return extractedData;
      } catch (error: unknown) {
        const message = error instanceof Error ? error.message : 'Unknown scraping error';
        console.error(`Error scraping ${url}:`, message);
        if (error instanceof Error) throw error;
        throw new Error(message);
      }
    }, url);
    
    return NextResponse.json({
      success: true,
      data: {
        productName: productData.productName || "Product Name Not Found",
        brand: productData.brand || "Brand Not Found",
        price: productData.price || 0,
        mrp: productData.mrp || 0,
        originalUrl: url,
        ecommercePlatform: platform
      },
    });
  } catch (error: unknown) {
    console.error('Scrape error:', error);
    const message = error instanceof Error ? error.message : "Failed to scrape product details";
    return NextResponse.json(
      { error: message },
      { status: 500 }
    );
  }
}

// Extract Myntra product data
async function extractMyntraProductData(page: Page) {
  // Reduced timeout from 3000ms to 1000ms since we don't need offers
  await page.waitForTimeout(1000);
  
  // Try to scroll down to ensure all content is loaded
  await page.evaluate(() => {
    window.scrollBy(0, 300);
  });
  
  // Eliminated second timeout after scrolling
  
  return await page.evaluate(() => {
    console.log('Page title:', document.title);
    
    // Try to get direct price from meta tags first
    const metaPriceTag = document.querySelector('meta[property="product:price:amount"]');
    let metaPrice = 0;
    if (metaPriceTag) {
      metaPrice = parseFloat(metaPriceTag.getAttribute('content') || '0');
      console.log('Meta price found:', metaPrice);
    }
    
    // Myntra specific selectors
    const myntraSelectors = {
      price: [
        '.pdp-price strong',
        '.pdp-mrp strong',
        '.pdp-discount',
        '.pdp-price',
        'span[class*="price"]',
        'div[class*="price"]'
      ],
      mrp: [
        '.pdp-mrp s',
        '.pdp-discount s',
        '.strike-price',
        'span.strike',
        'span[class*="mrp"]',
      ],
      name: [
        '.pdp-title',
        '.pdp-name',
        '.title-container h1',
        'h1[class*="title"]',
        'h1'
      ],
      brand: [
        '.pdp-title .brand-name',
        '.brand-logo + h1',
        '.pdp-name',
        '.brand'
      ]
    };
    
    // Debug HTML for price elements
    console.log('Debugging price elements:');
    for (const selector of myntraSelectors.price) {
      const elements = document.querySelectorAll(selector);
      console.log(`Selector "${selector}" found ${elements.length} elements`);
      for (const el of elements) {
        console.log(`-> Text: "${el.textContent?.trim()}"`);
      }
    }
    
    // Extract product name
    let productName = '';
    for (const selector of myntraSelectors.name) {
      const element = document.querySelector(selector);
      if (element && element.textContent) {
        productName = element.textContent.trim();
        console.log('Found product name:', productName, 'with selector:', selector);
        break;
      }
    }
    
    // Extract brand
    let brand = '';
    for (const selector of myntraSelectors.brand) {
      const element = document.querySelector(selector);
      if (element && element.textContent) {
        brand = element.textContent.trim();
        console.log('Found brand:', brand, 'with selector:', selector);
        break;
      }
    }
    
    // Extract price
    let priceText = '';
    
    for (const selector of myntraSelectors.price) {
      const elements = document.querySelectorAll(selector);
      for (const element of elements) {
        if (element && element.textContent) {
          const text = element.textContent.trim();
          if (text.includes('₹') || text.includes('Rs') || /\d+/.test(text)) {
            priceText = text;
            console.log('Found price text:', priceText, 'with selector:', selector);
            break;
          }
        }
      }
      if (priceText) break;
    }
    
    // Try to find a more direct price if we couldn't find it through selectors
    if (!priceText) {
      // Try to find any element with price-like text
      const allElements = document.querySelectorAll('*');
      for (const element of allElements) {
        if (element.textContent) {
          const text = element.textContent.trim();
          if ((text.includes('₹') || text.includes('Rs.') || text.includes('Rs ')) && /\d+/.test(text)) {
            const simpleText = text.length < 20 ? text : text.substring(0, 20) + '...';
            console.log('Found potential price text in element:', simpleText);
            if (!priceText) priceText = text;
          }
        }
      }
    }
    
    // Extract numeric price from text
    let numericPrice = 0;
    if (priceText) {
      // Properly parse the price by removing all non-numeric characters except decimal point
      // First, find the price part that contains ₹ or Rs
      const priceMatch = priceText.match(/₹\s*([\d,]+\.?\d*)|Rs\.?\s*([\d,]+\.?\d*)/i);
      if (priceMatch) {
        // Get the matched price string and remove commas
        const priceStr = (priceMatch[1] || priceMatch[2]).replace(/,/g, '');
        numericPrice = parseFloat(priceStr);
        console.log('Extracted numeric price:', numericPrice);
      } else {
        // Fallback: try to extract just the numbers, removing commas
        const cleanedPrice = priceText.replace(/[^\d.,]/g, '').replace(/,/g, '');
        numericPrice = parseFloat(cleanedPrice);
        console.log('Fallback price extraction:', numericPrice);
      }
    } else if (metaPrice > 0) {
      numericPrice = metaPrice;
    }
    
    // Use page title if product name wasn't found
    if (!productName && document.title) {
      productName = document.title.split('|')[0].trim() || document.title;
      console.log('Using page title as product name:', productName);
    }
    
    // Extract MRP (Maximum Retail Price)
    let mrp = 0;
    let mrpElement = null;
    
    for (const selector of myntraSelectors.mrp) {
      mrpElement = document.querySelector(selector);
      if (mrpElement && mrpElement.textContent) {
        const mrpText = mrpElement.textContent.trim();
        console.log(`Found MRP element with selector ${selector}: ${mrpText}`);
        
        // Extract number from string like "Rs. 1,999" or "₹1999"
        const mrpMatch = mrpText.match(/(?:Rs\.?|₹|MRP:?)\s*([0-9,]+(\.[0-9]+)?)/i);
        if (mrpMatch && mrpMatch[1]) {
          mrp = parseFloat(mrpMatch[1].replace(/,/g, ''));
          console.log(`Parsed MRP: ${mrp}`);
          break;
        }
      }
    }
    
    return { 
      productName, 
      brand, 
      price: numericPrice,
      mrp,
      htmlTitle: document.title,
      priceText: priceText
    };
  });
}

// Extract Amazon product data
async function extractAmazonProductData(page: Page) {
  // Reduced timeout from 2500ms to 800ms
  await page.waitForTimeout(800);
  
  // Try to scroll down to ensure content is loaded
  await page.evaluate(() => {
    window.scrollBy(0, 300);
  });
  
  // Eliminated second timeout after scrolling
  
  return await page.evaluate(() => {
    console.log('Amazon page title:', document.title);
    
    // Amazon specific selectors
    const amazonSelectors = {
      price: [
        '#corePriceDisplay_desktop_feature_div > div.a-section.a-spacing-none.aok-align-center.aok-relative > span.a-price.aok-align-center.reinventPricePriceToPayMargin.priceToPay > span:nth-child(2)',
        '#corePrice_desktop > div > table > tbody > tr:nth-child(1) > td.a-span12 > span.a-price.a-text-price.a-size-medium.apexPriceToPay > span:nth-child(2)'
      ],
      mrp: [
        '#corePriceDisplay_desktop_feature_div > div.a-section.a-spacing-small.aok-align-center > span > span.aok-relative > span.a-size-small.a-color-secondary.aok-align-center.basisPrice > span > span.a-offscreen',
	      '.basisPrice .a-text-price .a-offscreen'
      ],
      name: [
        '#productTitle',
        '.product-title',
        '.product-name',
        'h1'
      ],
      brand: [
        '#bylineInfo',
        '.product-by-line',
        '.brand',
        '#brand',
        'a#bylineInfo',
      ]
    };
    
    // Debug HTML for price elements
    console.log('Debugging Amazon price elements:');
    for (const selector of amazonSelectors.price) {
      const elements = document.querySelectorAll(selector);
      console.log(`Selector "${selector}" found ${elements.length} elements`);
      for (const el of elements) {
        console.log(`-> Text: "${el.textContent?.trim()}"`);
      }
    }
    
    // Extract product name
    let productName = '';
    for (const selector of amazonSelectors.name) {
      const element = document.querySelector(selector);
      if (element && element.textContent) {
        productName = element.textContent.trim();
        console.log('Found Amazon product name:', productName, 'with selector:', selector);
        break;
      }
    }
    
    // Extract brand
    let brand = '';
    for (const selector of amazonSelectors.brand) {
      const element = document.querySelector(selector);
      if (element && element.textContent) {
        let brandText = element.textContent.trim();
        // Clean up brand text (remove "Brand: " or similar prefixes)
        brandText = brandText.replace(/^(Brand:|Visit the|by)\s+/i, '').trim();
        brand = brandText;
        console.log('Found Amazon brand:', brand, 'with selector:', selector);
        break;
      }
    }
    
    // Extract price
    let priceText = '';
    
    for (const selector of amazonSelectors.price) {
      const elements = document.querySelectorAll(selector);
      for (const element of elements) {
        if (element && element.textContent) {
          const text = element.textContent.trim();
          if (text.includes('₹') || text.includes('Rs') || /\d+/.test(text)) {
            priceText = text;
            console.log('Found Amazon price text:', priceText, 'with selector:', selector);
            break;
          }
        }
      }
      if (priceText) break;
    }
    
    // Extract numeric price from text
    let numericPrice = 0;
    if (priceText) {
      // Properly parse the price by removing all non-numeric characters except decimal point
      // First, find the price part that contains ₹ or Rs
      const priceMatch = priceText.match(/₹\s*([\d,]+\.?\d*)|Rs\s*([\d,]+\.?\d*)/i);
      if (priceMatch) {
        // Get the matched price string and remove commas
        const priceStr = (priceMatch[1] || priceMatch[2]).replace(/,/g, '');
        numericPrice = parseFloat(priceStr);
        console.log('Extracted Amazon numeric price:', numericPrice);
      } else {
        // Fallback: try to extract just the numbers, removing commas
        const cleanedPrice = priceText.replace(/[^\d.,]/g, '').replace(/,/g, '');
        numericPrice = parseFloat(cleanedPrice);
        console.log('Fallback price extraction:', numericPrice);
      }
    }
    
    // Use page title if product name wasn't found
    if (!productName && document.title) {
      productName = document.title.split(':')[0].trim() || document.title;
      console.log('Using page title as Amazon product name:', productName);
    }
    
    // Extract MRP (Maximum Retail Price, or List Price in Amazon's case)
    let mrp = 0;
    let mrpElement = null;
    
    for (const selector of amazonSelectors.mrp) {
      mrpElement = document.querySelector(selector);
      if (mrpElement && mrpElement.textContent) {
        const mrpText = mrpElement.textContent.trim();
        console.log(`Found MRP element with selector ${selector}: ${mrpText}`);
        
        // Extract number from string like "M.R.P.: ₹1,999.00" or "₹1999.00"
        const mrpMatch = mrpText.match(/(?:M\.R\.P\.:|List Price:|₹|Rs\.?|INR|$)\s*([0-9,]+(\.[0-9]+)?)/i);
        if (mrpMatch && mrpMatch[1]) {
          mrp = parseFloat(mrpMatch[1].replace(/,/g, ''));
          console.log(`Parsed MRP: ${mrp}`);
          break;
        }
      }
    }
    
    return { 
      productName, 
      brand, 
      price: numericPrice,
      mrp,
      htmlTitle: document.title,
      priceText: priceText
    };
  });
}

async function extractFlipkartProductData(page: Page) {
  // Reduced timeout from 3000ms to 1000ms
  await page.waitForTimeout(1000);
  
  // Try to scroll down to ensure all content is loaded
  await page.evaluate(() => {
    window.scrollBy(0, 300);
  });
  
  // Eliminated second timeout after scrolling
  
  return await page.evaluate(() => {
    console.log('Flipkart page title:', document.title);
    
    // Updated Flipkart selectors with the latest HTML structure
    const flipkartSelectors = {
      price: [
        '.Nx9bqj.CxhGGd',
        '._30jeq3._16Jk6d',    // Current main price selector
        '._30jeq3',             // Alternative price selector
        '.dyC4hf ._30jeq3',     // Nested price selector
        '[data-testid="price"]',
        // Backup selectors
        '.a-price-whole',
        '[class*="_30jeq3"]',
        '[class*="price"]',
        'div[class*="price"]',
        'span[class*="price"]',
        '.dyC4hf',
        '._25b18c',
        '.CEmiEU',
        '.XS08ue',
        'div.yRaY8j.A6\\+E6v',
      ],
      mrp: [
        // Primary MRP selectors
        'div.yRaY8j.A6\\+E6v',
        '._3I9_wc._2p6lqe',    // Current strike price selector
        '._3I9_wc',            // Alternative strike price
        // Backup selectors
        '.dyC4hf ._3I9_wc',
        '._3auQ3N',
        '.dyC4hf .CEmiEU + .CEmiEU',
        '.CEmiEU._2xc28y',
        'div._3I9_wc._2p6lqe',
        'div[class*="mrp"]',
        'div[class*="_3I9_wc"]',
        'span[class*="mrp"]'
      ],
      name: [
        // Primary name selectors
        '.B_NuCI',               // Main product title selector
        '[data-testid="product-name"]',
        // Backup selectors
        '._35KyD6',
        '.product-title',
        'h1[class*="title"]',
        'h1',
        '.yhB1nd',
        '.aMaAEs',
        '.hGSR34',
        'span.B_NuCI'
      ],
      brand: [
        // Primary brand selectors
        '#sellerName span span',
        '.G6XhRU',
        '[data-testid="brand"]',
        // Backup selectors
        'span[class*="brand"]',
        'span[class*="G6XhRU"]',
        '.g5J0Hd',
        '.xfgSjb'
      ]
    };
    
    // Extract product name
    let productName = '';
    for (const selector of flipkartSelectors.name) {
      const element = document.querySelector(selector);
      if (element && element.textContent) {
        productName = element.textContent.trim();
        console.log('Found Flipkart product name:', productName, 'with selector:', selector);
        break;
      }
    }
    
    // Extract brand
    let brand = '';
    for (const selector of flipkartSelectors.brand) {
      const element = document.querySelector(selector);
      if (element && element.textContent) {
        // For Flipkart, brand is often part of the product name
        const fullText = element.textContent.trim();
        
        // If it's a full text, just take the first word as the brand
        if (fullText.includes(' ')) {
          brand = fullText.split(' ')[0];
        } else {
          brand = fullText;
        }
        
        console.log('Found Flipkart brand:', brand, 'with selector:', selector);
        break;
      }
    }
    
    // Try to extract brand from product name if not found directly
    if (!brand && productName) {
      // Extract brand from product name - generally the first word
      brand = productName.split(' ')[0];
    }
    
    // Extract price
    let priceText = '';
    
    for (const selector of flipkartSelectors.price) {
      const elements = document.querySelectorAll(selector);
      for (const element of elements) {
        if (element && element.textContent) {
          const text = element.textContent.trim();
          // Look for price indicators with more relaxed pattern matching
          if (text.includes('₹') || text.includes('Rs') || /\d+/.test(text)) {
            priceText = text;
            console.log('Found Flipkart price text:', priceText, 'with selector:', selector);
            break;
          }
        }
      }
      if (priceText) break;
    }
    
    // If we still don't have a price, try a more aggressive approach
    if (!priceText) {
      // Find elements with specific attributes that might contain prices
      const priceElements = document.querySelectorAll('[itemprop="price"], [property*="price"], [class*="price"]');
      
      for (const element of priceElements) {
        if (element.textContent) {
          const text = element.textContent.trim();
          if ((text.includes('₹') || text.includes('Rs')) && /\d+/.test(text)) {
            priceText = text;
            break;
          }
        }
      }
      
      // If still not found, do a broader search
      if (!priceText) {
        const allElements = document.querySelectorAll('*');
        for (const element of allElements) {
          if (element.textContent) {
            const text = element.textContent.trim();
            if ((text.includes('₹') || text.includes('Rs.') || text.includes('Rs ')) && /\d+/.test(text)) {
              if (text.length < 30) { // Price texts are usually short
                priceText = text;
                break;
              }
            }
          }
        }
      }
    }
    
    // Extract price from meta tags as a last resort
    if (!priceText) {
      const metaPriceElement = document.querySelector('meta[property="product:price:amount"]') || 
                             document.querySelector('meta[itemprop="price"]');
      
      if (metaPriceElement && metaPriceElement.getAttribute('content')) {
        priceText = `₹ ${metaPriceElement.getAttribute('content')}`;
      }
    }
    
    // Extract numeric price from text with improved regex
    let numericPrice = 0;
    if (priceText) {
      // First try the standard price format
      const priceMatch = priceText.match(/(?:₹|Rs\.?|MRP:?)\s*([0-9,]+(?:\.[0-9]+)?)/i);
      
      if (priceMatch && priceMatch[1]) {
        // Get the matched price string and remove commas
        const priceStr = priceMatch[1].replace(/,/g, '');
        numericPrice = parseFloat(priceStr);
      } else {
        // Fallback: extract any digits, assuming the first group of digits is the price
        const digitMatches = priceText.match(/(\d{1,3}(?:,\d{3})*(?:\.\d+)?|\d+(?:\.\d+)?)/g);
        if (digitMatches && digitMatches.length > 0) {
          // Use the first number found as the price
          const priceStr = digitMatches[0].replace(/,/g, '');
          numericPrice = parseFloat(priceStr);
        } else {
          // Last resort: extract any digits at all
          const cleanedPrice = priceText.replace(/[^\d.]/g, '');
          if (cleanedPrice) {
            numericPrice = parseFloat(cleanedPrice);
          }
        }
      }
    }
    
    // Use page title if product name wasn't found
    if (!productName && document.title) {
      productName = document.title.split('|')[0].trim() || document.title.split(':')[0].trim() || document.title;
    }
    
    // Extract MRP (Maximum Retail Price) with improved method
    let mrp = 0;
    
    for (const selector of flipkartSelectors.mrp) {
      const mrpElement = document.querySelector(selector);
      if (mrpElement && mrpElement.textContent) {
        const mrpText = mrpElement.textContent.trim();
        
        // Extract number from MRP text with improved regex
        const mrpMatch = mrpText.match(/(?:Rs\.?|₹|MRP:?)\s*([0-9,]+(?:\.[0-9]+)?)/i);
        
        if (mrpMatch && mrpMatch[1]) {
          mrp = parseFloat(mrpMatch[1].replace(/,/g, ''));
          break;
        } else {
          // Try to extract just the numbers if the format is unexpected
          const digitMatches = mrpText.match(/(\d{1,3}(?:,\d{3})*(?:\.\d+)?|\d+(?:\.\d+)?)/g);
          if (digitMatches && digitMatches.length > 0) {
            mrp = parseFloat(digitMatches[0].replace(/,/g, ''));
            break;
          }
        }
      }
    }
    
    // Special case: If MRP is found but price is not, check if MRP might actually be the price
    if (mrp > 0 && numericPrice === 0) {
      numericPrice = mrp; // Temporarily use MRP as price
      
      // Look for a separate current price
      const discountedPriceSelectors = ['._30jeq3', '.dyC4hf ._30jeq3', '[data-testid="price"]'];
      for (const selector of discountedPriceSelectors) {
        const priceElement = document.querySelector(selector);
        if (priceElement && priceElement.textContent) {
          const priceText = priceElement.textContent.trim();
          const priceMatch = priceText.match(/(?:₹|Rs\.?)\s*([0-9,]+(?:\.[0-9]+)?)/i);
          if (priceMatch && priceMatch[1]) {
            numericPrice = parseFloat(priceMatch[1].replace(/,/g, ''));
            break;
          }
        }
      }
    }
    
    return { 
      productName, 
      brand, 
      price: numericPrice,
      mrp,
      htmlTitle: document.title,
      priceText: priceText
    };
  });
}