import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

// Define the path to the scan log file
const DATA_DIR = path.join(process.cwd(), 'data');
const LOG_FILE = path.join(DATA_DIR, 'background_scan_log.json');

export async function GET(_request: Request) {
  try {
    // Check if the log file exists
    if (!fs.existsSync(LOG_FILE)) {
      return NextResponse.json({
        logs: []
      });
    }
    
    // Read log file
    const logData = fs.readFileSync(LOG_FILE, 'utf8');
    
    try {
      const logs = JSON.parse(logData);
      return NextResponse.json({
        logs: Array.isArray(logs) ? logs : []
      });
    } catch (parseError) {
      console.error('Error parsing log file:', parseError);
      return NextResponse.json({
        logs: [],
        error: 'Error parsing log data'
      }, { status: 500 });
    }
  } catch (error: unknown) {
    console.error('Error reading scan logs:', error);
    const message = error instanceof Error ? error.message : 'Failed to read scan logs';
    return NextResponse.json({
      logs: [],
      error: message
    }, { status: 500 });
  }
} 