# Changelog

## v0.1.0 — 2026-05-23

Initial release.

- `health-claw-mcp` Python MCP server wrapping `workout-claw` and `life-state` CLIs
- Tools: `workout_log`, `workout_history`, `workout_pr`, `workout_volume`, `workout_summary`, `workout_last`, `workout_delete`, `state_set`, `state_get`, `state_week`, `health_summary`
- `--transport stdio|http` for local and VPS container use
- `SKILL.md` manifest for OpenClaw integration
- Replaces direct CLI skill invocations of workout-claw and life-state in the lifekit stack
