// Parity between the React Native adapter and the CSS adapter: each component's slots render
// through React Native Web with the styles `select` picks, and as markup styled by the CSS
// adapter's stylesheet, nested as the component's structure says so CSS inheritance applies.
// Key properties must compute the same: colors, border widths, radii, padding, opacity, type,
// and the sizes the React Native styles set in pixels. Layout that React Native Web does its
// own way (flex defaults, box sizing) is left out, and so are the radii and outline rings of
// shape variants, which clip on the web and fall back to rounded corners and borders in React
// Native.

import { classesFor } from "@pureform/css-adapter";
import { select, stylesFor, themeKey } from "@pureform/rn-adapter";
import type {
    PrecomputedStyles,
    Resolved,
    State,
    Style,
} from "@pureform/rn-adapter";
import chroma from "chroma-js";
import { createElement } from "react";
import type { ReactElement } from "react";
import { flushSync } from "react-dom";
import { createRoot } from "react-dom/client";
import { View } from "react-native";
import { beforeAll, describe, expect, it } from "vitest";
import { commands } from "vitest/browser";

import { pureformConfig } from "../../../apps/solid-demo/panda.pureform";
import { forcePseudoClasses } from "./force-pseudo";
import { RN_COMPONENTS } from "./rn-components";

const THEME_ATTRIBUTE = "data-panda-theme";
const OPTIONS = { prefix: "pf", themeAttribute: THEME_ATTRIBUTE };

interface Scenario {
    name: string;
    /** Every variant value, or only each component's defaults. */
    every?: boolean;
    /** The ARIA or `data-pf-*` attributes the CSS adapter's selectors match. */
    attributes?: string[];
    /** Pseudo-classes forced on every element, for states no attribute sets. */
    pseudoClasses?: string[];
    state?: State;
    scheme?: "light" | "dark";
    theme?: string;
}

const SCENARIOS: Scenario[] = [
    { name: "every variant value at rest", every: true },
    { name: "hovered", attributes: ["data-pf-hover"], state: { hover: true } },
    {
        name: "pressed",
        attributes: ["data-pf-active"],
        state: { pressed: true, active: true },
    },
    {
        name: "focused",
        pseudoClasses: ["focus", "focus-visible", "focus-within"],
        state: { focus: true, focusVisible: true },
    },
    {
        name: "disabled",
        attributes: ['aria-disabled="true"'],
        state: { disabled: true },
    },
    {
        name: "checked",
        attributes: ['aria-checked="true"'],
        state: { checked: true },
    },
    {
        name: "selected",
        attributes: ['aria-selected="true"'],
        state: { selected: true },
    },
    {
        name: "invalid",
        attributes: ['aria-invalid="true"'],
        state: { invalid: true },
    },
    { name: "dark", scheme: "dark" },
    { name: "in a named theme", theme: "teal" },
];

interface Item {
    id: string;
    name: string;
    selection: Record<string, string>;
}

const items = (styles: PrecomputedStyles, every: boolean): Item[] =>
    RN_COMPONENTS.flatMap((name) => {
        const { variants } = styles.templates[name]!;
        const selections = [
            {},
            ...(every
                ? Object.entries(variants).flatMap(([group, values]) =>
                      values.map((value) => ({ [group]: value })),
                  )
                : []),
        ];
        return selections.map((selection, index) => ({
            id: `${name}-${index}`,
            name,
            selection,
        }));
    });

// A component's slots as a tree: the slots no other contains, each with its children.
const tree = (
    slots: readonly string[] | undefined,
    structure: Record<string, string[]> | undefined,
): [string, string[]][] => {
    if (!slots) return [["", []]];
    const children = new Set(Object.values(structure ?? {}).flat());
    return slots
        .filter((slot) => !children.has(slot))
        .map((slot) => [slot, structure?.[slot] ?? []]);
};

// Hidden native inputs, which the React Native components don't render.
const SKIPPED = new Set(["input"]);

const cssMarkup = (list: Item[], styles: Resolved, scenario: Scenario) => {
    const fns = classesFor(pureformConfig) as Record<
        string,
        (selection: object) => string | Record<string, string>
    >;
    const attributes = (scenario.attributes ?? []).map((a) => ` ${a}`).join("");
    const html = list
        .map(({ id, name, selection }) => {
            const classes = fns[name]!(selection);
            const { slots, structure } = styles[name]!;
            const element = (slot: string): string => {
                if (SKIPPED.has(slot)) return "";
                const own =
                    typeof classes === "string" ? classes : classes[slot];
                const inner = (structure?.[slot] ?? []).map(element).join("");
                return `<div data-id="${id}.${slot}"${attributes} class="${own}">${inner}</div>`;
            };
            return tree(slots, structure)
                .map(([slot]) => element(slot))
                .join("");
        })
        .join("\n");
    return scenario.theme
        ? `<div ${THEME_ATTRIBUTE}="${scenario.theme}">${html}</div>`
        : html;
};

const rnTree = (
    list: Item[],
    styles: Resolved,
    scenario: Scenario,
): ReactElement[] =>
    list.flatMap(({ id, name, selection }) => {
        const component = styles[name]!;
        const bySlot = select(component, selection, {
            scheme: scenario.scheme ?? "light",
            ...scenario.state,
        });
        const element = (slot: string): ReactElement | null =>
            SKIPPED.has(slot)
                ? null
                : createElement(
                      View,
                      {
                          key: slot,
                          testID: `${id}.${slot}`,
                          style: bySlot[slot] as object,
                      },
                      ...(component.structure?.[slot] ?? []).map(element),
                  );
        return tree(component.slots, component.structure).map(([slot]) =>
            element(slot)!,
        );
    });

// The computed properties a React Native property stands for.
const COMPUTED: Record<string, string[]> = {
    color: ["color"],
    fontSize: ["font-size"],
    fontWeight: ["font-weight"],
    lineHeight: ["line-height"],
    letterSpacing: ["letter-spacing"],
    width: ["width"],
    height: ["height"],
    minWidth: ["min-width"],
    minHeight: ["min-height"],
    gap: ["row-gap", "column-gap"],
};

// Compared on every element, since both sides default them the same.
const ALWAYS = [
    "background-color",
    "opacity",
    ...["top", "right", "bottom", "left"].flatMap((side) => [
        `border-${side}-width`,
        `padding-${side}`,
    ]),
    ...["top-left", "top-right", "bottom-right", "bottom-left"].map(
        (corner) => `border-${corner}-radius`,
    ),
];

const COLOR = /color$/;

const rgba = (value: string): number[] | undefined => {
    const srgb = /^color\(srgb ([^)]*)\)$/.exec(value)?.[1];
    if (srgb) {
        const [r, g, b, , a] = srgb.split(/\s+/).map(Number.parseFloat);
        return [
            r! * 255,
            g! * 255,
            b! * 255,
            Number.isNaN(a) || a === undefined ? 1 : a,
        ];
    }
    try {
        return chroma(value).rgba(false);
    } catch {
        return undefined;
    }
};

const same = (property: string, a: string, b: string): boolean => {
    if (a === b) return true;
    if (COLOR.test(property)) {
        const [x, y] = [rgba(a), rgba(b)];
        if (!x || !y) return false;
        if (Math.abs(x[3]! - y[3]!) > 0.01) return false;
        if (x[3] === 0) return true;
        return [0, 1, 2].every(
            (i) =>
                Math.abs(
                    Math.min(255, Math.max(0, x[i]!)) -
                        Math.min(255, Math.max(0, y[i]!)),
                ) <= 1.5,
        );
    }
    const [x, y] = [Number.parseFloat(a), Number.parseFloat(b)];
    return !Number.isNaN(x) && Math.abs(x - y) <= 0.5;
};

// Shapes clip on the web and take their rounded fallback in React Native, by design.
const SHAPED = (selection: Record<string, string>) =>
    selection.shape !== undefined && selection.shape !== "none";

// A shaped outline is a filled ring on the web and a border in React Native.
const RING = (property: string) =>
    property === "background-color" || /^border-.*-width$/.test(property);

const comparedFor = (
    style: Style | undefined,
    shaped: boolean,
    slot: string,
): string[] => [
    ...ALWAYS.filter(
        (property) =>
            !(shaped && property.endsWith("radius")) &&
            !(shaped && slot === "outline" && RING(property)),
    ),
    ...Object.entries(style ?? {}).flatMap(([property, value]) =>
        // Sizes only where React Native sets them in pixels: percentages follow each side's
        // own layout.
        ["width", "height", "minWidth", "minHeight"].includes(property) &&
        typeof value !== "number"
            ? []
            : (COMPUTED[property] ?? []),
    ),
];

let styles: PrecomputedStyles;
let css: string;

beforeAll(async () => {
    styles = await commands.rnStyles();
    css = await commands.adapterCss("CSS", OPTIONS);
});

describe("the React Native adapter matches the CSS adapter", () => {
    it.each(SCENARIOS)("$name", async (scenario) => {
        const resolved = stylesFor(
            styles,
            themeKey(scenario.theme, scenario.scheme ?? "light"),
        );
        const list = items(styles, scenario.every ?? false);

        const frame = document.createElement("iframe");
        frame.id = "rn-parity-css";
        frame.style.cssText = "width: 1280px; height: 900px; border: 0";
        document.body.append(frame);
        const doc = frame.contentDocument!;
        doc.open();
        doc.write(
            `<!doctype html><html${scenario.scheme === "dark" ? ' class="dark"' : ""}><head><style>${css}</style></head><body>${cssMarkup(list, resolved, scenario)}</body></html>`,
        );
        doc.close();
        if (scenario.pseudoClasses) {
            await forcePseudoClasses(
                frame,
                "[data-id]",
                scenario.pseudoClasses,
            );
        }

        const host = document.createElement("div");
        document.body.append(host);
        const root = createRoot(host);
        flushSync(() =>
            root.render(
                createElement(View, null, ...rnTree(list, resolved, scenario)),
            ),
        );

        const differences: string[] = [];
        let compared = 0;
        for (const { id, name, selection } of list) {
            const bySlot = select(resolved[name]!, selection, {
                scheme: scenario.scheme ?? "light",
                ...scenario.state,
            });
            for (const slot of Object.keys(bySlot)) {
                if (SKIPPED.has(slot)) continue;
                const key = `${id}.${slot}`;
                const web = doc.querySelector(`[data-id="${key}"]`);
                const native = document.querySelector(`[data-testid="${key}"]`);
                if (!web || !native) {
                    differences.push(`${key}: missing`);
                    continue;
                }
                const [a, b] = [
                    frame.contentWindow!.getComputedStyle(web),
                    getComputedStyle(native),
                ];
                for (const property of comparedFor(
                    bySlot[slot],
                    SHAPED(selection),
                    slot,
                )) {
                    compared++;
                    const [x, y] = [
                        a.getPropertyValue(property),
                        b.getPropertyValue(property),
                    ];
                    if (!same(property, x, y)) {
                        differences.push(
                            `${key} ${property}: css "${x}", rn "${y}"`,
                        );
                    }
                }
            }
        }
        root.unmount();
        host.remove();
        frame.remove();
        expect(compared).toBeGreaterThan(100);
        expect(differences).toEqual([]);
    });
});
