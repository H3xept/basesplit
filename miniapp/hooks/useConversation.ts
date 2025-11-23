'use client';

import { useState, useEffect } from 'react';
import { useXMTP } from '@/contexts/XMTPContext';
import { getAgentConversation } from '@/lib/xmtp/client';

export function useConversation() {
  const { client } = useXMTP();
  const [conversation, setConversation] = useState<Awaited<ReturnType<typeof getAgentConversation>> | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    if (!client) {
      setConversation(null);
      return;
    }

    let isMounted = true;

    async function loadConversation() {
      setIsLoading(true);
      setError(null);

      try {
        const conv = await getAgentConversation(client!);
        if (isMounted) {
          setConversation(conv);
        }
      } catch (err) {
        console.error('Failed to load conversation:', err);
        if (isMounted) {
          setError(err as Error);
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    }

    loadConversation();

    return () => {
      isMounted = false;
    };
  }, [client]);

  return { conversation, isLoading, error };
}
