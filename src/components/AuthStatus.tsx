'use client';

import { useState, useEffect } from 'react';

interface PlatformAuthStatus {
  authenticated: boolean;
  message: string;
}

interface AuthStatusData {
  success: boolean;
  status: {
    amazon: PlatformAuthStatus;
    myntra: PlatformAuthStatus;
    flipkart: PlatformAuthStatus;
  };
}

export default function AuthStatus() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [authStatus, setAuthStatus] = useState<AuthStatusData | null>(null);

  useEffect(() => {
    const checkAuthStatus = async () => {
      try {
        setLoading(true);
        setError('');
        
        const response = await fetch('/api/auth-status');
        if (!response.ok) {
          throw new Error('Failed to fetch authentication status');
        }
        
        const data = await response.json();
        setAuthStatus(data);
      } catch (err: unknown) {
        console.error('Error checking auth status:', err);
        const message = err instanceof Error ? err.message : 'Failed to check authentication status';
        setError(message);
      } finally {
        setLoading(false);
      }
    };
    
    checkAuthStatus();
  }, []);

  if (loading) {
    return (
      <div className="bg-gray-50 rounded-lg p-4 animate-pulse">
        <div className="h-4 bg-gray-200 rounded w-1/2 mb-3"></div>
        <div className="h-4 bg-gray-200 rounded w-3/4"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-700 text-sm">
        <div className="font-medium">Authentication status check failed</div>
        <div>{error}</div>
      </div>
    );
  }

  if (!authStatus) {
    return null;
  }

  return (
    <div className="bg-white rounded-lg shadow-sm overflow-hidden">
      <div className="bg-gradient-to-r from-gray-50 to-gray-100 px-4 py-3 border-b">
        <h3 className="text-sm font-medium text-gray-700">Platform Authentication Status</h3>
      </div>
      
      <div className="divide-y">
        {Object.entries(authStatus.status).map(([platform, status]) => (
          <div key={platform} className="px-4 py-3 flex items-center justify-between">
            <div>
              <span className="text-sm font-medium capitalize">{platform}</span>
              <p className="text-xs text-gray-500 mt-0.5">{status.message}</p>
            </div>
            
            <div>
              {status.authenticated ? (
                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                  Authenticated
                </span>
              ) : (
                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                  No Auth
                </span>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
} 