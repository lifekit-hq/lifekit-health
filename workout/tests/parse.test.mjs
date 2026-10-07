import { test } from 'node:test';
import assert from 'node:assert/strict';
import { parseExerciseInput, parseCardioInput, parseMuscleGroup, inferMuscleFromExercises, withInferredMuscle } from '../dist/lib/parse.js';

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

test('session muscle is inferred from the exercises, not the weekday', () => {
  const legs = parseExerciseInput('squat 4x5@100, leg-press 3x10@150, leg-curl 3x12@40');
  assert.equal(inferMuscleFromExercises(legs), 'legs');
  const mixed = parseExerciseInput('bench 3x8@60, pullups 3x8@bw');
  assert.equal(inferMuscleFromExercises(mixed), 'full'); // tie between chest and back
  const majority = parseExerciseInput('bench 4x8@60, pullups 3x8@bw');
  assert.equal(inferMuscleFromExercises(majority), 'chest');
  assert.equal(inferMuscleFromExercises([], true), 'cardio');
  assert.equal(inferMuscleFromExercises(parseExerciseInput('zercher-carry 3x10@40')), 'other');
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

const sets = (input) => parseExerciseInput(input)[0].sets;

test('accepts spaces in exercise names (normalized to dashes)', () => {
  const [ex] = parseExerciseInput('Bench Press 3x8@60');
  assert.equal(ex.name, 'bench-press');
  assert.equal(ex.sets.length, 3);
  assert.equal(ex.muscle, 'chest');
  assert.equal(parseExerciseInput('incline db press 4x12@20')[0].name, 'incline-db-press');
});

test('accepts kg and lb suffixes (lb stored as kg)', () => {
  assert.deepEqual(sets('bench 3x8@60kg')[0], { reps: 8, weight_kg: 60 });
  assert.deepEqual(sets('bench 3x8@60 kg')[0], { reps: 8, weight_kg: 60 });
  assert.deepEqual(sets('bench 1x5@135lb')[0], { reps: 5, weight_kg: 61.23 });
  assert.deepEqual(sets('curl 3x10@12.5KG')[0], { reps: 10, weight_kg: 12.5 });
});

test('per-set reps with one weight: 8,8,6@60', () => {
  assert.deepEqual(sets('bench 8,8,6@60'), [
    { reps: 8, weight_kg: 60 }, { reps: 8, weight_kg: 60 }, { reps: 6, weight_kg: 60 },
  ]);
});

test('per-set reps and weights: 8@60,6@65', () => {
  assert.deepEqual(sets('bench 8@60,6@65'), [
    { reps: 8, weight_kg: 60 }, { reps: 6, weight_kg: 65 },
  ]);
  assert.deepEqual(sets('bench 8@60kg, 6@65kg'), [
    { reps: 8, weight_kg: 60 }, { reps: 6, weight_kg: 65 },
  ]);
});

test('per-set lists do not swallow the next exercise', () => {
  const exs = parseExerciseInput('bench press 8,8,6@60, squat 3x5@100, pullups 8,6@bw');
  assert.deepEqual(exs.map(e => e.name), ['bench-press', 'squat', 'pullups']);
  assert.deepEqual(exs.map(e => e.sets.length), [3, 3, 2]);
  assert.equal(exs[2].sets[0].weight_kg, 'bw');
});

test('rejects set lists with no weight and other garbage', () => {
  assert.throws(() => parseExerciseInput('bench 8,8,6'), /could not parse exercise/);
  assert.throws(() => parseExerciseInput('bench'), /could not parse exercise/);
  assert.throws(() => parseExerciseInput('8@60'), /could not parse exercise/);
  assert.throws(() => parseExerciseInput('bench 3x8@60 extra'), /could not parse exercise/);
  assert.throws(() => parseExerciseInput('bench 999x8@60'), /could not parse exercise/);
});

test('todayISO uses the local calendar date, not UTC', async () => {
  const { todayISO } = await import('../dist/lib/dates.js');
  assert.equal(todayISO(new Date(2026, 5, 1, 0, 30)), '2026-06-01'); // 00:30 local, whatever the zone
  assert.equal(todayISO(new Date(2026, 11, 31, 23, 59)), '2026-12-31');
});
