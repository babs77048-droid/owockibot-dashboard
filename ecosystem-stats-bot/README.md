# owockibot Weekly Ecosystem Stats Twitter Bot

Generates a weekly stats summary for the owockibot ecosystem and posts it as a Twitter/X thread.

## Stats Tracked
- Total bounties created, completed, and paid out
- Active builders count
- Total USDC distributed
- Weekly vs all-time comparisons
- On-chain Safe transaction data (Base L2)

## Setup

1. Install dependencies:
   ```bash
   npm install
   ```

2. Copy `.env.example` to `.env` and fill in your Twitter API credentials:
   ```bash
   cp .env.example .env
   ```

3. Your `.env` should have:
   ```
   TWITTER_CONSUMER_KEY=your_consumer_key
   TWITTER_CONSUMER_SECRET=your_consumer_secret
   TWITTER_ACCESS_TOKEN=your_access_token
   TWITTER_ACCESS_TOKEN_SECRET=your_access_token_secret
   ```

## Usage

### Generate stats (preview only)
```bash
# With live API data
node generate.js

# With sample/dummy data
node generate.js --sample
```

### Post to Twitter
```bash
# Dry run (prints tweets without posting)
export $(cat .env | xargs) && node post.js --sample --dry-run

# Post with sample data
export $(cat .env | xargs) && node post.js --sample

# Post with live data
export $(cat .env | xargs) && node post.js
```

### Automate weekly
Add a cron job to run every Monday at 10am UTC:
```bash
0 10 * * 1 cd /path/to/ecosystem-stats-bot && export $(cat .env | xargs) && node post.js >> logs/weekly.log 2>&1
```

## Tweet Thread Format

The bot posts a 5-tweet thread:

1. **Hook** - Weekly overview with key numbers
2. **Bounty Breakdown** - Total, active, completed, new this week
3. **Builder Stats** - Unique builders, new this week, avg payout
4. **On-Chain Activity** - USDC paid, Safe transactions, Base L2
5. **CTA** - Join the community, hashtags

All tweets are under 280 characters.

## Data Sources
- Bounty Board API: `https://bounty-board-api.vercel.app/bounties`
- Safe Transaction API: `https://api.safe.global/tx-service/base/api/v1`
- Falls back gracefully if APIs are unavailable

## Output
- Console: formatted tweet thread
- `last-stats.json`: raw stats data for downstream use
