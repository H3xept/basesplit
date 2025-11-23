# BaseSplit Production Deployment Guide

This guide covers deploying the BaseSplit application to production using **Vercel** (frontend) and **Railway** (agent backend) with a shared **Vercel Postgres** database.

## Architecture Overview

```
┌─────────────────┐
│   Vercel        │ ← Miniapp (Next.js)
│   (Frontend)    │ → Reads bills, updates claims
└────────┬────────┘
         │
         ↓
┌─────────────────┐
│ Vercel Postgres │ ← Shared Database
│  (Database)     │
└────────┬────────┘
         │
         ↑
┌─────────────────┐
│   Railway       │ ← Agent (XMTP Listener)
│   (Backend)     │ → Creates bills, parses receipts
└─────────────────┘
```

## Prerequisites

- Vercel account ([vercel.com](https://vercel.com))
- Railway account ([railway.app](https://railway.app))
- GitHub repository connected to both platforms
- Google Gemini API key ([aistudio.google.com/app/apikey](https://aistudio.google.com/app/apikey))
- Ethereum wallet private key for the agent
- WalletConnect Project ID (optional, [cloud.walletconnect.com](https://cloud.walletconnect.com))

---

## Phase 1: Set Up Vercel Postgres Database

### 1.1 Create Database

1. Go to your Vercel dashboard
2. Navigate to **Storage** tab
3. Click **Create Database**
4. Select **Postgres**
5. Choose a region (recommend `iad1` - US East)
6. Click **Create**

### 1.2 Run Schema Migration

1. In the Vercel Postgres dashboard, go to the **Query** tab
2. Copy the contents of `/schema.sql` from this repository
3. Paste and execute the SQL to create tables and indexes

### 1.3 Get Connection String

1. In the Postgres dashboard, go to **Settings** → **Connection String**
2. Copy the `POSTGRES_URL` value
3. Save it for later use in both Vercel and Railway

---

## Phase 2: Deploy Miniapp to Vercel

### 2.1 Import Project

1. Go to [vercel.com/new](https://vercel.com/new)
2. Import your GitHub repository
3. Vercel will detect the `vercel.json` configuration

### 2.2 Configure Build Settings

The `vercel.json` file already configures these, but verify:

- **Framework Preset:** Next.js
- **Root Directory:** `miniapp` (auto-configured)
- **Build Command:** `cd miniapp && npm run build`
- **Install Command:** `cd miniapp && npm install`
- **Output Directory:** `miniapp/.next`

### 2.3 Set Environment Variables

Go to **Settings** → **Environment Variables** and add:

| Variable | Value | Description |
|----------|-------|-------------|
| `POSTGRES_URL` | `postgresql://...` | From Vercel Postgres (Step 1.3) |
| `NEXT_PUBLIC_WC_PROJECT_ID` | `your_project_id` | Optional - WalletConnect Project ID |

### 2.4 Deploy

1. Click **Deploy**
2. Wait for build to complete
3. Note the deployment URL (e.g., `https://your-app.vercel.app`)
4. Test by visiting the URL

### 2.5 Verify Deployment

- Visit the home page - should load without errors
- Check build logs for any warnings
- Try navigating to `/split/test-id` - should return 404 (expected, no bills yet)

---

## Phase 3: Deploy Agent to Railway

### 3.1 Create New Project

1. Go to [railway.app/new](https://railway.app/new)
2. Click **Deploy from GitHub repo**
3. Select your repository
4. Railway will detect the `railway.toml` configuration

### 3.2 Configure Build Settings

The `railway.toml` file already configures these, but verify in the Railway dashboard:

- **Build Command:** `cd agent && npm install && npm run build`
- **Start Command:** `cd agent && npm run start`
- **Builder:** NIXPACKS

### 3.3 Set Environment Variables

Go to **Variables** tab and add:

| Variable | Value | Description |
|----------|-------|-------------|
| `PRIVATE_KEY` | `0x...` | Ethereum wallet private key for agent |
| `XMTP_ENV` | `production` | XMTP environment (or `dev` for testing) |
| `GOOGLE_API_KEY` | `AIza...` | Google Gemini API key for OCR |
| `MINIAPP_URL` | `https://your-app.vercel.app` | Your Vercel deployment URL (from Step 2.4) |
| `DATABASE_URL` | `postgresql://...` | Same as Vercel Postgres connection string |
| `NODE_ENV` | `production` | Node environment |

**IMPORTANT:** Remove the `0x` prefix from `PRIVATE_KEY` if present.

### 3.4 Deploy

1. Click **Deploy**
2. Watch the build logs
3. Deployment should complete in 2-3 minutes
4. Check logs for "✅ Connected to PostgreSQL database"

### 3.5 Verify Deployment

Check the Railway logs for:

```
🚀 Starting BaseSplit XMTP Agent...
✅ Connected to PostgreSQL database
✅ Database tables initialized
📝 Using wallet address: 0x...
✅ XMTP Client initialized
🎧 Listening for messages on conversation: ...
```

---

## Phase 4: Test End-to-End Flow

### 4.1 Send Test Receipt via XMTP

1. Install an XMTP-compatible app (e.g., Converse, dev.xmtp.chat)
2. Send a receipt image to the agent's wallet address
3. Check Railway logs for OCR processing

### 4.2 Verify Bill Creation

1. Check Railway logs for "✅ Created bill [ID]"
2. Copy the bill ID
3. Visit `https://your-app.vercel.app/split/[BILL_ID]`
4. Should see the bill with line items

### 4.3 Test Claiming Items

1. Connect your wallet to the miniapp
2. Switch to Base or Base Sepolia network
3. Select items to claim
4. Pay with USDC
5. Verify transaction completes
6. Check that items are marked as claimed

---

## Environment Variables Reference

### Miniapp (Vercel)

```env
# Required
POSTGRES_URL=postgresql://default:abc123@xyz.postgres.vercel-storage.com:5432/verceldb

# Optional
NEXT_PUBLIC_WC_PROJECT_ID=your_walletconnect_project_id
```

### Agent (Railway)

```env
# Required
PRIVATE_KEY=abc123def456...  # Without 0x prefix
XMTP_ENV=production
GOOGLE_API_KEY=AIzaSy...
MINIAPP_URL=https://your-app.vercel.app
DATABASE_URL=postgresql://default:abc123@xyz.postgres.vercel-storage.com:5432/verceldb
NODE_ENV=production

# Optional (legacy fallback)
GOOGLE_VISION_API_KEY=your_vision_api_key
```

---

## Troubleshooting

### Miniapp Issues

**"Cannot connect to database"**
- Verify `POSTGRES_URL` is set correctly in Vercel
- Check Vercel Postgres connection status
- Ensure schema was created (run `schema.sql`)

**"Module not found: @vercel/postgres"**
- Redeploy with clean build
- Check that `package.json` includes `@vercel/postgres`

**Page loads but shows no bills**
- This is expected if agent hasn't created any bills yet
- Check agent logs on Railway

### Agent Issues

**"Cannot connect to PostgreSQL"**
- Verify `DATABASE_URL` is correct in Railway
- Check database is accessible (test from Query tab)
- Ensure SSL is configured properly

**"XMTP initialization failed"**
- Verify `PRIVATE_KEY` is valid (without 0x prefix)
- Check `XMTP_ENV` is set to `production` or `dev`
- Ensure wallet has some ETH for gas (very small amount needed)

**"Google API key invalid"**
- Verify `GOOGLE_API_KEY` is correct
- Check API key has Gemini API enabled
- Ensure no extra spaces in the key

**Agent crashes on startup**
- Check Railway logs for error messages
- Verify all required environment variables are set
- Ensure `NODE_ENV=production` is set

### Database Issues

**"Foreign key constraint violation"**
- Ensure schema was created in correct order
- Re-run `schema.sql` if needed

**"Table does not exist"**
- Run the schema migration from Step 1.2
- Check Vercel Postgres Query tab for errors

---

## Monitoring & Logs

### Vercel Logs

- **Real-time logs:** Vercel Dashboard → Deployments → [Select deployment] → Logs
- **API errors:** Check Functions tab for serverless function errors

### Railway Logs

- **Real-time logs:** Railway Dashboard → [Your project] → Deployments tab
- **Filter logs:** Use search box to filter by error level
- **Download logs:** Click ⋯ menu → Download logs

### Database Monitoring

- **Query performance:** Vercel Postgres → Insights
- **Active connections:** Check connection pool status
- **Storage usage:** Monitor in Vercel Postgres dashboard

---

## Scaling Considerations

### Vercel (Miniapp)

- Automatically scales with traffic
- Serverless functions have 10-second timeout (sufficient for DB queries)
- Consider upgrading to Pro if you hit hobby plan limits

### Railway (Agent)

- Runs as single instance (sufficient for XMTP listener)
- Upgrade plan if you need more memory/CPU
- Agent automatically reconnects if connection drops

### Database

- Vercel Postgres free tier: 256 MB storage, 60 hours compute/month
- Upgrade to paid tier if you exceed limits
- Monitor query performance and add indexes if needed

---

## Security Best Practices

1. **Never commit `.env` files** - Use `.env.example` only
2. **Rotate private keys** regularly for the agent
3. **Use separate wallets** for dev/staging/production
4. **Enable 2FA** on Vercel and Railway accounts
5. **Restrict database access** - Only allow Vercel and Railway IPs
6. **Monitor suspicious activity** - Set up alerts for failed deployments
7. **Review API keys** periodically and rotate if compromised

---

## Rollback Procedure

### Vercel Rollback

1. Go to Deployments tab
2. Find previous working deployment
3. Click ⋯ menu → Promote to Production

### Railway Rollback

1. Go to Deployments tab
2. Click on previous working deployment
3. Click **Redeploy**

### Database Rollback

⚠️ **No easy rollback** - Vercel Postgres doesn't support automated backups on free tier
- Consider manual backups via `pg_dump` if needed
- For production, upgrade to paid tier with automated backups

---

## Cost Estimate

| Service | Free Tier | Paid Tier |
|---------|-----------|-----------|
| **Vercel** | 100 GB bandwidth, 100 GB hours serverless | $20/month (Pro) |
| **Railway** | $5 credit/month (pay-as-you-go after) | ~$5-10/month usage |
| **Vercel Postgres** | 256 MB storage, 60 hours compute | $12/month (256 MB) |
| **Google Gemini API** | Free tier (60 requests/min) | Pay-as-you-go |

**Estimated monthly cost:** $5-15 for low traffic, $30-50 for moderate traffic

---

## Next Steps After Deployment

1. Set up custom domain on Vercel
2. Configure monitoring and alerts
3. Set up automated backups for database
4. Implement rate limiting for API routes
5. Add analytics (Vercel Analytics, PostHog, etc.)
6. Create staging environment for testing
7. Set up CI/CD with GitHub Actions

---

## Support & Resources

- **Vercel Docs:** [vercel.com/docs](https://vercel.com/docs)
- **Railway Docs:** [docs.railway.app](https://docs.railway.app)
- **XMTP Docs:** [xmtp.org/docs](https://xmtp.org/docs)
- **Next.js Docs:** [nextjs.org/docs](https://nextjs.org/docs)

For issues with this deployment guide, please open an issue on GitHub.
