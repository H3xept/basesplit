'use client';

import { useState, useEffect } from 'react';
import { useAccount, useWriteContract, useWaitForTransactionReceipt, useSwitchChain } from 'wagmi';
import { parseUnits } from 'viem';
import { base, baseSepolia } from 'wagmi/chains';
import { USDC_ADDRESS } from '@/lib/wagmi';
import { usdcAbi } from '@/lib/usdc-abi';
import type { LineItem } from '@/lib/db';
import { ConnectButton } from './ConnectButton';

interface BillSplitterProps {
  billId: string;
  items: LineItem[];
  payerAddress: string;
  totalAmount: number;
}

export function BillSplitter({
  billId,
  items,
  payerAddress,
  totalAmount,
}: BillSplitterProps) {
  const [selectedItems, setSelectedItems] = useState<Set<string>>(new Set());
  const [isPaying, setIsPaying] = useState(false);
  const [hasMounted, setHasMounted] = useState(false);

  const { address, isConnected, chain } = useAccount();
  const { switchChain } = useSwitchChain();

  // Prevent hydration mismatch by only showing connection state after mount
  useEffect(() => {
    setHasMounted(true);
  }, []);
  const { writeContract, data: hash, error } = useWriteContract();
  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({
    hash,
  });

  // Calculate total for selected items
  const selectedTotal = items
    .filter((item) => selectedItems.has(item.id))
    .reduce((sum, item) => sum + item.price, 0);

  // Toggle item selection
  const toggleItem = (itemId: string) => {
    setSelectedItems((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(itemId)) {
        newSet.delete(itemId);
      } else {
        newSet.add(itemId);
      }
      return newSet;
    });
  };

  // Handle payment
  const handlePay = async () => {
    console.log('handlePay called');
    console.log('address:', address);
    console.log('chain:', chain);
    console.log('selectedItems:', selectedItems);

    if (!address || !chain || selectedItems.size === 0) {
      console.log('Early return - missing requirements');
      return;
    }

    setIsPaying(true);

    try {
      const usdcAddress = USDC_ADDRESS[chain.id as keyof typeof USDC_ADDRESS];
      console.log('USDC Address:', usdcAddress);
      console.log('Chain ID:', chain.id);

      if (!usdcAddress) {
        alert('USDC not supported on this chain. Please switch to Base or Base Sepolia.');
        setIsPaying(false);
        return;
      }

      // Convert amount to USDC units (6 decimals)
      const amount = parseUnits(selectedTotal.toFixed(2), 6);
      console.log('Amount to transfer:', amount.toString());
      console.log('Payer address:', payerAddress);

      // Write contract
      writeContract({
        address: usdcAddress,
        abi: usdcAbi,
        functionName: 'transfer',
        args: [payerAddress as `0x${string}`, amount],
      });

      console.log('writeContract called successfully');
    } catch (err) {
      console.error('Payment error:', err);
      alert('Payment failed. Please try again.');
      setIsPaying(false);
    }
  };

  // Reset isPaying when transaction is confirmed or fails
  useEffect(() => {
    if (isConfirming || isSuccess) {
      setIsPaying(false);
    }
  }, [isConfirming, isSuccess]);

  // Log writeContract errors
  useEffect(() => {
    if (error) {
      console.error('writeContract error:', error);
      setIsPaying(false);
    }
  }, [error]);

  // Claim items when transaction is successful
  useEffect(() => {
    const claimItems = async () => {
      if (isSuccess && hash && address && selectedItems.size > 0) {
        try {
          console.log('[BillSplitter] Claiming items...', {
            itemIds: Array.from(selectedItems),
            claimedBy: address,
            txHash: hash,
          });

          const response = await fetch('/api/claim', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              itemIds: Array.from(selectedItems),
              claimedBy: address,
              txHash: hash,
            }),
          });

          if (!response.ok) {
            const errorText = await response.text();
            console.error('[BillSplitter] Failed to claim items:', errorText);
            console.error('[BillSplitter] Response status:', response.status);
          } else {
            const result = await response.json();
            console.log('[BillSplitter] Successfully claimed items:', result);
          }
        } catch (err) {
          console.error('[BillSplitter] Error claiming items:', err);
          if (err instanceof Error) {
            console.error('[BillSplitter] Error message:', err.message);
            console.error('[BillSplitter] Error stack:', err.stack);
          }
        }
      }
    };

    claimItems();
  }, [isSuccess, hash, address, selectedItems]);

  // Handle success
  if (isSuccess) {
    return (
      <div className="bg-white dark:bg-dark-card rounded-2xl shadow-2xl p-8 border border-gray-100 dark:border-dark-border animate-scale-in">
        <div className="text-center">
          <div className="text-7xl mb-6 animate-scale-in">✅</div>
          <h2 className="text-3xl font-bold mb-3 text-gray-900 dark:text-white">Payment Successful!</h2>
          <p className="text-lg text-gray-600 dark:text-gray-300 mb-6">
            You paid ${selectedTotal.toFixed(2)} USDC
          </p>
          <div className="bg-gray-50 dark:bg-dark-hover rounded-lg p-4 mb-6">
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-1">Transaction Hash</p>
            <p className="font-mono text-sm text-gray-700 dark:text-gray-300 break-all">
              {hash?.substring(0, 10)}...{hash?.substring(hash.length - 8)}
            </p>
          </div>
          <button
            onClick={() => window.location.reload()}
            className="px-8 py-3 bg-primary dark:bg-primary-light text-white rounded-lg hover:bg-opacity-90 font-semibold transition-all hover:scale-105 active:scale-95 shadow-md hover:shadow-lg"
          >
            Done
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white dark:bg-dark-card rounded-2xl shadow-2xl p-8 border border-gray-100 dark:border-dark-border transition-all duration-300">
      {/* Wallet Connection */}
      {!hasMounted || !isConnected ? (
        <div className="text-center py-12">
          <div className="text-5xl mb-4">🔐</div>
          <p className="text-xl text-gray-700 dark:text-gray-300 mb-6 font-medium">
            Connect your wallet to split this bill
          </p>
          <div className="flex justify-center">
            <ConnectButton />
          </div>
        </div>
      ) : !chain || (!USDC_ADDRESS[chain.id as keyof typeof USDC_ADDRESS]) ? (
        <div className="text-center py-12">
          <div className="text-5xl mb-4">🔄</div>
          <p className="text-xl text-gray-700 dark:text-gray-300 mb-3 font-medium">
            Please switch to a supported network
          </p>
          <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">
            {chain ? `You're on ${chain.name}. Please switch to:` : 'Your wallet is connected but chain not detected.'}
          </p>
          <div className="flex flex-col gap-3 max-w-xs mx-auto">
            <button
              onClick={() => switchChain({ chainId: base.id })}
              className="px-6 py-3 bg-blue-600 dark:bg-blue-700 text-white rounded-lg hover:bg-blue-700 dark:hover:bg-blue-600 font-medium transition-all hover:scale-105 active:scale-95 shadow-md hover:shadow-lg"
            >
              Switch to Base
            </button>
            <button
              onClick={() => switchChain({ chainId: baseSepolia.id })}
              className="px-6 py-3 bg-primary dark:bg-primary-light text-white rounded-lg hover:bg-opacity-90 font-medium transition-all hover:scale-105 active:scale-95 shadow-md hover:shadow-lg"
            >
              Switch to Base Sepolia (Testnet)
            </button>
          </div>
        </div>
      ) : (
        <>
          {/* Network Info */}
          <div className="mb-6 p-4 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-xl animate-slide-up">
            <div className="flex items-center justify-between text-sm">
              <span className="text-green-800 dark:text-green-300 font-medium">
                Connected to <strong>{chain.name}</strong>
              </span>
              <span className="text-green-600 dark:text-green-400 text-xl">✓</span>
            </div>
          </div>

          {/* Items List */}
          <div className="mb-6">
            <h2 className="text-2xl font-bold mb-6 text-gray-900 dark:text-white">Select Your Items</h2>
            <div className="space-y-3">
              {items.map((item) => {
                const isSelected = selectedItems.has(item.id);
                const isClaimed = Boolean(item.claimed_by);

                return (
                  <div
                    key={item.id}
                    className={`flex items-center justify-between p-5 rounded-xl border-2 transition-all duration-200 ${
                      isClaimed
                        ? 'bg-gray-50 dark:bg-gray-800/30 border-gray-200 dark:border-gray-700 opacity-50'
                        : isSelected
                        ? 'bg-primary/10 dark:bg-primary-light/20 border-primary dark:border-primary-light shadow-md'
                        : 'border-gray-200 dark:border-dark-border hover:border-primary/50 dark:hover:border-primary-light/50 cursor-pointer hover:shadow-md bg-white dark:bg-dark-hover'
                    }`}
                    onClick={() => !isClaimed && toggleItem(item.id)}
                  >
                    <div className="flex items-center gap-4">
                      <input
                        type="checkbox"
                        checked={isSelected}
                        disabled={isClaimed}
                        onChange={() => {}}
                        className="w-5 h-5 accent-primary"
                      />
                      <div>
                        <p className="font-semibold text-gray-900 dark:text-white">{item.description}</p>
                        {isClaimed && (
                          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                            Already claimed by{' '}
                            {item.claimed_by?.substring(0, 6)}...
                          </p>
                        )}
                      </div>
                    </div>
                    <p className="font-bold text-lg text-gray-900 dark:text-white">${item.price.toFixed(2)}</p>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Payment Summary */}
          <div className="border-t border-gray-200 dark:border-dark-border pt-6 mt-6">
            <div className="flex justify-between items-center mb-6 px-2">
              <span className="text-lg font-semibold text-gray-700 dark:text-gray-300">Your Total:</span>
              <span className="text-3xl font-bold text-gradient">
                ${selectedTotal.toFixed(2)}
              </span>
            </div>

            <button
              onClick={handlePay}
              disabled={selectedItems.size === 0 || isPaying || isConfirming}
              className="w-full py-5 bg-primary dark:bg-primary-light text-white rounded-xl font-bold text-lg hover:bg-opacity-90 disabled:bg-gray-300 dark:disabled:bg-gray-700 disabled:cursor-not-allowed disabled:text-gray-500 dark:disabled:text-gray-400 transition-all hover:scale-105 active:scale-95 shadow-lg hover:shadow-xl disabled:hover:scale-100"
            >
              {isPaying || isConfirming
                ? '⏳ Processing...'
                : selectedItems.size === 0
                ? 'Select items to pay'
                : `💳 Pay ${selectedTotal.toFixed(2)} USDC`}
            </button>

            <div className="mt-4 p-3 bg-gray-50 dark:bg-dark-hover rounded-lg">
              <p className="text-xs text-gray-500 dark:text-gray-400 text-center">
                Paying to: <span className="font-mono">{payerAddress.substring(0, 6)}...
                {payerAddress.substring(payerAddress.length - 4)}</span>
              </p>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
