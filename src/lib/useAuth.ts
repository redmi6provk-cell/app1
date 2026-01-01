'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

export function useAuth() {
  const [isLoggedIn, setIsLoggedIn] = useState<boolean | null>(null);
  const router = useRouter();

  useEffect(() => {
    // Check if we're on the client side
    if (typeof window !== 'undefined') {
      // Simple way to check if user might be logged in
      // This isn't foolproof but works with our middleware
      const notRedirected = !window.location.pathname.includes('/login');
      setIsLoggedIn(notRedirected);
    }
  }, []);

  const logout = async () => {
    try {
      const res = await fetch('/api/auth/logout', { method: 'POST' });
      if (res.ok) {
        router.push('/login');
        router.refresh();
      }
    } catch (error) {
      console.error('Logout failed', error);
    }
  };

  return { isLoggedIn, logout };
} 