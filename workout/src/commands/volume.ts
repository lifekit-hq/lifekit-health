import { getNumber, getString, type ParsedArgs } from '../lib/args.js';
import { err, print } from '../lib/format.js';
import { listLogDates, readDayLog } from '../lib/storage.js';
import { exerciseTotals } from '../lib/analytics.js';
import { parseMuscleGroup, withInferredMuscle } from '../lib/parse.js';

export function volumeCommand(flags: ParsedArgs['flags']): void {
  const muscleFlag = getString(flags, 'muscle');
  if (!muscleFlag) {
    err('volume requires --muscle <group>. example: workout-claw volume --muscle back --weeks 4');
    process.exit(1);
  }
  const muscle = parseMuscleGroup(muscleFlag);
  const weeks = getNumber(flags, 'weeks') ?? 4;
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - weeks * 7);
  const cutoffISO = cutoff.toISOString().slice(0, 10);

  let totalVolume = 0;
  let totalSets = 0;
  let totalReps = 0;
  let sessionsWithMuscle = 0;
  const perDate: Array<{ date: string; volume_kg: number; sets: number; exercises: string[] }> = [];

  for (const date of listLogDates()) {
    if (date < cutoffISO) continue;
    const log = readDayLog(date);
    let dateVolume = 0;
    let dateSets = 0;
    const dateExercises: string[] = [];
    let dateHadMuscle = false;

    for (const session of log) {
      for (const ex of session.exercises) {
        const enriched = withInferredMuscle(ex);
        if (enriched.muscle !== muscle) continue;
        dateHadMuscle = true;
        const t = exerciseTotals(ex);
        dateVolume += t.total_volume_kg;
        dateSets += t.total_sets;
        totalReps += t.total_reps;
        dateExercises.push(ex.name);
      }
    }

    if (dateHadMuscle) {
      perDate.push({ date, volume_kg: Math.round(dateVolume * 100) / 100, sets: dateSets, exercises: dateExercises });
      totalVolume += dateVolume;
      totalSets += dateSets;
      sessionsWithMuscle += 1;
    }
  }

  print({
    muscle,
    window: { weeks, since: cutoffISO },
    totals: {
      volume_kg: Math.round(totalVolume * 100) / 100,
      sets: totalSets,
      reps: totalReps,
      days_trained: sessionsWithMuscle,
    },
    by_date: perDate.reverse(),
  });
}
