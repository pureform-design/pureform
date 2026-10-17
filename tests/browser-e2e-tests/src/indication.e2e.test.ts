// The state layer and the focus indicator against fixtures: every component at each variant
// value, in each interaction state, must compute the colors and outlines the fixtures recorded,
// on each web target (the Panda preset, the CSS adapter, Tailwind) and in React Native's styles.
// The fixtures were recorded before the state layer and the focus indicator read component
// tokens, so the default indication draws exactly what it drew before.
//
// Each fixture lists, per element, its resting values and the states that change them. An
// element no state changes is left out.
//
// A component's own indication tokens, set on its root, change it and not a component of the
// same kind nested inside it, which starts from the theme's again.

import * as pandaRecipes from "$recipes";
import { classesFor, manifestOf } from "@pureform/css-adapter";
import type { PrecomputedStyles, State, Style } from "@pureform/rn-adapter";
import { componentFactory } from "@pureform/rn-adapter/factory";
import type {
    AnyComponent,
    NativeSelection,
} from "@pureform/rn-adapter/factory";
import { tokenVar } from "@pureform/styling/theme-vars";
import { describe, expect, it } from "vitest";
import { commands } from "vitest/browser";

import { pureformConfig } from "../../../apps/solid-demo/panda.pureform";
import type { Adapter } from "./commands";
import { forcePseudoClasses } from "./force-pseudo";
import { RN_COMPONENTS } from "./rn-components";

import pandaCss from "#/App.css?inline";

const OPTIONS = { prefix: "pf", themeAttribute: "data-panda-theme" };

interface Scenario {
    name: string;
    /** Attributes set on every element. */
    attributes?: string[];
    /** Pseudo-classes forced on every element. */
    pseudoClasses?: string[];
    /** The same state in React Native's selection. */
    state: State;
}

const SCENARIOS: Scenario[] = [
    { name: "rest", state: {} },
    { name: "hovered", attributes: ["data-pf-hover"], state: { hover: true } },
    {
        name: "focused",
        pseudoClasses: ["focus", "focus-visible", "focus-within"],
        state: { focus: true, focusVisible: true },
    },
    {
        name: "pressed",
        attributes: ["data-pf-active"],
        state: { pressed: true, active: true },
    },
    {
        name: "dragged",
        attributes: ["data-pf-dragging"],
        state: { dragged: true },
    },
    {
        name: "hovered-selected",
        attributes: ["data-pf-hover", 'aria-selected="true"'],
        state: { hover: true, selected: true },
    },
    {
        name: "pressed-checked",
        attributes: ["data-pf-active", 'aria-checked="true"'],
        state: { pressed: true, active: true, checked: true },
    },
    {
        name: "focused-checked",
        attributes: ['aria-checked="true"'],
        pseudoClasses: ["focus", "focus-visible", "focus-within"],
        state: { focus: true, focusVisible: true, checked: true },
    },
];

interface Item {
    id: string;
    name: string;
    selection: Record<string, string>;
}

// Each component's defaults, then each variant value on its own.
const itemsOf = (
    name: string,
    variants: Readonly<Record<string, readonly string[]>>,
): Item[] => [
    { id: name, name, selection: {} },
    ...Object.entries(variants).flatMap(([group, values]) =>
        values.map((value) => ({
            id: `${name}[${group}=${value}]`,
            name,
            selection: { [group]: value },
        })),
    ),
];

const SPECS = Object.values(pureformConfig.components);

const WEB_ITEMS: Item[] = SPECS.flatMap((spec) =>
    itemsOf(spec.name, manifestOf(spec).variants),
);

// A component's slots as a tree: the slots no other contains, each holding its own.
const outermost = (
    slots: readonly string[],
    structure: Readonly<Record<string, readonly string[]>>,
): string[] => {
    const inner = new Set(Object.values(structure).flat());
    return slots.filter((slot) => !inner.has(slot));
};

type Classes = string | Record<string, string>;
type ClassFns = Record<string, (selection: object) => Classes>;

// Panda types a "true"/"false" group as a boolean and compares strictly.
const pandaSelection = (selection: Record<string, string>) =>
    Object.fromEntries(
        Object.entries(selection).map(([group, value]) => [
            group,
            value === "true" ? true : value === "false" ? false : value,
        ]),
    );

const CLASSES: Record<"panda" | "plain", (item: Item) => Classes> = {
    panda: ({ name, selection }) =>
        (pandaRecipes as unknown as ClassFns)[name]!(pandaSelection(selection)),
    plain: ({ name, selection }) =>
        (classesFor(pureformConfig) as ClassFns)[name]!(selection),
};

const markup = (
    classesOf: (item: Item) => Classes,
    scenario: Scenario,
): string => {
    const attributes = (scenario.attributes ?? [])
        .map((attribute) => ` ${attribute}`)
        .join("");
    return WEB_ITEMS.map((item) => {
        const spec = pureformConfig.components[
            item.name as keyof typeof pureformConfig.components
        ] as { slots?: string[]; structure?: Record<string, string[]> };
        const classes = classesOf(item);
        const element = (slot: string): string => {
            const own = typeof classes === "string" ? classes : classes[slot];
            const inner = (spec.structure?.[slot] ?? []).map(element).join("");
            return `<div data-id="${item.id}.${slot}"${attributes} class="${own}">${inner}</div>`;
        };
        return `<div>${outermost(spec.slots ?? ["root"], spec.structure ?? {})
            .map(element)
            .join("")}</div>`;
    }).join("\n");
};

// What an element draws in a scenario: its background, its color, and its outline, `none`
// when there's none of ours (the browser's own focus outline, `auto`, counts as none).
interface Drawn {
    bg: string;
    color: string;
    outline: string;
}

// Each item's elements, by item and then slot, in a scenario.
type Values = Record<string, Record<string, Drawn>>;

const outline = (
    style: string | undefined,
    width: string | number | undefined,
    color: string | undefined,
    offset: string | number | undefined,
): string =>
    !style || style === "none" || style === "auto" || !width
        ? "none"
        : `${style} ${width} ${color} offset ${offset}`;

const webValues = async (
    classesOf: (item: Item) => Classes,
    scenario: Scenario,
    css: string[],
    keepOnly?: string[],
): Promise<Values> => {
    const frame = document.createElement("iframe");
    frame.id = "indication-frame";
    frame.style.cssText = "width: 1280px; height: 900px; border: 0";
    document.body.append(frame);
    try {
        const doc = frame.contentDocument!;
        doc.open();
        doc.write(
            `<!doctype html><html><head><style>${pandaCss}</style>${css
                .map((sheet) => `<style>${sheet}</style>`)
                .join(
                    "",
                )}</head><body>${markup(classesOf, scenario)}</body></html>`,
        );
        doc.close();
        if (keepOnly) {
            // Keep only Panda's reset and base layers, and its layer order.
            const sheet = doc.styleSheets[0]!;
            const win = frame.contentWindow as unknown as typeof globalThis;
            for (let i = sheet.cssRules.length - 1; i >= 0; i--) {
                const rule = sheet.cssRules[i];
                const keep =
                    rule instanceof win.CSSLayerStatementRule ||
                    (rule instanceof win.CSSLayerBlockRule &&
                        keepOnly.includes(rule.name));
                if (!keep) sheet.deleteRule(i);
            }
        }
        if (scenario.pseudoClasses) {
            await forcePseudoClasses(
                frame,
                "[data-id]",
                scenario.pseudoClasses,
            );
        }
        const out: Values = {};
        for (const element of doc.querySelectorAll<HTMLElement>("[data-id]")) {
            const style = frame.contentWindow!.getComputedStyle(element);
            const id = element.dataset.id!;
            const dot = id.lastIndexOf(".");
            (out[id.slice(0, dot)] ??= {})[id.slice(dot + 1)] = {
                bg: style.backgroundColor,
                color: style.color,
                outline: outline(
                    style.outlineStyle,
                    style.outlineWidth,
                    style.outlineColor,
                    style.outlineOffset,
                ),
            };
        }
        return out;
    } finally {
        frame.remove();
    }
};

const nativeValues = (
    styles: PrecomputedStyles,
    scenario: Scenario,
): Values => {
    const out: Values = {};
    for (const name of RN_COMPONENTS) {
        const factory = componentFactory(styles, name).for({ scheme: "light" });
        for (const item of itemsOf(name, styles.templates[name]!.variants)) {
            const bySlot = factory.selected({
                ...item.selection,
                ...scenario.state,
            } as NativeSelection<AnyComponent>).styles as Record<
                string,
                Style | undefined
            >;
            const own: Record<string, Drawn> = (out[item.id] = {});
            for (const [slot, style = {}] of Object.entries(bySlot)) {
                const value = (property: string) =>
                    (style as Record<string, unknown>)[property] as
                        | string
                        | number
                        | undefined;
                own[slot] = {
                    bg: String(value("backgroundColor") ?? "none"),
                    color: String(value("color") ?? "none"),
                    outline: outline(
                        value("outlineStyle") as string | undefined,
                        value("outlineWidth"),
                        value("outlineColor") as string | undefined,
                        value("outlineOffset"),
                    ),
                };
            }
        }
    }
    return out;
};

const same = (a: Drawn | undefined, b: Drawn | undefined) =>
    a?.bg === b?.bg && a?.color === b?.color && a?.outline === b?.outline;

// What changes from `from` to `to`, or everything without `from`.
const describeDrawn = (to: Drawn, from?: Drawn): string =>
    (["bg", "color", "outline"] as const)
        .filter((key) => to[key] !== from?.[key])
        .map((key) => `${key} ${to[key]}`)
        .join(" | ");

// The fixture's text: per element, what it draws at rest, then what each state changes. An item
// that draws as its component's defaults in every scenario is left out, and so is an element
// no state changes.
const fixture = (byScenario: Record<string, Values>): string => {
    const lines: string[] = [];
    const rest = byScenario.rest!;
    const defaultsOf = (id: string) => id.replace(/\[.*$/, "");
    for (const [id, slots] of Object.entries(rest)) {
        const defaults = defaultsOf(id);
        if (
            defaults !== id &&
            SCENARIOS.every(({ name }) =>
                Object.entries(byScenario[name]![id]!).every(([slot, drawn]) =>
                    same(drawn, byScenario[name]![defaults]?.[slot]),
                ),
            )
        ) {
            continue;
        }
        for (const [slot, drawn] of Object.entries(slots)) {
            const changed = SCENARIOS.filter(
                ({ name }) =>
                    name !== "rest" &&
                    !same(byScenario[name]![id]![slot], drawn),
            );
            if (changed.length === 0) continue;
            lines.push(`${id}.${slot}: ${describeDrawn(drawn)}`);
            for (const { name } of changed) {
                lines.push(
                    `    ${name}: ${describeDrawn(byScenario[name]![id]![slot]!, drawn)}`,
                );
            }
        }
    }
    return `${lines.join("\n")}\n`;
};

const ADAPTERS: [target: string, adapter?: Adapter][] = [
    ["panda"],
    ["css", "CSS"],
    ["tailwind", "Tailwind"],
];

describe("the state layer and the focus indicator compute as the fixtures recorded", () => {
    it.each(ADAPTERS)("%s", async (_target, adapter) => {
        const css = adapter
            ? [await commands.adapterCss(adapter, OPTIONS)]
            : [];
        const byScenario: Record<string, Values> = {};
        for (const scenario of SCENARIOS) {
            byScenario[scenario.name] = await webValues(
                adapter ? CLASSES.plain : CLASSES.panda,
                scenario,
                css,
                adapter ? ["reset", "base"] : undefined,
            );
        }
        await expect(fixture(byScenario)).toMatchFileSnapshot(
            "./__fixtures__/indication/web.txt",
        );
    });

    it("React Native", async () => {
        const styles = await commands.rnStyles();
        const byScenario = Object.fromEntries(
            SCENARIOS.map((scenario) => [
                scenario.name,
                nativeValues(styles, scenario),
            ]),
        );
        await expect(fixture(byScenario)).toMatchFileSnapshot(
            "./__fixtures__/indication/native.txt",
        );
    });
});

// A component's tree of slots as markup, with `inside` placed in the slot `into`.
const nestedMarkup = (
    name: string,
    classes: Classes,
    id: string,
    rootStyle = "",
    inside?: { into: string; html: string },
): string => {
    const spec = pureformConfig.components[
        name as keyof typeof pureformConfig.components
    ] as { slots: string[]; structure?: Record<string, string[]> };
    const element = (slot: string): string => {
        const own = typeof classes === "string" ? classes : classes[slot];
        const style =
            slot === "root" && rootStyle ? ` style="${rootStyle}"` : "";
        const inner =
            (spec.structure?.[slot] ?? []).map(element).join("") +
            (inside?.into === slot ? inside.html : "");
        return `<div data-id="${id}.${slot}" data-pf-hover class="${own}"${style}>${inner}</div>`;
    };
    return outermost(spec.slots, spec.structure ?? {})
        .map(element)
        .join("");
};

// Components whose surface is their root, another slot, and a slot following the root.
const NESTED: [name: string, surface: string][] = [
    ["button", "root"],
    ["iconButton", "container"],
    ["checkbox", "root"],
];

const OWN_TOKENS = {
    stateHoverOpacity: "50%",
    focusIndicatorThickness: "7px",
    focusIndicatorColor: "rgb(255, 0, 0)",
};

// The same in React Native's values: lengths in points.
const NATIVE_OWN_TOKENS = {
    stateHoverOpacity: "50%",
    focusIndicatorThickness: 7,
    focusIndicatorColor: "rgba(255, 0, 0, 1)",
};

describe("a component's own indication tokens", () => {
    it.each(ADAPTERS)(
        "change it and not a nested one of the same kind, on %s",
        async (_target, adapter) => {
            const css = adapter
                ? [await commands.adapterCss(adapter, OPTIONS)]
                : [];
            const frame = document.createElement("iframe");
            frame.id = "indication-nested";
            frame.style.cssText = "width: 1280px; height: 900px; border: 0";
            document.body.append(frame);
            try {
                const html = NESTED.map(([name, surface]) => {
                    const classes = (adapter ? CLASSES.plain : CLASSES.panda)({
                        id: name,
                        name,
                        selection: {},
                    });
                    const own = Object.entries(OWN_TOKENS)
                        .map(
                            ([token, value]) =>
                                `${tokenVar(`components.${name}.${token}`, OPTIONS)}: ${value}`,
                        )
                        .join("; ");
                    return `<div>${nestedMarkup(
                        name,
                        classes,
                        `${name}-outer`,
                        own,
                        {
                            into: surface,
                            html: nestedMarkup(name, classes, `${name}-inner`),
                        },
                    )}${nestedMarkup(name, classes, `${name}-plain`)}</div>`;
                }).join("");
                const doc = frame.contentDocument!;
                doc.open();
                doc.write(
                    `<!doctype html><html><head><style>${pandaCss}</style>${css
                        .map((sheet) => `<style>${sheet}</style>`)
                        .join("")}</head><body>${html}</body></html>`,
                );
                doc.close();
                if (adapter) {
                    const sheet = doc.styleSheets[0]!;
                    const win =
                        frame.contentWindow as unknown as typeof globalThis;
                    for (let i = sheet.cssRules.length - 1; i >= 0; i--) {
                        const rule = sheet.cssRules[i];
                        const keep =
                            rule instanceof win.CSSLayerStatementRule ||
                            (rule instanceof win.CSSLayerBlockRule &&
                                ["reset", "base"].includes(rule.name));
                        if (!keep) sheet.deleteRule(i);
                    }
                }
                const read = (id: string, property: string) =>
                    frame
                        .contentWindow!.getComputedStyle(
                            doc.querySelector(`[data-id="${id}"]`)!,
                        )
                        .getPropertyValue(property);
                const hovered = Object.fromEntries(
                    NESTED.map(([name, surface]) => [
                        name,
                        ["outer", "inner", "plain"].map((which) =>
                            read(
                                `${name}-${which}.${surface}`,
                                "background-color",
                            ),
                        ),
                    ]),
                );
                await forcePseudoClasses(frame, "[data-id]", [
                    "focus",
                    "focus-visible",
                    "focus-within",
                ]);
                const ring = (id: string) =>
                    ["outline-width", "outline-color"]
                        .map((property) => read(id, property))
                        .join(" ");
                for (const [name] of NESTED) {
                    const [outer, inner, plain] = hovered[name]!;
                    expect(outer, name).not.toBe(plain);
                    expect(inner, name).toBe(plain);
                    expect(ring(`${name}-outer.root`), name).toBe(
                        "7px rgb(255, 0, 0)",
                    );
                    expect(ring(`${name}-inner.root`), name).toBe(
                        ring(`${name}-plain.root`),
                    );
                    expect(ring(`${name}-plain.root`), name).toMatch(/^3px /);
                }
            } finally {
                frame.remove();
            }
        },
    );

    it("change it on React Native", async () => {
        const styles = await commands.rnStyles();
        for (const [name, surface] of NESTED) {
            const factory = componentFactory(styles, name).for({
                scheme: "light",
            });
            // The factory here has no generated glue to name the tokens, so they go by path.
            const own = Object.fromEntries(
                Object.entries(NATIVE_OWN_TOKENS).map(([token, value]) => [
                    `components.${name}.${token}`,
                    value,
                ]),
            );
            const select = (state: State, tokens?: object) =>
                factory.selected({
                    ...state,
                    ...(tokens ? { tokens } : {}),
                } as NativeSelection<AnyComponent>).styles as Record<
                    string,
                    Record<string, unknown> | undefined
                >;
            const hovered = { hover: true };
            expect(
                select(hovered, own)[surface]?.backgroundColor,
                name,
            ).not.toEqual(select(hovered)[surface]?.backgroundColor);
            const focused = { focus: true, focusVisible: true };
            expect(select(focused, own).root, name).toMatchObject({
                outlineWidth: 7,
                outlineColor: "rgba(255, 0, 0, 1)",
            });
            expect(select(focused).root?.outlineWidth, name).toBe(3);
        }
    });
});
