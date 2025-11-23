'use client';

import { useEffect, useRef } from 'react';
import { useMessages } from '@/hooks/useMessages';
import { useConversation } from '@/hooks/useConversation';

export function MessageList() {
  const { messages, isLoading } = useMessages();
  const { conversation } = useConversation();
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Loading state
  if (isLoading) {
    return (
      <div className="h-full flex items-center justify-center p-8">
        <div className="text-center">
          <div className="text-4xl mb-4 animate-pulse">💬</div>
          <p className="text-gray-500 dark:text-gray-400">Loading messages...</p>
        </div>
      </div>
    );
  }

  // Empty state
  if (!conversation || messages.length === 0) {
    return (
      <div className="h-full flex items-center justify-center p-8">
        <div className="text-center max-w-md">
          <div className="text-6xl mb-4">📸</div>
          <h3 className="text-xl font-bold mb-3 text-gray-900 dark:text-white">
            Send Your First Receipt
          </h3>
          <p className="text-gray-600 dark:text-gray-400 mb-6">
            Upload a receipt image and our AI will automatically split the bill for you
          </p>
          <div className="bg-primary/10 dark:bg-primary-light/20 rounded-xl p-4 text-left">
            <p className="text-sm text-gray-700 dark:text-gray-300">
              <strong>Tip:</strong> Make sure the receipt is clear and all items are visible for best results
            </p>
          </div>
        </div>
      </div>
    );
  }

  // Filter out user-facing messages only
  const userMessages = messages.filter((message) => {
    const contentType = message.contentType?.typeId || 'text';
    // Only show text, attachment, and remoteAttachment messages
    return contentType === 'text' || contentType === 'attachment' || contentType === 'remoteAttachment';
  });

  // Messages list
  return (
    <div className="h-full overflow-y-auto p-6 space-y-4">
      {userMessages.map((message) => {
        const isAgent = !message.isSelf;
        const contentType = message.contentType?.typeId || 'text';

        // Format message content based on type
        let displayContent: React.ReactNode;

        if (contentType === 'text') {
          // Regular text message
          displayContent = (
            <p className="whitespace-pre-wrap break-words">
              {String(message.content)}
            </p>
          );
        } else if (contentType === 'attachment' || contentType === 'remoteAttachment') {
          // Image attachment
          displayContent = (
            <div className="flex items-center gap-2">
              <span className="text-2xl">📎</span>
              <span>Receipt image</span>
            </div>
          );
        } else {
          // Fallback (shouldn't reach here due to filter)
          displayContent = (
            <p className="text-gray-500 italic">
              Message content unavailable
            </p>
          );
        }

        return (
          <div
            key={message.id}
            className={`flex ${isAgent ? 'justify-start' : 'justify-end'} animate-slide-up`}
          >
            <div
              className={`max-w-[75%] rounded-2xl p-4 ${
                isAgent
                  ? 'bg-gray-100 dark:bg-dark-hover text-gray-900 dark:text-white'
                  : 'bg-gradient-to-r from-primary to-primary-light text-white'
              } shadow-md`}
            >
              {/* Agent avatar */}
              {isAgent && (
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-xl">🤖</span>
                  <span className="text-xs font-semibold text-gray-600 dark:text-gray-400">
                    BaseSplit Agent
                  </span>
                </div>
              )}

              {/* Message content */}
              <div className={`text-sm ${isAgent ? '' : 'text-white'}`}>
                {displayContent}
              </div>

              {/* Timestamp */}
              <div
                className={`text-xs mt-2 ${
                  isAgent
                    ? 'text-gray-500 dark:text-gray-500'
                    : 'text-white/70'
                }`}
              >
                {message.sentAt.toLocaleTimeString([], {
                  hour: '2-digit',
                  minute: '2-digit',
                })}
              </div>
            </div>
          </div>
        );
      })}
      <div ref={messagesEndRef} />
    </div>
  );
}
