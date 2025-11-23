import { Client, type Signer } from '@xmtp/browser-sdk';
import type { WalletClient } from 'viem';
import {
  AttachmentCodec,
  RemoteAttachmentCodec
} from '@xmtp/content-type-remote-attachment';
import { createXMTPSigner } from './signer';
import { XMTP_ENV, AGENT_ADDRESS } from './constants';

/**
 * Clears XMTP IndexedDB databases to fix corruption issues
 */
async function clearXMTPDatabases() {
  try {
    console.log('🔍 Listing all IndexedDB databases...');
    const databases = await indexedDB.databases();
    console.log('Found databases:', databases.map(db => db.name));

    const xmtpDatabases = databases.filter(db =>
      db.name?.toLowerCase().includes('xmtp') ||
      db.name?.includes('dev-') ||
      db.name?.includes('libxmtp')
    );

    console.log('XMTP databases to delete:', xmtpDatabases.map(db => db.name));

    for (const db of xmtpDatabases) {
      if (db.name) {
        console.log(`🗑️ Deleting database: ${db.name}`);
        await new Promise<void>((resolve, reject) => {
          const request = indexedDB.deleteDatabase(db.name!);
          request.onsuccess = () => {
            console.log(`✅ Deleted: ${db.name}`);
            resolve();
          };
          request.onerror = () => {
            console.error(`❌ Failed to delete: ${db.name}`, request.error);
            reject(request.error);
          };
          request.onblocked = () => {
            console.warn(`⚠️ Deletion blocked: ${db.name}`);
            // Resolve anyway to continue
            resolve();
          };
        });
      }
    }

    // Wait a bit for deletion to complete
    await new Promise(resolve => setTimeout(resolve, 500));
    console.log('✅ Cleared XMTP databases');
  } catch (error) {
    console.error('Failed to clear XMTP databases:', error);
    throw error;
  }
}

/**
 * Creates a deterministic encryption key from the wallet address
 * This ensures the same wallet always uses the same encryption key
 */
function createDbEncryptionKey(address: string): Uint8Array {
  const key = new Uint8Array(32);
  const normalized = address.toLowerCase().replace('0x', '');

  // Create a deterministic key from the address
  for (let i = 0; i < 32; i++) {
    const charIndex = i % normalized.length;
    key[i] = normalized.charCodeAt(charIndex);
  }

  return key;
}

/**
 * Creates an XMTP client from a Wagmi wallet client
 */
export async function createXMTPClient(walletClient: WalletClient) {
  if (!walletClient.account) {
    throw new Error('Wallet must be connected');
  }

  const signer = createXMTPSigner(walletClient);
  const dbEncryptionKey = createDbEncryptionKey(walletClient.account.address);

  try {
    const client = await Client.create(signer, {
      env: XMTP_ENV,
      dbEncryptionKey,
      codecs: [new AttachmentCodec(), new RemoteAttachmentCodec()],
    });

    console.log('✅ XMTP client created successfully');
    console.log('📨 Inbox ID:', client.inboxId);

    return client;
  } catch (error: any) {
    // Only clear database if it's an installation limit error
    if (error?.message?.includes('already registered') && error?.message?.includes('installations')) {
      console.error('❌ Installation limit reached!');
      console.error('Please go to /revoke to clear old installations');
      throw new Error('Installation limit reached. Please visit /revoke to clear old installations.');
    }

    // For other database errors, don't automatically clear
    // This prevents creating new installations unnecessarily
    if (error?.message?.includes('Database') || error?.message?.includes('NotFound')) {
      console.error('⚠️ XMTP database error:', error.message);
      console.error('If this persists, visit /revoke or try window.resetXMTP()');
    }

    // Re-throw the error
    throw error;
  }
}

/**
 * Finds or creates a DM conversation with the agent
 */
export async function getAgentConversation(client: Awaited<ReturnType<typeof Client.create>>) {
  try {
    // Try to get existing DM by the agent's Ethereum address
    let dm = await client.conversations.getDmByIdentifier({
      identifier: AGENT_ADDRESS.toLowerCase(),
      identifierKind: 'Ethereum',
    });

    // If no existing conversation, create a new one
    if (!dm) {
      console.log('No existing conversation found, creating new DM with agent...');
      dm = await client.conversations.newDm(AGENT_ADDRESS.toLowerCase());
      console.log('✅ New conversation created with agent');
    }

    return dm;
  } catch (error) {
    console.error('Error getting agent conversation:', error);
    throw error;
  }
}

/**
 * Sends a text message to a conversation
 */
export async function sendMessage(
  conversation: Awaited<ReturnType<typeof getAgentConversation>>,
  message: string
) {
  if (!conversation) {
    throw new Error('No conversation available');
  }
  await conversation.send(message);
}

/**
 * Streams messages from a conversation
 */
export async function streamMessages(
  client: Awaited<ReturnType<typeof Client.create>>,
  onMessage: (message: any) => void,
  onError?: (error: Error) => void
) {
  const stream = await client.conversations.streamAllMessages({
    onValue: (message) => {
      // Skip messages from self
      if (message.senderInboxId === client.inboxId) {
        return;
      }
      onMessage(message);
    },
    onError: (error) => {
      console.error('Stream error:', error);
      onError?.(error);
    },
  });

  return stream;
}

/**
 * Manually reset XMTP - clears all databases and forces reconnection
 * Call this from browser console if you encounter database issues: window.resetXMTP()
 */
export async function resetXMTP() {
  console.log('🔄 Manually resetting XMTP...');
  await clearXMTPDatabases();
  console.log('✅ XMTP reset complete. Please refresh the page and reconnect your wallet.');
  return true;
}

// Expose reset function globally for debugging
if (typeof window !== 'undefined') {
  (window as any).resetXMTP = resetXMTP;
  console.log('💡 Tip: If you encounter XMTP issues, run window.resetXMTP() in console');
}
