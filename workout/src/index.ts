import { parseCliArgs } from './lib/args.js';
import { ensureDirs } from './lib/storage.js';
import { err } from './lib/format.js';

const HELP = `
workout-claw — local gym workout tracker

USAGE
  workout-claw <command> [args] [flags]

COMMANDS

  log <exercises>                   Log a workout session
    --muscle <group>                back | legs | chest | shoulders | arms | core | full | cardio | other
                                    (inferred from the exercises if omitted; or from the
                                    optional ~/.workout-claw/config.json weekday split)
    --cardio "<entry>"              Optional cardio: e.g. "incline-walk 20min @4.5kmh i6"
    --note "<text>"                 Free-text note
    --date YYYY-MM-DD               Date to log under (default: today, local time)
    --time HH:MM                    Override time (default: now)

  history                           List recent sessions
    --muscle <group>                Filter by muscle group
    --exercise <name>               Filter by exercise name
    --weeks <n>                     How many weeks back (default: 4)

  pr <exercise>                     Best estimated 1RM for an exercise (Epley formula)

  volume                            Cross-day volume rollup for a muscle group
    --muscle <group>                Required: back | legs | chest | shoulders | arms | core | cardio
    --weeks <n>                     How many weeks back (default: 4)

  summary                           Today's logged sessions
    --date YYYY-MM-DD               Date to show (default: today, local time)

  last                              Most recent session across all dates

  delete <session-id>               Remove a logged session by id
  edit <session-id>                 Open a session in $EDITOR for manual fixes

PER-EXERCISE MUSCLE TAGGING (v0.3)
  Every exercise is auto-tagged with a muscle group at log time (heuristic
  matching by name). Pullups on chest day count as 'back' volume; deadlifts
  count as 'back'. Use 'volume --muscle X' for accurate cross-day rollups.
  'history --muscle X' now matches sessions where ANY exercise hits the
  target muscle, not just session-level focus.

INPUT FORMAT (log)
  <exercise> <sets>x<reps>@<weight>      e.g. "bench 4x10@60"
  <exercise> <sets>x<reps>@bw            bodyweight (e.g. "pullups 4x10@bw")
  <exercise> <sets>x<reps>@<weight>kg|lb optional unit; lb is stored as kg ("bench 3x8@135lb")
  <exercise> 8,8,6@60                    per-set reps, one weight
  <exercise> 8@60,6@65                   per-set reps and weights
  Names may use dashes or spaces:        "incline-db-press 4x12@20" / "bench press 3x8@60"
  Multiple exercises: comma-separated.   "bench 4x10@60, incline-db 4x12@20"

OUTPUT   YAML on stdout, errors on stderr
DATA     ~/.workout-claw/logs/YYYY-MM-DD.json  (fully local, no network)
`.trim();

async function main(): Promise<void> {
  ensureDirs();

  const { positionals, flags } = parseCliArgs(process.argv.slice(2));

  if (positionals.length === 0 || flags['help'] || positionals[0] === 'help') {
    console.log(HELP);
    process.exit(0);
  }

  const [cmd, ...rest] = positionals;

  switch (cmd) {
    case 'log': {
      const { logCommand } = await import('./commands/log.js');
      logCommand(rest, flags);
      break;
    }
    case 'history': {
      const { historyCommand } = await import('./commands/history.js');
      historyCommand(flags);
      break;
    }
    case 'pr': {
      const { prCommand } = await import('./commands/pr.js');
      prCommand(rest);
      break;
    }
    case 'summary': {
      const { summaryCommand } = await import('./commands/summary.js');
      summaryCommand(flags);
      break;
    }
    case 'volume': {
      const { volumeCommand } = await import('./commands/volume.js');
      volumeCommand(flags);
      break;
    }
    case 'last': {
      const { lastCommand } = await import('./commands/last.js');
      lastCommand();
      break;
    }
    case 'delete': {
      const { deleteCommand } = await import('./commands/delete.js');
      deleteCommand(rest);
      break;
    }
    case 'edit': {
      const { editCommand } = await import('./commands/edit.js');
      editCommand(rest);
      break;
    }
    default:
      err(`unknown command: ${cmd}\nRun 'workout-claw --help' for usage.`);
      process.exit(1);
  }
}

main().catch(e => {
  err(String(e?.message ?? e));
  process.exit(1);
});
