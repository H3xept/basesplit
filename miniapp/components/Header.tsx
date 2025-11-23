'use client';

import Link from 'next/link';
import { WalletButton } from './WalletButton';

export function Header() {
  return (
    <header className="bg-white border-b border-gray-200 sticky top-0 z-40">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          {/* Logo/Brand */}
          <Link href="/" className="flex items-center">
            <h1 className="text-2xl font-bold text-gray-900">
              BaseSplit <span className="text-primary">💸</span>
            </h1>
          </Link>

          {/* Wallet Button */}
          <WalletButton />
        </div>
      </div>
    </header>
  );
}
