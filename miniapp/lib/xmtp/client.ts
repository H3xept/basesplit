import { Client, type Signer } from '@xmtp/browser-sdk';
import type { WalletClient } from 'viem';
import {
  AttachmentCodec,
  RemoteAttachmentCodec
} from '@xmtp/content-type-remote-attachment';
import { createXMTPSigner } from './signer';
import { XMTP_ENV, AGENT_ADDRESS } from './constants';

/**
 * Creates an XMTP client from a Wagmi wallet client
 */
export async function createXMTPClient(walletClient: WalletClient) {
  if (!walletClient.account) {
    throw new Error('Wallet must be connected');
  }

  const signer = createXMTPSigner(walletClient);

  const client = await Client.create(signer, {
    env: XMTP_ENV,
    codecs: [new AttachmentCodec(), new RemoteAttachmentCodec()],
  });

  return client;
}

/**
 * Finds or creates a DM conversation with the agent
 */
export async function getAgentConversation(client: Awaited<ReturnType<typeof Client.create>>) {
  try {
    // Try to get existing DM by the agent's Ethereum address
    const dm = await client.conversations.getDmByIdentifier({
      identifier: AGENT_ADDRESS.toLowerCase(),
      identifierKind: 'Ethereum',
    });

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
