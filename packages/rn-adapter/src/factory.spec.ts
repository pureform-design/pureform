import { defineSlotComponent } from "@pureform/core";
import {
    alias,
    colorMix,
    containerSize,
    dynamic,
    pct,
    px,
    rgb,
    slot,
    unitless,
    viewportSize,
    when,
} from "@pureform/core/ast";
import type { CoreConfig } from "@pureform/core/types";
import { pureform } from "@pureform/preset";
import { describe, expect, expectTypeOf, it } from "vitest";

import { precompute, runtimeStyles, splitPrecomputed } from "./build";
import { instanceTokenKeys } from "./codegen";
import {
    componentFactory,
    movingSlots,
    nativeFactory,
    selectionOrder,
} from "./factory";
import type { NativeFactory, NativeSlots } from "./factory";
import type { ComponentStyles } from "./lower";
import { overridesFor, stylesFor, withSetTokens } from "./resolve";
import type { Overrides, Styles } from "./resolve";
import { selectWithTransitions } from "./select";
import type { Selected, State } from "./select";
import type { ThemeValues, Value } from "./values";

// A button whose container color is a dynamic token, darker on hover, with a label, an
// `rtl` and a wide-container case, a viewport case on the label, and a teal theme.
const config = {
    tokens: {
        colors: {
            violet: rgb(100, 50, 150),
            teal: rgb(0, 100, 100),
            white: rgb(255, 255, 255),
        },
    },
    semanticTokens: {
        colors: { primary: alias("tokens", "colors", "violet") },
    },
    components: {
        button: defineSlotComponent({
            name: "button",
            slots: ["root", "label"],
            structure: { root: ["label"] },
            tokens: {
                container: dynamic(
                    ["components", "button", "container"],
                    alias("semanticTokens", "colors", "primary"),
                ),
            },
            recipe: {
                base: {
                    root: {
                        backgroundColor: when(
                            slot("root", "hover"),
                            colorMix(
                                dynamic(
                                    ["components", "button", "container"],
                                    alias(
                                        "semanticTokens",
                                        "colors",
                                        "primary",
                                    ),
                                ),
                                alias("tokens", "colors", "white"),
                                pct(20),
                            ),
                            dynamic(
                                ["components", "button", "container"],
                                alias("semanticTokens", "colors", "primary"),
                            ),
                        ),
                        marginInlineStart: when("rtl", px(4), px(0)),
                        paddingInlineStart: when(
                            containerSize({ min: px(360) }),
                            px(24),
                            px(12),
                        ),
                    },
                    label: {
                        fontSize: when(
                            viewportSize({ min: px(600) }),
                            px(16),
                            px(14),
                        ),
                    },
                },
                variants: {
                    size: {
                        small: { root: { height: px(32) } },
                        large: { root: { height: px(48) } },
                    },
                    toggle: {
                        true: { root: { opacity: unitless(0.5) } },
                        false: {},
                    },
                },
                defaultVariants: { size: "small", toggle: "false" },
            },
        }),
    },
    themes: {
        teal: {
            semanticTokens: {
                colors: { primary: alias("tokens", "colors", "teal") },
            },
        },
    },
} as unknown as CoreConfig;

const BUTTON_TOKENS = { container: "components.button.container" };

type ButtonShape = {
    variants: { size: "small" | "large"; toggle: "true" | "false" };
    slots: "root" | "label";
    states: "hover" | "rtl";
    tokens: "container";
};

// What the hooks gave before the factory: selection over the resolved styles, again with the
// tokens the selection sets, and with the instance's own.
const reference = (
    styles: Styles,
    name: string,
    where: { theme?: string; scheme?: "light" | "dark"; overrides?: Overrides },
    variants: Record<string, string | boolean | undefined>,
    state: State,
    tokens?: Overrides,
): Selected => {
    const scheme = where.scheme ?? "light";
    const key = `${where.theme ?? "base"}:${scheme}`;
    const overrides = overridesFor(where.overrides, scheme);
    const component = stylesFor(styles, key, {
        ...overrides,
        ...(tokens ? overridesFor(tokens, scheme) : {}),
    })[name]!;
    const from = (resolved: ComponentStyles<Value>) =>
        selectWithTransitions(resolved, variants, { scheme, ...state });
    return withSetTokens(from(component), from, {
        styles,
        key,
        name,
        scheme,
        overrides,
        ...(tokens ? { tokens } : {}),
    });
};

const json = (value: unknown) => JSON.stringify(value);

describe("selectionOrder", () => {
    it("keys a component by its groups, the states it reads, and its bounds", () => {
        const { templates } = precompute(config);
        expect(selectionOrder(templates.button!)).toEqual({
            variants: ["size", "toggle"],
            states: ["hover", "rtl"],
            defaults: { size: "small", toggle: "false" },
            bounds: ["container>=360", "width>=600"],
        });
    });

    it("leaves out states named like a group, and the environment's", () => {
        const order = selectionOrder({
            variants: { indeterminate: ["true", "false"] },
            defaultVariants: {},
            entries: [
                {
                    layer: 0,
                    match: {},
                    slot: "",
                    rules: [
                        "indeterminate",
                        "ltr",
                        "svg",
                        "dark",
                        "pressed",
                        "custom",
                    ].map((name) => ({
                        when: [name],
                        specificity: 1,
                        style: {},
                    })),
                },
            ],
        });
        expect(order.states).toEqual(["pressed", "rtl", "custom"]);
    });
});

describe("movingSlots", () => {
    const rule = (style: Record<string, Value>, when: string[] = []) => ({
        when,
        specificity: when.length,
        style,
    });
    const component = (
        rules: Record<string, ReturnType<typeof rule>[]>,
    ): ComponentStyles => ({
        slots: Object.keys(rules),
        variants: { size: ["small", "large"] },
        defaultVariants: { size: "small" },
        entries: Object.entries(rules).map(([slot, list], index) => ({
            layer: index % 2 === 0 ? 0 : 1,
            match: (index % 2 === 0 ? {} : { size: "large" }) as Record<
                string,
                string
            >,
            slot,
            rules: list,
        })),
    });
    const transition = (property: string) => [
        { property, duration: 100, easing: "linear", delay: 0 },
    ];

    it("names the slots with a transition of a style property or an animation, in any case", () => {
        expect(
            movingSlots(
                component({
                    root: [rule({ transition: transition("backgroundColor") })],
                    // In a variant value and under a state.
                    handle: [
                        rule({}),
                        rule({ transition: transition("start") }, ["pressed"]),
                    ],
                    indicator: [rule({ animation: { name: "spin" } as never })],
                    label: [rule({ color: "red" })],
                    // A token's own tween and a clip shape's morph move no view.
                    value: [
                        rule({
                            transition: transition("--components.x.value"),
                        }),
                    ],
                    shape: [rule({ transition: transition("clipPath") })],
                    none: [rule({ transition: "none", animation: "none" })],
                }),
            ),
        ).toEqual(new Set(["root", "handle", "indicator"]));
    });

    it("gives every factory the preset's moving slots", () => {
        const styles = precompute(pureform(), {
            components: ["listItem", "dialog", "linearProgress"],
        });
        expect(nativeFactory("listItem", styles).moving).toEqual(
            new Set(["root"]),
        );
        expect(nativeFactory("dialog", styles).moving).toEqual(new Set());
        expect(nativeFactory("linearProgress", styles).moving).toEqual(
            new Set(["indicator"]),
        );
    });
});

describe("nativeFactory", () => {
    const styles = precompute(config);
    const button = nativeFactory<ButtonShape>("button", styles, BUTTON_TOKENS);

    it("gives what selection gives, by slot", () => {
        const selected = reference(styles, "button", {}, {}, {});
        const slots = button({});
        expect(slots.root.style).toEqual(selected.styles.root);
        expect(slots.label).toEqual({
            style: selected.styles.label,
            transitions: [],
            parent: "root",
        });
        expect(button.selected({})).toEqual(selected);
    });

    it("selects once per key, and freezes what it gives", () => {
        const first = button({ size: "large", hover: true });
        // A state it doesn't read doesn't make a new key.
        expect(
            button({ size: "large", hover: true, pressed: true } as never),
        ).toBe(first);
        expect(button({ size: "large", toggle: false, hover: true })).toBe(
            first,
        );
        expect(button({ toggle: true })).toBe(button({ toggle: "true" }));
        expect(button({})).toBe(button({ size: "small" }));
        expect(Object.isFrozen(first.root.style)).toBe(true);
        expect(button({})).not.toBe(first);
    });

    it("matches selection for every variant, state, scheme, theme, and SVG", () => {
        for (const theme of [undefined, "teal"]) {
            for (const scheme of ["light", "dark"] as const) {
                for (const svg of [false, true]) {
                    const at = button.for({
                        ...(theme ? { theme } : {}),
                        scheme,
                        svg,
                    });
                    for (const size of ["small", "large"] as const) {
                        for (const toggle of [true, false]) {
                            for (const state of <
                                { hover?: boolean; rtl?: boolean }[]
                            >[
                                {},
                                { hover: true },
                                { rtl: true },
                                { hover: true, rtl: true },
                            ]) {
                                const variants = { size, toggle };
                                expect(
                                    at.selected({ ...variants, ...state }),
                                ).toEqual(
                                    reference(
                                        styles,
                                        "button",
                                        { ...(theme ? { theme } : {}), scheme },
                                        variants,
                                        { svg, ...state },
                                    ),
                                );
                            }
                        }
                    }
                }
            }
        }
    });

    it("keeps one table per environment, sharing it between widths that meet the same bounds", () => {
        expect(button.for()).toBe(button.for({ scheme: "light" }));
        expect(button.for({ width: 100 })).toBe(button.for({ width: 599 }));
        expect(button.for({ width: 100 })).not.toBe(button.for({ width: 600 }));
        const wide = button.for({ width: 700, containers: { "": 400 } });
        expect(wide({}).label.style.fontSize).toBe(16);
        expect(wide({}).root.style.paddingStart).toBe(24);
        expect(button({}).label.style.fontSize).toBe(14);
        expect(button({}).root.style.paddingStart).toBe(12);
        expect(button.for({ scheme: "dark" })).not.toBe(button.for());
        expect(button.for({ svg: true })).not.toBe(button.for());
        expect(button.for({ overrides: { "colors.primary": "#ff0000" } })).toBe(
            button.for({ overrides: { "colors.primary": "#ff0000" } }),
        );
    });

    it("applies the provider's overrides", () => {
        const overrides = { "colors.primary": "#ff0000" };
        expect(button.for({ overrides })({}).root.style).toEqual(
            reference(styles, "button", { overrides }, {}, {}).styles.root,
        );
        expect(button.for({ overrides })({}).root.style.backgroundColor).toBe(
            "#ff0000",
        );
    });

    it("sets instance tokens by name, by theme key, or per scheme", () => {
        const named = button({ tokens: { container: "#00ff00" } });
        expect(named.root.style.backgroundColor).toBe("#00ff00");
        expect(button.selected({ tokens: { container: "#00ff00" } })).toEqual(
            reference(
                styles,
                "button",
                {},
                {},
                {},
                {
                    "components.button.container": "#00ff00",
                },
            ),
        );
        expect(
            button({
                tokens: { "components.button.container": "#00ff00" } as never,
            }),
        ).toEqual(named);
        expect(
            button.for({ scheme: "dark" })({
                tokens: {
                    light: { container: "#ffffff" },
                    dark: { container: "#00ff00" },
                } as never,
            }).root.style.backgroundColor,
        ).toBe("#00ff00");
        expect(button({ tokens: {} })).toBe(button({}));
        expect(button({ tokens: { container: "#00ff00" } })).toBe(named);
        expect(Object.isFrozen(named.root.style)).toBe(true);
    });

    it("gives a component without slots its root", () => {
        const preset = precompute(pureform(), { components: ["icon"] });
        const icon = nativeFactory<{ slots: "root" }>("icon", preset);
        expect(Object.keys(icon({}))).toEqual(["root"]);
        expect(icon({}).root.style).toEqual(icon.selected({}).styles[""]);
    });

    it("needs the component in the styles", () => {
        expect(() => nativeFactory("card", styles)).toThrow(
            'no styles for component "card"',
        );
    });

    it("works over runtime styles too", () => {
        const runtime = runtimeStyles(config);
        expect(nativeFactory("button", runtime)({ hover: true })).toEqual(
            button({ hover: true }),
        );
    });

    it("is one factory per styles and component", () => {
        expect(componentFactory(styles, "button")).toBe(
            componentFactory(styles, "button"),
        );
        expect(componentFactory(styles, "button")).not.toBe(button);
    });

    it("types slots, variants, and states from the component's shape", () => {
        expectTypeOf(button).toEqualTypeOf<NativeFactory<ButtonShape>>();
        expectTypeOf(
            button({ size: "large", toggle: true, hover: true }),
        ).toEqualTypeOf<NativeSlots<ButtonShape>>();
        expectTypeOf<keyof NativeSlots<ButtonShape>>().toEqualTypeOf<
            "root" | "label"
        >();
        // @ts-expect-error: not a size
        button({ size: "huge" });
        // @ts-expect-error: a state the button doesn't read
        button({ pressed: true });
        button({ tokens: { container: "#fff" } });
    });
});

describe("splitPrecomputed", () => {
    // Precomputes the whole preset, then each component alone: over half a second on its own.
    it(
        "gives each component's styles as precomputing it alone does",
        { timeout: 30_000 },
        () => {
            const preset = pureform();
            const whole = precompute(preset);
            const split = splitPrecomputed(whole);
            expect(Object.keys(split)).toEqual(Object.keys(whole.templates));
            for (const name of Object.keys(whole.templates)) {
                expect(json(split[name])).toBe(
                    json(precompute(preset, { components: [name] })),
                );
                expect(split[name]!.themes).toBe(whole.themes);
            }
        },
    );
});

describe("over the preset", () => {
    const preset = pureform();
    const whole = precompute(preset);
    const split = splitPrecomputed(whole);

    // Every group's values one at a time, the rest at their defaults.
    const valueByValue = (component: ComponentStyles<unknown>) => [
        {},
        ...Object.entries(component.variants).flatMap(([group, values]) =>
            values.map((value) => ({ [group]: value })),
        ),
    ];

    it(
        "gives what selection gives, for every variant value, each state alone and all, in both schemes, with and without SVG",
        { timeout: 60_000 },
        () => {
            let count = 0;
            for (const [name, component] of Object.entries(whole.templates)) {
                const factory = nativeFactory(name, split[name]!);
                const shared = componentFactory(whole, name);
                const states = factory.order.states ?? [];
                const stateSets: Record<string, boolean>[] = [
                    {},
                    ...states.map((state) => ({ [state]: true })),
                    Object.fromEntries(states.map((state) => [state, true])),
                ];
                for (const scheme of ["light", "dark"] as const) {
                    for (const svg of [false, true]) {
                        const at = factory.for({ scheme, svg });
                        const over = shared.for({ scheme, svg });
                        for (const variants of valueByValue(component)) {
                            for (const state of stateSets) {
                                const expected = json(
                                    reference(
                                        whole,
                                        name,
                                        { scheme },
                                        variants,
                                        { svg, ...state },
                                    ),
                                );
                                const selection = { ...state, ...variants };
                                expect(json(at.selected(selection))).toBe(
                                    expected,
                                );
                                expect(json(over.selected(selection))).toBe(
                                    expected,
                                );
                                count++;
                            }
                        }
                    }
                }
            }
            expect(count).toBeGreaterThan(10_000);
        },
    );

    it(
        "gives what selection gives with each instance token set",
        { timeout: 60_000 },
        () => {
            const theme = whole.themes["base:light"]!;
            for (const [name, spec] of Object.entries(preset.components)) {
                const keys = instanceTokenKeys(name, spec);
                const factory = nativeFactory(name, split[name]!, keys);
                for (const [token, key] of Object.entries(keys)) {
                    const now = theme[key];
                    const value =
                        typeof now === "number"
                            ? now + 3
                            : typeof now === "string" && now.startsWith("rgba")
                              ? "rgba(10, 20, 30, 0.5)"
                              : now;
                    if (value === undefined) continue;
                    const tokens: ThemeValues = { [key]: value };
                    expect(
                        json(
                            factory.selected({
                                tokens: { [token]: value },
                            }),
                        ),
                    ).toBe(json(reference(whole, name, {}, {}, {}, tokens)));
                }
            }
        },
    );
});
