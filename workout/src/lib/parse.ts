import type { ExerciseEntry, MuscleGroup, SetEntry } from './types.js';
import { inferMuscleFromName } from './exercise-map.js';
import { assertValidDate, todayISO } from './dates.js';

export { todayISO };

/** `--date` flag or the local date; rejects anything that is not a real YYYY-MM-DD. */
export function resolveDate(flag: string | undefined): string {
  const date = flag ?? todayISO();
  assertValidDate(date);
  return date;
}

const VALID_MUSCLES: MuscleGroup[] = ['back', 'legs', 'chest', 'shoulders', 'arms', 'core', 'full', 'cardio', 'other'];

export function parseMuscleGroup(s: string | undefined): MuscleGroup {
  if (!s) return 'other';
  const lower = s.toLowerCase().trim();
  if (VALID_MUSCLES.includes(lower as MuscleGroup)) return lower as MuscleGroup;
  return 'other';
}

/**
 * Session-level muscle group from the exercises themselves: the muscle with the
 * most sets wins; a tie between muscles is a 'full' session. Cardio-only
 * sessions are 'cardio'; nothing recognisable is 'other'.
 */
export function inferMuscleFromExercises(exercises: ExerciseEntry[], hasCardio = false): MuscleGroup {
  const sets = new Map<MuscleGroup, number>();
  for (const ex of exercises) {
    const m = ex.muscle ?? inferMuscleFromName(ex.name);
    if (m === 'other') continue;
    sets.set(m, (sets.get(m) ?? 0) + ex.sets.length);
  }
  if (sets.size === 0) return exercises.length === 0 && hasCardio ? 'cardio' : 'other';
  const ranked = [...sets.entries()].sort((a, b) => b[1] - a[1]);
  if (ranked.length > 1 && ranked[0][1] === ranked[1][1]) return 'full';
  return ranked[0][0];
}

const WEIGHT = '(\\d+(?:\\.\\d+)?|bw)(kg|lbs?)?';
const UNIFORM_RE = new RegExp(`^(\\d+)x(\\d+)@${WEIGHT}$`, 'i');
const SET_RE = new RegExp(`^(\\d+)(?:@${WEIGHT})?$`, 'i');
const SPEC_START_RE = /^\d+(?:x\d+)?(?:@|$|,)/i;
const MAX_SETS = 50;
const LB_TO_KG = 0.45359237;

function toWeight(num: string, unit: string | undefined): number | 'bw' {
  if (num.toLowerCase() === 'bw') return 'bw';
  const n = Number(num);
  if (unit && unit.toLowerCase().startsWith('lb')) return Math.round(n * LB_TO_KG * 100) / 100;
  return n;
}

function parseSets(spec: string): SetEntry[] | null {
  const uniform = UNIFORM_RE.exec(spec);
  if (uniform) {
    const sets = parseInt(uniform[1], 10);
    if (sets < 1 || sets > MAX_SETS) return null;
    const weight = toWeight(uniform[3], uniform[4]);
    return Array.from({ length: sets }, () => ({ reps: parseInt(uniform[2], 10), weight_kg: weight }));
  }
  // Per-set list: "8,8,6@60" or "8@60,6@65". A set without a weight takes the
  // weight of the next set that has one.
  const items = spec.split(',').map(i => SET_RE.exec(i));
  if (items.length > MAX_SETS || items.some(m => !m)) return null;
  const out: SetEntry[] = [];
  let pending: number[] = [];
  for (const m of items as RegExpExecArray[]) {
    const reps = parseInt(m[1], 10);
    if (m[2] === undefined) {
      pending.push(reps);
      continue;
    }
    const weight = toWeight(m[2], m[3]);
    for (const r of pending) out.push({ reps: r, weight_kg: weight });
    pending = [];
    out.push({ reps, weight_kg: weight });
  }
  return pending.length === 0 && out.length > 0 ? out : null;
}

/**
 * Parse fitdown-inspired exercise notation:
 *   "bench 4x10@60"           4 sets × 10 reps @ 60 kg
 *   "bench 4x10@60kg"         explicit unit (kg or lb; lb is stored as kg)
 *   "pullups 4x10@bw"         4 sets × 10 reps bodyweight
 *   "bench press 3x8@60"      spaces in names are normalized to dashes
 *   "bench 8,8,6@60"          per-set reps, one weight
 *   "bench 8@60,6@65"         per-set reps and weights
 *
 * Multiple exercises separated by commas; a comma segment that starts with a
 * digit continues the previous exercise's set list:
 *   "bench 8,8,6@60, incline-db 4x12@20, triceps 4x12@40"
 */
export function parseExerciseInput(input: string): ExerciseEntry[] {
  const segments: string[] = [];
  for (const raw of input.split(',')) {
    const seg = raw.trim();
    if (!seg) continue;
    if (/^\d/.test(seg) && segments.length > 0) segments[segments.length - 1] += ',' + seg;
    else segments.push(seg);
  }

  const exercises: ExerciseEntry[] = [];
  for (const part of segments) {
    const fail = (): never => {
      throw new Error(`could not parse exercise: "${part}". expected format: "<name> <sets>x<reps>@<weight>" (e.g. "bench 4x10@60", "bench press 3x8@60kg", "bench 8,8,6@60", "bench 8@60,6@65" or "pullups 4x10@bw")`);
    };
    const tokens = part.split(/\s+/);
    const idx = tokens.findIndex((t, i) => i > 0 && SPEC_START_RE.test(t));
    if (idx === -1) fail();
    const name = tokens.slice(0, idx).join('-').toLowerCase();
    if (!/^[a-z][\w'-]*$/.test(name)) fail();
    const spec = tokens.slice(idx).join(' ')
      .replace(/\s*@\s*/g, '@')
      .replace(/\s+(kg|lbs?)\b/gi, '$1')
      .replace(/\s*,\s*/g, ',');
    const sets = /\s/.test(spec) ? null : parseSets(spec);
    if (!sets) fail();
    exercises.push({ name, sets: sets!, muscle: inferMuscleFromName(name) });
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

export function nowHHMM(): string {
  const d = new Date();
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
}
