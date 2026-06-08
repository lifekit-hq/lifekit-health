import { err, print } from '../lib/format.js';
import { deleteSessionById } from '../lib/storage.js';

export function deleteCommand(positionals: string[]): void {
  const id = positionals[0];
  if (!id) {
    err('delete requires a session id. example: workout-claw delete buEtXTal');
    process.exit(1);
  }
  const result = deleteSessionById(id);
  if (!result) {
    err(`no session found with id "${id}"`);
    process.exit(1);
  }
  print({
    deleted: {
      id,
      date: result.date,
      muscle_group: result.removed.muscle_group,
      exercises: result.removed.exercises.length,
      time: result.removed.time,
    },
  });
}
