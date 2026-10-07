import { existsSync, readFileSync } from 'fs';
import { join } from 'path';
import type { MuscleGroup } from './types.js';
import { parseMuscleGroup } from './parse.js';
import { weekdayOf } from './dates.js';

const CONFIG_FILE = join(process.env.HOME ?? '~', '.workout-claw', 'config.json');

const DAYS = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'];
const DAY_NAMES = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];

export interface Config {
  /** Optional weekday → muscle group map, e.g. {"mon":"back","wed":"legs"}. */
  split?: Record<string, string>;
}

export function readConfig(path = CONFIG_FILE): Config {
  if (!existsSync(path)) return {};
  let parsed: unknown;
  try {
    parsed = JSON.parse(readFileSync(path, 'utf8'));
  } catch (e) {
    throw new Error(`corrupt JSON in ${path} (${(e as Error).message}). Fix or remove the file.`);
  }
  if (parsed === null || typeof parsed !== 'object' || Array.isArray(parsed)) {
    throw new Error(`${path} must be a JSON object like {"split":{"mon":"back"}}`);
  }
  return parsed as Config;
}

/**
 * Muscle group the user's optional config assigns to the weekday of `date`
 * (keys: mon..sun or monday..sunday), or undefined if no split is configured
 * for that day. No split exists unless the user writes one.
 */
export function muscleFromConfig(date: string, config: Config = readConfig()): MuscleGroup | undefined {
  const split = config.split;
  if (!split || typeof split !== 'object') return undefined;
  const wd = weekdayOf(date);
  const entry = Object.entries(split).find(([k]) => {
    const key = k.toLowerCase();
    return key === DAYS[wd] || key === DAY_NAMES[wd];
  });
  if (!entry) return undefined;
  const muscle = parseMuscleGroup(String(entry[1]));
  return muscle === 'other' && String(entry[1]).toLowerCase().trim() !== 'other' ? undefined : muscle;
}
