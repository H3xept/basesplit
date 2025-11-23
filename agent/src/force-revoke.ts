import dotenv from 'dotenv';
dotenv.config();

import { Client, type Signer } from '@xmtp/node-sdk';
import { createWalletClient, http, type Hex } from 'viem';
import { privateKeyToAccount } from 'viem/accounts';

// Configuration
const PRIVATE_KEY = process.env.PRIVATE_KEY as Hex;
const TARGET_INBOX_ID = "1ee08188de831a0124e456317d1ca80acda4413f4d937b416dcb76a68459603e";
const XMTP_ENV = (process.env.XMTP_ENV || 'local') as 'local' | 'dev' | 'production';

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

async function main() {
    const signer = createSigner(PRIVATE_KEY);
    const identifier = await signer.getIdentifier();
    console.log(`> Wallet Address: ${identifier.identifier}`);

    try {
        // FETCH STATE (STATICALLY)
        // This bypasses the login requirement that is currently blocking you.
        console.log(`> Fetching state for Inbox ID: ${TARGET_INBOX_ID}...`);
        console.log(`> Using XMTP Environment: ${XMTP_ENV}`);

        const inboxStates = await Client.inboxStateFromInboxIds(
            [TARGET_INBOX_ID],
            XMTP_ENV
        );

        if (!inboxStates || inboxStates.length === 0) {
            console.error("❌ No inbox state found. Check your InboxID and Network.");
            console.error(`   Inbox ID: ${TARGET_INBOX_ID}`);
            console.error(`   Network: ${XMTP_ENV}`);
            return;
        }

        const installations = inboxStates[0].installations;
        console.log(`> Found ${installations.length} installations.`);

        if (installations.length === 0) {
            console.log("✅ No installations to revoke.");
            return;
        }

        // Display installations
        console.log('\n📋 Current installations:');
        installations.forEach((inst, idx) => {
            console.log(`   ${idx + 1}. Installation ID: ${Buffer.from(inst.bytes).toString('hex').substring(0, 16)}...`);
        });

        // PREPARE REVOCATION
        // We will revoke ALL existing installations to clear the slate.
        const installationIds = installations.map((inst) => inst.bytes);

        console.log(`\n⚠️  About to revoke ${installationIds.length} installation(s)...`);
        console.log('   This will clear all existing installations for this inbox.');
        console.log('   The next time you run the agent, it will create a new installation.\n');

        // EXECUTE REVOKE
        console.log('> Executing revocation...');
        await Client.revokeInstallations(signer, TARGET_INBOX_ID, installationIds, XMTP_ENV);

        console.log("\n✅ Success! All old installations revoked.");
        console.log("You can now run your register command again:");
        console.log("   npm run dev  or  yarn dev\n");

    } catch (error: any) {
        console.error("\n❌ Error during revocation:", error.message);
        console.error("\nTroubleshooting:");
        console.error("1. Verify your PRIVATE_KEY in .env matches the wallet for this InboxID");
        console.error("2. Check that XMTP_ENV matches where the inbox was created");
        console.error("3. Ensure you have network connectivity");
        if (error.stack) {
            console.error("\nFull error:");
            console.error(error.stack);
        }
    }
}

main();
