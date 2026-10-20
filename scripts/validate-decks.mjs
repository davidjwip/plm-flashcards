// Deck validator: every word must be decodable from the patterns already
// taught at its unit. Deliberately a stub until the first deck lands — it
// exits 0 and says so, rather than pretending to have checked anything.
import { existsSync, readdirSync } from 'node:fs';

const DECKS = new URL('../decks/', import.meta.url);

if (!existsSync(DECKS)) {
  console.log('validate:decks — no decks yet (nothing checked)');
  process.exit(0);
}

const files = readdirSync(DECKS).filter((f) => f.endsWith('.json'));
if (files.length === 0) {
  console.log('validate:decks — decks/ exists but is empty (nothing checked)');
  process.exit(0);
}

console.error(
  `validate:decks — ${files.length} deck file(s) found but no validator implemented yet. Failing loudly.`,
);
process.exit(1);
