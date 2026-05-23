---
name: health-claw
description: Log workouts, track PRs and volume, record daily mood/energy/soreness/sleep. State-aware health module for the lifekit ecosystem.
author: Denys Sychov
version: 0.1.0
triggers:
  - "log workout"
  - "log my workout"
  - "gym session"
  - "track exercise"
  - "what's my PR"
  - "workout history"
  - "weekly volume"
  - "back volume"
  - "chest volume"
  - "how am I feeling"
  - "mood check"
  - "morning check-in"
  - "log mood"
  - "log energy"
  - "I feel"
  - "feeling tired"
  - "feeling good"
  - "feeling sore"
  - "energy is"
  - "slept badly"
  - "slept well"
  - "how's my health"
  - "health summary"
---

# health-claw

Lifekit health module. Wraps `workout-claw` (gym tracker) and `life-state` (daily state primitive) behind a single MCP server, so OpenClaw can give state-aware fitness suggestions instead of generic templates.

## Architecture

```
OpenClaw → health-claw MCP (http://health-claw:8000/mcp/)
                  ↓                    ↓
           workout-claw CLI      life-state CLI
                  ↓                    ↓
    ~/.workout-claw/logs/      ~/.life/state/
```

This module replaces direct skill invocations of `workout-claw` and `life-state` — routing goes through the MCP instead.

## Available tools

### Workout tools (backed by workout-claw CLI)

| Tool | When to use |
|---|---|
| `workout_log` | User describes a workout session |
| `workout_history` | "Show my chest workouts from the last month" |
| `workout_pr` | "What's my bench PR?" |
| `workout_volume` | "How much back volume this week?" |
| `workout_summary` | "What did I do at the gym today?" |
| `workout_last` | "What was my last workout?" (no date given) |
| `workout_delete` | User wants to remove a logged session |

### State tools (backed by life-state CLI)

| Tool | When to use |
|---|---|
| `state_set` | User describes how they feel, mentions energy/soreness/sleep |
| `state_get` | "How am I feeling today?" / read before making suggestions |
| `state_week` | "How's my energy been this week?" |

### Cross-domain

| Tool | When to use |
|---|---|
| `health_summary` | Start of any health conversation — gives state + last workout context |

## Notes for the agent

- **Call `health_summary` first** when the user asks anything health-related without a specific operation. It gives you today's energy/soreness/sleep so suggestions are state-aware.
- **Workout log syntax**: `bench 4x10@60, pullups 4x10@bw` — comma-separated, dashes for multi-word names, `@bw` for bodyweight.
- **State is merge-not-replace**: morning check-in + post-workout check-in can both call `state_set` and compose cleanly.
- **Volume vs history**: for "how much X volume?" use `workout_volume` (per-exercise aggregation across sessions). For "what did I do on chest day?" use `workout_history`.
- **workout_delete is irreversible** — confirm with the user before calling.
- **Parse state loosely**: "feeling wired, energy 8, sore quads" → `state_set(mood="wired", energy=8, sore="quads")`.

## Data locations

- Workout sessions: `~/.workout-claw/logs/YYYY-MM-DD.json`
- Daily state: `~/.life/state/YYYY-MM-DD.json` (inside lifekit)
