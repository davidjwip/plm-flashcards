import bankJson from '../data/wordbank.json';
import beeJson from '../data/bee.json';
import { mount } from './app';
import type { BeeDeck } from './bee';
import type { Bank } from './types';

// Bootstrap only: everything testable lives in app.ts, views.ts, engine.ts.
// The bee deck is always mounted so the header toggle works from a plain load;
// the hash only chooses the initial mode.
const root = document.querySelector<HTMLElement>('#app');
if (root) {
  mount({
    bank: bankJson as Bank,
    beeDeck: beeJson as BeeDeck,
    root,
  });
}
