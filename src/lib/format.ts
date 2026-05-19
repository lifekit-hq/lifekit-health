import { stringify } from 'yaml';

function omitUndefined(obj: unknown): unknown {
  if (Array.isArray(obj)) return obj.map(omitUndefined);
  if (obj !== null && typeof obj === 'object') {
    const result: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(obj as Record<string, unknown>)) {
      if (v !== undefined && v !== null) {
        result[k] = omitUndefined(v);
      }
    }
    return result;
  }
  return obj;
}

export function print(data: unknown): void {
  const cleaned = omitUndefined(data);
  process.stdout.write(stringify(cleaned, { lineWidth: 0 }));
}

export function err(msg: string): void {
  process.stderr.write(`error: ${msg}\n`);
}
