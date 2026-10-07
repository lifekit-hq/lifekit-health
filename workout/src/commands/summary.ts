import { getString, type ParsedArgs } from '../lib/args.js';
import { print } from '../lib/format.js';
import { readDayLog } from '../lib/storage.js';
import { sessionSummary, exerciseTotals } from '../lib/analytics.js';
import { resolveDate, withInferredMuscle } from '../lib/parse.js';

export function summaryCommand(flags: ParsedArgs['flags']): void {
  const date = resolveDate(getString(flags, 'date'));
  const log = readDayLog(date);

  if (log.length === 0) {
    print({ date, sessions: 0, message: 'no workouts logged' });
    return;
  }

  print({
    date,
    sessions: log.map(s => {
      const sum = sessionSummary(date, s);
      return {
        id: s.id,
        time: s.time,
        muscle_group: s.muscle_group,
        total_sets: sum.total_sets,
        total_volume_kg: sum.total_volume_kg,
        exercises: s.exercises.map(ex => {
          const enriched = withInferredMuscle(ex);
          const t = exerciseTotals(ex);
          return {
            name: ex.name,
            muscle: enriched.muscle,
            total_sets: t.total_sets,
            total_reps: t.total_reps,
            total_volume_kg: t.total_volume_kg,
            sets: ex.sets.map(set => ({
              reps: set.reps,
              weight_kg: set.weight_kg,
            })),
          };
        }),
        cardio: s.cardio.length ? s.cardio : undefined,
        notes: s.notes,
      };
    }),
  });
}
