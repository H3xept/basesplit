'use client';

import { useAccount, useConnect, useDisconnect } from 'wagmi';
import { useState, useRef, useEffect } from 'react';

export function WalletButton() {
  const { address, isConnected } = useAccount();
  const { connect, connectors } = useConnect();
  const { disconnect } = useDisconnect();
  const [isOpen, setIsOpen] = useState(false);
  const [hasMounted, setHasMounted] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Prevent hydration mismatch
  useEffect(() => {
    setHasMounted(true);
  }, []);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  // Don't render wallet-specific UI until mounted on client
  if (!hasMounted) {
    return (
      <div className="relative">
        <button className="px-4 py-2 bg-gray-100 dark:bg-dark-hover text-gray-400 dark:text-gray-500 rounded-lg text-sm font-medium cursor-wait transition-colors">
          Loading...
        </button>
      </div>
    );
  }

  if (isConnected && address) {
    return (
      <div className="relative" ref={dropdownRef}>
        <button
          onClick={() => setIsOpen(!isOpen)}
          className="px-4 py-2 bg-green-50 dark:bg-green-900/30 text-green-700 dark:text-green-400 rounded-lg hover:bg-green-100 dark:hover:bg-green-900/40 transition-all font-mono text-sm font-medium border border-green-200 dark:border-green-800 hover:scale-105 active:scale-95"
        >
          {address.substring(0, 6)}...{address.substring(address.length - 4)}
        </button>

        {isOpen && (
          <div className="absolute right-0 mt-2 w-48 bg-white dark:bg-dark-card rounded-lg shadow-lg border border-gray-200 dark:border-dark-border py-2 z-50 animate-scale-in">
            <div className="px-4 py-2 border-b border-gray-100 dark:border-dark-border">
              <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Connected</p>
              <p className="font-mono text-xs break-all text-gray-700 dark:text-gray-300">{address}</p>
            </div>
            <button
              onClick={() => {
                disconnect();
                setIsOpen(false);
              }}
              className="w-full text-left px-4 py-2 text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
            >
              Disconnect
            </button>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="px-4 py-2 bg-primary dark:bg-primary-light text-white rounded-lg hover:bg-opacity-90 transition-all text-sm font-medium hover:scale-105 active:scale-95 shadow-md hover:shadow-lg"
      >
        Connect Wallet
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-2 w-56 bg-white dark:bg-dark-card rounded-lg shadow-lg border border-gray-200 dark:border-dark-border py-2 z-50 animate-scale-in">
          <div className="px-4 py-2 border-b border-gray-100 dark:border-dark-border">
            <p className="text-sm font-medium text-gray-700 dark:text-gray-300">Select Wallet</p>
          </div>
          {connectors.map((connector) => (
            <button
              key={connector.id}
              onClick={() => {
                connect({ connector });
                setIsOpen(false);
              }}
              className="w-full text-left px-4 py-3 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-dark-hover transition-colors"
            >
              {connector.name}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
