/**
 * XMTP Configuration Constants
 */

export const XMTP_ENV = (process.env.NEXT_PUBLIC_XMTP_ENV || 'production') as 'dev' | 'production' | 'local';

export const AGENT_ADDRESS = process.env.NEXT_PUBLIC_AGENT_ADDRESS as `0x${string}`;

if (!AGENT_ADDRESS) {
  throw new Error('NEXT_PUBLIC_AGENT_ADDRESS environment variable is required');
}
