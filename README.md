# lifekit-health

The lifekit **health module**: local-first CLI tools + agent skills for workout, nutrition, and daily-state tracking. Built for [OpenClaw](https://openclaw.ai) agents, usable by humans directly.

| dir | npm / ClawHub | role | lang |
|-----|-----|------|------|
| [`workout/`](workout/) | `workout-claw` | gym workout tracker — sessions, PRs, volume-by-muscle | TypeScript |
| [`nutrition/`](nutrition/) | `@pita/nutrition-claw` | meals, macros, food library with local semantic search (offline ONNX embeddings) | TypeScript |
| [`life-state/`](life-state/) | `life-state` | daily mood/energy/soreness/sleep capture with merge semantics | TypeScript |
| [`mcp/`](mcp/) | — | legacy MCP server wrapping the CLIs (superseded by the skills-first model below) | Python |

## Architecture: CLI + SKILL.md, no daemon

Each tool is two layers:

1. **A deterministic CLI** — plain-JSON storage under `~/.workout-claw/`, `~/.nutrition-claw/`, `~/.life/state/` (override with `LIFE_STATE_DIR`). YAML output built for agent parsing. No network, no daemon, fully local.
2. **A `SKILL.md`** — tells any agent when to invoke the CLI (trigger phrases), how to call it, and how to verify writes (log → read back → only then confirm).

The skills are published on [ClawHub](https://clawhub.com); the binaries install from npm. Skills declare `metadata.openclaw.requires.bins` so OpenClaw gates them until the binary is on PATH instead of failing silently.

Cross-skill design: `life-state` is the shared state primitive — workout/nutrition coaching reads today's energy/soreness before recommending intensity.

## Install

```bash
# binaries
npm install -g workout-claw life-state
# nutrition-claw: see nutrition/README.md (native ONNX deps)

# skills (OpenClaw)
openclaw skills install workout-claw
openclaw skills install nutrition-claw
```

## Develop

```bash
( cd workout    && npm ci && npm test )   # build + node:test suite
( cd life-state && npm ci && npm test )
( cd nutrition  && npm ci && npm run build )  # build requires bun
```

---
_Consolidated 2026-06-08 from dsdevq/{workout-claw, life-state, health-claw} (archived); `nutrition/` joined 2026-07-20 (first public source release — previously ClawHub-only)._
