import type { ExerciseEntry, ExerciseTotals, SetEntry, Session, SessionSummary, PRRecord } from './types.js';

export function setVolumeKg(set: SetEntry): number {
  if (set.weight_kg === 'bw') return 0;
  return set.weight_kg * set.reps;
}

export function exerciseTotals(ex: ExerciseEntry): ExerciseTotals {
  let total_reps = 0;
  let total_volume_kg = 0;
  for (const s of ex.sets) {
    total_reps += s.reps;
    total_volume_kg += setVolumeKg(s);
  }
  return {
    total_sets: ex.sets.length,
    total_reps,
    total_volume_kg: Math.round(total_volume_kg * 100) / 100,
  };
}

export function sessionSummary(date: string, s: Session): SessionSummary {
  let total_sets = 0;
  let total_volume_kg = 0;
  for (const ex of s.exercises) {
    const t = exerciseTotals(ex);
    total_sets += t.total_sets;
    total_volume_kg += t.total_volume_kg;
  }
  return {
    date,
    muscle_group: s.muscle_group,
    exercises: s.exercises.length,
    total_sets,
    total_volume_kg: Math.round(total_volume_kg * 100) / 100,
  };
}

/**
 * Epley formula for estimated 1-rep max.
 *   1RM = weight × (1 + reps/30)
 * Returns 0 for bodyweight sets (no weight to estimate from).
 */
export function epley1RM(weight_kg: number | 'bw', reps: number): number {
  if (weight_kg === 'bw') return 0;
  if (reps <= 0) return 0;
  return Math.round(weight_kg * (1 + reps / 30) * 100) / 100;
}

/**
 * Scan a list of (date, session) tuples for the best estimated 1RM of a given exercise.
 */
export function findBestPR(exercise: string, dated: Array<{ date: string; session: Session }>): PRRecord | null {
  const target = exercise.toLowerCase();
  let best: PRRecord | null = null;
  for (const { date, session } of dated) {
    for (const ex of session.exercises) {
      if (ex.name.toLowerCase() !== target) continue;
      for (const s of ex.sets) {
        if (s.weight_kg === 'bw') continue;
        const est = epley1RM(s.weight_kg, s.reps);
        if (best === null || est > best.estimated_1rm_kg) {
          best = {
            exercise: ex.name,
            date,
            weight_kg: s.weight_kg,
            reps: s.reps,
            estimated_1rm_kg: est,
          };
        }
      }
    }
  }
  return best;
}
