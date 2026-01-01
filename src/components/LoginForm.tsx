'use client';

import { useState, FormEvent } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';

export default function LoginForm() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const searchParams = useSearchParams(); // This hook needs Suspense

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setError('');
    setLoading(true);

    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password }),
      });

      if (response.ok) {
        // If redirect param exists, go there, otherwise go to home
        const redirectUrl = searchParams.get('redirect') || '/';
        router.push(redirectUrl);
        router.refresh(); // Refresh router state to update layout/session
      } else {
        const data = await response.json();
        setError(data.message || 'Failed to login. Please check your credentials.');
      }
    } catch (_error) {
      setError('An error occurred. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ padding: '40px', borderRadius: '8px', boxShadow: '0 4px 12px rgba(0, 0, 0, 0.1)', backgroundColor: 'white', width: '100%', maxWidth: '400px' }}>
      <h1 style={{ textAlign: 'center', marginBottom: '24px', color: '#333' }}>Login</h1>
      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
        <div>
          <label htmlFor="username" style={{ display: 'block', marginBottom: '8px', color: '#555' }}>Username</label>
          <input
            id="username"
            type="text"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            required
            style={{ width: '100%', padding: '10px', borderRadius: '4px', border: '1px solid #ccc', color: '#333' }}
          />
        </div>
        <div>
          <label htmlFor="password" style={{ display: 'block', marginBottom: '8px', color: '#555' }}>Password</label>
          <input
            id="password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            style={{ width: '100%', padding: '10px', borderRadius: '4px', border: '1px solid #ccc', color: '#333' }}
          />
        </div>
        {error && <p style={{ color: 'red', textAlign: 'center', margin: '0' }}>{error}</p>}
        <button 
          type="submit" 
          disabled={loading}
          style={{
            padding: '12px', 
            borderRadius: '4px', 
            border: 'none', 
            backgroundColor: loading ? '#80b5f9' : '#0070f3', 
            color: 'white', 
            cursor: loading ? 'not-allowed' : 'pointer', 
            fontSize: '16px',
            transition: 'background-color 0.2s'
          }}
          onMouseOver={(e) => !loading && (e.currentTarget.style.backgroundColor = '#005bb5')}
          onMouseOut={(e) => !loading && (e.currentTarget.style.backgroundColor = '#0070f3')}
        >
          {loading ? 'Logging in...' : 'Login'}
        </button>
      </form>
    </div>
  );
} 