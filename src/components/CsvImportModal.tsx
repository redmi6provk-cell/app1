'use client';

import { useState, useRef, ChangeEvent } from 'react';
import { Product } from '@/types';
import { detectPlatform } from '@/utils/helpers';
import { nanoid } from 'nanoid';

interface CsvImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  onImport: (products: Product[]) => void;
  existingProducts: Product[];
}

type CsvRow = {
  url: string;
  desiredPrice: string;
  imageUrl?: string;
};

type ImportError = {
  rowNumber: number;
  message: string;
};

export default function CsvImportModal({ isOpen, onClose, onImport, existingProducts }: CsvImportModalProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [errors, setErrors] = useState<ImportError[]>([]);
  const [successCount, setSuccessCount] = useState(0);
  const [validProducts, setValidProducts] = useState<Product[]>([]);
  const [step, setStep] = useState<'upload' | 'review' | 'complete'>('upload');
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [rawCsvContent, setRawCsvContent] = useState<string>(''); // Store raw CSV for debugging

  const resetState = () => {
    setErrors([]);
    setSuccessCount(0);
    setValidProducts([]);
    setStep('upload');
    setRawCsvContent('');
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleClose = () => {
    resetState();
    onClose();
  };

  // Simpler, more robust CSV parsing function for our specific use case
  const parseCsvFile = (fileContent: string): CsvRow[] => {
    // Store raw content for debugging
    setRawCsvContent(fileContent);

    // Split by line
    const lines = fileContent.split(/\r\n|\n/).filter(line => line.trim());
    
    if (lines.length === 0) {
      throw new Error('The CSV file is empty');
    }

    // Get the header line
    const headerLine = lines[0].toLowerCase();
    
    // Simple check for required headers
    if (!headerLine.includes('url') || 
        !(headerLine.includes('desired_price') || headerLine.includes('desiredprice') || headerLine.includes('price'))) {
      throw new Error('CSV must contain at least "url" and "desired_price" columns');
    }

    // Check if we have an imageUrl column
    const hasImageUrl = headerLine.includes('imageurl') || headerLine.includes('image_url') || headerLine.includes('image url');
    
    // Get column indices based on headers
    const headers = headerLine.split(',').map(h => h.trim());
    const urlIndex = headers.findIndex(h => h === 'url');
    const priceIndex = headers.findIndex(h => 
      h === 'desired_price' || h === 'desiredprice' || h === 'price'
    );
    const imageUrlIndex = hasImageUrl ? 
      headers.findIndex(h => h === 'imageurl' || h === 'image_url' || h === 'image url') : -1;
    
    // Parse the rest of the lines
    const rows: CsvRow[] = [];
    
    for (let i = 1; i < lines.length; i++) {
      const line = lines[i].trim();
      if (!line) continue;
      
      // Split the line by comma
      const values = line.split(',').map(v => v.trim());
      
      // Make sure we have enough values
      if (values.length < 2 || values.length <= priceIndex) {
        throw new Error(`Row ${i+1}: Not enough columns`);
      }
      
      const url = values[urlIndex];
      const desiredPrice = values[priceIndex];
      const imageUrl = imageUrlIndex >= 0 && values.length > imageUrlIndex ? values[imageUrlIndex] : undefined;
      
      // Check if we have both URL and price
      if (!url || !desiredPrice) {
        throw new Error(`Row ${i+1}: Missing required values`);
      }
      
      rows.push({
        url,
        desiredPrice,
        imageUrl
      });
    }
    
    return rows;
  };

  const validateProducts = (csvRows: CsvRow[]): { valid: Product[], errors: ImportError[] } => {
    const validProducts: Product[] = [];
    const errors: ImportError[] = [];
    
    csvRows.forEach((row, index) => {
      const rowNumber = index + 2; // +1 for 0-index, +1 for header row
      
      // Validate URL
      if (!row.url) {
        errors.push({ rowNumber, message: 'URL is required' });
        return;
      }
      
      // Validate platform
      const platform = detectPlatform(row.url);
      if (platform === 'Unknown') {
        errors.push({ 
          rowNumber, 
          message: 'Currently only Myntra, Amazon and Flipkart URLs are supported' 
        });
        return;
      }
      
      // Check for duplicate
      const normalizedUrl = row.url.trim().toLowerCase();
      const isDuplicate = existingProducts.some(product => 
        product.url.toLowerCase() === normalizedUrl
      );
      
      if (isDuplicate) {
        errors.push({ 
          rowNumber, 
          message: 'This product is already being tracked' 
        });
        return;
      }
      
      // Validate price
      const priceValue = parseFloat(row.desiredPrice);
      if (isNaN(priceValue) || priceValue <= 0) {
        errors.push({ 
          rowNumber, 
          message: 'Valid price is required (must be > 0)' 
        });
        return;
      }
      
      // Create valid product
      validProducts.push({
        id: nanoid(),
        url: row.url.trim(),
        desiredPrice: priceValue,
        ecommercePlatform: platform,
        imageUrl: row.imageUrl,
      });
    });
    
    return { valid: validProducts, errors };
  };

  const handleFileChange = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    setIsLoading(true);
    setErrors([]);
    
    try {
      // Read the file content
      const fileContent = await file.text();
      
      // Parse CSV
      const csvRows = parseCsvFile(fileContent);
      
      // Validate products
      const { valid, errors } = validateProducts(csvRows);
      
      setValidProducts(valid);
      setErrors(errors);
      setSuccessCount(valid.length);
      
      // Go to review step if we have valid products
      if (valid.length > 0) {
        setStep('review');
      }
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Failed to parse CSV file';
      setErrors([{ rowNumber: 0, message }]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleImport = () => {
    setIsLoading(true);
    try {
      onImport(validProducts);
      setStep('complete');
    } catch (_error) {
      setErrors([...errors, { rowNumber: 0, message: 'Failed to import products' }]);
    } finally {
      setIsLoading(false);
    }
  };

  const downloadSampleCsv = (e: React.MouseEvent) => {
    e.preventDefault();
    // Create sample CSV with headers and rows - include the optional imageUrl column
    const sampleCsv = 
`url,desired_price,imageUrl
https://www.amazon.in/OnePlus-Mirror-Black-64GB-Memory/dp/B0756Z43QS,25999.00,https://example.com/oneplus-image.jpg
https://www.flipkart.com/sony-wh-1000xm4-noise-cancelling-wireless-headphone/p/itm25856695aace8,24990.00,https://example.com/sony-headphones.jpg
https://www.myntra.com/watches/fossil/fossil-men-the-minimalist-three-hand-tan-leather-watch-fs5304/7139443/buy,8995.00,`;
    
    // Create a blob and download link
    const blob = new Blob([sampleCsv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'sample_import.csv';
    document.body.appendChild(a);
    a.click();
    window.URL.revokeObjectURL(url);
    document.body.removeChild(a);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-gray-600 bg-opacity-75 flex items-center justify-center z-50 overflow-y-auto">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl my-4 max-h-[calc(100vh-2rem)] flex flex-col">
        <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-center flex-shrink-0">
          <h2 className="text-xl font-semibold text-gray-800">Import Products from CSV</h2>
          <button 
            onClick={handleClose}
            className="text-gray-500 hover:text-gray-700"
          >
            <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        
        <div className="px-6 py-4 overflow-y-auto flex-grow">
          {step === 'upload' && (
            <>
              <div className="bg-yellow-50 border border-yellow-200 rounded p-3 mb-4">
                <div className="flex items-start">
                  <svg className="h-5 w-5 text-yellow-600 mt-0.5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <div>
                    <p className="text-sm text-yellow-700 font-medium">Important CSV Format Instructions:</p>
                    <ul className="mt-1 pl-5 text-xs text-yellow-700 list-disc">
                      <li>The CSV must have a header row with <b>url</b> and <b>desired_price</b> columns</li>
                      <li>Each product should be on a separate line</li>
                      <li>The price should be the <b>last value</b> on each line</li>
                      <li>Use the sample template to ensure correct formatting</li>
                    </ul>
                  </div>
                </div>
              </div>
              
              <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center">
                <input
                  type="file"
                  accept=".csv"
                  ref={fileInputRef}
                  onChange={handleFileChange}
                  className="hidden"
                  id="csv-file-input"
                />
                
                <label 
                  htmlFor="csv-file-input"
                  className="cursor-pointer flex flex-col items-center justify-center"
                >
                  <svg className="h-12 w-12 text-gray-400 mb-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M9 13h6m-3-3v6m5 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                  <span className="text-sm text-gray-600 mb-1 font-medium">
                    {isLoading ? 'Processing...' : 'Click to select a CSV file'}
                  </span>
                  <span className="text-xs text-gray-500">
                    Format: url,desired_price,imageUrl (optional)
                  </span>
                </label>
              </div>
              
              <div className="mt-4">
                <a 
                  href="#" 
                  onClick={downloadSampleCsv}
                  className="text-indigo-600 hover:text-indigo-800 text-sm font-medium"
                >
                  Download sample CSV template
                </a>
              </div>
            </>
          )}

          {/* Debug section - only visible when there are errors */}
          {errors.length > 0 && step === 'upload' && rawCsvContent && (
            <div className="mt-4 p-3 border border-gray-200 rounded-md bg-gray-50">
              <h4 className="text-sm font-medium text-gray-700 mb-2">CSV Content Preview:</h4>
              <pre className="text-xs text-gray-600 bg-white p-2 rounded border border-gray-200 overflow-x-auto">
                {rawCsvContent.length > 500 ? rawCsvContent.substring(0, 500) + '...' : rawCsvContent}
              </pre>
            </div>
          )}

          {step === 'review' && (
            <>
              <div className="mb-4">
                <h3 className="text-lg font-medium text-gray-900 mb-2">Import Preview</h3>
                <div className="bg-green-50 border border-green-200 rounded p-3 mb-3 flex items-center">
                  <svg className="h-5 w-5 text-green-500 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  <span className="text-green-700">
                    {successCount} valid product{successCount !== 1 ? 's' : ''} ready to import
                  </span>
                </div>
                
                {errors.length > 0 && (
                  <div className="bg-yellow-50 border border-yellow-200 rounded p-3 flex items-start">
                    <svg className="h-5 w-5 text-yellow-500 mr-2 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                    </svg>
                    <div>
                      <span className="text-yellow-700 font-medium block mb-1">
                        {errors.length} error{errors.length !== 1 ? 's' : ''} found
                      </span>
                      <ul className="list-disc pl-5 text-sm">
                        {errors.map((error, index) => (
                          <li key={index} className="text-gray-700">
                            Row {error.rowNumber > 0 ? error.rowNumber : 'Header'}: {error.message}
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>
                )}
              </div>
              
              <div className="mt-4 border border-gray-200 rounded-lg overflow-hidden">
                <div className="overflow-hidden">
                  <div className="max-h-80 overflow-y-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                      <thead className="bg-gray-50 sticky top-0 z-10">
                        <tr>
                          <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Platform</th>
                          <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">URL</th>
                          <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Price</th>
                          <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Image URL</th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                        {validProducts.map((product, index) => (
                          <tr key={index} className="hover:bg-gray-50">
                            <td className="px-4 py-3 whitespace-nowrap">
                              <span className={`px-2 py-1 text-xs rounded-full ${
                                product.ecommercePlatform === 'Amazon' ? 'bg-orange-100 text-orange-800' :
                                product.ecommercePlatform === 'Flipkart' ? 'bg-blue-100 text-blue-800' : 
                                product.ecommercePlatform === 'Myntra' ? 'bg-pink-100 text-pink-800' : 
                                'bg-gray-100 text-gray-800'
                              }`}>
                                {product.ecommercePlatform}
                              </span>
                            </td>
                            <td className="px-4 py-3 text-sm text-gray-500">
                              <div className="truncate max-w-xs" title={product.url}>
                                {product.url}
                              </div>
                            </td>
                            <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500">
                              ₹{product.desiredPrice.toFixed(2)}
                            </td>
                            <td className="px-4 py-3 text-sm text-gray-500">
                              {product.imageUrl ? (
                                <div className="truncate max-w-xs" title={product.imageUrl}>
                                  {product.imageUrl}
                                </div>
                              ) : (
                                <span className="text-gray-400">Not provided</span>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
                <div className="bg-gray-50 px-4 py-2 text-sm text-gray-500 text-center border-t border-gray-200">
                  Showing {validProducts.length} products 
                  {validProducts.length > 50 && (
                    <span className="ml-1 text-indigo-600">Scroll to see all</span>
                  )}
                </div>
              </div>
            </>
          )}

          {step === 'complete' && (
            <div className="py-8 text-center">
              <div className="mb-4 flex justify-center">
                <div className="rounded-full bg-green-100 p-3">
                  <svg className="h-8 w-8 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                </div>
              </div>
              <h3 className="text-lg font-medium text-gray-900 mb-2">Import Complete!</h3>
              <p className="text-gray-600">
                Successfully imported {successCount} product{successCount !== 1 ? 's' : ''}
              </p>
            </div>
          )}
          
          {errors.length > 0 && step === 'upload' && (
            <div className="mt-4 bg-red-50 border border-red-200 rounded p-3">
              <ul className="list-disc pl-5 text-sm">
                {errors.map((error, index) => (
                  <li key={index} className="text-red-700">
                    {error.message}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
        
        <div className="px-6 py-4 bg-gray-50 border-t border-gray-200 flex justify-end flex-shrink-0">
          {step === 'upload' && (
            <button
              onClick={handleClose}
              className="bg-white border border-gray-300 text-gray-700 py-2 px-4 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 shadow-sm font-medium"
            >
              Cancel
            </button>
          )}
          
          {step === 'review' && (
            <>
              <button
                onClick={() => setStep('upload')}
                className="bg-white border border-gray-300 text-gray-700 py-2 px-4 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 shadow-sm font-medium mr-3"
              >
                Back
              </button>
              
              <button
                onClick={handleImport}
                disabled={validProducts.length === 0 || isLoading}
                className={`flex items-center justify-center bg-gradient-to-r from-indigo-600 to-purple-600 text-white py-2 px-6 rounded-md hover:from-indigo-700 hover:to-purple-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 ${validProducts.length === 0 || isLoading ? 'opacity-50 cursor-not-allowed' : ''} shadow-sm font-medium`}
              >
                {isLoading ? (
                  <>
                    <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Importing...
                  </>
                ) : (
                  <>Import {validProducts.length} Products</>
                )}
              </button>
            </>
          )}
          
          {step === 'complete' && (
            <button
              onClick={handleClose}
              className="bg-gradient-to-r from-indigo-600 to-purple-600 text-white py-2 px-6 rounded-md hover:from-indigo-700 hover:to-purple-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 shadow-sm font-medium"
            >
              Done
            </button>
          )}
        </div>
      </div>
    </div>
  );
}