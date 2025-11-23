'use client';

import { useState } from 'react';
import { useWalletClient } from 'wagmi';
import { revokeAllInstallations } from '@/lib/xmtp/revoke';

export default function RevokePage() {
  const { data: walletClient } = useWalletClient();
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [message, setMessage] = useState('');

  const handleRevoke = async () => {
    if (!walletClient) {
      setStatus('error');
      setMessage('Please connect your wallet first');
      return;
    }

    try {
      setStatus('loading');
      setMessage('Revoking installations...');

      await revokeAllInstallations(walletClient);

      setStatus('success');
      setMessage('✅ Successfully revoked all installations! You can now go back and reconnect.');
    } catch (error: any) {
      setStatus('error');
      setMessage(`❌ Error: ${error.message}`);
      console.error('Revoke error:', error);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-xl p-8 max-w-md w-full">
        <h1 className="text-3xl font-bold text-gray-900 mb-4">
          Revoke XMTP Installations
        </h1>

        <div className="mb-6 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
          <p className="text-sm text-yellow-800">
            ⚠️ <strong>Warning:</strong> This will revoke all existing XMTP installations
            for your wallet. Use this if you've hit the 10 installation limit.
          </p>
        </div>

        {!walletClient ? (
          <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
            <p className="text-sm text-blue-800">
              Please connect your wallet to revoke installations.
            </p>
          </div>
        ) : (
          <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-lg">
            <p className="text-sm text-green-800">
              ✓ Wallet connected: {walletClient.account.address.slice(0, 6)}...
              {walletClient.account.address.slice(-4)}
            </p>
          </div>
        )}

        <button
          onClick={handleRevoke}
          disabled={!walletClient || status === 'loading'}
          className="w-full bg-red-600 hover:bg-red-700 disabled:bg-gray-400 text-white font-semibold py-3 px-4 rounded-lg transition-colors duration-200"
        >
          {status === 'loading' ? 'Revoking...' : 'Revoke All Installations'}
        </button>

        {message && (
          <div
            className={`mt-4 p-4 rounded-lg ${
              status === 'success'
                ? 'bg-green-50 border border-green-200 text-green-800'
                : status === 'error'
                ? 'bg-red-50 border border-red-200 text-red-800'
                : 'bg-blue-50 border border-blue-200 text-blue-800'
            }`}
          >
            <p className="text-sm whitespace-pre-wrap">{message}</p>
          </div>
        )}

        {status === 'success' && (
          <div className="mt-6">
            <a
              href="/"
              className="block text-center bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 px-4 rounded-lg transition-colors duration-200"
            >
              Go Back to Home
            </a>
          </div>
        )}

        <div className="mt-6 text-xs text-gray-500">
          <p className="mb-2">
            <strong>What does this do?</strong>
          </p>
          <p>
            This removes all existing XMTP installations associated with your wallet,
            allowing you to create a fresh installation. This is necessary when you've
            reached the maximum of 10 installations.
          </p>
        </div>
      </div>
    </div>
  );
}
