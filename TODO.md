# workout-claw — backlog

## v0.2 — session editing (✅ shipped 2026-05-15)

- [x] `workout-claw delete <session-id>` — remove a logged session by id.
- [x] `workout-claw edit <session-id>` — open the session JSON in `$EDITOR` for manual fixes.
- [x] `workout-claw last` — print the most recent session across all dates.

## v0.3 — per-exercise muscle tagging (✅ shipped 2026-05-15)

- [x] Optional `muscle` field on `ExerciseEntry`, auto-inferred at log time via exercise-name → muscle keyword map (`src/lib/exercise-map.ts`).
- [x] Read-time enrichment (`withInferredMuscle`) so v0.2 logs without the field also work.
- [x] New `volume --muscle X --weeks N` command — cross-day volume rollup per muscle group.
- [x] `history --muscle X` now matches sessions where ANY exercise hits the target muscle, not just session-level focus.
- [x] `log` / `summary` / `last` output surfaces muscle per exercise.

## v0.4 — quality-of-life

- [ ] Bodyweight-adjusted volume for `@bw` sets (use `health.md` weight, optionally minus assistance). Right now pullups contribute 0 kg to volume which understates load.
- [ ] `workout-claw progress <exercise>` — top-N estimated 1RMs over time, not just the single best.
- [ ] RPE per set in the parser: `bench 4x10@60r8` for RPE 8.

## Out of scope for now

- Semantic search / embeddings (nutrition-claw has this; we don't need it until the exercise vocabulary fragments).
- Recovery suggestions, opinionated commentary (skill UX layer; let the agent handle it on top of CLI output).
- Web/TUI frontend. CLI + agent is the product.

## OpenClaw integration notes

- `SKILL.md` source-of-truth lives here. Sync to OpenClaw workspace via `npm run openclaw:sync` (copies + restarts gateway).
- Symlinks don't work — loader rejects them as `symlink-escape`.
