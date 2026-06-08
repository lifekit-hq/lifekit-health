import { getNumber, getString, type ParsedArgs } from '../lib/args.js';
import { print } from '../lib/format.js';
import { listLogDates, readDayLog } from '../lib/storage.js';
import { sessionSummary } from '../lib/analytics.js';
import { parseMuscleGroup, withInferredMuscle } from '../lib/parse.js';

export function historyCommand(flags: ParsedArgs['flags']): void {
  const muscleFlag = getString(flags, 'muscle');
  const exerciseFilter = getString(flags, 'exercise')?.toLowerCase();
  const weeks = getNumber(flags, 'weeks') ?? 4;
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - weeks * 7);
  const cutoffISO = cutoff.toISOString().slice(0, 10);

  const muscle = muscleFlag ? parseMuscleGroup(muscleFlag) : null;
  const sessions: Array<Record<string, unknown>> = [];

  for (const date of listLogDates()) {
    if (date < cutoffISO) continue;
    const log = readDayLog(date);
    for (const session of log) {
      const enrichedExercises = session.exercises.map(withInferredMuscle);
      if (muscle) {
        const sessionMatches = session.muscle_group === muscle;
        const exerciseMatches = enrichedExercises.some(ex => ex.muscle === muscle);
        if (!sessionMatches && !exerciseMatches) continue;
      }
      if (exerciseFilter && !session.exercises.some(ex => ex.name.toLowerCase() === exerciseFilter)) continue;
      const sum = sessionSummary(date, session);
      sessions.push({
        date,
        time: session.time,
        muscle_group: session.muscle_group,
        exercises: enrichedExercises.map(ex => ({ name: ex.name, muscle: ex.muscle })),
        total_sets: sum.total_sets,
        total_volume_kg: sum.total_volume_kg,
        notes: session.notes,
      });
    }
  }

  print({
    filter: {
      muscle: muscle ?? 'all',
      exercise: exerciseFilter ?? 'all',
      weeks_back: weeks,
      since: cutoffISO,
    },
    count: sessions.length,
    sessions: sessions.reverse(),
  });
}
