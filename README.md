# health-claw

Lifekit health module. An MCP server that wraps [`workout-claw`](https://github.com/dsdevq/workout-claw) (gym tracker) and [`life-state`](https://github.com/dsdevq/life-state) (daily state primitive) behind a single `streamable-http` endpoint so OpenClaw can give state-aware fitness suggestions.

Part of the [lifekit](https://github.com/dsdevq/lifekit) personal-AI ecosystem.

## Architecture

```
OpenClaw gateway → health-claw MCP (http://health-claw:8000/mcp/)
                          ↓                    ↓
                   workout-claw CLI      life-state CLI
                          ↓                    ↓
              ~/.workout-claw/logs/    ~/.life/state/
```

OpenClaw never calls workout-claw or life-state directly — everything routes through this MCP server. The MCP layer adds a `health_summary` tool that combines both data sources for state-aware context at conversation start.

## Install

```bash
git clone https://github.com/dsdevq/health-claw.git
cd health-claw
pip install -e .
```

Requires Python >= 3.12. Also requires `workout-claw` and `life-state` CLIs on PATH:

```bash
# workout-claw
git clone https://github.com/dsdevq/workout-claw.git && cd workout-claw
npm install && npm run build && npm link

# life-state
git clone https://github.com/dsdevq/life-state.git && cd life-state
npm install && npm run build && npm install -g .
```

## Usage

```bash
# stdio (local / PC use)
health-claw-mcp

# HTTP (VPS container use)
health-claw-mcp --transport http --port 8000
```

## Tools

| Tool | Backed by | Description |
|---|---|---|
| `workout_log` | workout-claw | Log a gym session (fitdown syntax) |
| `workout_history` | workout-claw | Query session history by muscle/exercise |
| `workout_pr` | workout-claw | Estimated 1RM via Epley formula |
| `workout_volume` | workout-claw | Cross-day volume rollup per muscle group |
| `workout_summary` | workout-claw | Day summary |
| `workout_last` | workout-claw | Most recent session |
| `workout_delete` | workout-claw | Delete session by ID |
| `state_set` | life-state | Record mood, energy, soreness, sleep (merge) |
| `state_get` | life-state | Read state for a date |
| `state_week` | life-state | Week aggregate |
| `health_summary` | both | Today's state + last workout in one call |

## VPS deployment

health-claw runs as a container in the [lifekit-stack](https://github.com/dsdevq/lifekit-stack). See `compose/docker-compose.yml` there.

## License

MIT.
