'use client';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { WagmiProvider } from 'wagmi';
import { config } from '@/lib/wagmi';
import { useState } from 'react';
import { XMTPProvider } from '@/contexts/XMTPContext';

export function Providers({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            retry: 3, // Retry failed queries up to 3 times
            retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
            staleTime: 10_000, // Data is fresh for 10 seconds
            refetchOnWindowFocus: false, // Don't refetch when window regains focus
            refetchOnMount: false, // Don't refetch on component mount if data exists
          },
          mutations: {
            retry: 2, // Retry mutations up to 2 times
            retryDelay: 1000,
          },
        },
      })
  );

  return (
    <WagmiProvider config={config}>
      <QueryClientProvider client={queryClient}>
        <XMTPProvider>{children}</XMTPProvider>
      </QueryClientProvider>
    </WagmiProvider>
  );
}
