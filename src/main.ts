import bankJson from '../data/wordbank.json';
import beeJson from '../data/bee.json';
import { mount } from './app';
import type { BeeDeck } from './bee';
import type { Bank } from './types';

// Bootstrap only: everything testable lives in app.ts, views.ts, engine.ts.
// Bee mode is a route, not a second app: same engine, dictation deck.
const root = document.querySelector<HTMLElement>('#app');
const beeMode = window.location.hash.startsWith('#bee');
if (root) {
  mount({
    bank: bankJson as Bank,
    root,
    ...(beeMode ? { beeDeck: beeJson as BeeDeck } : {}),
  });
}
