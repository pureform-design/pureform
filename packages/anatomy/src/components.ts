// Types over the preset's components, from the generated anatomy.

import type { anatomy } from "./generated";
import type { PartName } from "./types";

/** The preset components' anatomies, by name. */
export type Anatomies = typeof anatomy;

/** A preset component's name. */
export type AnatomyName = keyof Anatomies;

/** A preset component's part names: `PartOf<"button">` is `"root" | "label" | …`. */
export type PartOf<N extends AnatomyName> = PartName<Anatomies[N]>;
