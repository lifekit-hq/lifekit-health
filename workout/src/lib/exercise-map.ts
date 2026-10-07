import type { MuscleGroup } from './types.js';

/**
 * Heuristic exercise-name → primary muscle group lookup. Used to enrich logged
 * sessions with per-exercise muscle tags so cross-day volume queries
 * ("back volume last 4 weeks") account for accessory work that crosses
 * the session-level muscle_group boundary.
 *
 * Match is substring-based on a normalized form (lowercase, dashes/spaces/
 * underscores stripped). The longest matching keyword wins (so 'legcurl' beats
 * 'curl'); list order only breaks ties between equally long keywords.
 */
const KEYWORDS: Array<[string[], MuscleGroup]> = [
  // CORE
  [['plank', 'crunch', 'situp', 'legraise', 'abwheel', 'rollout', 'russiantwist', 'hangingleg', 'kneeraise', 'cablecrunch'], 'core'],
  // ARMS — biceps + triceps share 'arms' bucket
  // Note: 'dip' lives in CHEST below — parallel-bar dips emphasize chest as prime mover.
  //       'tricep-dip' / 'bench-dip' still resolve to arms via the 'tricep' / 'benchdip' keyword
  //       because arms is checked before chest.
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
  [['bench', 'benchpress', 'inclinebench', 'declinebench', 'inclinedb', 'inclinedumbbell',
    'dbpress', 'dumbbellpress', 'chestpress', 'barbellpress', 'bbpress',
    'pushup', 'fly', 'flye', 'flies', 'pecdeck', 'cablefly', 'dip'], 'chest'],
  // LEGS
  [['squat', 'legpress', 'hacksquat', 'lunge', 'legcurl', 'legextension', 'calf', 'calves',
    'glute', 'hipthrust', 'bulgarian', 'stepup'], 'legs'],
  // CARDIO
  [['run', 'running', 'sprint', 'jog', 'bike', 'cycling', 'cycle', 'rowmachine', 'rowing',
    'treadmill', 'elliptical', 'walk', 'inclinewalk'], 'cardio'],
];

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
  return best;
}
