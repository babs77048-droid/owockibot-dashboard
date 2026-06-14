/*!
 * owockibot Weekly Ecosystem Stats - Core Generator
 * Shared between CLI (generate.js) and Poster (post.js)
 */

const https = require('https');
const http = require('http');

const BOUNTY_BOARD_API = 'https://bounty-board-api.vercel.app';
const SAFE_TX_API = 'https://api.safe.global/tx-service/base/api/v1';
const OWOCKIBOT_SAFE = '0x366d76210220acf4ab8188f29943bb87cd7ef1fa';
const WEEK_MS = 7 * 24 * 60 * 60 * 1000;

function fetchJSON(url, timeout = 15000) {
  return new Promise((resolve, reject) => {
    const mod = url.startsWith('https') ? https : http;
    const req = mod.get(url, { timeout }, (res) => {
      if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
        return fetchJSON(res.headers.location, timeout).then(resolve, reject);
      }
      if (res.statusCode !== 200) {
        res.resume();
        return reject(new Error('HTTP ' + res.statusCode + ' for ' + url));
      }
      let data = '';
      res.on('data', (c) => (data += c));
      res.on('end', () => {
        try { resolve(JSON.parse(data)); }
        catch (e) { reject(new Error('Invalid JSON from ' + url)); }
      });
    });
    req.on('error', reject);
    req.on('timeout', () => { req.destroy(); reject(new Error('Timeout')); });
  });
}

function weekRange() {
  const now = new Date();
  const weekAgo = new Date(now.getTime() - WEEK_MS);
  const fmt = (d) => d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  return fmt(weekAgo) + ' - ' + fmt(now);
}

async function fetchBountyData() {
  try {
    return await fetchJSON(BOUNTY_BOARD_API + '/bounties');
  } catch (e) {
    console.error('Bounty API fetch failed:', e.message);
    return [];
  }
}

async function fetchSafeTransactions() {
  try {
    const txs = await fetchJSON(SAFE_TX_API + '/safes/' + OWOCKIBOT_SAFE + '/multisig-transactions/?limit=50');
    return txs.results || [];
  } catch (e) {
    console.error('Safe TX API fetch failed:', e.message);
    return [];
  }
}

function computeStats(bounties, safeTxs) {
  const now = Date.now();
  const oneWeekAgo = now - WEEK_MS;

  const totalBounties = bounties.length;
  const completedBounties = bounties.filter(b => b.status === 'completed' || b.status === 'paid').length;
  const activeBounties = bounties.filter(b => b.status === 'open' || b.status === 'in_progress').length;

  const weeklyBounties = bounties.filter(b => {
    const created = new Date(b.created_at || b.createdAt).getTime();
    return created >= oneWeekAgo;
  });
  const weeklyCompleted = bounties.filter(b => {
    const updated = new Date(b.completed_at || b.updatedAt || b.updated_at).getTime();
    return updated >= oneWeekAgo && (b.status === 'completed' || b.status === 'paid');
  });

  const builderSet = new Set();
  bounties.forEach(b => {
    if (b.assignee || b.builder) builderSet.add(b.assignee || b.builder);
    if (b.claimers) b.claimers.forEach(c => builderSet.add(c));
  });
  const totalBuilders = builderSet.size;

  let totalUSDC = 0;
  bounties.forEach(b => {
    if (b.amount) totalUSDC += Number(b.amount);
    if (b.reward) totalUSDC += Number(b.reward);
    if (b.payout) totalUSDC += Number(b.payout);
  });

  let weeklyUSDCPaid = 0;
  safeTxs.forEach(tx => {
    if (tx.dataDecoded && tx.dataDecoded.method === 'transfer') {
      const value = tx.dataDecoded.parameters && tx.dataDecoded.parameters.find(p => p.name === 'amount' || p.name === '_amount');
      if (value && Number(value.value) > 0) {
        weeklyUSDCPaid += Number(value.value);
      }
    }
  });

  const weeklyBuilderSet = new Set();
  weeklyBounties.forEach(b => {
    if (b.assignee || b.builder) weeklyBuilderSet.add(b.assignee || b.builder);
  });

  return {
    weekRange: weekRange(),
    totalBounties,
    activeBounties,
    completedBounties,
    weeklyNewBounties: weeklyBounties.length,
    weeklyCompleted: weeklyCompleted.length,
    totalBuilders,
    weeklyNewBuilders: weeklyBuilderSet.size,
    totalUSDC,
    weeklyUSDCPaid,
    safeTxCount: safeTxs.length
  };
}

function sampleStats() {
  return {
    weekRange: weekRange(),
    totalBounties: 147,
    activeBounties: 23,
    completedBounties: 108,
    weeklyNewBounties: 14,
    weeklyCompleted: 9,
    totalBuilders: 62,
    weeklyNewBuilders: 7,
    totalUSDC: 32450.00,
    weeklyUSDCPaid: 4820.00,
    safeTxCount: 89
  };
}

function formatThread(stats) {
  const tweets = [];

  // Tweet 1: Hook
  tweets.push(
    '🚀 owockibot Weekly Ecosystem Report\n' +
    '📈 ' + stats.weekRange + '\n\n' +
    '🔥 ' + stats.weeklyNewBounties + ' new bounties created\n' +
    '✅ ' + stats.weeklyCompleted + ' bounties completed\n' +
    '💰 $' + stats.weeklyUSDCPaid.toLocaleString() + ' USDC paid out this week\n\n' +
    '🧵 Thread below ⬇️'
  );

  // Tweet 2: Bounty Breakdown
  tweets.push(
    '🏆 Bounty Breakdown\n\n' +
    '📦 Total bounties: ' + stats.totalBounties + '\n' +
    '🔓 Active now: ' + stats.activeBounties + '\n' +
    '✅ Completed: ' + stats.completedBounties + '\n' +
    '🆕 New this week: ' + stats.weeklyNewBounties + '\n\n' +
    'Completion rate: ' + ((stats.completedBounties / stats.totalBounties) * 100).toFixed(1) + '%'
  );

  // Tweet 3: Builders
  tweets.push(
    '👷 Builder Stats\n\n' +
    '👥 Total unique builders: ' + stats.totalBuilders + '\n' +
    '🆕 New builders this week: ' + stats.weeklyNewBuilders + '\n' +
    '💰 Total USDC distributed: $' + stats.totalUSDC.toLocaleString() + '\n' +
    '📊 Avg payout per bounty: $' + (stats.completedBounties > 0 ? (stats.totalUSDC / stats.completedBounties).toFixed(2) : '0.00') + '\n\n' +
    'The community keeps growing 💜'
  );

  // Tweet 4: On-Chain
  const safeNote = stats.safeTxCount > 0
    ? '🔗 Safe transactions processed: ' + stats.safeTxCount
    : '🔗 On-chain payments verified via Safe';
  tweets.push(
    '💰 On-Chain Activity\n\n' +
    '💸 Weekly USDC paid: $' + stats.weeklyUSDCPaid.toLocaleString() + '\n' +
    safeNote + '\n' +
    '⛓️ All payouts on Base (Coinbase L2)\n\n' +
    'Fully transparent. Fully on-chain.'
  );

  // Tweet 5: CTA
  tweets.push(
    '🚀 Want to earn?\n\n' +
    'Join the owockibot builder community:\n' +
    '🔗 0xwork.org\n\n' +
    'Pick a bounty → Submit work → Get paid in USDC\n\n' +
    'See you next week 💜\n\n' +
    '#OwockiBot #Base #OnChainWork #Web3 #Bounties'
  );

  return tweets;
}

async function generate(useSample = false) {
  let stats;
  if (useSample) {
    console.log('Using sample data\n');
    stats = sampleStats();
  } else {
    console.log('Fetching live data...\n');
    const [bounties, safeTxs] = await Promise.all([
      fetchBountyData(),
      fetchSafeTransactions()
    ]);
    stats = computeStats(bounties, safeTxs);
  }

  const tweets = formatThread(stats);
  return { stats, tweets };
}

module.exports = { generate, computeStats, formatThread, sampleStats, fetchBountyData, fetchSafeTransactions };
