// A stagger on a spring: the spring is sampled into the progression curve `staggerDelays` follows,
// and its settle time bounds the sequence. Both adapters use it, so the web and React Native run
// the same sequence from the same spring.

import { settleTime, springAt, springProblem } from "@pureform/core";
import type { SpringNode } from "@pureform/core/ast";

import { staggerDelays } from "./stagger";
import type { StaggerOptions } from "./stagger";

export interface SpringStaggerOptions extends Omit<
    StaggerOptions,
    "curve" | "duration"
> {
    /** The spring the count runs on (Compose's menu uses `SlowEffects`). */
    readonly spring: SpringNode;
}

export interface SpringStagger {
    /** Each item's wait, in ms, in item order. */
    readonly delays: readonly number[];
    /** How long the spring takes to settle, in ms: the longest the sequence can run. */
    readonly duration: number;
}

/** Each item's wait for a count running on `spring`, and the spring's settle time. */
export const staggerOnSpring = (
    options: SpringStaggerOptions,
): SpringStagger => {
    const { spring, ...rest } = options;
    const problem = springProblem(spring);
    if (problem) throw new Error(`stagger: ${problem}`);
    const duration = Math.ceil(settleTime(spring) * 1000);
    return {
        delays: staggerDelays({
            ...rest,
            curve: (time) => springAt(spring, time / 1000),
            duration,
        }),
        duration,
    };
};
