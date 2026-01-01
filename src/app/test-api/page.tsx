'use client';

import { useState } from 'react';

export default function TestApi() {
  const [url, setUrl] = useState('');
  const [result, setResult] = useState('// Results will appear here');
  const [isLoading, setIsLoading] = useState(false);
  const [status, setStatus] = useState({ text: '', type: '' });

  const setUrlValue = (sampleUrl: string) => {
    setUrl(sampleUrl);
  };

  const handleScrape = async () => {
    if (!url.trim()) {
      setResult('<span class="error">Please enter a valid URL</span>');
                return;
            }
            
            try {
      setIsLoading(true);
      setStatus({ text: 'Scraping in progress...', type: '' });
      setResult('Fetching product data...');
                
                const response = await fetch('/api/scrape', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({ url })
                });
                
                const data = await response.json();
                
                if (response.ok) {
        setStatus({ text: 'Success!', type: 'success' });
        setResult(JSON.stringify(data, null, 2));
                } else {
        setStatus({ text: 'Error!', type: 'error' });
        setResult(`<span class="error">Error: ${data.error || 'Unknown error'}</span>\n\n${JSON.stringify(data, null, 2)}`);
      }
    } catch (error: unknown) {
      setStatus({ text: 'Error!', type: 'error' });
      const message = error instanceof Error ? error.message : "Unknown scraping error";
      setResult(`<span class="error">Error: ${message}</span>`);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div style={{ 
      fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Oxygen, Ubuntu, Cantarell, "Open Sans", "Helvetica Neue", sans-serif',
      maxWidth: '800px',
      margin: '0 auto',
      padding: '20px',
      backgroundColor: '#f7f7f7'
    }}>
      <h1 style={{ 
        color: '#333',
        borderBottom: '2px solid #eee',
        paddingBottom: '10px'
      }}>E-commerce Scraper API Tester</h1>
      
      <div style={{ 
        backgroundColor: 'white',
        borderRadius: '8px',
        padding: '20px',
        boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
      }}>
        <div style={{ marginBottom: '15px' }}>
          <label style={{ 
            display: 'block',
            marginBottom: '5px',
            fontWeight: '500'
          }} htmlFor="url">Product URL (Flipkart, Amazon, or Myntra)</label>
          <input 
            type="url" 
            id="url"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder="https://www.flipkart.com/product/..." 
            required
            style={{
              width: '100%',
              padding: '8px',
              border: '1px solid #ddd',
              borderRadius: '4px',
              fontSize: '16px'
            }}
          />
        </div>
        
        <button 
          onClick={handleScrape}
          style={{
            backgroundColor: '#4a90e2',
            color: 'white',
            border: 'none',
            padding: '10px 15px',
            borderRadius: '4px',
            cursor: 'pointer',
            fontSize: '16px',
            transition: 'background-color 0.3s'
          }}
        >
          Scrape Product
        </button>
        
        {isLoading && (
          <span style={{
            display: 'inline-block',
            width: '20px',
            height: '20px',
            border: '3px solid rgba(0,0,0,0.1)',
            borderRadius: '50%',
            borderTopColor: '#4a90e2',
            animation: 'spin 1s ease-in-out infinite',
            marginLeft: '10px',
            verticalAlign: 'middle'
          }} />
        )}
        
        {status.text && (
          <span style={{
            color: status.type === 'error' ? '#e74c3c' : status.type === 'success' ? '#27ae60' : 'inherit',
            fontWeight: '500',
            marginLeft: '10px'
          }}>
            {status.text}
          </span>
        )}
        
        <div style={{
          marginTop: '20px',
          padding: '10px',
          backgroundColor: '#f8f9fa',
          borderRadius: '4px'
        }}>
          <p style={{ margin: '5px 0', fontSize: '14px' }}><strong>Sample URLs:</strong></p>
          <p style={{ margin: '5px 0', fontSize: '14px' }}>
            <a 
              onClick={() => setUrlValue('https://www.flipkart.com/supreme-olive-home-garden-plastic-outdoor-table/p/itmf2cdeb5bb74f4')}
              style={{
                color: '#4a90e2',
                textDecoration: 'none',
                cursor: 'pointer'
              }}
            >
              Flipkart - Supreme Olive Table
            </a>
          </p>
          <p style={{ margin: '5px 0', fontSize: '14px' }}>
            <a 
              onClick={() => setUrlValue('https://www.amazon.in/Redmi-Storage-Performance-Mediatek-Display/dp/B0C45CN5M3/')}
              style={{
                color: '#4a90e2',
                textDecoration: 'none',
                cursor: 'pointer'
              }}
            >
              Amazon - Redmi 12 5G
            </a>
          </p>
          <p style={{ margin: '5px 0', fontSize: '14px' }}>
            <a 
              onClick={() => setUrlValue('https://www.myntra.com/shirts/roadster/roadster-men-navy-blue--maroon-regular-fit-checked-casual-sustainable-shirt/2127876/buy')}
              style={{
                color: '#4a90e2',
                textDecoration: 'none',
                cursor: 'pointer'
              }}
            >
              Myntra - Roadster Shirt
            </a>
          </p>
        </div>
        
        <pre style={{
          backgroundColor: '#f1f1f1',
          padding: '15px',
          borderRadius: '4px',
          overflowX: 'auto',
          whiteSpace: 'pre-wrap',
          marginTop: '20px'
        }} dangerouslySetInnerHTML={{ __html: result }} />
      </div>
      
      <style jsx global>{`
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}