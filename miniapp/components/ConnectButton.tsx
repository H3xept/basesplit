'use client';

import { useAccount, useConnect, useDisconnect } from 'wagmi';
import { useState, useEffect } from 'react';

export function ConnectButton() {
  const { address, isConnected } = useAccount();
  const { connect, connectors } = useConnect();
  const { disconnect } = useDisconnect();
  const [hasMounted, setHasMounted] = useState(false);

  // Prevent hydration mismatch
  useEffect(() => {
    setHasMounted(true);
  }, []);

  // Don't render wallet-specific UI until mounted on client
  if (!hasMounted) {
    return (
      <div className="flex flex-col gap-3 w-full max-w-xs">
        <div className="px-6 py-3 bg-gray-100 dark:bg-dark-hover text-gray-400 dark:text-gray-500 rounded-lg text-center transition-colors">
          Loading...
        </div>
      </div>
    );
  }

  if (isConnected && address) {
    return (
      <div className="flex flex-col gap-3 items-center">
        <div className="px-4 py-2 bg-green-50 dark:bg-green-900/30 border border-green-200 dark:border-green-800 rounded-lg">
          <p className="text-sm text-green-700 dark:text-green-400 mb-1">Connected</p>
          <p className="font-mono text-sm text-green-900 dark:text-green-300">
            {address.substring(0, 6)}...{address.substring(address.length - 4)}
          </p>
        </div>
        <button
          onClick={() => disconnect()}
          className="px-4 py-2 text-sm text-red-600 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300 underline transition-colors"
        >
          Disconnect
        </button>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3 w-full max-w-xs">
      {connectors.map((connector) => (
        <button
          key={connector.id}
          onClick={() => connect({ connector })}
          className="px-6 py-3 bg-primary dark:bg-primary-light text-white rounded-lg hover:bg-opacity-90 font-medium transition-all hover:scale-105 active:scale-95 shadow-md hover:shadow-lg"
        >
          Connect {connector.name}
        </button>
      ))}
    </div>
  );
}
