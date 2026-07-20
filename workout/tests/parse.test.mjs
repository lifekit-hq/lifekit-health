import { test } from 'node:test';
import assert from 'node:assert/strict';
import { parseExerciseInput, parseCardioInput, parseMuscleGroup, inferMuscleFromWeekday, withInferredMuscle } from '../dist/lib/parse.js';

test('parses basic exercise notation', () => {
  const [ex] = parseExerciseInput('bench 4x10@60');
  assert.equal(ex.name, 'bench');
  assert.equal(ex.sets.length, 4);
  assert.deepEqual(ex.sets[0], { reps: 10, weight_kg: 60 });
  assert.equal(ex.muscle, 'chest');
});

test('parses bodyweight sets', () => {
  const [ex] = parseExerciseInput('pullups 4x10@bw');
  assert.equal(ex.sets[0].weight_kg, 'bw');
  assert.equal(ex.muscle, 'back');
});

test('parses decimal weights', () => {
  const [ex] = parseExerciseInput('curl 3x12@12.5');
  assert.equal(ex.sets[0].weight_kg, 12.5);
});

test('parses comma-separated multi-exercise input', () => {
  const exs = parseExerciseInput('bench 4x10@60, incline-db 4x12@20, triceps 4x12@40');
  assert.equal(exs.length, 3);
  assert.equal(exs[1].name, 'incline-db');
  assert.equal(exs[1].muscle, 'chest');
  assert.equal(exs[2].muscle, 'arms');
});

test('rejects malformed input with a helpful error', () => {
  assert.throws(() => parseExerciseInput('bench 4 sets of 10'), /could not parse exercise/);
});

test('parseMuscleGroup accepts valid groups and defaults to other', () => {
  assert.equal(parseMuscleGroup('Chest'), 'chest');
  assert.equal(parseMuscleGroup('quads'), 'other');
  assert.equal(parseMuscleGroup(undefined), 'other');
});

test('weekday inference: Mon=back, Wed=legs, Fri=chest, else other', () => {
  assert.equal(inferMuscleFromWeekday(new Date('2026-07-20T12:00:00')), 'back'); // Monday
  assert.equal(inferMuscleFromWeekday(new Date('2026-07-22T12:00:00')), 'legs');
  assert.equal(inferMuscleFromWeekday(new Date('2026-07-24T12:00:00')), 'chest');
  assert.equal(inferMuscleFromWeekday(new Date('2026-07-25T12:00:00')), 'other');
});

test('withInferredMuscle enriches v0.2 entries and preserves existing tags', () => {
  const legacy = { name: 'squat', sets: [{ reps: 5, weight_kg: 100 }] };
  assert.equal(withInferredMuscle(legacy).muscle, 'legs');
  const tagged = { name: 'squat', sets: [], muscle: 'full' };
  assert.equal(withInferredMuscle(tagged).muscle, 'full');
});

test('parses cardio notation', () => {
  const c = parseCardioInput('incline-walk 20min @4.5kmh i6');
  assert.equal(c.type, 'incline-walk');
  assert.equal(c.minutes, 20);
  assert.equal(c.speed_kmh, 4.5);
  assert.equal(c.incline, 6);
  const run = parseCardioInput('run 5km 24min');
  assert.equal(run.distance_km, 5);
  assert.equal(run.minutes, 24);
});
