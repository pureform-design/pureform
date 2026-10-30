// The web's stagger: CSS runs the animation, and JavaScript only works out its timing. A theme
// spring is sampled into one wait per item (`staggerDelays` in animate-core), and each item takes
// its wait as the `--pf-stagger-delay` custom property, which the item's own CSS animation reads
// (`animation-delay: var(--pf-stagger-delay)`). No frame of the sequence runs JavaScript.

import { staggerDelays } from "@pureform/animate-core";
import { settleTime, springAt, springProblem } from "@pureform/core";
import type { SpringNode } from "@pureform/core/ast";

/** The custom property an item's CSS animation reads its wait from. */
export const STAGGER_DELAY_VAR = "--pf-stagger-delay";

export interface StaggerOptions {
    /** How many items. */
    readonly count: number;
    /** The theme spring the count runs on (Compose's menu uses `SlowEffects`). */
    readonly spring: SpringNode;
    /** Entering shows items up the count; leaving hides them back down it, in reverse. */
    readonly phase: "enter" | "exit";
    /** Which end shows first when entering. Default `"end"`. */
    readonly from?: "start" | "end";
    /** How much longer motion runs, for watching it slowly. Default 1. */
    readonly timeScale?: number;
    /** Reduced motion drops the stagger: every item at once. */
    readonly reducedMotion?: boolean;
}

export interface Stagger {
    /** Each item's wait, in ms, in item order. */
    readonly delays: readonly number[];
    /** How long the spring takes to settle, in ms: the longest the sequence can run. */
    readonly duration: number;
    /** The style for item `index`: its wait as `--pf-stagger-delay`. */
    readonly style: (index: number) => Record<string, string>;
}

const ms = (value: number): string => `${Math.round(value * 100) / 100}ms`;

/** A stagger on a theme spring, as CSS custom properties per item. */
export const stagger = (options: StaggerOptions): Stagger => {
    const { count, spring, phase, from, reducedMotion } = options;
    const problem = springProblem(spring);
    if (problem) throw new Error(`stagger: ${problem}`);
    // The spring's settle time, in ms, bounds the sequence.
    const duration = Math.ceil(settleTime(spring) * 1000);
    const delays = staggerDelays({
        count,
        curve: (time) => springAt(spring, time / 1000),
        duration,
        phase,
        ...(from === undefined ? {} : { from }),
        ...(options.timeScale === undefined
            ? {}
            : { timeScale: options.timeScale }),
        ...(reducedMotion === undefined ? {} : { reducedMotion }),
    });
    return {
        delays,
        duration,
        style: (index) => ({ [STAGGER_DELAY_VAR]: ms(delays[index] ?? 0) }),
    };
};
