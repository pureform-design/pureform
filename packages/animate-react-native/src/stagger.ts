// React Native's stagger: the same sampled waits as the web's, for the engine to hand to its
// fastest path (an Animated or Reanimated delay), with no per-frame JavaScript to time the
// sequence. A spring is sampled into one wait per item (`staggerOnSpring` in animate-core).

import { staggerOnSpring } from "@pureform/animate-core";
import type {
    SpringStagger,
    SpringStaggerOptions,
} from "@pureform/animate-core";

export type StaggerOptions = SpringStaggerOptions;
export type Stagger = SpringStagger;

/** Each item's wait, in ms, for a count running on a theme spring, and the spring's settle time:
 *  the item nearest the FAB first when entering, the farthest first when leaving. */
export const stagger = (options: StaggerOptions): Stagger =>
    staggerOnSpring(options);
