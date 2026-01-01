'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { LogoutButton } from './LogoutButton';
import { useState } from 'react';

export default function Navigation() {
  const pathname = usePathname();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  // User's name to display in the header
  const userName = "Vinod"; // Replace with the actual user name or fetch from auth context
  
  // Don't render navigation on the login page
  if (pathname === '/login') {
    return null;
  }
  
  const isActive = (path: string) => {
    return pathname === path ? 'bg-indigo-800 text-white' : 'text-gray-300 hover:bg-indigo-700 hover:text-white';
  };
  
  const toggleMobileMenu = () => {
    setMobileMenuOpen(!mobileMenuOpen);
  };
  
  return (
    <nav className="bg-indigo-900">
      <div className="max-w-7xl mx-auto px-4">
        {/* Desktop navigation */}
        <div className="flex items-center justify-between h-16">
          <div className="flex items-center">
          <div className="flex-shrink-0">
            <span className="text-white font-bold text-xl">Price Drop Monitor</span>
          </div>
            
            {/* Desktop menu */}
            <div className="hidden md:flex md:ml-10">
              <div className="flex items-baseline space-x-4">
                <Link href="/" className={`px-3 py-2 rounded-md text-sm font-medium ${isActive('/')}`}>
                  Dashboard
                </Link>
                <Link href="/products" className={`px-3 py-2 rounded-md text-sm font-medium ${isActive('/products')}`}>
                  Products
                </Link>
                <Link href="/scanner" className={`px-3 py-2 rounded-md text-sm font-medium ${isActive('/scanner')}`}>
                  Scanner
                </Link>
                <Link href="/admin/scanner" className={`px-3 py-2 rounded-md text-sm font-medium ${isActive('/admin/scanner')}`}>
                  Auto Scan
                </Link>
              </div>
            </div>
          </div>
          
          <div className="flex items-center">
            {/* User name display */}
            <div className="mr-4">
              <div className="bg-white px-6 py-2 rounded-lg text-indigo-900 font-medium">
                {userName}
              </div>
            </div>
            
            {/* Logout button on desktop */}
            <div className="hidden md:block">
              <LogoutButton />
            </div>
          
          {/* Mobile menu button */}
          <div className="md:hidden">
            <button 
              onClick={toggleMobileMenu}
              className="inline-flex items-center justify-center p-2 rounded-md text-gray-300 hover:text-white hover:bg-indigo-700 focus:outline-none"
              aria-expanded="false"
            >
              <span className="sr-only">Open main menu</span>
              {/* Icon when menu is closed */}
              <svg
                className={`${mobileMenuOpen ? 'hidden' : 'block'} h-6 w-6`}
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                aria-hidden="true"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  d="M4 6h16M4 12h16M4 18h16"
                />
              </svg>
              {/* Icon when menu is open */}
              <svg
                className={`${mobileMenuOpen ? 'block' : 'hidden'} h-6 w-6`}
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                aria-hidden="true"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            </button>
            </div>
          </div>
        </div>
        
        {/* Mobile menu, show/hide based on state */}
        <div className={`${mobileMenuOpen ? 'block' : 'hidden'} md:hidden`}>
          <div className="px-2 pt-2 pb-3 space-y-1 sm:px-3">
            <Link 
              href="/" 
              className={`block px-3 py-2 rounded-md text-base font-medium ${isActive('/')}`}
              onClick={() => setMobileMenuOpen(false)}
            >
              Dashboard
            </Link>
            <Link 
              href="/products" 
              className={`block px-3 py-2 rounded-md text-base font-medium ${isActive('/products')}`}
              onClick={() => setMobileMenuOpen(false)}
            >
              Products
            </Link>
            <Link 
              href="/scanner" 
              className={`block px-3 py-2 rounded-md text-base font-medium ${isActive('/scanner')}`}
              onClick={() => setMobileMenuOpen(false)}
            >
              Scanner
            </Link>
            <Link 
              href="/admin/scanner" 
              className={`block px-3 py-2 rounded-md text-base font-medium ${isActive('/admin/scanner')}`}
              onClick={() => setMobileMenuOpen(false)}
            >
              Auto Scan
            </Link>
            <div className="mt-4">
              <LogoutButton />
            </div>
          </div>
        </div>
      </div>
    </nav>
  );
} 