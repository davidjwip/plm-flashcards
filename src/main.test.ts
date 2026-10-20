// @vitest-environment jsdom
import { describe, expect, it, vi } from 'vitest';

describe('bootstrap', () => {
  it('mounts the app into #app', async () => {
    vi.resetModules();
    document.body.innerHTML = '<main id="app"></main>';
    await import('./main');
    expect(document.querySelector('#app')!.textContent).toContain('Sound practice');
  });

  it('does nothing when the root element is missing', async () => {
    vi.resetModules();
    document.body.innerHTML = '<div></div>';
    await expect(import('./main')).resolves.toBeTruthy();
    expect(document.body.textContent).toBe('');
  });
});
