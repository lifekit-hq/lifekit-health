import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

// LIFE_STATE_DIR must be set BEFORE the module is imported — BASE_DIR is
// computed at import time. This is also the test for the env override itself.
process.env.LIFE_STATE_DIR = mkdtempSync(join(tmpdir(), 'life-state-test-'));
const { ensureDirs, readState, mergeState, listStateDates } = await import('../dist/lib/storage.js');

test('LIFE_STATE_DIR override: store lands in the configured directory', () => {
  ensureDirs();
  mergeState('2026-01-01', { mood: 'good' });
  assert.deepEqual(listStateDates(), ['2026-01-01']);
});

test('merge semantics: second set only updates passed fields', () => {
  mergeState('2026-01-02', { mood: 'tired', energy: 4, soreness: ['chest'] });
  const merged = mergeState('2026-01-02', { energy: 7 });
  assert.equal(merged.mood, 'tired');          // preserved
  assert.equal(merged.energy, 7);              // updated
  assert.deepEqual(merged.soreness, ['chest']); // preserved
  assert.equal(merged.date, '2026-01-02');     // date pinned
});

test('readState returns null for missing or unparseable dates', () => {
  assert.equal(readState('1999-01-01'), null);
});

test('listStateDates sorts ascending', () => {
  mergeState('2025-12-31', { mood: 'great' });
  const dates = listStateDates();
  assert.deepEqual(dates, ['2025-12-31', '2026-01-01', '2026-01-02']);
});
