import fs from 'fs';
import path from 'path';

// Path to store scanner state
const DATA_DIR = path.join(process.cwd(), 'data');
const STATE_FILE = path.join(DATA_DIR, 'scanner_state.json');

// Default state
const DEFAULT_STATE = {
  isScanning: false,
  lastUpdated: new Date().toISOString(),
  lastScanId: null
};

// Ensure data directory exists
const ensureDataDir = () => {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
};

// Get current scanner state
export const getScannerState = (): { isScanning: boolean; lastUpdated: string; lastScanId: string | null } => {
  try {
    ensureDataDir();
    
    if (!fs.existsSync(STATE_FILE)) {
      // Initialize with default state if file doesn't exist
      fs.writeFileSync(STATE_FILE, JSON.stringify(DEFAULT_STATE, null, 2), 'utf8');
      return DEFAULT_STATE;
    }
    
    const stateData = fs.readFileSync(STATE_FILE, 'utf8');
    return JSON.parse(stateData);
  } catch (error) {
    console.error('Error reading scanner state:', error);
    return DEFAULT_STATE;
  }
};

// Set scanner state
export const setScannerState = (isScanning: boolean, lastScanId?: string | null): void => {
  try {
    ensureDataDir();
    
    const newState = {
      isScanning,
      lastUpdated: new Date().toISOString(),
      lastScanId: lastScanId || null
    };
    
    fs.writeFileSync(STATE_FILE, JSON.stringify(newState, null, 2), 'utf8');
  } catch (error) {
    console.error('Error updating scanner state:', error);
  }
};

// Check if scanner is currently active
export const isScanningActive = (): boolean => {
  const state = getScannerState();
  return state.isScanning;
};

// Generate a unique scan ID
export const generateScanId = (): string => {
  return Date.now().toString(36) + Math.random().toString(36).substring(2, 15);
}; 