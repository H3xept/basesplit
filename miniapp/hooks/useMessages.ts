'use client';

import { useState, useEffect, useCallback } from 'react';
import { useXMTP } from '@/contexts/XMTPContext';
import { useConversation } from './useConversation';
import { streamMessages } from '@/lib/xmtp/client';

export interface Message {
  id: string;
  senderInboxId: string;
  conversationId: string;
  content: any;
  contentType: any;
  sentAt: Date;
  isSelf: boolean;
}

export function useMessages() {
  const { client } = useXMTP();
  const { conversation } = useConversation();
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  // Load existing messages from the conversation
  useEffect(() => {
    if (!conversation || !client) {
      setMessages([]);
      return;
    }

    let isMounted = true;

    async function loadMessages() {
      setIsLoading(true);
      setError(null);

      try {
        const msgs = await conversation.messages();
        if (isMounted) {
          const formattedMessages = msgs.map((msg) => ({
            id: msg.id,
            senderInboxId: msg.senderInboxId,
            conversationId: msg.conversationId,
            content: msg.content,
            contentType: msg.contentType,
            sentAt: new Date(Number(msg.sentAtNs) / 1_000_000),
            isSelf: msg.senderInboxId === client?.inboxId,
          }));
          setMessages(formattedMessages);
        }
      } catch (err) {
        console.error('Failed to load messages:', err);
        if (isMounted) {
          setError(err as Error);
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    }

    loadMessages();

    return () => {
      isMounted = false;
    };
  }, [conversation, client]);

  // Stream new messages
  useEffect(() => {
    if (!client) return;

    let isMounted = true;

    const setupStream = async () => {
      try {
        await streamMessages(
          client,
          (message) => {
            if (isMounted) {
              const formattedMessage: Message = {
                id: message.id,
                senderInboxId: message.senderInboxId,
                conversationId: message.conversationId,
                content: message.content,
                contentType: message.contentType,
                sentAt: new Date(Number(message.sentAtNs) / 1_000_000),
                isSelf: message.senderInboxId === client.inboxId,
              };
              setMessages((prev) => [...prev, formattedMessage]);
            }
          },
          (error) => {
            console.error('Stream error:', error);
            if (isMounted) {
              setError(error);
            }
          }
        );
      } catch (err) {
        console.error('Failed to setup message stream:', err);
      }
    };

    setupStream();

    return () => {
      isMounted = false;
    };
  }, [client]);

  // Send a message
  const sendMessage = useCallback(
    async (content: string) => {
      if (!conversation) {
        throw new Error('No conversation available');
      }

      try {
        // Optimistic update
        const tempMessage: Message = {
          id: `temp-${Date.now()}`,
          senderInboxId: client?.inboxId || '',
          conversationId: conversation.id,
          content,
          contentType: { typeId: 'text' },
          sentAt: new Date(),
          isSelf: true,
        };
        setMessages((prev) => [...prev, tempMessage]);

        // Send the message
        await conversation.send(content);
      } catch (err) {
        console.error('Failed to send message:', err);
        // Remove optimistic message on error
        setMessages((prev) => prev.filter((msg) => !msg.id.startsWith('temp-')));
        throw err;
      }
    },
    [conversation, client]
  );

  return {
    messages,
    isLoading,
    error,
    sendMessage,
  };
}
