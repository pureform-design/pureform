import { defineSlotComponent } from "@pureform/core";
import {
    alias,
    dynamic,
    hex,
    spring,
    transition,
    tween,
} from "@pureform/core/ast";
import { pureform } from "@pureform/preset";
import { createElement } from "react";
import { renderToString } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { precompute, runtimeStyles } from "./build";
import { nativeFactory } from "./factory";
import {
    PureformProvider,
    PureformContainer,
    StylesProvider,
    pressableState,
    useStyleEnvironment,
    useComponentState,
    useComponentStyles,
    useContainerFrame,
    useMeasureContainer,
    useTokens,
    withContainer,
} from "./react";
import type { Overrides, Styles } from "./resolve";
import type { State } from "./select";

const config = pureform();
const options = { components: ["button"], schemes: ["light", "dark"] as const };
const precomputed = precompute(config, {
    ...options,
    schemes: [...options.schemes],
});

// Render a button's root style as JSON through the provider and hook.
const rootStyle = (
    provider: {
        styles: Styles;
        scheme: "light" | "dark";
        overrides?: Overrides;
    },
    state: State = {},
) => {
    const Probe = () =>
        createElement(
            "pre",
            null,
            JSON.stringify(
                useComponentStyles("button", { variant: "filled" }, state).root,
            ),
        );
    const html = renderToString(
        createElement(PureformProvider, provider, createElement(Probe)),
    );
    return JSON.parse(
        html.replace(/^<pre>|<\/pre>$/g, "").replaceAll("&quot;", '"'),
    ) as Record<string, unknown>;
};

describe("PureformProvider and useComponentStyles", () => {
    it("give a component's styles for the scheme", () => {
        const light = rootStyle({ styles: precomputed, scheme: "light" });
        const dark = rootStyle({ styles: precomputed, scheme: "dark" });
        expect(light.backgroundColor).toMatch(/^rgba\(/);
        expect(dark.backgroundColor).not.toBe(light.backgroundColor);
    });

    it("render the same from runtime styles", () => {
        const runtime = runtimeStyles(config, {
            ...options,
            schemes: [...options.schemes],
        });
        expect(rootStyle({ styles: runtime, scheme: "dark" })).toEqual(
            rootStyle({ styles: precomputed, scheme: "dark" }),
        );
    });

    it("apply overrides, and the state", () => {
        const overridden = rootStyle({
            styles: precomputed,
            scheme: "light",
            overrides: { "colors.primary": "rgba(200, 0, 0, 1)" },
        });
        expect(overridden.backgroundColor).toBe("rgba(200, 0, 0, 1)");
        const disabled = rootStyle(
            { styles: precomputed, scheme: "light" },
            { disabled: true },
        );
        expect(disabled.pointerEvents).toBe("none");
    });

    it("give the theme's tokens, with overrides", () => {
        const Probe = () =>
            createElement("i", null, String(useTokens()["colors.primary"]));
        const html = renderToString(
            createElement(
                PureformProvider,
                {
                    styles: precomputed,
                    scheme: "light",
                    overrides: { "colors.primary": "rgba(255, 0, 0, 1)" },
                },
                createElement(Probe),
            ),
        );
        expect(html).toBe("<i>rgba(255, 0, 0, 1)</i>");
    });

    it("take overrides per scheme", () => {
        const overrides = {
            light: { "colors.primary": "rgba(200, 0, 0, 1)" },
            dark: { "colors.primary": "rgba(0, 0, 200, 1)" },
        };
        expect(
            rootStyle({ styles: precomputed, scheme: "light", overrides })
                .backgroundColor,
        ).toBe("rgba(200, 0, 0, 1)");
        expect(
            rootStyle({ styles: precomputed, scheme: "dark", overrides })
                .backgroundColor,
        ).toBe("rgba(0, 0, 200, 1)");
    });

    it("give one instance its own token values", () => {
        const styles = precompute(config, {
            components: ["linearProgress"],
            schemes: ["light"],
        });
        const Probe = (props: { value: number }) =>
            createElement(
                "i",
                null,
                String(
                    useComponentStyles(
                        "linearProgress",
                        {},
                        {},
                        {
                            "components.linearProgress.value": props.value,
                        },
                    ).indicator!.width,
                ),
            );
        const html = renderToString(
            createElement(
                PureformProvider,
                { styles, scheme: "light" },
                createElement(Probe, { value: 40 }),
                createElement(Probe, { value: 75 }),
            ),
        );
        expect(html).toBe("<i>40%</i><i>75%</i>");
    });

    it("need a provider", () => {
        const Probe = () =>
            createElement("i", null, String(useComponentStyles("button")));
        expect(() => renderToString(createElement(Probe))).toThrow(
            "needs a PureformProvider",
        );
    });
});

describe("StylesProvider", () => {
    const switchStyles = precompute(config, {
        components: ["switchControl"],
        schemes: ["light"],
    });
    const factory = nativeFactory("switchControl", switchStyles);
    const source = {
        factory: () => factory,
        themeValues: () => switchStyles,
    };
    const handle = (rtl: boolean) => {
        const Probe = () =>
            createElement(
                "pre",
                null,
                JSON.stringify(
                    useComponentStyles("switchControl", {}, { checked: true })
                        .handle,
                ),
            );
        const html = renderToString(
            createElement(
                StylesProvider,
                { source, scheme: "light", rtl },
                createElement(Probe),
            ),
        );
        return JSON.parse(
            html.replace(/^<pre>|<\/pre>$/g, "").replaceAll("&quot;", '"'),
        ) as Record<string, unknown>;
    };

    it("selects from the source's factories as PureformProvider does", () => {
        const Probe = () =>
            createElement(
                "pre",
                null,
                JSON.stringify(useComponentStyles("switchControl")),
            );
        const render = (provider: unknown) =>
            renderToString(
                createElement(
                    provider as typeof StylesProvider,
                    {
                        source,
                        styles: switchStyles,
                        scheme: "light",
                    } as never,
                    createElement(Probe),
                ),
            );
        expect(render(StylesProvider)).toBe(render(PureformProvider));
    });

    it("selects the styles under rtl when the layout runs right to left", () => {
        expect(handle(true).transform).not.toEqual(handle(false).transform);
        expect(handle(false)).toEqual(
            factory.selected({ checked: true }).styles.handle,
        );
        expect(handle(true)).toEqual(
            factory.selected({ checked: true, rtl: true }).styles.handle,
        );
    });

    it("gives the environment to call a factory in", () => {
        const Probe = () =>
            createElement("pre", null, JSON.stringify(useStyleEnvironment()));
        const html = renderToString(
            createElement(
                StylesProvider,
                {
                    source,
                    scheme: "dark",
                    theme: "teal",
                    svg: true,
                    width: 400,
                },
                createElement(Probe),
            ),
        );
        expect(
            JSON.parse(
                html.replace(/^<pre>|<\/pre>$/g, "").replaceAll("&quot;", '"'),
            ),
        ).toEqual({
            theme: "teal",
            scheme: "dark",
            overrides: {},
            svg: true,
            width: 400,
            containers: {},
        });
    });
});

describe("pressableState", () => {
    it("maps Pressable's state and keeps the component's own", () => {
        expect(
            pressableState(
                { pressed: true, hovered: false, focused: true },
                { checked: true },
            ),
        ).toEqual({
            checked: true,
            pressed: true,
            active: true,
            hover: false,
            focus: true,
            focusVisible: true,
        });
    });
});

describe("timeScale", () => {
    it("stretches every transition by the provider's scale", () => {
        const durations = (timeScale?: number) => {
            const Probe = () =>
                createElement(
                    "pre",
                    null,
                    useComponentState("button", { variant: "filled" })
                        .transitions.root!.map((t) => t.duration)
                        .join(","),
                );
            return renderToString(
                createElement(
                    PureformProvider,
                    {
                        styles: precomputed,
                        scheme: "light",
                        ...(timeScale ? { timeScale } : {}),
                    },
                    createElement(Probe),
                ),
            ).replace(/^<pre>|<\/pre>$/g, "");
        };
        const normal = durations().split(",").map(Number);
        expect(normal.length).toBeGreaterThan(0);
        expect(durations(10).split(",").map(Number)).toEqual(
            normal.map((d) => d * 10),
        );
    });
});

describe("timeScale and springs", () => {
    it("slows a spring by scaling its stiffness and damping", () => {
        const springy = {
            ...config,
            springs: { fast: spring({ stiffness: 800, damping: 0.6 }) },
            components: {
                box: defineSlotComponent({
                    name: "box",
                    slots: ["root"],
                    recipe: {
                        base: {
                            root: {
                                transition: transition(
                                    tween("transform", {
                                        spring: alias("springs", "fast"),
                                    }),
                                ),
                            },
                        },
                    },
                }),
            },
        };
        const styles = precompute(springy, {
            components: ["box"],
            schemes: ["light"],
        });
        const transitionOf = (timeScale?: number) => {
            const Probe = () =>
                createElement(
                    "pre",
                    null,
                    JSON.stringify(
                        useComponentState("box").transitions.root![0],
                    ),
                );
            return JSON.parse(
                renderToString(
                    createElement(
                        PureformProvider,
                        {
                            styles,
                            scheme: "light",
                            ...(timeScale ? { timeScale } : {}),
                        },
                        createElement(Probe),
                    ),
                )
                    .replace(/^<pre>|<\/pre>$/g, "")
                    .replaceAll("&quot;", '"'),
            );
        };
        const normal = transitionOf();
        expect(normal.spring).toEqual({
            type: "spring",
            stiffness: 800,
            damping: 2 * 0.6 * Math.sqrt(800),
            mass: 1,
        });
        const slow = transitionOf(2);
        expect(slow.duration).toBe(normal.duration * 2);
        expect(slow.spring.stiffness).toBeCloseTo(200, 10);
        expect(slow.spring.damping).toBeCloseTo(normal.spring.damping / 2, 10);
        expect(slow.spring.mass).toBe(1);
    });
});

describe("token transitions", () => {
    it("name the token whose own value moves, which no style property takes", () => {
        const config = pureform();
        const styles = precompute(config, {
            components: ["circularProgress"],
            schemes: ["light"],
        });
        const Probe = () =>
            createElement(
                "pre",
                null,
                JSON.stringify(
                    useComponentState(
                        "circularProgress",
                        {},
                        {},
                        {
                            "components.circularProgress.value": 40,
                        },
                    ).transitions.root!.map((t) => t.property),
                ),
            );
        const html = renderToString(
            createElement(
                PureformProvider,
                { styles, scheme: "light" },
                createElement(Probe),
            ),
        );
        expect(html).toContain("--components.circularProgress.value");
    });
});

describe("variant tokens", () => {
    const accent = dynamic(["components", "tinted", "accent"], hex("#0000ff"));
    const tinted = defineSlotComponent({
        name: "tinted",
        tokens: { accent },
        slots: ["root", "label"],
        structure: { root: ["label"] },
        recipe: {
            base: {
                root: { backgroundColor: accent },
                label: { borderColor: accent },
            },
            variants: {
                tone: {
                    plain: {},
                    brand: {
                        root: {
                            tokens: {
                                "components.tinted.accent": hex("#ff0000"),
                            },
                            states: {
                                pressed: {
                                    tokens: {
                                        "components.tinted.accent":
                                            hex("#00ff00"),
                                    },
                                },
                            },
                        },
                    },
                },
            },
            defaultVariants: { tone: "plain" },
        },
    });
    const withTinted = {
        ...config,
        components: { ...config.components, tinted },
    };

    const render = (
        styles: Styles,
        variants: Record<string, string>,
        state: State = {},
        tokens?: Record<string, string>,
    ) => {
        const Probe = () => {
            const { styles: s } = useComponentState(
                "tinted",
                variants,
                state,
                tokens,
            );
            return createElement(
                "pre",
                null,
                JSON.stringify([
                    s.root!.backgroundColor,
                    s.label!.borderColor,
                    s.root,
                ]),
            );
        };
        return renderToString(
            createElement(
                PureformProvider,
                { styles, scheme: "light" },
                createElement(Probe),
            ),
        );
    };

    for (const [mode, build] of [
        ["precomputed", precompute],
        ["runtime", runtimeStyles],
    ] as const) {
        const styles = build(withTinted, {
            components: ["tinted"],
            schemes: ["light"],
        });

        it(`move every slot reading them (${mode})`, () => {
            expect(render(styles, { tone: "plain" })).toContain(
                "[&quot;rgba(0, 0, 255, 1)&quot;,&quot;rgba(0, 0, 255, 1)&quot;",
            );
            expect(render(styles, { tone: "brand" })).toContain(
                "[&quot;rgba(255, 0, 0, 1)&quot;,&quot;rgba(255, 0, 0, 1)&quot;",
            );
            expect(
                render(styles, { tone: "brand" }, { pressed: true }),
            ).toContain(
                "[&quot;rgba(0, 255, 0, 1)&quot;,&quot;rgba(0, 255, 0, 1)&quot;",
            );
        });

        it(`give way to the instance's own (${mode})`, () => {
            expect(
                render(
                    styles,
                    { tone: "brand" },
                    {},
                    {
                        "components.tinted.accent": "#ffffff",
                    },
                ),
            ).toContain("[&quot;#ffffff&quot;,&quot;#ffffff&quot;");
        });

        it(`stay out of the styles (${mode})`, () => {
            expect(render(styles, { tone: "brand" })).not.toContain(
                "--components",
            );
        });
    }
});

describe("container frames", () => {
    it("puts a value under the nearest key and the container's name, keeping the outer ones", () => {
        const outer = { page: 1, "": 2 };
        expect(withContainer(outer, 3, "card")).toEqual({
            page: 1,
            "": 3,
            card: 3,
        });
        expect(withContainer(outer, 3)).toEqual({ page: 1, "": 3 });
        expect(withContainer(outer, undefined, "card")).toBe(outer);
    });

    it("has no frame outside a container, or before one is measured", () => {
        const frames: unknown[] = [];
        const Probe = () => {
            frames.push(useContainerFrame(), useContainerFrame("card"));
            return null;
        };
        renderToString(createElement(Probe));
        renderToString(
            createElement(
                PureformContainer,
                { name: "card" },
                createElement(Probe),
            ),
        );
        expect(frames).toEqual([undefined, undefined, undefined, undefined]);
    });

    it("gives a measure function inside a container only", () => {
        const found: unknown[] = [];
        const Probe = () => {
            found.push(typeof useMeasureContainer());
            return null;
        };
        renderToString(createElement(Probe));
        renderToString(
            createElement(PureformContainer, null, createElement(Probe)),
        );
        expect(found).toEqual(["undefined", "function"]);
    });
});
