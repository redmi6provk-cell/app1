import { NextResponse } from 'next/server';
import { areAmazonCookiesValid } from '@/utils/amazonAuth';

export async function GET() {
  try {
    // Check Amazon authentication status
    const isAmazonAuthenticated = areAmazonCookiesValid();
    
    return NextResponse.json({
      success: true,
      status: {
        amazon: {
          authenticated: isAmazonAuthenticated,
          message: isAmazonAuthenticated 
            ? 'Amazon authentication is active and cookies are valid' 
            : 'Amazon authentication is not configured or cookies have expired'
        },
        // Add other platforms as needed
        myntra: {
          authenticated: false, // No auth needed for Myntra
          message: 'Myntra does not require authentication'
        },
        flipkart: {
          authenticated: false, // No auth needed for Flipkart yet
          message: 'Flipkart does not require authentication'
        }
      }
    });
    
  } catch (error: unknown) {
    console.error('Auth status check error:', error);
    const message = error instanceof Error ? error.message : 'Failed to check authentication status';
    return NextResponse.json(
      { error: message },
      { status: 500 }
    );
  }
} 