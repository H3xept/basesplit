import { Client } from '@xmtp/browser-sdk';
import type { WalletClient } from 'viem';
import { createXMTPSigner } from './signer';
import { XMTP_ENV } from './constants';

/**
 * Revokes all installations for the current wallet's InboxID
 * This is useful when you hit the 10 installation limit
 */
export async function revokeAllInstallations(walletClient: WalletClient) {
  if (!walletClient.account) {
    throw new Error('Wallet must be connected');
  }

  const signer = createXMTPSigner(walletClient);

  try {
    // First, try to create a temporary client to get the inbox ID
    // This will fail if we're over the limit, but we can still use the error message
    let inboxId: string | null = null;

    try {
      const tempClient = await Client.create(signer, {
        env: XMTP_ENV,
      });
      inboxId = tempClient.inboxId || null;
      console.log(`> Found Inbox ID: ${inboxId}`);
    } catch (error: any) {
      // If we get an installation limit error, extract the InboxID from the error message
      const match = error?.message?.match(/InboxID ([a-f0-9]+)/);
      if (match) {
        inboxId = match[1];
        console.log(`> Extracted Inbox ID from error: ${inboxId}`);
      } else {
        console.error('Could not determine inbox ID');
        throw new Error('Could not determine inbox ID. Please provide it manually or check the error message.');
      }
    }

    if (!inboxId) {
      console.log('No inbox ID found for this wallet');
      return;
    }

    // Fetch inbox state
    const inboxStates = await Client.inboxStateFromInboxIds([inboxId], XMTP_ENV);

    if (!inboxStates || inboxStates.length === 0) {
      console.log('No inbox state found');
      return;
    }

    const installations = inboxStates[0].installations;
    console.log(`> Found ${installations.length} installations`);

    if (installations.length === 0) {
      console.log('No installations to revoke');
      return;
    }

    // Display installations
    console.log('\n📋 Current installations:');
    installations.forEach((inst, idx) => {
      const idHex = Array.from(inst.bytes)
        .map(b => b.toString(16).padStart(2, '0'))
        .join('')
        .substring(0, 16);
      console.log(`   ${idx + 1}. Installation ID: ${idHex}...`);
    });

    const installationIds = installations.map((inst) => inst.bytes);

    console.log(`\n⚠️  Revoking ${installationIds.length} installation(s)...`);

    // Revoke all installations
    await Client.revokeInstallations(signer, inboxId, installationIds, XMTP_ENV);

    console.log('\n✅ Success! All installations revoked');
    console.log('You can now reconnect your wallet to create a fresh installation');

    return true;
  } catch (error: any) {
    console.error('Error revoking installations:', error);
    throw error;
  }
}

/**
 * Browser console helper function to revoke installations
 * Usage: Open browser console and run: window.revokeXMTPInstallations()
 */
if (typeof window !== 'undefined') {
  (window as any).revokeXMTPInstallations = async () => {
    console.log('⚠️ To use this function, you need to pass your wallet client');
    console.log('This function should be called programmatically with a connected wallet');
    return false;
  };
}
