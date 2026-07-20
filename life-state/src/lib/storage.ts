import { existsSync, mkdirSync, readFileSync, readdirSync, writeFileSync } from 'fs';
import { join } from 'path';
import type { DayState } from './types.js';

// LIFE_STATE_DIR overrides the default store location — lets deployments
// (containers, shared vaults) point at a mounted/canonical directory without
// a filesystem-level remap of ~/.life/state.
const BASE_DIR = process.env.LIFE_STATE_DIR ?? join(process.env.HOME ?? '~', '.life', 'state');

export function ensureDirs(): void {
  if (!existsSync(BASE_DIR)) mkdirSync(BASE_DIR, { recursive: true });
}

function statePath(date: string): string {
  return join(BASE_DIR, `${date}.json`);
}

export function readState(date: string): DayState | null {
  const p = statePath(date);
  if (!existsSync(p)) return null;
  try {
    return JSON.parse(readFileSync(p, 'utf8')) as DayState;
  } catch {
    return null;
  }
}

export function writeState(date: string, state: DayState): void {
  writeFileSync(statePath(date), JSON.stringify(state, null, 2) + '\n');
}

/**
 * Merge an update into today's state. Existing fields are preserved unless
 * explicitly overwritten by the patch.
 */
export function mergeState(date: string, patch: Partial<DayState>): DayState {
  const existing = readState(date) ?? { date };
  const merged: DayState = { ...existing, ...patch, date };
  writeState(date, merged);
  return merged;
}

export function listStateDates(): string[] {
  if (!existsSync(BASE_DIR)) return [];
  return readdirSync(BASE_DIR)
    .filter(f => f.endsWith('.json'))
    .map(f => f.replace('.json', ''))
    .sort();
}
