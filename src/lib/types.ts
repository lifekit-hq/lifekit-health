export type MuscleGroup = 'back' | 'legs' | 'chest' | 'shoulders' | 'arms' | 'core' | 'full' | 'cardio' | 'other';

export interface SetEntry {
  reps: number;
  weight_kg: number | 'bw';
  rpe?: number;
}

export interface ExerciseEntry {
  name: string;
  sets: SetEntry[];
  muscle?: MuscleGroup;
}

export interface CardioEntry {
  type: string;
  minutes?: number;
  distance_km?: number;
  speed_kmh?: number;
  incline?: number;
  notes?: string;
}

export interface Session {
  id: string;
  time: string;
  muscle_group: MuscleGroup;
  exercises: ExerciseEntry[];
  cardio: CardioEntry[];
  notes?: string;
}

export type DayLog = Session[];

export interface ExerciseTotals {
  total_sets: number;
  total_reps: number;
  total_volume_kg: number;
}

export interface SessionSummary {
  date: string;
  muscle_group: MuscleGroup;
  exercises: number;
  total_sets: number;
  total_volume_kg: number;
}

export interface PRRecord {
  exercise: string;
  date: string;
  weight_kg: number;
  reps: number;
  estimated_1rm_kg: number;
}
