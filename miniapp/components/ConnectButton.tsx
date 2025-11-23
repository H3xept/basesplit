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
        <div className="px-6 py-3 bg-gray-100 text-gray-400 rounded-lg text-center">
          Loading...
        </div>
      </div>
    );
  }

  if (isConnected && address) {
    return (
      <div className="flex flex-col gap-3 items-center">
        <div className="px-4 py-2 bg-gray-100 rounded-lg">
          <p className="text-sm text-gray-600 mb-1">Connected</p>
          <p className="font-mono text-sm">
            {address.substring(0, 6)}...{address.substring(address.length - 4)}
          </p>
        </div>
        <button
          onClick={() => disconnect()}
          className="px-4 py-2 text-sm text-red-600 hover:text-red-700 underline"
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
          className="px-6 py-3 bg-primary text-white rounded-lg hover:bg-opacity-90 font-medium transition-all"
        >
          Connect {connector.name}
        </button>
      ))}
    </div>
  );
}
