# Changelog

## 1.1.1

- Data safety: goals, food library, day logs and the education log are written atomically (temp file + rename in the same directory).
- A corrupt JSON data file now fails with a clear `corrupt JSON` error instead of silently reading as empty, so the next write can no longer overwrite it. A missing file still reads as empty.
- A `--date` that is not a real `YYYY-MM-DD` is rejected before it can become a filename.
- Added storage tests (`npm test`, temp `HOME`, never touches real data).
