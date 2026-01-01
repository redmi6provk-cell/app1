'use client';

import { useState, useEffect } from 'react';

export default function ScannerStatusWidget() {
  const [isScanning, setIsScanning] = useState(false);
  const [isActivelyScanningNow, setIsActivelyScanningNow] = useState(false);
  const [loading, setLoading] = useState(true);
  const [statusText, setStatusText] = useState('Checking status...');

  useEffect(() => {
    // Fetch scanner state on component mount only
    fetchScannerState();
    
    // Remove the polling interval
  }, []);
  
  const fetchScannerState = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/scanner-state');
      
      if (response.ok) {
        const data = await response.json();
        setIsScanning(data.isScanning);
        setIsActivelyScanningNow(data.isActivelyScanningNow);
        
        // Determine status text based on both states
        if (data.isScanning) {
          setStatusText(data.isActivelyScanningNow 
            ? 'Continuous scanning is active (Scanner running)' 
            : 'Continuous scanning is active');
        } else {
          setStatusText(data.isActivelyScanningNow 
            ? 'Scanner is running (manual scan)' 
            : 'Scanning is paused');
        }
      } else {
        setStatusText('Unable to get scanner status');
      }
    } catch (error) {
      console.error('Error fetching scanner state:', error);
      setStatusText('Error checking scanner');
    } finally {
      setLoading(false);
    }
  };
  
  return (
    <div className="flex items-center space-x-2">
      <span 
        className={`relative flex h-3 w-3 ${isScanning || isActivelyScanningNow ? 'animate-pulse' : ''}`}
      >
        <span 
          className={`absolute inline-flex h-full w-full rounded-full ${
            isScanning || isActivelyScanningNow ? 'bg-green-400' : 'bg-gray-400'
          } opacity-75`}
        ></span>
        <span 
          className={`relative inline-flex rounded-full h-3 w-3 ${
            isScanning || isActivelyScanningNow ? 'bg-green-500' : 'bg-gray-500'
          }`}
        ></span>
      </span>
      <span className="text-sm text-gray-600">
        {statusText}
      </span>
      {loading && (
        <svg className="animate-spin h-3 w-3 text-gray-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
        </svg>
      )}
    </div>
  );
} 