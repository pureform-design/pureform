// The web targets every suite runs on. Each Vitest project pairs a binding with a target: it
// aliases `#registry` to the target's registry and loads the target's stylesheet first
// (`src/targets/<target>/setup.ts`), so components render with that target's real classes.

/** The web targets, in the order the projects are listed. */
export const TARGETS = ["panda", "css", "tailwind"] as const;

export type TargetName = (typeof TARGETS)[number];
