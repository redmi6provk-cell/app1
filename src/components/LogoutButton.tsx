'use client';

import { useAuth } from '@/lib/useAuth';

export function LogoutButton() {
  const { logout } = useAuth();
  
  return (
    <button
      onClick={logout}
      style={{
        padding: '8px 16px',
        borderRadius: '4px',
        border: 'none',
        backgroundColor: '#f44336',
        color: 'white',
        cursor: 'pointer',
        fontSize: '14px',
      }}
    >
      Logout
    </button>
  );
} 