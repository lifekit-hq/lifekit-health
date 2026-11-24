# lifekit-health
The lifekit health module: three local-first CLI tools (workout-claw, nutrition-claw, life-state), each paired with an agent skill, for gym workouts, meals and macros, and daily mood and energy capture. The glossary covers the vocabulary shared across the three packages and the per-tool domain nouns; it does not describe any user's data.

## Language

**Health module**:
The monorepo of the three tools (`workout/`, `nutrition/`, `life-state/`) consolidated from earlier standalone repos.

**CLI**:
The deterministic command-line half of each tool (`workout-claw`, `nutrition-claw`, `life-state`): plain-JSON local storage and YAML output built for agent parsing, with no network and no daemon.

**Skill**:
The `SKILL.md` half of each tool, telling an agent when to invoke the CLI (trigger phrases) and how to call it. Skills declare `metadata.openclaw.requires.bins` so they stay gated until the binary is on PATH.

**State primitive**:
`life-state`'s role as the shared daily state that other skills read to adapt their suggestions (the morning brief today; a future workout suggester for volume and intensity).

**Day state**:
One day's `DayState` record in life-state: `mood`, `energy` (1-10), `soreness`, `sleep_quality` and a free `note`, stored as `<date>.json`.
_Avoid_: life state (the tool's name, not the record)

**Merge semantics**:
The rule that calling `life-state set` again on the same day updates only the fields passed, so a morning check-in and a post-workout check-in compose.

**Session**:
One logged workout (`Session`): an id, a time, a `muscle_group`, its exercises and any cardio. A day's sessions form that day's log.

**Exercise entry**:
One exercise in a session (`ExerciseEntry`): its name, its sets and an optional `muscle`, inferred from the exercise name when logged.

**Set**:
One `SetEntry`: reps, `weight_kg` (or `bw` for bodyweight) and an optional RPE.

**Muscle group**:
One of `back`, `legs`, `chest`, `shoulders`, `arms`, `core`, `full`, `cardio`, `other` (`MuscleGroup`); the axis for history and volume queries.

**Volume**:
The total weight lifted (sets times reps times weight, `total_volume_kg`), rolled up across days for one muscle group by `workout-claw volume`.

**PR**:
A personal record for an exercise (`PRRecord`): the best set by estimated 1RM, found with `workout-claw pr`.

**Estimated 1RM**:
The one-rep max (`estimated_1rm_kg`) computed from a set with the Epley formula.

**Meal**:
One logged eating event (`Meal`): an id, an `HH:MM` wall-clock time, a name and its ingredients.

**Ingredient**:
One item within a meal (`Ingredient`) with its own nutrient values, entered manually or scaled from the food library.

**Food library**:
The reusable personal set of foods (`FoodLibrary`, `FoodEntry`), each defined per an amount and unit, that ingredients can be added from.

**Goals**:
The daily nutrient targets (`Goals`); each nutrient is a `min` or `max` direction (`GOAL_DIRECTION`), for example protein a minimum and calories a maximum. Set with `goals set` or the `configure` wizard.

**Configure**:
The first-time `nutrition-claw configure` flow that computes goals from a body profile (auto mode) or sets each nutrient directly (manual mode).

**Impact feedback**:
The `impact` block returned by `meal ingredient add` and `update`: per nutrient, what the ingredient added, the running daily total and the share of goal.

**Semantic search**:
Offline, embedding-based lookup (ONNX vectors) over meals, ingredients and foods in nutrition-claw, so a food is found without an exact name.

**Day log**:
`DayLog`, the day's list of entries: sessions in workout-claw and meals in nutrition-claw.

## Relationships
- Each tool is one **CLI** plus one **Skill**; the skill tells the agent when and how to call the CLI.
- A **Session** has many **Exercise entries**, each with many **Sets**, and carries one **Muscle group**.
- **Volume** and **PR** are derived from **Sets**; a **PR** is ranked by **Estimated 1RM**.
- A **Meal** has many **Ingredients**; an **Ingredient** may be scaled from an entry in the **Food library**.
- Adding an **Ingredient** returns **Impact feedback** measured against the **Goals**.
- **Semantic search** spans **Meals**, **Ingredients** and the **Food library**.
- **Day state** is the **State primitive** that other skills read; it is written with **Merge semantics**.

## Flagged ambiguities
- `DayLog` is two different types: `Session[]` in `workout/src/lib/types.ts` and `Meal[]` in `nutrition/src/lib/types.ts`.
- `muscle` vs `muscle_group` vs `--sore` vs `soreness`: the session's focus is `muscle_group`, a single exercise's is `muscle` (`workout/src/lib/types.ts`), and life-state records `soreness` through the `--sore` flag (`life-state/SKILL.md`).
- "state" vs "life-state": `life-state` is the tool and `DayState` the record; the storage path is `~/.life/state/` (legacy `.life` naming), overridable with `LIFE_STATE_DIR` (`life-state/src/lib/storage.ts:8`).
- `summary` is a command in both workout-claw and nutrition-claw with different meanings (a day's sessions vs a day's nutrient totals against goals).
