# lifekit-health

The lifekit **health module** — consolidated. Three pieces that were three repos:

| dir | was | role | lang |
|-----|-----|------|------|
| [`workout/`](workout/) | `workout-claw` | local-first gym workout tracker CLI | TypeScript |
| [`life-state/`](life-state/) | `life-state` | daily mood/energy/soreness/sleep capture CLI | TypeScript |
| [`mcp/`](mcp/) | `health-claw` | MCP server fusing both into state-aware fitness context for OpenClaw | Python |

**Why one repo:** `mcp/` wraps the other two and is useless without them; you always
deploy all three together. One clone, one place, co-versioned. History of each is
preserved (subtree-merged, not squashed).

## Build / install

```bash
# CLIs (TypeScript) — build + put on PATH
( cd workout    && npm install && npm run build && npm link )
( cd life-state && npm install && npm run build && npm link )

# MCP server (Python) — wraps the two CLIs
( cd mcp && pip install -e . )
```

OpenClaw talks only to the `mcp/` server; it shells out to the two CLIs on PATH.

---
_Consolidated 2026-06-08 from dsdevq/{workout-claw, life-state, health-claw} (now archived)._
