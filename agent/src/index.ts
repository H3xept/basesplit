import { Client, type Signer } from '@xmtp/node-sdk';
import { getRandomValues } from 'node:crypto';
import { createWalletClient, http, type Hex } from 'viem';
import { privateKeyToAccount } from 'viem/accounts';
import { mainnet } from 'viem/chains';
import dotenv from 'dotenv';
import {
  initDatabase,
  createBill,
  createLineItem,
  type Bill,
  type LineItem,
} from './db.js';
import {
  parseReceiptWithOllama,
  downloadAttachment,
  calculateTotal,
} from './receipt-parser.js';
import { randomUUID } from 'crypto';

dotenv.config();

// Environment variables
const PRIVATE_KEY = process.env.PRIVATE_KEY as Hex;
const MINIAPP_URL = process.env.MINIAPP_URL || 'http://localhost:3000';
const XMTP_ENV = process.env.XMTP_ENV || 'local';

if (!PRIVATE_KEY) {
  throw new Error('PRIVATE_KEY environment variable is required');
}

/**
 * Create XMTP-compatible signer from private key
 */
function createSigner(privateKey: Hex): Signer {
  const account = privateKeyToAccount(privateKey);

  return {
    type: 'EOA',
    getIdentifier: () => ({
      identifier: account.address.toLowerCase(),
      identifierKind: 0, // 0 = Ethereum address
    }),
    signMessage: async (message: string) => {
      // Sign the message directly with the account
      const signature = await account.signMessage({
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

/**
 * Handle receipt image attachment
 */
async function handleReceiptAttachment(
  message: any,
  client: Client
): Promise<void> {
  try {
    console.log('📸 Received receipt image attachment');
    console.log('Filename:', message.parameters?.filename || 'unknown');

    // Note: For Node SDK v4, remote attachment decoding requires additional setup
    // For now, we'll use the mock OCR data which works for the demo
    // The message metadata is logged for debugging
    console.log('Message content type:', message.contentType);
    const contentStr = JSON.stringify(message.content);
    console.log('Message content preview:', contentStr ? contentStr.substring(0, 200) : 'undefined');

    console.log('🔍 Using mocked receipt parser...');
    const parsedReceipt = await parseReceiptWithOllama('mock');

    // Generate bill ID
    const billId = randomUUID();

    // Calculate total
    const totalAmount = calculateTotal(parsedReceipt);

    // Get conversation to send reply
    const conversation = await client.conversations.getConversationById(message.conversationId);
    if (!conversation) {
      console.error('Could not find conversation');
      return;
    }

    // Get sender's wallet address from inbox ID
    let payerAddress: string;
    try {
      const inboxState = await client.preferences.getLatestInboxState(message.senderInboxId);
      if (!inboxState || !inboxState.identifiers || inboxState.identifiers.length === 0) {
        console.error('Could not find wallet address for inbox ID:', message.senderInboxId);
        await conversation.send('❌ Could not process receipt. Unable to determine wallet address.');
        return;
      }

      // Find the first Ethereum address (identifierKind === 0)
      const ethereumIdentifier = inboxState.identifiers.find(
        (id: any) => id.identifierKind === 0
      );

      if (!ethereumIdentifier) {
        console.error('No Ethereum address found for inbox ID:', message.senderInboxId);
        await conversation.send('❌ Could not process receipt. No Ethereum address associated with your account.');
        return;
      }

      payerAddress = ethereumIdentifier.identifier;
      console.log(`📧 Sender inbox ID: ${message.senderInboxId}`);
      console.log(`💳 Sender wallet address: ${payerAddress}`);
    } catch (error) {
      console.error('Error getting sender address:', error);
      await conversation.send('❌ Could not process receipt. Error retrieving wallet address.');
      return;
    }

    // Create bill in database
    const bill: Bill = {
      id: billId,
      conversation_id: message.conversationId,
      payer_address: payerAddress,
      image_url: message.parameters?.filename || 'receipt.png',
      total_amount: totalAmount,
      is_settled: false,
    };

    createBill(bill);
    console.log(`✅ Created bill ${billId} for $${totalAmount.toFixed(2)}`);

    // Create line items
    parsedReceipt.items.forEach((item) => {
      const lineItem: LineItem = {
        id: randomUUID(),
        bill_id: billId,
        description: item.description,
        price: item.price,
      };
      createLineItem(lineItem);
    });

    console.log(`✅ Created ${parsedReceipt.items.length} line items`);

    // Generate miniapp link
    const miniappLink = `${MINIAPP_URL}/split/${billId}`;

    // Send response message
    const responseMessage = `Receipt processed! 🧾

Total: $${totalAmount.toFixed(2)}
Items: ${parsedReceipt.items.length}

Split the bill here:
${miniappLink}`;

    await conversation.send(responseMessage);
    console.log('✅ Sent miniapp link to conversation');

  } catch (error) {
    console.error('Error handling receipt:', error);

    // Send error message to conversation
    try {
      const conversation = await client.conversations.getConversationById(message.conversationId);
      if (conversation) {
        await conversation.send(
          '❌ Failed to process receipt. Please try again with a clearer image.'
        );
      }
    } catch (sendError) {
      console.error('Failed to send error message:', sendError);
    }
  }
}

/**
 * Main agent function
 */
async function main() {
  console.log('🚀 Starting SplitEt XMTP Agent...');

  // Initialize database
  initDatabase();

  // Create signer
  const signer = createSigner(PRIVATE_KEY);
  const identifier = await signer.getIdentifier();
  console.log(
    `📝 Using wallet address: ${identifier.identifier}`
  );

  // Create XMTP client with consistent encryption key
  // Use a deterministic key derived from private key to avoid database key issues
  const dbEncryptionKey = new Uint8Array(32);
  const privateKeyBytes = Buffer.from(PRIVATE_KEY.slice(2), 'hex');
  for (let i = 0; i < 32; i++) {
    dbEncryptionKey[i] = privateKeyBytes[i % privateKeyBytes.length];
  }

  const client = await Client.create(signer, {
    env: XMTP_ENV as 'local' | 'dev' | 'production',
    dbEncryptionKey,
  });

  console.log(`✅ XMTP client created (env: ${XMTP_ENV})`);
  console.log(`📨 Inbox ID: ${client.inboxId}`);

  // Stream all messages
  console.log('👂 Listening for receipt attachments...');

  const stream = await client.conversations.streamAllMessages({
    onValue: async (message) => {
      try {
        // Log ALL messages for debugging
        console.log('📨 Message received!');
        console.log('  Type:', message.contentType?.typeId || 'unknown');
        console.log('  From:', message.senderInboxId);

        // Safely log content
        try {
          const contentStr = JSON.stringify(message.content);
          console.log('  Content preview:', contentStr ? contentStr.substring(0, 100) : 'empty');
        } catch (e) {
          console.log('  Content preview: [unable to stringify]');
        }

        // Check if message is an attachment (handle all attachment types)
        const contentType = message.contentType?.typeId;
        if (
          contentType === 'attachment' ||
          contentType === 'remoteAttachment' ||
          contentType === 'remoteStaticAttachment'
        ) {
          console.log('📎 Processing attachment...');
          await handleReceiptAttachment(message, client);
        } else if (contentType === 'text') {
          console.log('💬 Text message received (not processing, waiting for attachments)');
        } else {
          console.log('⚠️  Unknown message type, skipping');
        }
      } catch (error) {
        console.error('Error processing message:', error);
      }
    },
    onError: (error) => {
      console.error('Stream error:', error);
    },
  });

  console.log('✅ Agent is now running! Press Ctrl+C to stop.');

  // Keep process running
  process.on('SIGINT', async () => {
    console.log('\n👋 Shutting down agent...');
    // Close stream if needed
    process.exit(0);
  });
}

// Run the agent
main().catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});
