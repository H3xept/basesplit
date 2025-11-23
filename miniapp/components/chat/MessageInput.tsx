'use client';

import { useState, useRef, FormEvent } from 'react';
import { useMessages } from '@/hooks/useMessages';
import { useConversation } from '@/hooks/useConversation';
import { ContentTypeAttachment, type Attachment } from '@xmtp/content-type-remote-attachment';

export function MessageInput() {
  const [input, setInput] = useState('');
  const [isSending, setIsSending] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { sendMessage } = useMessages();
  const { conversation } = useConversation();

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();

    if (!input.trim() || isSending) return;

    setIsSending(true);
    try {
      await sendMessage(input.trim());
      setInput('');
    } catch (error) {
      console.error('Failed to send message:', error);
      alert('Failed to send message. Please try again.');
    } finally {
      setIsSending(false);
    }
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Check if it's an image
    if (!file.type.startsWith('image/')) {
      alert('Please select an image file');
      return;
    }

    // Check file size (limit to 10MB)
    if (file.size > 10 * 1024 * 1024) {
      alert('Image must be smaller than 10MB');
      return;
    }

    if (!conversation) {
      alert('No conversation available');
      return;
    }

    setIsSending(true);
    try {
      // Convert file to Uint8Array
      const arrayBuffer = await file.arrayBuffer();
      const uint8Array = new Uint8Array(arrayBuffer);

      // Create attachment object
      const attachment: Attachment = {
        filename: file.name,
        mimeType: file.type,
        data: uint8Array,
      };

      // Send attachment
      await conversation.send(attachment, ContentTypeAttachment);

      // Reset file input
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    } catch (error) {
      console.error('Failed to send image:', error);
      alert('Failed to send image. Please try again.');
    } finally {
      setIsSending(false);
    }
  };

  return (
    <div className="space-y-3">
      {/* File Upload Button */}
      <div className="flex gap-2">
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          capture="environment"
          onChange={handleFileSelect}
          className="hidden"
          id="receipt-upload"
          disabled={isSending}
        />
        <label
          htmlFor="receipt-upload"
          className={`flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-xl font-semibold transition-all duration-200 cursor-pointer ${
            isSending
              ? 'bg-gray-300 dark:bg-gray-700 text-gray-500 dark:text-gray-500 cursor-not-allowed'
              : 'bg-primary/10 dark:bg-primary-light/20 text-primary dark:text-primary-light hover:bg-primary/20 dark:hover:bg-primary-light/30 hover:scale-105'
          }`}
        >
          <span className="text-xl">📸</span>
          <span>Upload Receipt</span>
        </label>
      </div>

      {/* Text Input Form */}
      <form onSubmit={handleSubmit} className="flex gap-2">
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Type a message..."
          disabled={isSending}
          className="flex-1 px-4 py-3 rounded-xl border border-gray-200 dark:border-dark-border bg-gray-50 dark:bg-dark-hover text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-primary dark:focus:ring-primary-light transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
        />
        <button
          type="submit"
          disabled={!input.trim() || isSending}
          className={`px-6 py-3 rounded-xl font-semibold transition-all duration-200 ${
            !input.trim() || isSending
              ? 'bg-gray-300 dark:bg-gray-700 text-gray-500 dark:text-gray-500 cursor-not-allowed'
              : 'bg-gradient-to-r from-primary to-primary-light text-white hover:scale-105 hover:shadow-lg'
          }`}
        >
          {isSending ? (
            <span className="flex items-center gap-2">
              <span className="animate-spin">⏳</span>
              <span>Sending...</span>
            </span>
          ) : (
            <span className="text-xl">➤</span>
          )}
        </button>
      </form>

      {/* Hint Text */}
      <p className="text-xs text-center text-gray-500 dark:text-gray-500">
        Upload a receipt image for AI-powered bill splitting
      </p>
    </div>
  );
}
