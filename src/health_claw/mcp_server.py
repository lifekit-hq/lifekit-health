"""health-claw-mcp — MCP server bridging OpenClaw to workout-claw and life-state CLIs.

Tools:
  workout_log      — log a gym session (fitdown-style input)
  workout_history  — query session history by muscle/exercise
  workout_pr       — get estimated 1RM for an exercise (Epley formula)
  workout_volume   — cross-day volume rollup per muscle group
  workout_summary  — workout summary for a specific date
  workout_last     — most recent workout session across all dates
  workout_delete   — delete a session by ID
  state_set        — record mood, energy, soreness, sleep quality (merge semantics)
  state_get        — read state for a date (default: today)
  state_week       — week aggregate of life-state
  health_summary   — combined: today's state + last workout session

Data paths (via bind-mount in container):
  workout-claw:  ~/.workout-claw/logs/   →  /home/node/.workout-claw/
  life-state:    ~/.life/state/          →  /home/node/.life/state/

Transport:
  stdio (default) — for direct PC/laptop use
  http            — streamable-http for VPS container use (--transport http)
"""

from __future__ import annotations

import logging
import os
import subprocess
from typing import Any

import yaml

logger = logging.getLogger(__name__)

_WORKOUT_CLAW_BIN = os.environ.get("HEALTH_WORKOUT_CLAW_BIN", "workout-claw")
_LIFE_STATE_BIN = os.environ.get("HEALTH_LIFE_STATE_BIN", "life-state")
_CMD_TIMEOUT = int(os.environ.get("HEALTH_CMD_TIMEOUT", "30"))


# ─── subprocess helpers ───────────────────────────────────────────────────────


def _run(cmd: list[str], *, timeout: int = _CMD_TIMEOUT) -> tuple[int, str, str]:
    proc = subprocess.run(cmd, capture_output=True, text=True, timeout=timeout)
    return proc.returncode, proc.stdout, proc.stderr


def _parse_output(stdout: str, stderr: str) -> dict[str, Any]:
    """Parse YAML/text output from a CLI call into a dict."""
    stripped = stdout.strip()
    if stripped:
        try:
            parsed = yaml.safe_load(stripped)
            if isinstance(parsed, (dict, list)):
                return {"result": parsed}
        except yaml.YAMLError:
            pass
    return {"output": stripped, "stderr": stderr.strip() or None}


def _cli_error(cmd_name: str, rc: int, stderr: str, stdout: str) -> dict[str, Any]:
    return {"error": f"{cmd_name}_failed", "rc": rc, "detail": stderr.strip() or stdout.strip()}


# ─── workout-claw tools ───────────────────────────────────────────────────────


def workout_log(
    exercises: str,
    *,
    muscle: str | None = None,
    cardio: str | None = None,
    note: str | None = None,
    date: str | None = None,
    time: str | None = None,
) -> dict[str, Any]:
    cmd = [_WORKOUT_CLAW_BIN, "log", exercises]
    if muscle:
        cmd += ["--muscle", muscle]
    if cardio:
        cmd += ["--cardio", cardio]
    if note:
        cmd += ["--note", note]
    if date:
        cmd += ["--date", date]
    if time:
        cmd += ["--time", time]
    try:
        rc, out, err = _run(cmd)
    except (subprocess.TimeoutExpired, OSError) as exc:
        return {"error": "workout_log_failed", "detail": str(exc)}
    if rc != 0:
        return _cli_error("workout_log", rc, err, out)
    return _parse_output(out, err)


def workout_history(
    *,
    muscle: str | None = None,
    exercise: str | None = None,
    weeks: int = 4,
) -> dict[str, Any]:
    cmd = [_WORKOUT_CLAW_BIN, "history", "--weeks", str(weeks)]
    if muscle:
        cmd += ["--muscle", muscle]
    if exercise:
        cmd += ["--exercise", exercise]
    try:
        rc, out, err = _run(cmd)
    except (subprocess.TimeoutExpired, OSError) as exc:
        return {"error": "workout_history_failed", "detail": str(exc)}
    if rc != 0:
        return _cli_error("workout_history", rc, err, out)
    return _parse_output(out, err)


def workout_pr(exercise: str) -> dict[str, Any]:
    cmd = [_WORKOUT_CLAW_BIN, "pr", exercise]
    try:
        rc, out, err = _run(cmd)
    except (subprocess.TimeoutExpired, OSError) as exc:
        return {"error": "workout_pr_failed", "detail": str(exc)}
    if rc != 0:
        return _cli_error("workout_pr", rc, err, out)
    return _parse_output(out, err)


def workout_volume(muscle: str, *, weeks: int = 4) -> dict[str, Any]:
    cmd = [_WORKOUT_CLAW_BIN, "volume", "--muscle", muscle, "--weeks", str(weeks)]
    try:
        rc, out, err = _run(cmd)
    except (subprocess.TimeoutExpired, OSError) as exc:
        return {"error": "workout_volume_failed", "detail": str(exc)}
    if rc != 0:
        return _cli_error("workout_volume", rc, err, out)
    return _parse_output(out, err)


def workout_summary(*, date: str | None = None) -> dict[str, Any]:
    cmd = [_WORKOUT_CLAW_BIN, "summary"]
    if date:
        cmd += ["--date", date]
    try:
        rc, out, err = _run(cmd)
    except (subprocess.TimeoutExpired, OSError) as exc:
        return {"error": "workout_summary_failed", "detail": str(exc)}
    if rc != 0:
        return _cli_error("workout_summary", rc, err, out)
    return _parse_output(out, err)


def workout_last() -> dict[str, Any]:
    cmd = [_WORKOUT_CLAW_BIN, "last"]
    try:
        rc, out, err = _run(cmd)
    except (subprocess.TimeoutExpired, OSError) as exc:
        return {"error": "workout_last_failed", "detail": str(exc)}
    if rc != 0:
        return _cli_error("workout_last", rc, err, out)
    return _parse_output(out, err)


def workout_delete(session_id: str) -> dict[str, Any]:
    cmd = [_WORKOUT_CLAW_BIN, "delete", session_id]
    try:
        rc, out, err = _run(cmd)
    except (subprocess.TimeoutExpired, OSError) as exc:
        return {"error": "workout_delete_failed", "detail": str(exc)}
    if rc != 0:
        return _cli_error("workout_delete", rc, err, out)
    return _parse_output(out, err)


# ─── life-state tools ─────────────────────────────────────────────────────────


def state_set(
    *,
    mood: str | None = None,
    energy: int | None = None,
    sleep: str | None = None,
    sore: str | None = None,
    note: str | None = None,
    date: str | None = None,
) -> dict[str, Any]:
    cmd = [_LIFE_STATE_BIN, "set"]
    if mood:
        cmd += ["--mood", mood]
    if energy is not None:
        cmd += ["--energy", str(energy)]
    if sleep:
        cmd += ["--sleep", sleep]
    if sore:
        cmd += ["--sore", sore]
    if note:
        cmd += ["--note", note]
    if date:
        cmd += ["--date", date]
    if len(cmd) == 2:
        return {"error": "state_set_no_fields", "detail": "at least one field required"}
    try:
        rc, out, err = _run(cmd)
    except (subprocess.TimeoutExpired, OSError) as exc:
        return {"error": "state_set_failed", "detail": str(exc)}
    if rc != 0:
        return _cli_error("state_set", rc, err, out)
    return _parse_output(out, err)


def state_get(*, date: str | None = None) -> dict[str, Any]:
    cmd = [_LIFE_STATE_BIN, "get"]
    if date:
        cmd += ["--date", date]
    try:
        rc, out, err = _run(cmd)
    except (subprocess.TimeoutExpired, OSError) as exc:
        return {"error": "state_get_failed", "detail": str(exc)}
    if rc != 0:
        return _cli_error("state_get", rc, err, out)
    return _parse_output(out, err)


def state_week(*, days: int = 7) -> dict[str, Any]:
    cmd = [_LIFE_STATE_BIN, "week", "--days", str(days)]
    try:
        rc, out, err = _run(cmd)
    except (subprocess.TimeoutExpired, OSError) as exc:
        return {"error": "state_week_failed", "detail": str(exc)}
    if rc != 0:
        return _cli_error("state_week", rc, err, out)
    return _parse_output(out, err)


# ─── combined summary ─────────────────────────────────────────────────────────


def health_summary() -> dict[str, Any]:
    """Today's life-state + most recent workout in one call."""
    state_result = state_get()
    last_result = workout_last()
    return {
        "state": state_result.get("result", state_result),
        "last_workout": last_result.get("result", last_result),
    }


# ─── MCP server wiring ────────────────────────────────────────────────────────


def build_server():
    from mcp.server.fastmcp import FastMCP

    server = FastMCP("health-claw")

    @server.tool(
        name="workout_log",
        description=(
            "Log a gym session. `exercises` uses fitdown syntax: 'bench 4x10@60, pullups 4x10@bw'. "
            "Multi-word exercise names use dashes: 'incline-db-press', 'barbell-row'. "
            "Bodyweight: '@bw'. All weights in kg. "
            "muscle: back|legs|chest|shoulders|arms|core|cardio (inferred from weekday if omitted). "
            "cardio: e.g. 'incline-walk 20min @4.5kmh i6'. "
            "date: YYYY-MM-DD (default: today). time: HH:MM (default: now)."
        ),
    )
    def _workout_log(
        exercises: str,
        muscle: str | None = None,
        cardio: str | None = None,
        note: str | None = None,
        date: str | None = None,
        time: str | None = None,
    ) -> dict[str, Any]:
        return workout_log(exercises, muscle=muscle, cardio=cardio, note=note, date=date, time=time)

    @server.tool(
        name="workout_history",
        description=(
            "Query workout session history. Filter by muscle group (back|legs|chest|shoulders|arms|core|cardio) "
            "or specific exercise name (normalized, e.g. 'bench', 'deadlift'). weeks: how far back (default 4)."
        ),
    )
    def _workout_history(
        muscle: str | None = None, exercise: str | None = None, weeks: int = 4
    ) -> dict[str, Any]:
        return workout_history(muscle=muscle, exercise=exercise, weeks=weeks)

    @server.tool(
        name="workout_pr",
        description=(
            "Get estimated 1RM for an exercise using the Epley formula (weight × (1 + reps/30)). "
            "exercise: normalized name, e.g. 'bench', 'squat', 'deadlift', 'overhead-press'."
        ),
    )
    def _workout_pr(exercise: str) -> dict[str, Any]:
        return workout_pr(exercise=exercise)

    @server.tool(
        name="workout_volume",
        description=(
            "Cross-day volume rollup per muscle group. Aggregates per-exercise across sessions — "
            "pullups on chest day count toward back volume. "
            "Returns total kg, sets, reps, days trained, per-date breakdown. "
            "Use for 'how much back/chest/leg volume this week?' questions. "
            "muscle: back|legs|chest|shoulders|arms|core. weeks: default 4."
        ),
    )
    def _workout_volume(muscle: str, weeks: int = 4) -> dict[str, Any]:
        return workout_volume(muscle=muscle, weeks=weeks)

    @server.tool(
        name="workout_summary",
        description=(
            "Workout summary for a specific date. date: YYYY-MM-DD (default: today). "
            "Returns exercises, sets, volume, cardio for the day."
        ),
    )
    def _workout_summary(date: str | None = None) -> dict[str, Any]:
        return workout_summary(date=date)

    @server.tool(
        name="workout_last",
        description=(
            "Most recent workout session across all dates. "
            "Use for 'what did I do at the gym?' without naming a specific date."
        ),
    )
    def _workout_last() -> dict[str, Any]:
        return workout_last()

    @server.tool(
        name="workout_delete",
        description=(
            "Delete a workout session by session ID (non-reversible). "
            "Session IDs come from workout_log / workout_summary / workout_last output. "
            "Confirm with the user before calling."
        ),
    )
    def _workout_delete(session_id: str) -> dict[str, Any]:
        return workout_delete(session_id=session_id)

    @server.tool(
        name="state_set",
        description=(
            "Record today's mood, energy, soreness, and sleep quality. "
            "Merge semantics: only passed fields are updated — morning + post-workout check-ins compose cleanly. "
            "mood: great|good|normal|tired|terrible (freeform accepted, stored verbatim). "
            "energy: 1–10. sleep: good|ok|poor. "
            "sore: comma-separated muscle groups e.g. 'chest,triceps'. "
            "Parse loosely: 'feeling wired, energy 8, sore legs' → mood='wired', energy=8, sore='legs'."
        ),
    )
    def _state_set(
        mood: str | None = None,
        energy: int | None = None,
        sleep: str | None = None,
        sore: str | None = None,
        note: str | None = None,
        date: str | None = None,
    ) -> dict[str, Any]:
        return state_set(mood=mood, energy=energy, sleep=sleep, sore=sore, note=note, date=date)

    @server.tool(
        name="state_get",
        description=(
            "Read life-state for a date. date: YYYY-MM-DD (default: today). "
            "Returns mood, energy, soreness, sleep_quality, note."
        ),
    )
    def _state_get(date: str | None = None) -> dict[str, Any]:
        return state_get(date=date)

    @server.tool(
        name="state_week",
        description=(
            "Week aggregate of life-state. days: how many days back (default 7). "
            "Returns avg energy, mood histogram, top soreness areas, per-day rollup."
        ),
    )
    def _state_week(days: int = 7) -> dict[str, Any]:
        return state_week(days=days)

    @server.tool(
        name="health_summary",
        description=(
            "Combined health context: today's life-state (mood, energy, soreness, sleep) "
            "plus the most recent workout session. "
            "Call this at the start of any health conversation to give state-aware suggestions "
            "instead of generic templates."
        ),
    )
    def _health_summary() -> dict[str, Any]:
        return health_summary()

    return server


def main() -> int:
    import argparse

    parser = argparse.ArgumentParser(prog="health-claw-mcp")
    parser.add_argument(
        "--transport",
        choices=["stdio", "http"],
        default="stdio",
        help="MCP transport: stdio (default, for local/PC use) or http (for VPS container use)",
    )
    parser.add_argument("--port", type=int, default=8000, help="Port for HTTP transport (default: 8000)")
    parser.add_argument("--host", default="0.0.0.0", help="Host for HTTP transport (default: 0.0.0.0)")
    args = parser.parse_args()

    logging.basicConfig(
        level=os.environ.get("HEALTH_MCP_LOG_LEVEL", "INFO"),
        format="%(asctime)s %(levelname)s health-claw-mcp %(message)s",
    )

    server = build_server()

    if args.transport == "http":
        server.run(transport="streamable-http", host=args.host, port=args.port)
    else:
        server.run()

    return 0


if __name__ == "__main__":
    raise SystemExit(main())
