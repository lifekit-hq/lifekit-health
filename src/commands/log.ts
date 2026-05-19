import { nanoid } from 'nanoid';
import { getString, type ParsedArgs } from '../lib/args.js';
import { print, err } from '../lib/format.js';
import { appendSession } from '../lib/storage.js';
import { parseExerciseInput, parseCardioInput, parseMuscleGroup, inferMuscleFromWeekday, todayISO, nowHHMM } from '../lib/parse.js';
import { sessionSummary } from '../lib/analytics.js';
import type { Session, CardioEntry } from '../lib/types.js';

export function logCommand(positionals: string[], flags: ParsedArgs['flags']): void {
  const input = positionals.join(' ').trim();
  if (!input && !flags['cardio']) {
    err('log requires exercise input. example: workout-claw log "bench 4x10@60, incline-db 4x12@20"');
    process.exit(1);
  }

  const date = getString(flags, 'date') ?? todayISO();
  const time = getString(flags, 'time') ?? nowHHMM();
  const muscleFlag = getString(flags, 'muscle');
  const muscle_group = muscleFlag
    ? parseMuscleGroup(muscleFlag)
    : inferMuscleFromWeekday(new Date(date));

  let exercises;
  try {
    exercises = input ? parseExerciseInput(input) : [];
  } catch (e) {
    err(String((e as Error).message));
    process.exit(1);
  }

  const cardio: CardioEntry[] = [];
  const cardioFlag = getString(flags, 'cardio');
  if (cardioFlag) cardio.push(parseCardioInput(cardioFlag));

  const session: Session = {
    id: nanoid(8),
    time,
    muscle_group,
    exercises,
    cardio,
    notes: getString(flags, 'note'),
  };

  appendSession(date, session);
  const summary = sessionSummary(date, session);

  print({
    logged: {
      date,
      session_id: session.id,
      muscle_group: session.muscle_group,
      time: session.time,
      exercises_count: summary.exercises,
      total_sets: summary.total_sets,
      total_volume_kg: summary.total_volume_kg,
    },
    exercises: session.exercises.map(ex => ({
      name: ex.name,
      muscle: ex.muscle,
      sets: ex.sets.length,
      reps_per_set: ex.sets[0]?.reps,
      weight: ex.sets[0]?.weight_kg,
    })),
    cardio: session.cardio.length ? session.cardio : undefined,
    notes: session.notes,
  });
}
