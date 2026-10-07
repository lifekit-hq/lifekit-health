import type { MuscleGroup } from './types.js';

/**
 * Heuristic exercise-name → primary muscle group lookup. Used to enrich logged
 * sessions with per-exercise muscle tags so cross-day volume queries
 * ("back volume last 4 weeks") account for accessory work that crosses
 * the session-level muscle_group boundary.
 *
 * Match is substring-based on a normalized form (lowercase, dashes/spaces/
 * underscores stripped). The longest matching movement keyword wins (so 'legcurl'
 * beats 'curl'); list order only breaks ties between equally long keywords.
 * Bench/incline-style modifiers describe position, not movement, so they only
 * decide the group when no movement keyword matches ('incline-db-curl' is arms,
 * 'incline-db' alone is chest).
 */
const KEYWORDS: Array<[string[], MuscleGroup]> = [
  // CORE
  [['plank', 'crunch', 'situp', 'legraise', 'abwheel', 'rollout', 'russiantwist', 'hangingleg', 'kneeraise', 'cablecrunch'], 'core'],
  // ARMS — biceps + triceps share 'arms' bucket
  // Note: 'dip' lives in CHEST below — parallel-bar dips emphasize chest as prime mover.
  //       'tricep-dip' / 'bench-dip' still resolve to arms via the 'tricep' / 'benchdip' keyword
  //       because those are longer than 'dip'.
  [['curl', 'preacher', 'hammercurl', 'bicep', 'spidercurl',
    'triceps', 'tricep', 'skullcrusher', 'pushdown', 'overheadextension', 'kickback', 'benchdip'], 'arms'],
  // SHOULDERS
  [['ohp', 'overheadpress', 'militarypress', 'shoulderpress', 'lateralraise', 'latraise',
    'sideraise', 'frontraise', 'reardelt', 'reversefly', 'reverseflye', 'uprightrow', 'arnoldpress'], 'shoulders'],
  // BACK
  [['pullup', 'chinup', 'latpulldown', 'pulldown', 'row', 'tbar', 'seatedrow', 'cablerow',
    'barbellrow', 'dbrow', 'dumbbellrow', 'bentover', 'facepull', 'shrug', 'deadlift', 'rdl', 'romanian'], 'back'],
  // CHEST
  // 'barbellpress'/'bbpress' cover flat barbell press logged without the word
  // "bench" — a bare 'press' keyword would misroute legpress/shoulderpress.
  [['benchpress', 'dbpress', 'dumbbellpress', 'chestpress', 'barbellpress', 'bbpress',
    'pushup', 'fly', 'flye', 'flies', 'pecdeck', 'cablefly', 'dip'], 'chest'],
  // LEGS
  [['squat', 'legpress', 'hacksquat', 'lunge', 'legcurl', 'legextension', 'calf', 'calves',
    'glute', 'hipthrust', 'bulgarian', 'stepup'], 'legs'],
  // CARDIO
  [['run', 'running', 'sprint', 'jog', 'bike', 'cycling', 'cycle', 'rowmachine', 'rowing',
    'treadmill', 'elliptical', 'walk', 'inclinewalk'], 'cardio'],
];

const CHEST_MODIFIERS = ['bench', 'inclinedb', 'inclinedumbbell'];

function normalize(s: string): string {
  return s.toLowerCase().replace(/[-_\s]/g, '');
}

export function inferMuscleFromName(name: string): MuscleGroup {
  const n = normalize(name);
  let best: MuscleGroup = 'other';
  let bestLen = 0;
  for (const [keywords, muscle] of KEYWORDS) {
    for (const kw of keywords) {
      if (kw.length > bestLen && n.includes(kw)) {
        best = muscle;
        bestLen = kw.length;
      }
    }
  }
  if (bestLen === 0 && CHEST_MODIFIERS.some(kw => n.includes(kw))) return 'chest';
  return best;
}
