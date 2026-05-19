import type { ExerciseEntry, MuscleGroup, SetEntry } from './types.js';
import { inferMuscleFromName } from './exercise-map.js';

const VALID_MUSCLES: MuscleGroup[] = ['back', 'legs', 'chest', 'shoulders', 'arms', 'core', 'full', 'cardio', 'other'];

export function parseMuscleGroup(s: string | undefined): MuscleGroup {
  if (!s) return 'other';
  const lower = s.toLowerCase().trim();
  if (VALID_MUSCLES.includes(lower as MuscleGroup)) return lower as MuscleGroup;
  return 'other';
}

export function inferMuscleFromWeekday(date: Date): MuscleGroup {
  const weekday = date.getDay();
  if (weekday === 1) return 'back';
  if (weekday === 3) return 'legs';
  if (weekday === 5) return 'chest';
  return 'other';
}

/**
 * Parse fitdown-inspired exercise notation:
 *   "bench 4x10@60"           4 sets × 10 reps @ 60 kg
 *   "pullups 4x10@bw"         4 sets × 10 reps bodyweight
 *   "squat 3x5@100"           classic strength format
 *   "incline-db-press 4x12@20"  multi-word names use dashes
 *
 * Multiple exercises separated by commas:
 *   "bench 4x10@60, incline-db 4x12@20, triceps 4x12@40"
 */
export function parseExerciseInput(input: string): ExerciseEntry[] {
  const exercises: ExerciseEntry[] = [];
  const parts = input.split(',').map(p => p.trim()).filter(Boolean);

  for (const part of parts) {
    const match = part.match(/^([\w-]+)\s+(\d+)x(\d+)@(\d+(?:\.\d+)?|bw)$/i);
    if (!match) {
      throw new Error(`could not parse exercise: "${part}". expected format: "<name> <sets>x<reps>@<weight>" (e.g. "bench 4x10@60" or "pullups 4x10@bw")`);
    }
    const [, name, setsStr, repsStr, weightStr] = match;
    const sets = parseInt(setsStr, 10);
    const reps = parseInt(repsStr, 10);
    const weight: number | 'bw' = weightStr.toLowerCase() === 'bw' ? 'bw' : Number(weightStr);

    const setEntries: SetEntry[] = [];
    for (let i = 0; i < sets; i++) {
      setEntries.push({ reps, weight_kg: weight });
    }
    const lowerName = name.toLowerCase();
    exercises.push({ name: lowerName, sets: setEntries, muscle: inferMuscleFromName(lowerName) });
  }
  return exercises;
}

/**
 * Read-time enrichment: if an exercise was logged in v0.2 (pre-muscle-tag),
 * infer its muscle on the fly. Pure function, doesn't mutate disk.
 */
export function withInferredMuscle(ex: ExerciseEntry): ExerciseEntry {
  if (ex.muscle) return ex;
  return { ...ex, muscle: inferMuscleFromName(ex.name) };
}

/**
 * Parse cardio entry from string:
 *   "incline-walk 20min @4.5kmh i6"
 *   "run 5km 24min"
 *   "bike 30min"
 */
export function parseCardioInput(input: string): { type: string; minutes?: number; speed_kmh?: number; incline?: number; distance_km?: number; notes?: string } {
  const tokens = input.trim().split(/\s+/);
  const type = tokens[0].toLowerCase();
  const result: { type: string; minutes?: number; speed_kmh?: number; incline?: number; distance_km?: number; notes?: string } = { type };

  for (const tok of tokens.slice(1)) {
    const lower = tok.toLowerCase();
    const minMatch = lower.match(/^(\d+(?:\.\d+)?)min$/);
    const kmMatch = lower.match(/^(\d+(?:\.\d+)?)km$/);
    const speedMatch = lower.match(/^@(\d+(?:\.\d+)?)kmh$/);
    const inclineMatch = lower.match(/^i(\d+(?:\.\d+)?)$/);
    if (minMatch) result.minutes = Number(minMatch[1]);
    else if (kmMatch) result.distance_km = Number(kmMatch[1]);
    else if (speedMatch) result.speed_kmh = Number(speedMatch[1]);
    else if (inclineMatch) result.incline = Number(inclineMatch[1]);
  }
  return result;
}

export function todayISO(): string {
  return new Date().toISOString().slice(0, 10);
}

export function nowHHMM(): string {
  const d = new Date();
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
}
