import * as fs from 'fs';
import * as path from 'path';
import { Product } from '../types';

// Define the data directory path
const DATA_DIR = path.join(process.cwd(), 'data');
const getFilePath = (platform: string) => path.join(DATA_DIR, `${platform.toLowerCase()}_products.json`);

// Ensure data directory exists
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

// Load products from a platform's file
export function loadProducts(platform: string): Product[] {
  const filePath = getFilePath(platform);
  
  if (!fs.existsSync(filePath)) {
    return [];
  }
  
  try {
    const data = fs.readFileSync(filePath, 'utf8');
    return JSON.parse(data) as Product[];
  } catch (error) {
    console.error(`Error loading products for ${platform}:`, error);
    return [];
  }
}

// Save products to a platform's file
export async function saveProducts(platform: string, products: Product[]): Promise<void> {
  const filePath = getFilePath(platform);
  
  try {
    fs.writeFileSync(filePath, JSON.stringify(products, null, 2), 'utf8');
  } catch (error) {
    console.error(`Error saving products for ${platform}:`, error);
    throw error;
  }
}

// Get all products from all platforms
export function getAllProducts(): Product[] {
  const platforms = ['myntra', 'amazon', 'flipkart', 'unknown'];
  let allProducts: Product[] = [];
  
  for (const platform of platforms) {
    const products = loadProducts(platform);
    allProducts = [...allProducts, ...products];
  }
  
  return allProducts;
} 