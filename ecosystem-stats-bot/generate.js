/*!
 * CLI wrapper for owockibot Weekly Ecosystem Stats Generator
 * Usage:
 *   node generate.js            # live data from API
 *   node generate.js --sample   # use sample/dummy data
 */

const { generate } = require('./lib/generator');
const fs = require('fs');

async function main() {
  const useSample = process.argv.includes('--sample');
  const { stats, tweets } = await generate(useSample);

  console.log('===============================================');
  console.log('  owockibot Weekly Stats - ' + stats.weekRange);
  console.log('===============================================\n');

  tweets.forEach((tweet, i) => {
    console.log('-- Tweet ' + (i + 1) + '/' + tweets.length + ' (' + tweet.length + ' chars) --');
    console.log(tweet);
    console.log();
  });

  fs.writeFileSync(
    __dirname + '/last-stats.json',
    JSON.stringify(stats, null, 2)
  );
  console.log('Stats saved to last-stats.json');
}

main().catch(console.error);
