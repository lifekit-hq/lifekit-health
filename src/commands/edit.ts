import { spawnSync } from 'child_process';
import { writeFileSync, readFileSync, unlinkSync, existsSync } from 'fs';
import { tmpdir } from 'os';
import { join } from 'path';
import { err, print } from '../lib/format.js';
import { findSessionById, replaceSessionById } from '../lib/storage.js';
import type { Session } from '../lib/types.js';

export function editCommand(positionals: string[]): void {
  const id = positionals[0];
  if (!id) {
    err('edit requires a session id. example: workout-claw edit buEtXTal');
    process.exit(1);
  }
  const found = findSessionById(id);
  if (!found) {
    err(`no session found with id "${id}"`);
    process.exit(1);
  }

  const tmpPath = join(tmpdir(), `workout-claw-edit-${id}.json`);
  writeFileSync(tmpPath, JSON.stringify(found.session, null, 2));

  const editor = process.env.EDITOR ?? 'vi';
  const editorResult = spawnSync(editor, [tmpPath], { stdio: 'inherit' });

  if (editorResult.status !== 0) {
    if (existsSync(tmpPath)) unlinkSync(tmpPath);
    err(`editor exited with status ${editorResult.status}; original session unchanged`);
    process.exit(1);
  }

  let updated: Session;
  try {
    updated = JSON.parse(readFileSync(tmpPath, 'utf8')) as Session;
  } catch (e) {
    err(`invalid JSON in edited file: ${(e as Error).message}; original session unchanged`);
    if (existsSync(tmpPath)) unlinkSync(tmpPath);
    process.exit(1);
  }

  if (existsSync(tmpPath)) unlinkSync(tmpPath);

  if (updated.id !== id) {
    err(`session id changed in edit ("${id}" → "${updated.id}"); refusing to save. revert the id field.`);
    process.exit(1);
  }

  replaceSessionById(id, updated);
  print({
    edited: { id, date: found.date },
  });
}
