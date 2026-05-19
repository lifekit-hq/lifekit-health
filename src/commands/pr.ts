import { print, err } from '../lib/format.js';
import { listLogDates, readDayLog } from '../lib/storage.js';
import { findBestPR } from '../lib/analytics.js';
import type { Session } from '../lib/types.js';

export function prCommand(positionals: string[]): void {
  const exercise = positionals[0];
  if (!exercise) {
    err('pr requires an exercise name. example: workout-claw pr bench');
    process.exit(1);
  }

  const dated: Array<{ date: string; session: Session }> = [];
  for (const date of listLogDates()) {
    for (const session of readDayLog(date)) {
      dated.push({ date, session });
    }
  }

  const best = findBestPR(exercise, dated);
  if (!best) {
    print({ exercise, pr: null, message: `no logged sets found for "${exercise}"` });
    return;
  }
  print({
    exercise: best.exercise,
    estimated_1rm_kg: best.estimated_1rm_kg,
    from_set: {
      date: best.date,
      weight_kg: best.weight_kg,
      reps: best.reps,
    },
    formula: 'Epley: 1RM = weight × (1 + reps/30)',
  });
}
