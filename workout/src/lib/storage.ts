import { closeSync, existsSync, fsyncSync, mkdirSync, openSync, readFileSync, readdirSync, renameSync, unlinkSync, writeSync } from 'fs';
import { dirname, join } from 'path';
import { assertValidDate, isValidDate } from './dates.js';
import type { DayLog, Session } from './types.js';

const BASE_DIR = join(process.env.HOME ?? '~', '.workout-claw');
const LOGS_DIR = join(BASE_DIR, 'logs');

export function ensureDirs(): void {
  for (const dir of [BASE_DIR, LOGS_DIR]) {
    if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
  }
}

function readJson<T>(path: string, fallback: T): T {
  if (!existsSync(path)) return fallback;
  const raw = readFileSync(path, 'utf8');
  try {
    return JSON.parse(raw) as T;
  } catch (e) {
    throw new Error(
      `corrupt JSON in ${path} (${(e as Error).message}). Refusing to treat it as empty - ` +
      'that would overwrite your data on the next write. Repair or move the file aside, then retry.',
    );
  }
}

/** Write to a temp file in the same directory, fsync, then rename over the target. */
function writeJson(path: string, data: unknown): void {
  const tmp = join(dirname(path), `.${process.pid}.${Date.now()}.tmp`);
  const fd = openSync(tmp, 'w');
  try {
    writeSync(fd, JSON.stringify(data, null, 2) + '\n');
    fsyncSync(fd);
  } catch (e) {
    closeSync(fd);
    try { unlinkSync(tmp); } catch { /* best effort */ }
    throw e;
  }
  closeSync(fd);
  try {
    renameSync(tmp, path);
  } catch (e) {
    try { unlinkSync(tmp); } catch { /* best effort */ }
    throw e;
  }
}

export function logPath(date: string): string {
  assertValidDate(date);
  return join(LOGS_DIR, `${date}.json`);
}

export function readDayLog(date: string): DayLog {
  return readJson<DayLog>(logPath(date), []);
}

export function writeDayLog(date: string, log: DayLog): void {
  writeJson(logPath(date), log);
}

export function appendSession(date: string, session: Session): void {
  const log = readDayLog(date);
  log.push(session);
  writeDayLog(date, log);
}

export function listLogDates(): string[] {
  if (!existsSync(LOGS_DIR)) return [];
  return readdirSync(LOGS_DIR)
    .filter(f => f.endsWith('.json'))
    .map(f => f.slice(0, -'.json'.length))
    .filter(isValidDate)
    .sort();
}

export function findSessionById(id: string): { date: string; session: Session; index: number } | null {
  for (const date of listLogDates()) {
    const log = readDayLog(date);
    const idx = log.findIndex(s => s.id === id);
    if (idx !== -1) return { date, session: log[idx], index: idx };
  }
  return null;
}

export function deleteSessionById(id: string): { date: string; removed: Session } | null {
  const found = findSessionById(id);
  if (!found) return null;
  const log = readDayLog(found.date);
  log.splice(found.index, 1);
  writeDayLog(found.date, log);
  return { date: found.date, removed: found.session };
}

export function replaceSessionById(id: string, updated: Session): { date: string } | null {
  const found = findSessionById(id);
  if (!found) return null;
  const log = readDayLog(found.date);
  log[found.index] = updated;
  writeDayLog(found.date, log);
  return { date: found.date };
}

export function getLastSession(): { date: string; session: Session } | null {
  const dates = listLogDates();
  for (let i = dates.length - 1; i >= 0; i--) {
    const log = readDayLog(dates[i]);
    if (log.length > 0) {
      return { date: dates[i], session: log[log.length - 1] };
    }
  }
  return null;
}
