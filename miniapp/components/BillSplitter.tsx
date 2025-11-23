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
            console.error('Failed to claim items:', await response.text());
          }
        } catch (err) {
          console.error('Error claiming items:', err);
        }
      }
    };

    claimItems();
  }, [isSuccess, hash, address, selectedItems]);

  // Handle success
  if (isSuccess) {
    return (
      <div className="bg-white rounded-lg shadow-md p-6">
        <div className="text-center">
          <div className="text-6xl mb-4">✅</div>
          <h2 className="text-2xl font-bold mb-2">Payment Successful!</h2>
          <p className="text-gray-600 mb-4">
            You paid ${selectedTotal.toFixed(2)} USDC
          </p>
          <p className="text-sm text-gray-500">
            Transaction: {hash?.substring(0, 10)}...{hash?.substring(hash.length - 8)}
          </p>
          <button
            onClick={() => window.location.reload()}
            className="mt-4 px-6 py-2 bg-primary text-white rounded-lg hover:bg-opacity-90"
          >
            Done
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow-md p-6">
      {/* Wallet Connection */}
      {!hasMounted || !isConnected ? (
        <div className="text-center py-8">
          <p className="text-gray-600 mb-4">
            Connect your wallet to split this bill
          </p>
          <div className="flex justify-center">
            <ConnectButton />
          </div>
        </div>
      ) : !chain || (!USDC_ADDRESS[chain.id as keyof typeof USDC_ADDRESS]) ? (
        <div className="text-center py-8">
          <p className="text-gray-600 mb-4">
            Please switch to a supported network
          </p>
          <p className="text-sm text-gray-500 mb-4">
            {chain ? `You're on ${chain.name}. Please switch to:` : 'Your wallet is connected but chain not detected.'}
          </p>
          <div className="flex flex-col gap-3 max-w-xs mx-auto">
            <button
              onClick={() => switchChain({ chainId: base.id })}
              className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium"
            >
              Switch to Base
            </button>
            <button
              onClick={() => switchChain({ chainId: baseSepolia.id })}
              className="px-6 py-3 bg-primary text-white rounded-lg hover:bg-opacity-90 font-medium"
            >
              Switch to Base Sepolia (Testnet)
            </button>
          </div>
        </div>
      ) : (
        <>
          {/* Network Info */}
          <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded-lg">
            <div className="flex items-center justify-between text-sm">
              <span className="text-green-800">
                Connected to <strong>{chain.name}</strong>
              </span>
              <span className="text-green-600">✓</span>
            </div>
          </div>

          {/* Items List */}
          <div className="mb-6">
            <h2 className="text-xl font-semibold mb-4">Select Your Items</h2>
            <div className="space-y-2">
              {items.map((item) => {
                const isSelected = selectedItems.has(item.id);
                const isClaimed = Boolean(item.claimed_by);

                return (
                  <div
                    key={item.id}
                    className={`flex items-center justify-between p-4 rounded-lg border-2 transition-all ${
                      isClaimed
                        ? 'bg-gray-50 border-gray-200 opacity-50'
                        : isSelected
                        ? 'bg-primary bg-opacity-10 border-primary'
                        : 'border-gray-200 hover:border-gray-300 cursor-pointer'
                    }`}
                    onClick={() => !isClaimed && toggleItem(item.id)}
                  >
                    <div className="flex items-center gap-3">
                      <input
                        type="checkbox"
                        checked={isSelected}
                        disabled={isClaimed}
                        onChange={() => {}}
                        className="w-5 h-5"
                      />
                      <div>
                        <p className="font-medium">{item.description}</p>
                        {isClaimed && (
                          <p className="text-xs text-gray-500">
                            Already claimed by{' '}
                            {item.claimed_by?.substring(0, 6)}...
                          </p>
                        )}
                      </div>
                    </div>
                    <p className="font-semibold">${item.price.toFixed(2)}</p>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Payment Summary */}
          <div className="border-t pt-4">
            <div className="flex justify-between items-center mb-4">
              <span className="text-lg font-semibold">Your Total:</span>
              <span className="text-2xl font-bold text-primary">
                ${selectedTotal.toFixed(2)}
              </span>
            </div>

            <button
              onClick={handlePay}
              disabled={selectedItems.size === 0 || isPaying || isConfirming}
              className="w-full py-4 bg-primary text-white rounded-lg font-semibold text-lg hover:bg-opacity-90 disabled:bg-gray-300 disabled:cursor-not-allowed transition-all"
            >
              {isPaying || isConfirming
                ? 'Processing...'
                : selectedItems.size === 0
                ? 'Select items to pay'
                : `Pay ${selectedTotal.toFixed(2)} USDC`}
            </button>

            <p className="text-xs text-gray-500 text-center mt-2">
              Paying to: {payerAddress.substring(0, 6)}...
              {payerAddress.substring(payerAddress.length - 4)}
            </p>
          </div>
        </>
      )}
    </div>
  );
}
