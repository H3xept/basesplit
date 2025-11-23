'use client';

import { useXMTP } from '@/contexts/XMTPContext';
import { MessageList } from './MessageList';
import { MessageInput } from './MessageInput';

export function ChatPanel() {
  const { client, isLoading, error, initialize } = useXMTP();

  // Loading state
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center p-8">
        <div className="max-w-3xl w-full">
          <div className="bg-white dark:bg-dark-card rounded-2xl p-12 shadow-2xl border border-gray-100 dark:border-dark-border text-center animate-fade-in">
            <div className="text-6xl mb-4 animate-pulse">🔐</div>
            <h2 className="text-2xl font-bold mb-4 text-gray-900 dark:text-white">
              Connecting to XMTP
            </h2>
            <p className="text-gray-600 dark:text-gray-400 mb-4">
              Please sign the message in your wallet to enable secure messaging
            </p>
            <div className="inline-block h-2 w-48 bg-gray-200 dark:bg-dark-hover rounded-full overflow-hidden">
              <div className="h-full bg-gradient-to-r from-primary to-primary-light rounded-full animate-pulse" style={{ width: '60%' }}></div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center p-8">
        <div className="max-w-3xl w-full">
          <div className="bg-white dark:bg-dark-card rounded-2xl p-12 shadow-2xl border border-red-200 dark:border-red-900 text-center animate-fade-in">
            <div className="text-6xl mb-4">⚠️</div>
            <h2 className="text-2xl font-bold mb-4 text-red-600 dark:text-red-400">
              Connection Failed
            </h2>
            <p className="text-gray-600 dark:text-gray-400 mb-6">
              {error.message}
            </p>
            <button
              onClick={initialize}
              className="px-6 py-3 bg-primary hover:bg-primary/90 text-white font-semibold rounded-xl transition-all duration-200 hover:scale-105"
            >
              Try Again
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Chat interface
  if (client) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4 animate-fade-in">
        <div className="max-w-4xl w-full h-[85vh] flex flex-col">
          {/* Chat Header */}
          <div className="bg-white dark:bg-dark-card rounded-t-2xl p-6 shadow-lg border border-gray-100 dark:border-dark-border border-b-0">
            <div className="flex items-center gap-4">
              <div className="text-4xl">🤖</div>
              <div className="flex-1">
                <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
                  BaseSplit Agent
                </h2>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  Send a receipt to split the bill
                </p>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                <span className="text-sm text-gray-500 dark:text-gray-400">Online</span>
              </div>
            </div>
          </div>

          {/* Messages Container */}
          <div className="flex-1 bg-white dark:bg-dark-card border-x border-gray-100 dark:border-dark-border overflow-hidden">
            <MessageList />
          </div>

          {/* Message Input */}
          <div className="bg-white dark:bg-dark-card rounded-b-2xl p-4 shadow-lg border border-gray-100 dark:border-dark-border border-t-0">
            <MessageInput />
          </div>
        </div>
      </div>
    );
  }

  return null;
}
