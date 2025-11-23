import { http, createConfig, fallback } from 'wagmi';
import { base, baseSepolia } from 'wagmi/chains';
import { coinbaseWallet, injected } from 'wagmi/connectors';

// USDC contract addresses
export const USDC_ADDRESS = {
  [base.id]: '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913' as const,
  [baseSepolia.id]: '0x036CbD53842c5426634e7929541eC2318f3dCF7e' as const,
};

export const config = createConfig({
  chains: [base, baseSepolia],
  connectors: [
    injected(), // Supports all injected wallets (MetaMask, Rabby, Rainbow, etc.)
    coinbaseWallet({
      appName: 'BaseSplit',
      preference: 'smartWalletOnly',
    }),
  ],
  transports: {
    [base.id]: fallback([
      http('https://mainnet.base.org'),
      http('https://base.llamarpc.com'),
      http('https://base-rpc.publicnode.com'),
      http(), // Uses the chain's default RPC
    ]),
    [baseSepolia.id]: fallback([
      http('https://sepolia.base.org'),
      http('https://base-sepolia-rpc.publicnode.com'),
      http(), // Uses the chain's default RPC
    ]),
  },
  batch: {
    multicall: {
      wait: 100,
    },
  },
  pollingInterval: 12_000, // Poll every 12 seconds instead of default 4 seconds
});
