'use client';

import Link from 'next/link';
import Image from 'next/image';
import { WalletButton } from './WalletButton';
import { useTheme } from './ThemeProvider';

export function Header() {
  const { theme, toggleTheme } = useTheme();

  return (
    <header className="bg-[#F5F0E6] dark:bg-dark-card border-b border-[#E5DFD0] dark:border-dark-border sticky top-0 z-40 backdrop-blur-sm bg-opacity-90 dark:bg-opacity-90 transition-colors duration-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          {/* Logo/Brand */}
          <Link href="/" className="flex items-center gap-3 group">
            <Image
              src="/assets/hashitout.png"
              alt="HashItOut Logo"
              width={40}
              height={40}
              className="transition-all duration-200 group-hover:scale-105"
            />
            <h1 className="text-2xl font-bold transition-all duration-200 group-hover:scale-105" style={{ textShadow: '0 1px 2px rgba(0, 0, 0, 0.1)' }}>
              <span className="text-[#5A3A1A] dark:text-[#8B6F47]">Hash</span>
              <span className="text-[#F4A259]">It</span>
              <span className="text-[#5A3A1A] dark:text-[#8B6F47]">Out</span>
            </h1>
          </Link>

          <div className="flex items-center gap-3">
            {/* Theme Toggle Button */}
            <button
              onClick={toggleTheme}
              className="p-2 rounded-lg bg-[#E5DFD0] dark:bg-dark-hover hover:bg-[#D5CFBF] dark:hover:bg-dark-border transition-all duration-200 hover:scale-105 active:scale-95"
              aria-label="Toggle theme"
            >
              {theme === 'light' ? (
                <svg className="w-5 h-5 text-[#5A3A1A]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
                </svg>
              ) : (
                <svg className="w-5 h-5 text-[#F4A259]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
                </svg>
              )}
            </button>

            {/* Wallet Button */}
            <WalletButton />
          </div>
        </div>
      </div>
    </header>
  );
}
