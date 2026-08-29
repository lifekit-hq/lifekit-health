# lifekit-health — Claude Context

The lifekit **health module**: local-first CLI tools + agent skills for workout, nutrition, and daily-state tracking. Built for [OpenClaw](https://openclaw.ai) agents, usable by humans directly. Consolidated 2026-06-08 from dsdevq/{workout-claw, life-state, health-claw}; `nutrition/` joined 2026-07-20. Sole developer: Denys (nutrition originally by Peter Martischka).

| dir | package | what | lang / runtime |
| --- | --- | --- | --- |
| `workout/` | `workout-claw` (npm) | gym tracker — sessions, PRs (Epley 1RM), volume-by-muscle, exercise→muscle inference | TypeScript, tsc, node:test |
| `life-state/` | `life-state` (npm) | daily mood/energy/soreness/sleep capture with merge semantics — the shared state primitive other skills read | TypeScript, tsc, node:test |
| `nutrition/` | `@pita/nutrition-claw` (GitHub Packages) | meals, macros, food library with local semantic search (offline ONNX embeddings) | TypeScript, **bun build** |
| `mcp/` | `health-claw-mcp` | **legacy** MCP server wrapping the workout/life-state CLIs — superseded by the skills-first model; frozen, no CI | Python ≥3.12 |

**Architecture: CLI + SKILL.md, no daemon.** Each tool is a deterministic CLI (plain-JSON storage under `~/.workout-claw/`, `~/.nutrition-claw/`, `~/.life/state/`; YAML output built for agent parsing; no network) plus a `SKILL.md` telling any agent when/how to invoke it and how to verify writes (log → read back → only then confirm). Skills publish to ClawHub, binaries to npm. There is no root `package.json` — each package is independent; work inside the package you're changing.

## Commands

```bash
( cd workout    && npm ci && npm test )       # tsc build + node --test tests/*.test.mjs
( cd life-state && npm ci && npm test )       # same shape
( cd nutrition  && npm ci && npm run build )  # bun build (requires bun); no test suite yet
( cd mcp && pip install -e . )                # legacy — touch only if the MCP server is the ask
```

Node ≥ 20 (CI runs 22). After editing a `SKILL.md`, sync it into the local OpenClaw workspace (`npm run openclaw:sync` in workout/life-state; `./scripts/sync-skill.sh` per `nutrition/AGENTS.md`) — an outdated skill file makes the agent give wrong guidance.

## Gates (what `.github/workflows/test.yml` enforces on every PR)

- `workout` + `life-state`: `npm ci && npm test` on Node 22 — the test script builds first, so a type error fails CI.
- `nutrition`: `npm ci && npm run build` with bun — build gate only.
- Nothing is soft-failed. Run the same commands locally before pushing.

## Conventions (ecosystem-standard)

- **Branch**: `<type>/<issue#>-<slug>` (e.g. `chore/2-adopt-gold-standard`); create via `gh issue develop <n>`.
- **Commits / PR titles**: conventional commits. Scope = package: `feat(workout): …`, `fix(nutrition): …`.
- **PR body**: what + why, plus a **Validation** section stating what was run/checked.
- **Issues**: imperative title, no priority prefix — priority lives in the `P1`/`P2` label. P1 issues carry traceability → acceptance criteria → shape; P2/P3 stay one-liners until promoted.
- **Milestones**: `M<n> — <outcome>`, named for the outcome, never a date.
- Main is protected in spirit: all changes land via squash-merged PR, CI green first.
- Only `README.md` and `CLAUDE.md` belong at the repo root — durable docs go to `docs/`; per-package `README.md`/`SKILL.md` are published artifacts and stay in their package.

### Gold-standard divergences

Deliberate gaps vs [REPO-STANDARD.md](https://github.com/lifekit-hq/.github/blob/main/REPO-STANDARD.md), noted here instead of silently skipped. This repo is early-stage — honest notes over invented machinery.

- **§5 Releases — no release-please / Weekly Release.** Packages version independently and ship manually (`prepublishOnly` builds; `npm publish` per package); nothing has been published from this monorepo yet. Adopt release-please (manifest/multi-package mode) + the weekly cron when the module ships on a cadence. `mcp/CHANGELOG.md` is a frozen legacy artifact, not evidence of a live CHANGELOG discipline.
- **§6 CI — no lint or format gate.** No ESLint/Prettier toolchain exists in any package; adding one is real work (adopt `@lifekit-hq/config` presets), not a CI one-liner. When lint/format scripts land, wire them into `test.yml` the same day — no soft-fail. `nutrition` also has no test suite (build gate only), and `mcp/` (legacy) has no CI at all.
- **§7 Pre-commit hook — deferred** until lint/format scripts exist to mirror; a hook that only re-runs the test suites would just duplicate CI at commit time.
- **§3 Planning — `workout/TODO.md`** is a pre-consolidation backlog file; new planning happens in GitHub issues per the standard, and TODO.md items migrate to issues as they're picked up.
- **`nutrition/AGENTS.md`** is a package-local agent pointer (house-accepted); note its `./scripts/sync-skill.sh` is not in-repo (lives in the ClawHub publish flow).
