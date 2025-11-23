'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';
import { useWalletClient, useAccount } from 'wagmi';
import { Client } from '@xmtp/browser-sdk';
import { createXMTPClient } from '@/lib/xmtp/client';

type XMTPClient = Awaited<ReturnType<typeof Client.create>> | null;

interface XMTPContextValue {
  client: XMTPClient;
  isLoading: boolean;
  error: Error | null;
  initialize: () => Promise<void>;
}

const XMTPContext = createContext<XMTPContextValue | undefined>(undefined);

export function XMTPProvider({ children }: { children: React.ReactNode }) {
  const [client, setClient] = useState<XMTPClient>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const { data: walletClient } = useWalletClient();
  const { address, isConnected } = useAccount();

  // Initialize XMTP client when wallet is connected
  const initialize = async () => {
    if (!walletClient || !isConnected) {
      setError(new Error('Wallet not connected'));
      return;
    }

    // If client already exists for this address, don't recreate
    if (client) {
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const xmtpClient = await createXMTPClient(walletClient);
      setClient(xmtpClient);
      console.log('✅ XMTP client initialized');
    } catch (err) {
      console.error('Failed to initialize XMTP client:', err);
      setError(err as Error);
    } finally {
      setIsLoading(false);
    }
  };

  // Reset client when wallet disconnects
  useEffect(() => {
    if (!isConnected) {
      setClient(null);
      setError(null);
    }
  }, [isConnected, address]);

  const value: XMTPContextValue = {
    client,
    isLoading,
    error,
    initialize,
  };

  return <XMTPContext.Provider value={value}>{children}</XMTPContext.Provider>;
}

export function useXMTP() {
  const context = useContext(XMTPContext);
  if (context === undefined) {
    throw new Error('useXMTP must be used within an XMTPProvider');
  }
  return context;
}
