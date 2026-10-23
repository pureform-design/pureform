import { sampleSpring } from "@pureform/core";
import {
    alias,
    animation,
    animations,
    dynamic,
    linearEasing,
    numeric,
    spring,
    transition,
    tween,
} from "@pureform/core/ast";
import type { SpringValue } from "@pureform/core/ast";
import type { CoreConfig } from "@pureform/core/types";
import { describe, expect, it } from "vitest";

import { compileNodeToCSS } from "./compile-node";
import { componentTokenVars, registeredProperties } from "./config";
import type { LowerCtx } from "./context";
import { varTokenRef } from "./css";
import { themeVars } from "./runtime";
import { compileSpring } from "./spring";
import { compileStyleMap } from "./style-map";

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

    it("writes a spring token as a duration var and an easing var, with its exact parameters", () => {
        const vars = themeVars(config);
        const sampled = sampleSpring(fast);
        expect(vars["--springs-spatial-fast-duration"]).toBe(
            `${sampled.duration}ms`,
        );
        expect(vars["--springs-spatial-fast-easing"]).toMatch(
            /^linear\(0, .* 1\)$/,
        );
        // A settle from a release speed samples the spring itself again from these.
        expect(vars["--springs-spatial-fast-stiffness"]).toBe("800");
        expect(vars["--springs-spatial-fast-damping"]).toBe("0.6");
        expect(vars["--springs-spatial-fast-mass"]).toBe("1");
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
        // A movement on a spring alongside a fade on its tween.
        expect(
            compileNodeToCSS(
                animations(
                    animation({ name: "grow", spring: spatial }),
                    animation({
                        name: "fade",
                        duration: alias("durations", "short2"),
                    }),
                ),
                ctx,
            ),
        ).toBe(
            "var(--springs-spatial-fast-duration) var(--springs-spatial-fast-easing) grow, " +
                "var(--durations-short2) fade",
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

describe("spring component tokens on the web", () => {
    const withMove = (move: SpringValue): CoreConfig => ({
        ...config,
        components: {
            box: {
                name: "box",
                tokens: {
                    move: dynamic(["components", "box", "move"], move),
                },
                recipe: {},
            } as never,
            card: {
                name: "card",
                tokens: {
                    lift: dynamic(
                        ["components", "card", "lift"],
                        alias("springs", "spatialFast"),
                    ),
                },
                recipe: {},
            } as never,
        },
        themes: {
            aliased: {
                components: {
                    box: {
                        tokens: { move: alias("components", "card", "lift") },
                    },
                },
            },
            slow: {
                components: {
                    box: {
                        tokens: { move: alias("springs", "spatialFast") },
                    },
                },
            },
            literal: {
                components: { box: { tokens: { move: fast } } },
            },
        },
    });
    const move = alias("components", "box", "move");

    it("reads an alias to a spring role through the token's two vars, falling back to the role's", () => {
        const aliased = withMove(alias("springs", "spatialFast"));
        expect(compileSpring(move, { ...ctx, config: aliased })).toEqual([
            "var(--components-box-move-duration, var(--springs-spatial-fast-duration))",
            "var(--components-box-move-easing, var(--springs-spatial-fast-easing))",
        ]);
        expect(
            compileNodeToCSS(transition(tween("transform", { spring: move })), {
                ...ctx,
                config: aliased,
            }),
        ).toBe(
            "transform var(--components-box-move-duration, var(--springs-spatial-fast-duration)) " +
                "var(--components-box-move-easing, var(--springs-spatial-fast-easing))",
        );
    });

    it("falls back to a literal spring's sampled timing", () => {
        const { duration } = sampleSpring(fast);
        const [d, e] = compileSpring(move, { ...ctx, config: withMove(fast) });
        expect(d).toBe(`var(--components-box-move-duration, ${duration}ms)`);
        expect(e).toMatch(
            /^var\(--components-box-move-easing, linear\(0, .*, 1\)\)$/,
        );
    });

    it("writes a theme's override as the two vars, by reference to a role", () => {
        const aliased = withMove(fast);
        expect(
            componentTokenVars(aliased.themes!.slow!, {
                ...ctx,
                config: aliased,
            }),
        ).toEqual({
            "--components-box-move-duration":
                "var(--springs-spatial-fast-duration)",
            "--components-box-move-easing":
                "var(--springs-spatial-fast-easing)",
            "--components-box-move-stiffness":
                "var(--springs-spatial-fast-stiffness)",
            "--components-box-move-damping":
                "var(--springs-spatial-fast-damping)",
            "--components-box-move-mass": "var(--springs-spatial-fast-mass)",
        });
        const literal = componentTokenVars(aliased.themes!.literal!, {
            ...ctx,
            config: aliased,
        });
        expect(literal["--components-box-move-duration"]).toBe(
            `${sampleSpring(fast).duration}ms`,
        );
        expect(Object.keys(literal)).toEqual([
            "--components-box-move-duration",
            "--components-box-move-easing",
            "--components-box-move-stiffness",
            "--components-box-move-damping",
            "--components-box-move-mass",
        ]);
        expect(literal["--components-box-move-stiffness"]).toBe("800");
    });

    it("writes a theme's alias to another component's spring token as the two vars, reading that token's", () => {
        const aliased = withMove(fast);
        expect(
            componentTokenVars(aliased.themes!.aliased!, {
                ...ctx,
                config: aliased,
            }),
        ).toEqual({
            "--components-box-move-duration":
                "var(--components-card-lift-duration, var(--springs-spatial-fast-duration))",
            "--components-box-move-easing":
                "var(--components-card-lift-easing, var(--springs-spatial-fast-easing))",
            "--components-box-move-stiffness":
                "var(--components-card-lift-stiffness, var(--springs-spatial-fast-stiffness))",
            "--components-box-move-damping":
                "var(--components-card-lift-damping, var(--springs-spatial-fast-damping))",
            "--components-box-move-mass":
                "var(--components-card-lift-mass, var(--springs-spatial-fast-mass))",
        });
    });

    it("leaves spring tokens unregistered with @property", () => {
        expect(registeredProperties(withMove(fast), ctx)).toEqual([]);
    });

    it("sets a spring token in a style as its two vars", () => {
        expect(
            compileStyleMap(
                {
                    tokens: {
                        "components.box.move": alias("springs", "spatialFast"),
                    },
                },
                ctx,
            ),
        ).toEqual({
            "--components-box-move-duration":
                "var(--springs-spatial-fast-duration)",
            "--components-box-move-easing":
                "var(--springs-spatial-fast-easing)",
            "--components-box-move-stiffness":
                "var(--springs-spatial-fast-stiffness)",
            "--components-box-move-damping":
                "var(--springs-spatial-fast-damping)",
            "--components-box-move-mass": "var(--springs-spatial-fast-mass)",
        });
    });
});
