import { test, before } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, writeFileSync, readFileSync, readdirSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

// HOME must point at a temp dir before storage.ts is imported (it reads HOME at load).
// Runs on node's built-in TypeScript stripping (Node >= 22.18), so no build step is needed.
const home = mkdtempSync(join(tmpdir(), 'nutrition-claw-storage-'));
process.env.HOME = home;
const base = join(home, '.nutrition-claw');
const logs = join(base, 'logs');
let storage;

before(async () => {
  mkdirSync(logs, { recursive: true });
  storage = await import('../src/lib/storage.ts');
});

const meal = { id: 'm1', name: 'oats', time: '08:00', ingredients: [] };
const tmpLeft = dir => readdirSync(dir).filter(f => f.endsWith('.tmp'));

test('missing files read as empty', () => {
  assert.deepEqual(storage.readDayLog('2026-01-01'), []);
  assert.deepEqual(storage.readGoals(), {});
  assert.deepEqual(storage.readFoods(), {});
});

test('corrupt day log throws and is left untouched', () => {
  const f = join(logs, '2026-01-02.json');
  writeFileSync(f, '[{"id": "m1", "na');
  assert.throws(() => storage.readDayLog('2026-01-02'), /corrupt JSON in .*2026-01-02\.json/);
  assert.equal(readFileSync(f, 'utf8'), '[{"id": "m1", "na');
});

test('corrupt goals and foods throw instead of reading as empty', () => {
  writeFileSync(join(base, 'goals.json'), '{"calories": ');
  writeFileSync(join(base, 'foods.json'), '{');
  assert.throws(() => storage.readGoals(), /corrupt JSON/);
  assert.throws(() => storage.readFoods(), /corrupt JSON/);
});

test('writes round-trip atomically and leave no temp files', () => {
  storage.writeDayLog('2026-01-03', [meal]);
  storage.writeDayLog('2026-01-03', [meal, { ...meal, id: 'm2' }]);
  assert.deepEqual(storage.readDayLog('2026-01-03').map(m => m.id), ['m1', 'm2']);
  storage.appendEducationLog('oats');
  assert.deepEqual([...storage.readEducationLog()], ['oats']);
  assert.deepEqual(tmpLeft(logs), []);
  assert.deepEqual(tmpLeft(base), []);
});

test('a failed write leaves the existing file intact', () => {
  storage.writeDayLog('2026-01-04', [meal]);
  const circular = {}; circular.self = circular;
  assert.throws(() => storage.writeDayLog('2026-01-04', circular));
  assert.deepEqual(storage.readDayLog('2026-01-04').map(m => m.id), ['m1']);
  assert.deepEqual(tmpLeft(logs), []);
});

test('invalid dates never become filenames', () => {
  for (const bad of ['../../etc/passwd', '2026-1-1', '2026-02-30', 'today', '2026-01-01.json', '']) {
    assert.throws(() => storage.readDayLog(bad), /invalid date/, bad);
    assert.throws(() => storage.writeDayLog(bad, []), /invalid date/, bad);
  }
});
