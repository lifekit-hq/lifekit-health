# Changelog

## 0.4.0

**Data safety**
- Day files are written atomically (temp file + rename in the same directory).
- A corrupt JSON day file now fails with a clear `corrupt JSON` error instead of reading as empty, so the next log can no longer overwrite it. A missing file still reads as empty.

**Input**
- Spaces in exercise names are accepted and normalized to dashes: `bench press 3x8@60`.
- `kg` / `lb` suffix: `bench 3x8@60kg`, `bench 1x5@135lb` (lb is stored as kg).
- Per-set reps and weights: `bench 8,8,6@60`, `bench 8@60,6@65`. All previously accepted forms still work.

**Muscle inference**
- The most specific keyword wins: `leg-curl` is legs, `curl` is still arms; `rowing` is cardio.
- The hardcoded weekday split (Mon=back, Wed=legs, Fri=chest) is removed. The session muscle group is inferred from the exercises, or taken from an optional `~/.workout-claw/config.json` (`{"split":{"mon":"back"}}`). `inferMuscleFromWeekday` is gone.

**Dates**
- `--date YYYY-MM-DD` on `log` and `summary`; the default is the local date (it was UTC). Anything that is not a real date is rejected before it can become a filename.

**Tests**
- New tests run against a temp `HOME` and never touch real data.
