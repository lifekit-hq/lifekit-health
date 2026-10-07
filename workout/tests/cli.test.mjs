import { test } from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { mkdtempSync, mkdirSync, writeFileSync, readFileSync, existsSync, readdirSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { parse } from 'yaml';

const bin = join(dirname(fileURLToPath(import.meta.url)), '..', 'bin', 'workout-claw.js');

function run(home, ...args) {
  const r = spawnSync(process.execPath, [bin, ...args], { env: { ...process.env, HOME: home }, encoding: 'utf8' });
  return { code: r.status, out: r.stdout, err: r.stderr };
}
const tmpHome = () => mkdtempSync(join(tmpdir(), 'workout-claw-cli-'));
const day = (home, date) => JSON.parse(readFileSync(join(home, '.workout-claw', 'logs', `${date}.json`), 'utf8'));

test('--date files the session under that date; muscle comes from the exercises', () => {
  const home = tmpHome();
  const r = run(home, 'log', 'squat 4x5@100, leg-curl 3x12@40', '--date', '2026-03-04');
  assert.equal(r.code, 0, r.err);
  assert.equal(parse(r.out).logged.date, '2026-03-04');
  const [s] = day(home, '2026-03-04');
  assert.equal(s.muscle_group, 'legs'); // 2026-03-04 is a Wednesday; no hardcoded split either way
  assert.equal(run(home, 'log', 'bench 3x8@60', '--date', '2026-03-02').out.includes('muscle_group: chest'), true); // Monday
});

test('default date is the local date, not UTC', () => {
  const home = tmpHome();
  const r = spawnSync(process.execPath, [bin, 'log', 'bench 3x8@60'], {
    env: { ...process.env, HOME: home, TZ: 'Pacific/Kiritimati' }, // UTC+14: local date is ahead of UTC for most of the day
    encoding: 'utf8',
  });
  assert.equal(r.status, 0, r.stderr);
  const local = new Intl.DateTimeFormat('en-CA', { timeZone: 'Pacific/Kiritimati' }).format(new Date());
  assert.equal(parse(r.stdout).logged.date, local);
});

test('invalid --date is rejected before any file is written', () => {
  const home = tmpHome();
  for (const bad of ['../x', '2026-13-01', 'yesterday', '2026-02-30']) {
    const r = run(home, 'log', 'bench 3x8@60', '--date', bad);
    assert.equal(r.code, 1, bad);
    assert.match(r.err, /invalid date/);
    assert.equal(run(home, 'summary', '--date', bad).code, 1);
  }
  assert.deepEqual(readdirSync(join(home, '.workout-claw', 'logs')), []);
});

test('optional config split is used when set; absent config means no weekday guess', () => {
  const home = tmpHome();
  const noConfig = run(home, 'log', 'zercher-carry 3x10@40', '--date', '2026-03-04'); // Wednesday
  assert.match(noConfig.out, /muscle_group: other/);
  mkdirSync(join(home, '.workout-claw'), { recursive: true });
  writeFileSync(join(home, '.workout-claw', 'config.json'), JSON.stringify({ split: { wed: 'legs' } }));
  assert.match(run(home, 'log', 'zercher-carry 3x10@40', '--date', '2026-03-04').out, /muscle_group: legs/);
  assert.match(run(home, 'log', 'zercher-carry 3x10@40', '--date', '2026-03-05').out, /muscle_group: other/); // Thursday
  assert.match(run(home, 'log', 'bench 3x8@60', '--date', '2026-03-04', '--muscle', 'chest').out, /muscle_group: chest/);
});

test('new input forms log through the CLI', () => {
  const home = tmpHome();
  const r = run(home, 'log', 'bench press 8@60kg,6@65kg, squat 8,8,6@100', '--date', '2026-03-04');
  assert.equal(r.code, 0, r.err);
  const [s] = day(home, '2026-03-04');
  assert.deepEqual(s.exercises.map(e => e.name), ['bench-press', 'squat']);
  assert.deepEqual(s.exercises[0].sets, [{ reps: 8, weight_kg: 60 }, { reps: 6, weight_kg: 65 }]);
  assert.deepEqual(s.exercises[1].sets.map(x => x.reps), [8, 8, 6]);
});

test('a corrupt day file fails loudly and is left untouched', () => {
  const home = tmpHome();
  mkdirSync(join(home, '.workout-claw', 'logs'), { recursive: true });
  const f = join(home, '.workout-claw', 'logs', '2026-03-04.json');
  writeFileSync(f, '[{"id":');
  const r = run(home, 'log', 'bench 3x8@60', '--date', '2026-03-04');
  assert.equal(r.code, 1);
  assert.match(r.err, /corrupt JSON/);
  assert.equal(readFileSync(f, 'utf8'), '[{"id":');
  assert.equal(existsSync(f), true);
});
