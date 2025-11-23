# SplitEt 💸

**Master Technical Specification for ETHGlobal Hackathon**

SplitEt is a hybrid decentralized application that combines an XMTP Agent (for OCR and coordination) with a Base Miniapp (for UI and payments) to make bill splitting seamless and frictionless.

## 🏆 Hackathon Target

- **XMTP**: Best Miniapp & Best Use of Agent SDK
- **Base**: Best Use of Base

## 🎯 Problem & Solution

**Problem**: Group bill splitting is manual and disconnected from the payment layer.

**Solution**: An Agent listens to XMTP chat, uses AI (Ollama) to read receipts, and generates a smart Miniapp link where users tap-to-pay using USDC on Base.

## 🏗️ Architecture

### Hybrid Loop

```
┌─────────────┐     ┌──────────────┐     ┌─────────────┐
│   XMTP      │────>│   Agent      │────>│   Miniapp   │
│   Chat      │     │   (Ollama)   │     │   (UI)      │
└─────────────┘     └──────────────┘     └─────────────┘
      │                    │                     │
      │              ┌─────▼─────┐              │
      │              │  SQLite   │◄─────────────┘
      │              │  Database │
      │              └───────────┘
      │                    │
      └────────────────────▼────────────────────┐
                    Base Blockchain (USDC)       │
                    ────────────────────────────┘
```

**Components:**
1. **Context Layer (Agent)**: XMTP listener with Ollama for OCR
2. **Data Layer (SQLite)**: Bills, Items, Claim Status
3. **Interaction Layer (Miniapp)**: UI for selecting items and paying
4. **Settlement Layer (Base)**: USDC transfers

## 📁 Project Structure

```
splid2/
├── agent/              # XMTP Agent (Node.js)
│   ├── src/
│   │   ├── index.ts           # Main agent entry
│   │   ├── receipt-parser.ts  # Ollama integration
│   │   └── db.ts              # SQLite operations
│   ├── database.db            # SQLite database
│   ├── package.json
│   └── .env.example
├── miniapp/            # Next.js Miniapp
│   ├── app/
│   │   ├── split/[billId]/    # Bill splitting page
│   │   ├── layout.tsx
│   │   └── providers.tsx
│   ├── components/
│   │   └── BillSplitter.tsx   # Main UI component
│   ├── lib/
│   │   ├── db.ts              # Database access
│   │   ├── wagmi.ts           # Wallet config
│   │   └── usdc-abi.ts        # USDC contract ABI
│   └── package.json
└── README.md
```

## 🚀 Quick Start

### Prerequisites

1. **Node.js** (v20+)
2. **Ollama** with vision model
3. **Anvil** (from Foundry) for local blockchain
4. **XMTP local node** (optional, for testing)

### 1. Install Ollama

```bash
# macOS/Linux
curl -fsSL https://ollama.com/install.sh | sh

# Pull vision model
ollama pull llama3.2-vision
```

### 2. Set Up XMTP Agent

```bash
cd agent

# Install dependencies
npm install

# Create .env file
cp .env.example .env

# Edit .env and add:
# - PRIVATE_KEY=0x... (your test wallet private key)
# - XMTP_ENV=local
# - OLLAMA_URL=http://localhost:11434
# - MINIAPP_URL=http://localhost:3000

# Start the agent
npm run dev
```

The agent will:
- ✅ Initialize SQLite database
- ✅ Connect to XMTP network
- ✅ Listen for receipt attachments
- ✅ Parse receipts using Ollama
- ✅ Send Miniapp links

### 3. Set Up Miniapp

```bash
cd miniapp

# Install dependencies
npm install

# Create .env.local (optional)
cp .env.example .env.local

# Start the development server
npm run dev
```

The Miniapp will be available at `http://localhost:3000`

### 4. Start Anvil (Optional)

For local Base network testing:

```bash
anvil --fork-url https://mainnet.base.org
```

## 💬 Usage Flow

### Step 1: Upload Receipt in XMTP Chat

1. Open an XMTP-compatible chat app (e.g., Converse, xmtp.chat)
2. Send a receipt image to the chat where the agent is listening
3. Wait for the agent to process (~5-10 seconds)

### Step 2: Agent Processing

The agent will:
1. ✅ Detect the attachment
2. ✅ Download and convert to base64
3. ✅ Send to Ollama for parsing
4. ✅ Extract line items and prices
5. ✅ Store in SQLite database
6. ✅ Reply with Miniapp link

**Example Agent Response:**
```
Receipt processed! 🧾

Total: $65.43
Items: 5

Split the bill here:
http://localhost:3000/split/abc-123-def
```

### Step 3: Open Miniapp

1. Click the link from the chat
2. See all items from the receipt
3. Connect your wallet
4. Select the items you ate/ordered

### Step 4: Pay with USDC

1. Select your items (checkboxes)
2. See your calculated total
3. Click "Pay X USDC"
4. Approve the transaction in your wallet
5. ✅ Payment complete!

## 🗄️ Database Schema

### Bills Table
```sql
CREATE TABLE bills (
  id TEXT PRIMARY KEY,
  conversation_id TEXT NOT NULL,
  payer_address TEXT NOT NULL,
  image_url TEXT,
  total_amount REAL,
  created_at INTEGER,
  is_settled INTEGER DEFAULT 0
);
```

### Line Items Table
```sql
CREATE TABLE line_items (
  id TEXT PRIMARY KEY,
  bill_id TEXT NOT NULL,
  description TEXT NOT NULL,
  price REAL NOT NULL,
  claimed_by TEXT,
  paid_tx_hash TEXT,
  FOREIGN KEY (bill_id) REFERENCES bills(id)
);
```

## 🧪 Testing

### Test Receipt Parsing

```bash
# Terminal 1: Start Ollama
ollama serve

# Terminal 2: Test with sample image
curl http://localhost:11434/api/generate -d '{
  "model": "llama3.2-vision",
  "prompt": "Extract items from this receipt as JSON",
  "images": ["base64-encoded-image"],
  "stream": false
}'
```

### Test XMTP Agent

1. Start the agent with `npm run dev`
2. Use xmtp.chat or Converse app
3. Send a receipt image
4. Check console logs for processing

### Test Miniapp Payment

1. Start Miniapp with `npm run dev`
2. Navigate to `http://localhost:3000/split/test-bill-id`
3. Connect wallet (MetaMask, Coinbase Wallet)
4. Select items and test payment flow

## 🔑 Environment Variables

### Agent (.env)
```bash
PRIVATE_KEY=0x...           # Agent wallet private key
XMTP_ENV=local              # local, dev, or production
OLLAMA_URL=http://localhost:11434
OLLAMA_MODEL=llama3.2-vision
MINIAPP_URL=http://localhost:3000
```

### Miniapp (.env.local)
```bash
NEXT_PUBLIC_WC_PROJECT_ID=  # Optional: WalletConnect project ID
```

## 🎨 Key Features

✅ **XMTP Integration**
- Real-time message listening
- Attachment handling
- Conversation management

✅ **Ollama Vision**
- Local LLM for privacy
- OCR for receipt parsing
- Structured JSON output

✅ **SQLite Database**
- Lightweight and fast
- Shared between agent and miniapp
- Simple schema

✅ **Base + USDC Payments**
- ERC-20 USDC transfers
- Base network integration
- Wallet connection via wagmi

✅ **Responsive UI**
- Tailwind CSS
- Mobile-friendly
- Real-time updates

## 🚧 Known Limitations

1. **Ollama Vision Accuracy**: May require clear, well-lit receipt images
2. **Single Payer**: Currently supports one payer per bill
3. **No Multi-Device Sync**: Database is local only
4. **Manual Item Selection**: No automatic splitting algorithm

## 🎯 Future Improvements

- [ ] Add tip calculation slider
- [ ] Support multiple payers
- [ ] Token gating for group access
- [ ] Split items among multiple people
- [ ] Receipt history view
- [ ] Export transaction records
- [ ] Push notifications for payments
- [ ] Multi-chain support

## 🔧 Troubleshooting

### Agent Issues

**Error: PRIVATE_KEY not found**
- Make sure `.env` file exists in `agent/` directory
- Verify `PRIVATE_KEY=0x...` is set

**Error: Ollama connection failed**
- Check if Ollama is running: `ollama serve`
- Verify model is installed: `ollama list`
- Test Ollama: `curl http://localhost:11434/api/tags`

**Error: Cannot connect to XMTP**
- Check network connectivity
- For `local` env, ensure XMTP local node is running
- Try switching to `dev` environment

### Miniapp Issues

**Error: Cannot read database**
- Ensure agent has been started at least once (creates DB)
- Check database path in `miniapp/lib/db.ts`
- Verify SQLite file exists at `agent/database.db`

**Error: USDC transfer failed**
- Ensure wallet has USDC balance
- Check you're on Base or Base Sepolia network
- Verify USDC contract address is correct

**Error: Wallet connection failed**
- Try clearing browser cache
- Reconnect wallet
- Check wallet network matches app network

## 📦 Dependencies

### Agent
- `@xmtp/node-sdk` - XMTP messaging
- `better-sqlite3` - Database
- `axios` - HTTP requests
- `viem` - Ethereum utilities

### Miniapp
- `next` - React framework
- `wagmi` - Wallet integration
- `@coinbase/onchainkit` - Base integration
- `viem` - Ethereum utilities
- `better-sqlite3` - Database access

## 🤝 Contributing

This is a hackathon project built for ETHGlobal. Contributions welcome!

## 📄 License

MIT

## 🏗️ Built With

- [XMTP](https://xmtp.org) - Decentralized messaging protocol
- [Ollama](https://ollama.com) - Local LLM with vision
- [Base](https://base.org) - Ethereum L2
- [Next.js](https://nextjs.org) - React framework
- [Wagmi](https://wagmi.sh) - Wallet integration
- [Tailwind CSS](https://tailwindcss.com) - Styling

## 🎬 Demo Video Script

### Scene 1: The Problem (15 sec)
*Show a group of friends looking at a restaurant receipt*
"Splitting bills is tedious. Manual calculations. Venmo requests. Awkward moments."

### Scene 2: The Solution (15 sec)
*Show phone screen with XMTP chat*
"With SplitEt, just send your receipt to the chat."

### Scene 3: AI Processing (10 sec)
*Show agent processing receipt*
"Our AI instantly parses every item."

### Scene 4: Select & Pay (20 sec)
*Show Miniapp UI*
"Click the link. Select your items. Pay with USDC on Base."

### Scene 5: Success (10 sec)
*Show confirmation*
"Done! ✅ No more awkward money talk."

---

**Built with ❤️ for ETHGlobal Hackathon**
**XMTP • Base • Ollama**
