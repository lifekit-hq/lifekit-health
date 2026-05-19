import { print } from '../lib/format.js';
import { getLastSession } from '../lib/storage.js';
import { sessionSummary, exerciseTotals } from '../lib/analytics.js';
import { withInferredMuscle } from '../lib/parse.js';

export function lastCommand(): void {
  const result = getLastSession();
  if (!result) {
    print({ message: 'no sessions logged yet' });
    return;
  }
  const { date, session } = result;
  const sum = sessionSummary(date, session);
  print({
    date,
    id: session.id,
    time: session.time,
    muscle_group: session.muscle_group,
    total_sets: sum.total_sets,
    total_volume_kg: sum.total_volume_kg,
    exercises: session.exercises.map(ex => {
      const enriched = withInferredMuscle(ex);
      const t = exerciseTotals(ex);
      return {
        name: ex.name,
        muscle: enriched.muscle,
        sets: ex.sets.length,
        reps_per_set: ex.sets[0]?.reps,
        weight: ex.sets[0]?.weight_kg,
        total_volume_kg: t.total_volume_kg,
      };
    }),
    cardio: session.cardio.length ? session.cardio : undefined,
    notes: session.notes,
  });
}
