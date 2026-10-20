import bankJson from '../data/wordbank.json';
import { mount } from './app';
import type { Bank } from './types';

// Bootstrap only: everything testable lives in app.ts, views.ts, engine.ts.
const root = document.querySelector<HTMLElement>('#app');
if (root) mount({ bank: bankJson as Bank, root });
