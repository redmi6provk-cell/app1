import { Suspense } from 'react';
import LoginForm from '@/components/LoginForm'; // Import the new component

// Define a simple loading component for Suspense fallback
function Loading() {
  return (
    <div style={{ padding: '40px', borderRadius: '8px', boxShadow: '0 4px 12px rgba(0, 0, 0, 0.1)', backgroundColor: 'white', width: '100%', maxWidth: '400px', textAlign: 'center', color: '#555' }}>
      Loading...
    </div>
  );
}

// This remains a Server Component
export default function LoginPage() {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', backgroundColor: '#f0f2f5' }}>
      {/* Wrap the client component needing useSearchParams in Suspense */}
      <Suspense fallback={<Loading />}>
        <LoginForm />
      </Suspense>
    </div>
  );
} 