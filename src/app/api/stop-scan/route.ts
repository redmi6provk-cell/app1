import { NextRequest, NextResponse } from "next/server";
import { requestScannerStop } from '@/app/api/background-scan/route';

export async function POST(_request: NextRequest) {
  try {
    // Request scanner to stop
    requestScannerStop();
    
    return NextResponse.json({
      success: true,
      message: 'Stop request sent to scanner'
    });
  } catch (error: unknown) {
    console.error('Error stopping scan:', error);
    const message = error instanceof Error ? error.message : 'Failed to stop scanner';
    return NextResponse.json(
      { error: message },
      { status: 500 }
    );
  }
} 