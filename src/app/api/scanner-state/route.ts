import { NextRequest, NextResponse } from "next/server";
import { getScannerState } from '@/utils/scannerState';
import { getScanInProgressStatus } from '@/app/api/background-scan/route';

export async function GET(_request: NextRequest) {
  try {
    const state = getScannerState();
    const isActivelyScanningNow = getScanInProgressStatus();
    
    return NextResponse.json({
      success: true,
      isScanning: state.isScanning,
      lastUpdated: state.lastUpdated,
      isActivelyScanningNow
    });
  } catch (error: unknown) {
    console.error('Error getting scanner state:', error);
    const message = error instanceof Error ? error.message : 'Failed to get scanner state';
    return NextResponse.json(
      { error: message },
      { status: 500 }
    );
  }
} 