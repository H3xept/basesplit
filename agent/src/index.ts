import { Client, type Signer } from '@xmtp/node-sdk';
import { createWalletClient, http, type Hex } from 'viem';
import { privateKeyToAccount } from 'viem/accounts';
import dotenv from 'dotenv';
import {
    AttachmentCodec,
    RemoteAttachmentCodec,
    type Attachment,
    type RemoteAttachment,
} from '@xmtp/content-type-remote-attachment';
import {
    initDatabase,
    createBill,
    createLineItem,
    type Bill,
    type LineItem,
} from './db.js';
import {
    parseReceiptWithGoogleVision,
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
 * Helper: Tries to fetch from the original URL, falls back to public gateways if 401/403
 */
async function fetchWithFallback(originalUrl: string): Promise<string> {
    const gateways = [
        originalUrl, // Try original first
        'https://gateway.pinata.cloud/ipfs/',
        'https://ipfs.io/ipfs/',
        'https://cloudflare-ipfs.com/ipfs/'
    ];

    // Extract CID from the original URL
    // supports formats like: .../ipfs/CID... or .../CID...
    const cidMatch = originalUrl.match(/\/ipfs\/([a-zA-Z0-9]+)/) || originalUrl.match(/\/([a-zA-Z0-9]{46,})/);
    const cid = cidMatch ? cidMatch[1] : null;

    if (!cid) {
        console.log("⚠️ Could not extract CID, trying original URL only.");
        return originalUrl;
    }

    console.log(`🔄 IPFS CID detected: ${cid}`);

    for (const gateway of gateways) {
        let targetUrl = gateway === originalUrl ? originalUrl : `${gateway}${cid}`;

        // If gateway ends in /ipfs/, append CID. If it's the original, use as is.
        if (gateway !== originalUrl && !gateway.endsWith('/')) {
            targetUrl = `${gateway}/${cid}`;
        }

        try {
            console.log(`🔎 Trying gateway: ${targetUrl}`);
            const response = await fetch(targetUrl, { method: 'HEAD' }); // Use HEAD to check quickly

            if (response.ok) {
                console.log(`✅ Found accessible file at: ${targetUrl}`);
                return targetUrl;
            }
            console.log(`❌ Gateway failed (${response.status}): ${targetUrl}`);
        } catch (e: any) {
            console.log(`❌ Gateway network error: ${e.message}`);
        }
    }

    throw new Error("All IPFS gateways failed to retrieve the file.");
}

/**
 * Handle receipt image attachment
 */
async function handleReceiptAttachment(
    message: any,
    client: Awaited<ReturnType<typeof Client.create<[AttachmentCodec, RemoteAttachmentCodec]>>>
): Promise<void> {
    try {
        console.log('📸 Received receipt image attachment');
        const contentType = message.contentType?.typeId;
        console.log('Content type:', contentType);
        console.log('Filename:', message.parameters?.filename || message.content?.filename || 'unknown');

        // Download and decode the attachment based on its type
        let imageData: Uint8Array;

        if (contentType === 'attachment') {
            // Regular attachment - data is directly in message.content.data
            console.log('📎 Processing regular attachment...');
            imageData = message.content.data;
        } else if (contentType === 'remoteAttachment' || contentType === 'remoteStaticAttachment') {
            // Remote attachment - need to decrypt and download
            console.log('🔗 Processing remote attachment...');

            const remoteContent = message.content;

            // --- FIX START: Gateway Fallback Logic ---
            try {
                // 1. Find a working URL (Original vs Public Gateways)
                const workingUrl = await fetchWithFallback(remoteContent.url);

                // 2. Update the content object with the working URL
                // We create a shallow copy to avoid mutating the original message object in unexpected ways
                const workingContent = {
                    ...remoteContent,
                    url: workingUrl
                };

                // 3. Load using the working URL
                const attachment = await RemoteAttachmentCodec.load<Attachment>(workingContent, client);
                imageData = attachment.data;
            } catch (loadError: any) {
                console.error('Failed to load remote attachment:', loadError.message);
                throw new Error(`Failed to load remote attachment: ${loadError.message}`);
            }
            // --- FIX END ---

        } else {
            throw new Error(`Unsupported attachment type: ${contentType}`);
        }

        if (!imageData || imageData.length === 0) {
            throw new Error('Failed to download attachment: empty data');
        }

        console.log(`✅ Downloaded attachment (${imageData.length} bytes)`);

        // Convert to base64 for Google Vision
        const imageBase64 = await downloadAttachment(imageData);

        // Parse receipt with Google Vision
        console.log('🔍 Parsing receipt with Google Vision...');
        const parsedReceipt = await parseReceiptWithGoogleVision(imageBase64);

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

        await createBill(bill);
        console.log(`✅ Created bill ${billId} for $${totalAmount.toFixed(2)}`);

        // Create line items
        for (const item of parsedReceipt.items) {
            const lineItem: LineItem = {
                id: randomUUID(),
                bill_id: billId,
                description: item.description,
                price: item.price,
            };
            await createLineItem(lineItem);
        }

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
    console.log('🚀 Starting BaseSplit XMTP Agent...');

    // Initialize database
    await initDatabase();

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
        codecs: [new AttachmentCodec(), new RemoteAttachmentCodec()],
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

                    // Send immediate acknowledgment
                    try {
                        const conversation = await client.conversations.getConversationById(message.conversationId);
                        if (conversation) {
                            await conversation.send('Processing your receipt... 🧾');
                        }
                    } catch (error) {
                        console.error('Error sending acknowledgment:', error);
                    }

                    await handleReceiptAttachment(message, client);
                } else if (contentType === 'text') {
                    console.log('💬 Text message received (not processing, waiting for attachments)');

                    // Send rejection message for text-only messages
                    try {
                        const conversation = await client.conversations.getConversationById(message.conversationId);
                        if (conversation) {
                            await conversation.send('Cool! Please only share receipts tho!');
                        }
                    } catch (error) {
                        console.error('Error sending rejection message:', error);
                    }
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
