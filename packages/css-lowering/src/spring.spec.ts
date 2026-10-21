import { sampleSpring } from "@pureform/core";
import {
    alias,
    animation,
    linearEasing,
    numeric,
    spring,
    transition,
    tween,
} from "@pureform/core/ast";
import type { CoreConfig } from "@pureform/core/types";
import { describe, expect, it } from "vitest";

import { compileNodeToCSS } from "./compile-node";
import type { LowerCtx } from "./context";
import { varTokenRef } from "./css";
import { themeVars } from "./runtime";

const fast = spring({ stiffness: 800, damping: 0.6 });

const config: CoreConfig = {
    tokens: {},
    semanticTokens: {},
    durations: { short2: numeric(100, "ms") },
    springs: { spatialFast: fast },
    components: {},
};

const ctx: LowerCtx = {
    config,
    prefix: undefined,
    target: "css",
    tokenRef: varTokenRef(),
};

describe("springs on the web", () => {
    it("writes linear() easings", () => {
        expect(
            compileNodeToCSS(linearEasing(0, [0.6, 30], [1.1, 70], 1), ctx),
        ).toBe("linear(0, 0.6 30%, 1.1 70%, 1)");
    });

    it("writes a spring token as a duration var and an easing var", () => {
        const vars = themeVars(config);
        const sampled = sampleSpring(fast);
        expect(vars["--springs-spatial-fast-duration"]).toBe(
            `${sampled.duration}ms`,
        );
        expect(vars["--springs-spatial-fast-easing"]).toMatch(
            /^linear\(0, .* 1\)$/,
        );
        expect(vars).toMatchSnapshot();
    });

    it("reads a spring token's vars in a transition and an animation", () => {
        const spatial = alias("springs", "spatialFast");
        expect(
            compileNodeToCSS(
                transition(
                    tween("transform", { spring: spatial }),
                    tween("opacity", {
                        spring: spatial,
                        delay: alias("durations", "short2"),
                    }),
                    tween("color", numeric(100, "ms")),
                ),
                ctx,
            ),
        ).toBe(
            "transform var(--springs-spatial-fast-duration) var(--springs-spatial-fast-easing), " +
                "opacity var(--springs-spatial-fast-duration) var(--springs-spatial-fast-easing) var(--durations-short2), " +
                "color 100ms",
        );
        expect(
            compileNodeToCSS(
                animation({
                    name: "grow",
                    spring: spatial,
                    fillMode: "forwards",
                }),
                ctx,
            ),
        ).toBe(
            "var(--springs-spatial-fast-duration) var(--springs-spatial-fast-easing) forwards grow",
        );
    });

    it("samples a literal spring in place", () => {
        const css = compileNodeToCSS(
            transition(tween("transform", { spring: fast })),
            ctx,
        );
        expect(css).toBe(
            `transform ${sampleSpring(fast).duration}ms linear(${sampleSpring(
                fast,
            )
                .points.map(([o, i]) =>
                    i === undefined ? `${o}` : `${o} ${i}%`,
                )
                .join(", ")})`,
        );
        expect(css).toMatchSnapshot();
    });
});
