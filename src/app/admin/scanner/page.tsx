'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';

interface ScanLog {
  timestamp: string;
  status: string;
  productsScanned?: number;
  successCount?: number;
  failureCount?: number;
  notificationCount?: number;
  duration?: number;
  durationFormatted?: string;
  message?: string;
  error?: string;
  isContinuous?: boolean;
  scanId?: string;
}

export default function AdminScannerPage() {
  const [logs, setLogs] = useState<ScanLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [scanningState, setScanningState] = useState(false);
  const [isActivelyScanningNow, setIsActivelyScanningNow] = useState(false);
  const [toggleInProgress, setToggleInProgress] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [isStoppingInProgress, setIsStoppingInProgress] = useState(false);

  // Load scan logs and scanner state
  useEffect(() => {
    const initialize = async () => {
      try {
        setLoading(true);
        setError(null);
        
        // Fetch logs
        const logsResponse = await fetch('/api/admin/scan-logs');
        
        if (!logsResponse.ok) {
          throw new Error('Failed to fetch scan logs');
        }
        
        const logsData = await logsResponse.json();
        setLogs(logsData.logs || []);
        
        // Fetch scanner state
        const stateResponse = await fetch('/api/scanner-state');
        
        if (stateResponse.ok) {
          const stateData = await stateResponse.json();
          setScanningState(stateData.isScanning);
          setIsActivelyScanningNow(stateData.isActivelyScanningNow);
        }
      } catch (error: unknown) {
        console.error('Error initializing scanner page:', error);
        const message = error instanceof Error ? error.message : 'Failed to initialize scanner page';
        setError(message);
      } finally {
        setLoading(false);
      }
    };
    
    initialize();

    // Set up a refresh interval to poll for scanner state changes
    const intervalId = setInterval(() => {
      fetchScannerState();
    }, 5000); // Check every 5 seconds

    return () => clearInterval(intervalId); // Clean up on unmount
  }, []);

  // Fetch scanner state
  const fetchScannerState = async () => {
    try {
      const response = await fetch('/api/scanner-state');
      
      if (response.ok) {
        const data = await response.json();
        setScanningState(data.isScanning);
        setIsActivelyScanningNow(data.isActivelyScanningNow);
      }
    } catch (error) {
      console.error('Error fetching scanner state:', error);
    }
  };
  
  // Trigger a manual background scan
  const triggerManualScan = async () => {
    try {
      setToggleInProgress(true);
      setStatusMessage(null);
      
      const response = await fetch('/api/background-scan');
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to trigger manual scan');
      }
      
      setStatusMessage('Manual scan triggered successfully. Check logs for details.');
      
      // Refresh logs after a short delay to show the new scan
      setTimeout(() => {
        fetchLogs();
      }, 2000);
    } catch (error: unknown) {
      console.error('Error triggering manual scan:', error);
      const message = error instanceof Error ? error.message : 'Unknown error triggering scan';
      setStatusMessage(`Error: ${message}`);
    } finally {
      setToggleInProgress(false);
    }
  };
  
  // Stop the currently running scan
  const stopScan = async () => {
    try {
      setIsStoppingInProgress(true);
      setStatusMessage(null);
      
      const response = await fetch('/api/stop-scan', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        }
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to stop scan');
      }
      
      setStatusMessage('Stop request sent. The current scan will terminate shortly.');
      
      // Refresh logs and state after a short delay
      setTimeout(() => {
        fetchLogs();
        fetchScannerState();
      }, 2000);
    } catch (error: unknown) {
      console.error('Error stopping scan:', error);
      const message = error instanceof Error ? error.message : 'Unknown error stopping scan';
      setStatusMessage(`Error: ${message}`);
    } finally {
      setIsStoppingInProgress(false);
    }
  };
  
  // Toggle continuous scanning
  const toggleContinuousScanning = async () => {
    try {
      setToggleInProgress(true);
      setStatusMessage(null);
      
      const newState = !scanningState;
      
      const response = await fetch('/api/background-scan', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          isScanning: newState
        }),
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to toggle scanning state');
      }
      
      // Update local state with the new value
      setScanningState(newState);
      setStatusMessage(newState 
        ? 'Continuous scanning turned ON. Scanning will run continuously in the background.' 
        : 'Continuous scanning turned OFF. Current scan (if any) will complete before stopping.');
      
      // Refresh logs after a short delay to show any new scan activity
      setTimeout(() => {
        fetchLogs();
      }, 2000);
    } catch (error: unknown) {
      console.error('Error toggling continuous scanning:', error);
      const message = error instanceof Error ? error.message : 'Unknown error toggling scan';
      setStatusMessage(`Error: ${message}`);
    } finally {
      setToggleInProgress(false);
    }
  };

  // Format date for display
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleString();
  };

  // Fetch logs method for refreshing data
  const fetchLogs = async () => {
    try {
      const response = await fetch('/api/admin/scan-logs');
      
      if (!response.ok) {
        throw new Error('Failed to fetch scan logs');
      }
      
      const data = await response.json();
      setLogs(data.logs || []);
    } catch (error: unknown) {
      console.error('Error loading scan logs:', error);
      // Optionally, log the specific error message if it exists
      // if (error instanceof Error) { console.error(error.message); }
    }
  };

  return (
    <div className="max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8">
      <div className="mb-6 flex flex-col sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Background Scanner Admin</h1>
          <p className="mt-1 text-sm text-gray-500">
            Manage automated background scanning of products
          </p>
        </div>
        <div className="mt-4 sm:mt-0">
          <Link 
            href="/"
            className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-gray-600 hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500"
          >
            <svg className="-ml-1 mr-2 h-5 w-5" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M9.707 16.707a1 1 0 01-1.414 0l-6-6a1 1 0 010-1.414l6-6a1 1 0 011.414 1.414L5.414 9H17a1 1 0 110 2H5.414l4.293 4.293a1 1 0 010 1.414z" clipRule="evenodd" />
            </svg>
            Back to Dashboard
          </Link>
        </div>
      </div>

      {/* Continuous Scanning Toggle Section */}
      <div className="bg-white shadow rounded-lg mb-6">
        <div className="px-4 py-5 sm:p-6">
          <h2 className="text-lg font-medium text-gray-900">Continuous Scanning Control</h2>
          <div className="mt-2 max-w-xl text-sm text-gray-500">
            <p>Toggle continuous background scanning of all products. When enabled, the system will continuously scan products one after another.</p>
          </div>
          <div className="mt-2">
            <div className="flex items-center">
              <div className={`h-3 w-3 rounded-full ${isActivelyScanningNow ? 'bg-green-500 animate-pulse' : 'bg-gray-300'} mr-2`}></div>
              <span className="text-sm font-medium text-gray-700">
                scanInProgress: <span className={isActivelyScanningNow ? 'text-green-600 font-bold' : 'text-red-600 font-bold'}>{isActivelyScanningNow ? "Yes" : "No"}</span>
              </span>
            </div>
          </div>
          <div className="mt-5 sm:flex sm:items-center">
            <div className="flex items-center">
              <button
                type="button"
                onClick={toggleContinuousScanning}
                disabled={toggleInProgress}
                className={`${scanningState 
                  ? 'bg-indigo-600 focus:ring-indigo-500' 
                  : 'bg-gray-200 focus:ring-indigo-500'} 
                  relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-offset-2`}
                aria-pressed={scanningState}
                aria-labelledby="continuous-scanning-label"
              >
                <span className="sr-only">Toggle continuous scanning</span>
                <span
                  aria-hidden="true"
                  className={`${scanningState ? 'translate-x-5' : 'translate-x-0'} 
                    pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out`}
                ></span>
              </button>
              <span className="ml-3 text-sm" id="continuous-scanning-label">
                {scanningState ? (
                  <span className="font-medium text-indigo-600">Active</span>
                ) : (
                  <span className="font-medium text-gray-500">Inactive</span>
                )}
              </span>
              
              {toggleInProgress && (
                <div className="ml-3">
                  <svg className="animate-spin h-5 w-5 text-indigo-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                </div>
              )}
            </div>
            
            {!scanningState && !isActivelyScanningNow && (
              <button 
                type="button"
                onClick={triggerManualScan}
                disabled={toggleInProgress || isActivelyScanningNow}
                className="ml-4 inline-flex items-center px-3 py-2 border border-transparent text-sm leading-4 font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <svg className="mr-2 -ml-1 h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
                Run Manual Scan
              </button>
            )}
            
            {/* Stop Scan Button - Only show when a manual scan is in progress (don't show during continuous scanning) */}
            {isActivelyScanningNow && !scanningState && (
              <button 
                type="button"
                onClick={stopScan}
                disabled={isStoppingInProgress}
                className="ml-4 inline-flex items-center px-3 py-2 border border-transparent text-sm leading-4 font-medium rounded-md text-white bg-red-600 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <svg className="mr-2 -ml-1 h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                </svg>
                {isStoppingInProgress ? 'Stopping...' : 'Stop Scan'}
              </button>
            )}
          </div>
          
          {statusMessage && (
            <div className={`mt-3 text-sm ${statusMessage.includes('Error') ? 'text-red-600' : 'text-green-600'}`}>
              {statusMessage}
            </div>
          )}
          
          <div className="mt-3 text-xs text-gray-500">
            <p className="font-semibold">Note:</p>
            <p>When continuous scanning is enabled, scans will automatically run one after another without any breaks. This will continuously update product prices in the background.</p>
          </div>
        </div>
      </div>

      {/* Scan Logs Section */}
      <div className="bg-white shadow rounded-lg overflow-hidden">
        <div className="px-4 py-5 border-b border-gray-200 sm:px-6 flex justify-between items-center">
          <div>
            <h3 className="text-lg leading-6 font-medium text-gray-900">
              Scan History
            </h3>
            <p className="mt-1 text-sm text-gray-500">
              Recent background scan logs
            </p>
          </div>
          <button
            onClick={fetchLogs}
            className="inline-flex items-center px-3 py-1.5 border border-transparent text-xs font-medium rounded text-indigo-700 bg-indigo-100 hover:bg-indigo-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
          >
            <svg className="-ml-0.5 mr-1.5 h-4 w-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M4 2a1 1 0 011 1v2.101a7.002 7.002 0 0111.601 2.566 1 1 0 11-1.885.666A5.002 5.002 0 005.999 7H9a1 1 0 010 2H4a1 1 0 01-1-1V3a1 1 0 011-1zm.008 9.057a1 1 0 011.276.61A5.002 5.002 0 0014.001 13H11a1 1 0 110-2h5a1 1 0 011 1v5a1 1 0 11-2 0v-2.101a7.002 7.002 0 01-11.601-2.566 1 1 0 01.61-1.276z" clipRule="evenodd" />
            </svg>
            Refresh
          </button>
        </div>
        {loading ? (
          <div className="px-4 py-16 sm:px-6 text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-indigo-500 mx-auto"></div>
            <p className="mt-2 text-sm text-gray-500">Loading logs...</p>
          </div>
        ) : error ? (
          <div className="px-4 py-5 sm:px-6">
            <div className="rounded-md bg-red-50 p-4">
              <div className="flex">
                <div className="flex-shrink-0">
                  <svg className="h-5 w-5 text-red-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                  </svg>
                </div>
                <div className="ml-3">
                  <h3 className="text-sm font-medium text-red-800">
                    Error loading logs
                  </h3>
                  <div className="mt-2 text-sm text-red-700">
                    <p>{error}</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        ) : logs.length === 0 ? (
          <div className="px-4 py-16 sm:px-6 text-center">
            <svg className="mx-auto h-12 w-12 text-gray-400" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
            </svg>
            <h3 className="mt-2 text-sm font-medium text-gray-900">No scan logs</h3>
            <p className="mt-1 text-sm text-gray-500">
              No background scans have been executed yet.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Time
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Mode
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Products
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Success/Failed
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Notifications
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Duration
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Message
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {logs.map((log, index) => (
                  <tr key={index} className={log.status === 'error' ? 'bg-red-50' : ''}>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {formatDate(log.timestamp)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                        log.status === 'completed' ? 'bg-green-100 text-green-800' : 
                        log.status === 'error' ? 'bg-red-100 text-red-800' : 'bg-yellow-100 text-yellow-800'
                      }`}>
                        {log.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {log.isContinuous ? 
                        <span className="text-indigo-600 font-medium">Continuous</span> : 
                        <span>Manual</span>
                      }
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {log.productsScanned || '-'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {log.successCount !== undefined && log.failureCount !== undefined ? 
                        `${log.successCount}/${log.failureCount}` : '-'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {log.notificationCount !== undefined ? log.notificationCount : '-'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {log.durationFormatted || '-'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {log.error || log.message || '-'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Info Section */}
      <div className="mt-6 bg-white shadow rounded-lg overflow-hidden">
        <div className="px-4 py-5 border-b border-gray-200 sm:px-6">
          <h3 className="text-lg leading-6 font-medium text-gray-900">
            Continuous Scanning Information
          </h3>
        </div>
        <div className="px-4 py-5 sm:p-6 text-sm text-gray-500">
          <p className="mb-4">
            <span className="font-semibold">How continuous scanning works:</span> When enabled, the system will automatically run scans one after another with a small pause between each scan cycle. This ensures your product prices stay up-to-date without manual intervention.
          </p>
          <p className="mb-4">
            <span className="font-semibold">Benefits:</span>
          </p>
          <ul className="list-disc ml-5 mt-1 mb-4">
            <li>Always up-to-date product prices</li>
            <li>Real-time price drop notifications</li>
            <li>No need to manually trigger scans</li>
            <li>Price history stays current</li>
          </ul>
          <p>
            <span className="font-semibold">Important note:</span> Continuous scanning will continue running in the background even if you close this page. To stop scanning, toggle the switch above to OFF.
          </p>
        </div>
      </div>
    </div>
  );
} 