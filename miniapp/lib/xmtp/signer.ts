import type { Signer } from '@xmtp/browser-sdk';
import type { WalletClient } from 'viem';

/**
 * Creates an XMTP-compatible signer from a Wagmi wallet client
 */
export function createXMTPSigner(walletClient: WalletClient): Signer {
  if (!walletClient.account) {
    throw new Error('Wallet client must have an account');
  }

  const account = walletClient.account;
  const address = account.address;

  return {
    type: 'EOA',
    getIdentifier: () => ({
      identifier: address.toLowerCase(),
      identifierKind: 'Ethereum' as const,
    }),
    signMessage: async (message: string): Promise<Uint8Array> => {
      // Request signature from wallet
      const signature = await walletClient.signMessage({
        account,
        message,
      });

      // Convert hex signature (0x...) to Uint8Array
      const signatureWithoutPrefix = signature.startsWith('0x')
        ? signature.slice(2)
        : signature;

      const signatureBytes = new Uint8Array(
        signatureWithoutPrefix.match(/.{1,2}/g)!.map((byte) => parseInt(byte, 16))
      );

      return signatureBytes;
    },
  };
}
