// Parity between the adapters: the same markup, styled once by the Panda preset and once by
// each other adapter's stylesheet for the same config (plain CSS, and Tailwind through its own
// compiler), must compute the same styles. Each styling renders in its own frame. Both keep
// Panda's reset and base layers (the app's global styles), so only the components' own styles
// differ. Custom properties are left out: Panda's own preset adds tokens of its own, and what
// matters is the values they resolve to.
//
// Every variant value is compared at rest, and again with the `shape()` clip rules dropped (a
// target that can't clip). States, the dark scheme, and a named theme are
// compared on each component's defaults: a state through the ARIA or `data-pf-*` attribute
// both adapters' selectors match, set on every element, so element and slot conditions both
// apply. Focus has no attribute, so it is forced on every element through DevTools.

import * as pandaRecipes from "$recipes";
import { manifestOf, classesFor } from "@pureform/css-adapter";
import type { ComponentManifest } from "@pureform/css-adapter";
import { describe, expect, it } from "vitest";
import { commands } from "vitest/browser";

import { pureformConfig } from "../../panda-fixture/panda.pureform";
import type { Adapter } from "./commands";
import { forcePseudoClasses } from "./force-pseudo";

import pandaCss from "#/styles.css?inline";

const PREFIX = "pf";
const THEME_ATTRIBUTE = "data-panda-theme";
const OPTIONS = { prefix: PREFIX, themeAttribute: THEME_ATTRIBUTE };

// Values from two groups that once set the same property on one slot, where Panda (which orders
// a recipe's variant classes by name) disagreed with the definition order the other adapters
// keep. The preset's variant-overlap spec keeps groups from overlapping; these show the result.
const COMBINATIONS: Record<string, Record<string, string>[]> = {
    circularProgress: [
        { indeterminate: "true", color: "success" },
        { indeterminate: "true", color: "error", shape: "wavy" },
    ],
    iconButton: [
        { variant: "outlined", shape: "circle" },
        { variant: "outlined", shape: "cookie9Sided", size: "xlarge" },
    ],
    card: [{ variant: "outlined", interactive: "false" }],
    appBar: [
        { size: "mediumFlexible", search: "true" },
        { size: "largeFlexible", search: "true" },
    ],
    sideSheet: [{ modal: "false", coplanar: "true" }],
};

// One element per selection: the defaults, then each variant value on its own, then the
// combinations above.
const selections = (
    name: string,
    manifest: ComponentManifest,
): Record<string, string>[] => [
    {},
    ...Object.entries(manifest.variants).flatMap(([group, values]) =>
        values.map((value) => ({ [group]: value })),
    ),
    ...(COMBINATIONS[name] ?? []),
];

interface Item {
    id: string;
    name: string;
    slots: readonly string[] | undefined;
    selection: Record<string, string>;
    /** For a combination, the slots nest as the anatomy does, so the tokens one group sets on
     *  the root reach the slot the other group styles. */
    structure?: Readonly<Record<string, readonly string[]>>;
}

const ITEMS: Item[] = Object.values(pureformConfig.components).flatMap(
    (spec) => {
        const manifest = manifestOf(spec);
        const all = selections(spec.name, manifest);
        const combined = all.length - (COMBINATIONS[spec.name]?.length ?? 0);
        return all.map((selection, index) => ({
            id: `${spec.name}-${index}`,
            name: spec.name,
            slots: manifest.slots,
            selection,
            ...(index >= combined && "structure" in spec
                ? {
                      structure: spec.structure as Readonly<
                          Record<string, readonly string[]>
                      >,
                  }
                : {}),
        }));
    },
);

// Each item's classes, from Panda's generated recipe functions, which add compound variants
// as atomic classes, or from the CSS adapter's runtime.
type Classes = (string | Record<string, string>)[];
type ClassFns = Record<
    string,
    (selection: object) => string | Record<string, string>
>;

// Panda types a "true"/"false" group as a boolean and compares strictly.
const typed = (selection: Record<string, string>) =>
    Object.fromEntries(
        Object.entries(selection).map(([group, value]) => [
            group,
            value === "true" ? true : value === "false" ? false : value,
        ]),
    );

const pandaClasses: Classes = ITEMS.map(({ name, selection }) => {
    const fn = (pandaRecipes as unknown as ClassFns)[name];
    if (!fn) throw new Error(`no Panda recipe for ${name}`);
    return fn(typed(selection));
});

const plainFns = classesFor(pureformConfig) as ClassFns;
const plainClasses: Classes = ITEMS.map(({ name, selection }) =>
    plainFns[name]!(selection),
);

interface Scenario {
    name: string;
    /** Only each component's defaults, or every variant value too. */
    every?: boolean;
    /** Attributes set on every element. */
    attributes?: string[];
    /** Pseudo-classes forced on every element, for states no attribute sets. */
    pseudoClasses?: string[];
    /** A class on the root element. */
    rootClass?: string;
    /** A named theme the components sit in. */
    theme?: string;
    /** Drop the rules for browsers that clip to `shape()`, as a target that can't clip draws. */
    noClipShape?: boolean;
}

// Delete every `@supports (clip-path: shape(…))` block, in layers and nested rules too.
const dropClipShape = (
    parent: { cssRules: CSSRuleList; deleteRule(index: number): void },
    win: typeof globalThis,
) => {
    for (let i = parent.cssRules.length - 1; i >= 0; i--) {
        const rule = parent.cssRules[i]!;
        if (
            rule instanceof win.CSSSupportsRule &&
            rule.conditionText.includes("shape(")
        ) {
            parent.deleteRule(i);
        } else if ((rule as Partial<CSSGroupingRule>).cssRules) {
            dropClipShape(rule as CSSGroupingRule, win);
        }
    }
};

const markup = (classes: Classes, scenario: Scenario): string => {
    const attributes = (scenario.attributes ?? [])
        .map((name) => ` ${name}`)
        .join("");
    const elements = ITEMS.flatMap(({ id, slots, structure }, index) => {
        if (!scenario.every && !id.endsWith("-0")) return [];
        const own = classes[index]!;
        if (!slots) {
            return `<div data-id="${id}"${attributes} class="${own as string}"></div>`;
        }
        const bySlot = own as Record<string, string>;
        if (structure) {
            const nested = (slot: string): string =>
                `<div data-id="${id}.${slot}"${attributes} class="${bySlot[slot]}">${(
                    structure[slot] ?? []
                )
                    .map(nested)
                    .join("")}</div>`;
            return `<div data-id="${id}">${nested(slots[0]!)}</div>`;
        }
        return `<div data-id="${id}">${slots
            .map(
                (slot) =>
                    `<div data-id="${id}.${slot}"${attributes} class="${bySlot[slot]}"></div>`,
            )
            .join("")}</div>`;
    }).join("\n");
    return scenario.theme
        ? `<div ${THEME_ATTRIBUTE}="${scenario.theme}">${elements}</div>`
        : elements;
};

// Animations (an indeterminate progress) start paused, so both frames compute their first
// frame rather than wherever each is when measured.
const PAUSED =
    "*, ::before, ::after { animation-play-state: paused !important; }";

/** Render the markup in a frame of the page's size, and return its computed styles. */
const computed = async (
    classes: Classes,
    scenario: Scenario,
    css: string[],
    keepOnly?: string[],
): Promise<Record<string, Record<string, string>>> => {
    const frame = document.createElement("iframe");
    frame.id = "parity-frame";
    frame.style.cssText = "width: 1280px; height: 900px; border: 0";
    document.body.append(frame);
    try {
        const doc = frame.contentDocument!;
        const rootClass = scenario.rootClass
            ? ` class="${scenario.rootClass}"`
            : "";
        doc.open();
        doc.write(
            `<!doctype html><html${rootClass}><head><style>${pandaCss}</style><style>${PAUSED}</style>${css
                .map((sheet) => `<style>${sheet}</style>`)
                .join(
                    "",
                )}</head><body>${markup(classes, scenario)}</body></html>`,
        );
        doc.close();
        if (scenario.pseudoClasses) {
            await forcePseudoClasses(
                frame,
                "[data-id]",
                scenario.pseudoClasses,
            );
        }
        if (keepOnly) {
            // Keep only the named layers and the layer order statements of Panda's sheet.
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
        if (scenario.noClipShape) {
            const win = frame.contentWindow as unknown as typeof globalThis;
            for (const sheet of doc.styleSheets) dropClipShape(sheet, win);
        }
        const out: Record<string, Record<string, string>> = {};
        for (const element of doc.querySelectorAll<HTMLElement>("[data-id]")) {
            const style = frame.contentWindow!.getComputedStyle(element);
            const values: Record<string, string> = {};
            for (const property of style) {
                if (property.startsWith("--")) continue;
                values[property] = style.getPropertyValue(property);
            }
            out[element.dataset.id ?? ""] = values;
        }
        return out;
    } finally {
        frame.remove();
    }
};

// Panda's build rounds numbers in its output (an aspect ratio of 16 / 9 becomes 1.77778), which
// shifts layout by a fraction of a pixel. So pixel lengths match within 0.05px, or a hundred
// thousandth of their size for positions far down the page; everything else matches exactly.
const PX = /-?\d*\.?\d+px/g;
const close = (a: string, b: string): boolean => {
    const x = Number.parseFloat(a);
    return (
        Math.abs(x - Number.parseFloat(b)) <= Math.max(0.05, Math.abs(x) * 1e-5)
    );
};
const same = (a: string, b: string | undefined): boolean => {
    if (a === b) return true;
    if (b === undefined || a.replace(PX, "#") !== b.replace(PX, "#"))
        return false;
    const right = b.match(PX) ?? [];
    return (a.match(PX) ?? []).every((n, i) => close(n, right[i] ?? ""));
};

const SCENARIOS: Scenario[] = [
    { name: "every variant value at rest", every: true },
    {
        name: "every variant value where shape() can't clip",
        every: true,
        noClipShape: true,
    },
    { name: "hovered", attributes: ["data-pf-hover"] },
    {
        name: "focused",
        pseudoClasses: ["focus", "focus-visible", "focus-within"],
    },
    { name: "pressed", attributes: ["data-pf-active"] },
    { name: "dragged", attributes: ["data-pf-dragging"] },
    { name: "disabled", attributes: ['aria-disabled="true"'] },
    { name: "selected", attributes: ['aria-selected="true"'] },
    { name: "checked", attributes: ['aria-checked="true"'] },
    { name: "indeterminate", attributes: ['aria-checked="mixed"'] },
    { name: "invalid", attributes: ['aria-invalid="true"'] },
    { name: "expanded", attributes: ['aria-expanded="true"'] },
    { name: "filled", attributes: ["data-pf-filled"] },
    { name: "dark", rootClass: "dark" },
    { name: "in a named theme", theme: "teal" },
];

const ADAPTERS: Adapter[] = ["CSS", "Tailwind"];

describe.each(ADAPTERS)(
    "the %s adapter matches the Panda preset",
    (adapter) => {
        let adapterCss: Promise<string> | undefined;

        it.each(SCENARIOS)("$name", async (scenario) => {
            adapterCss ??= commands.adapterCss(adapter, OPTIONS);
            const panda = await computed(pandaClasses, scenario, []);
            const plain = await computed(
                plainClasses,
                scenario,
                [await adapterCss],
                ["reset", "base"],
            );

            const differences: string[] = [];
            for (const [id, values] of Object.entries(panda)) {
                for (const [property, value] of Object.entries(values)) {
                    const other = plain[id]?.[property];
                    if (!same(value, other)) {
                        differences.push(
                            `${id} ${property}: panda "${value}", ${adapter} "${other}"`,
                        );
                    }
                }
            }
            expect(Object.keys(panda).length).toBeGreaterThan(30);
            expect(Object.keys(plain)).toEqual(Object.keys(panda));
            expect(differences, differences.join("\n")).toEqual([]);
        });
    },
);
