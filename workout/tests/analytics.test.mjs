import { test } from 'node:test';
import assert from 'node:assert/strict';
import { setVolumeKg, exerciseTotals, sessionSummary, epley1RM, findBestPR } from '../dist/lib/analytics.js';

test('set volume: weight × reps, bodyweight contributes 0 (documented v0.4 gap)', () => {
  assert.equal(setVolumeKg({ reps: 10, weight_kg: 60 }), 600);
  assert.equal(setVolumeKg({ reps: 10, weight_kg: 'bw' }), 0);
});

test('exercise totals aggregate sets and round to 2dp', () => {
  const t = exerciseTotals({ name: 'curl', sets: [
    { reps: 12, weight_kg: 12.5 },
    { reps: 10, weight_kg: 12.5 },
  ]});
  assert.deepEqual(t, { total_sets: 2, total_reps: 22, total_volume_kg: 275 });
});

test('session summary sums across exercises', () => {
  const s = sessionSummary('2026-07-20', {
    muscle_group: 'chest',
    exercises: [
      { name: 'bench', sets: [{ reps: 10, weight_kg: 60 }] },
      { name: 'fly', sets: [{ reps: 15, weight_kg: 10 }] },
    ],
  });
  assert.equal(s.total_sets, 2);
  assert.equal(s.total_volume_kg, 750);
  assert.equal(s.exercises, 2);
});

test('Epley 1RM formula and edge cases', () => {
  assert.equal(epley1RM(100, 5), 116.67);
  assert.equal(epley1RM(60, 1), 62);
  assert.equal(epley1RM('bw', 10), 0);
  assert.equal(epley1RM(100, 0), 0);
});

test('findBestPR picks the highest estimated 1RM across dates and sets', () => {
  const dated = [
    { date: '2026-07-01', session: { muscle_group: 'chest', exercises: [
      { name: 'bench', sets: [{ reps: 10, weight_kg: 60 }, { reps: 5, weight_kg: 70 }] },
    ]}},
    { date: '2026-07-15', session: { muscle_group: 'chest', exercises: [
      { name: 'bench', sets: [{ reps: 3, weight_kg: 80 }] },
      { name: 'squat', sets: [{ reps: 5, weight_kg: 120 }] },
    ]}},
  ];
  const pr = findBestPR('Bench', dated);
  assert.equal(pr.date, '2026-07-15');
  assert.equal(pr.weight_kg, 80);
  assert.equal(pr.estimated_1rm_kg, 88);
  assert.equal(findBestPR('ohp', dated), null);
});
