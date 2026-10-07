import { test, before } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, writeFileSync, readFileSync, readdirSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

// HOME must point at a temp dir before storage.js is imported (it reads HOME at load).
const home = mkdtempSync(join(tmpdir(), 'workout-claw-storage-'));
process.env.HOME = home;
const logs = join(home, '.workout-claw', 'logs');
let storage;

before(async () => {
  mkdirSync(logs, { recursive: true });
  storage = await import('../dist/lib/storage.js');
});

const session = { id: 'abc', time: '10:00', muscle_group: 'legs', exercises: [], cardio: [] };

test('missing day file reads as empty', () => {
  assert.deepEqual(storage.readDayLog('2026-01-01'), []);
});

test('corrupt JSON throws a clear error instead of reading as empty', () => {
  writeFileSync(join(logs, '2026-01-02.json'), '[{"id": "abc", "time"');
  assert.throws(() => storage.readDayLog('2026-01-02'), /corrupt JSON in .*2026-01-02\.json/);
  // and the next log must not overwrite the damaged file
  assert.throws(() => storage.appendSession('2026-01-02', session), /corrupt JSON/);
  assert.equal(readFileSync(join(logs, '2026-01-02.json'), 'utf8'), '[{"id": "abc", "time"');
});

test('writes are atomic: round-trips and leaves no temp files behind', () => {
  storage.appendSession('2026-01-03', session);
  storage.appendSession('2026-01-03', { ...session, id: 'def' });
  assert.deepEqual(storage.readDayLog('2026-01-03').map(s => s.id), ['abc', 'def']);
  assert.deepEqual(readdirSync(logs).filter(f => !f.endsWith('.json')), []);
  assert.equal(readdirSync(logs).some(f => f.endsWith('.tmp')), false);
});

test('a failed write leaves the existing file intact', () => {
  storage.writeDayLog('2026-01-04', [session]);
  const circular = {}; circular.self = circular;
  assert.throws(() => storage.writeDayLog('2026-01-04', circular));
  assert.deepEqual(storage.readDayLog('2026-01-04').map(s => s.id), ['abc']);
  assert.equal(readdirSync(logs).some(f => f.endsWith('.tmp')), false);
});

test('invalid dates never become filenames', () => {
  for (const bad of ['../../etc/passwd', '2026-1-1', '2026-02-30', 'today', '2026-01-01.json', '']) {
    assert.throws(() => storage.readDayLog(bad), /invalid date/, bad);
    assert.throws(() => storage.writeDayLog(bad, []), /invalid date/, bad);
  }
});

test('stray non-date .json files are skipped by cross-date listing', () => {
  rmSync(join(logs, '2026-01-02.json'));
  storage.writeDayLog('2026-01-05', [{ ...session, id: 'valid' }]);
  for (const stray of ['today.json', '2026-3-4.json']) writeFileSync(join(logs, stray), '[]');
  const dates = storage.listLogDates();
  assert.equal(dates.includes('today'), false);
  assert.equal(dates.includes('2026-3-4'), false);
  assert.equal(dates.includes('2026-01-05'), true);
  assert.equal(storage.findSessionById('valid').date, '2026-01-05');
  assert.equal(storage.findSessionById('missing'), null);
});
