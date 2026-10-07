import { test } from 'node:test';
import assert from 'node:assert/strict';
import { inferMuscleFromName } from '../dist/lib/exercise-map.js';

test('regression: barbell-press maps to chest (was silently "other" in real logs)', () => {
  assert.equal(inferMuscleFromName('barbell-press'), 'chest');
  assert.equal(inferMuscleFromName('bb-press'), 'chest');
});

test('order-dependent cases resolve to the intended group', () => {
  // 'dip' is chest, but tricep/bench variants must hit arms first
  assert.equal(inferMuscleFromName('dip'), 'chest');
  assert.equal(inferMuscleFromName('tricep-dip'), 'arms');
  assert.equal(inferMuscleFromName('bench-dip'), 'arms');
  // 'legpress' must not be captured by any press keyword upstream of legs
  assert.equal(inferMuscleFromName('leg-press'), 'legs');
  assert.equal(inferMuscleFromName('shoulder-press'), 'shoulders');
});

test('one representative per group', () => {
  assert.equal(inferMuscleFromName('hanging-leg-raise'), 'core');
  assert.equal(inferMuscleFromName('hammer-curl'), 'arms');
  assert.equal(inferMuscleFromName('lateral-raise'), 'shoulders');
  assert.equal(inferMuscleFromName('deadlift'), 'back');
  assert.equal(inferMuscleFromName('incline-db-press'), 'chest');
  assert.equal(inferMuscleFromName('bulgarian-split-squat'), 'legs');
  assert.equal(inferMuscleFromName('treadmill'), 'cardio');
});

test('normalization: case, dashes, underscores, spaces', () => {
  assert.equal(inferMuscleFromName('Lat_Pull Down'), 'back');
  assert.equal(inferMuscleFromName('CABLE FLY'), 'chest');
});

test('unknown exercises fall back to other', () => {
  assert.equal(inferMuscleFromName('zercher-carry'), 'other');
});

// Probe table from the ecosystem audit (report 4.3): the most specific keyword wins.
const PROBES = [
  ['leg-curl', 'legs'], ['curl', 'arms'], ['hammer-curl', 'arms'], ['bicep-curl', 'arms'],
  ['leg-press', 'legs'], ['hip-thrust', 'legs'], ['calf-raise', 'legs'], ['bulgarian-split-squat', 'legs'],
  ['face-pull', 'back'], ['romanian-deadlift', 'back'], ['chest-supported-row', 'back'], ['lat-pulldown', 'back'],
  ['walking-lunge', 'legs'], ['rowing', 'cardio'], ['reverse-fly', 'shoulders'], ['cable-fly', 'chest'],
  ['incline-db-curl', 'arms'], ['incline-dumbbell-curl', 'arms'], ['incline-bench-curl', 'arms'],
  ['decline-bench-tricep-extension', 'arms'], ['incline-bench-tricep-extension', 'arms'],
  ['incline-db-row', 'back'], ['incline-db-shrug', 'back'], ['incline-bench-row', 'back'], ['dumbbell-bench-row', 'back'],
  ['incline-db-rear-delt-fly', 'shoulders'],
  ['bench', 'chest'], ['incline-bench', 'chest'], ['incline-db', 'chest'], ['bench-press', 'chest'], ['incline-db-fly', 'chest'],
  ['incline-db-press', 'chest'], ['decline-bench-press', 'chest'],
];
for (const [name, muscle] of PROBES) {
  test(`probe: ${name} -> ${muscle}`, () => {
    assert.equal(inferMuscleFromName(name), muscle);
  });
}
