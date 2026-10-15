// Parity between the adapters: the same markup, styled once by the Panda preset and once by
// each other adapter's stylesheet for the same config (plain CSS, and Tailwind through its own
// compiler), must compute the same styles. Both pages
// keep Panda's reset and base layers (the app's global styles), so only the components' own
// styles differ. Custom properties are left out: Panda's own preset adds tokens of its own, and
// what matters is the values they resolve to.
//
// Every variant value is compared at rest. States, the dark scheme, and a named theme are
// compared on each component's defaults: a state through the data attributes both adapters'
// selectors match, set on every element, so element and slot conditions both apply.

import { expect, test } from "@playwright/test";
import type { Page } from "@playwright/test";
import { compileCss, manifestOf, recipes } from "@pureform/css-adapter";
import type { RecipeManifest } from "@pureform/css-adapter";
import { compileTailwind } from "@pureform/tailwind-adapter";
import { compile } from "@tailwindcss/node";

import { pureformConfig } from "../panda.pureform";

const PREFIX = "pf";

// One element per selection: the defaults, then each variant value on its own.
const selections = (manifest: RecipeManifest): Record<string, string>[] => [
    {},
    ...Object.entries(manifest.variants).flatMap(([group, values]) =>
        values.map((value) => ({ [group]: value })),
    ),
];

interface Item {
    id: string;
    name: string;
    slots: readonly string[] | undefined;
    selection: Record<string, string>;
}

const ITEMS: Item[] = Object.values(pureformConfig.components).flatMap(
    (spec) => {
        const manifest = manifestOf(spec);
        return selections(manifest).map((selection, index) => ({
            id: `${spec.name}-${index}`,
            name: spec.name,
            slots: manifest.slots,
            selection,
        }));
    },
);

// Each item's classes, from Panda's generated recipe functions in the demo, which add compound
// variants as atomic classes, or from the CSS adapter's runtime.
type Classes = (string | Record<string, string>)[];

const pandaClasses = (page: Page): Promise<Classes> =>
    page.evaluate(async (items) => {
        const recipes = (await import(
            /* @vite-ignore */ "/styled-system/recipes/index.js"
        )) as Record<
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
        return items.map(({ name, selection }) => {
            const fn = recipes[name];
            if (!fn) throw new Error(`no Panda recipe for ${name}`);
            return fn(typed(selection));
        });
    }, ITEMS);

const plainClasses = (): Classes => {
    const fns = recipes(pureformConfig) as Record<
        string,
        (selection: object) => string | Record<string, string>
    >;
    return ITEMS.map(({ name, selection }) => fns[name]!(selection));
};

interface Scenario {
    name: string;
    /** Only each component's defaults, or every variant value too. */
    every?: boolean;
    /** Data attributes set on every element. */
    attributes?: string[];
    /** A class on the root element. */
    rootClass?: string;
    /** A named theme the components sit in. */
    theme?: string;
}

const THEME_ATTRIBUTE = "data-panda-theme";

const markup = (classes: Classes, scenario: Scenario): string => {
    const attributes = (scenario.attributes ?? [])
        .map((name) => ` ${name}`)
        .join("");
    const elements = ITEMS.flatMap(({ id, slots }, index) => {
        if (!scenario.every && !id.endsWith("-0")) return [];
        const own = classes[index]!;
        if (!slots) {
            return `<div data-id="${id}"${attributes} class="${own as string}"></div>`;
        }
        const bySlot = own as Record<string, string>;
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

const computed = (page: Page) =>
    page.evaluate(() => {
        const out: Record<string, Record<string, string>> = {};
        for (const element of document.querySelectorAll("[data-id]")) {
            const style = getComputedStyle(element);
            const values: Record<string, string> = {};
            for (const property of style) {
                if (property.startsWith("--")) continue;
                values[property] = style.getPropertyValue(property);
            }
            out[(element as HTMLElement).dataset.id ?? ""] = values;
        }
        return out;
    });

// Animations (an indeterminate progress) start paused, so both pages compute their first frame
// rather than wherever each is when measured.
const PAUSED =
    "*, ::before, ::after { animation-play-state: paused !important; }";

const render = async (
    page: Page,
    css: string,
    classes: Classes,
    scenario: Scenario,
    keepOnly?: string[],
) => {
    const rootClass = scenario.rootClass
        ? ` class="${scenario.rootClass}"`
        : "";
    await page.setContent(
        `<!doctype html><html${rootClass}><head><style>${css}</style><style>${PAUSED}</style></head><body>${markup(classes, scenario)}</body></html>`,
    );
    if (keepOnly) {
        // Keep only the named layers and the layer order statements.
        await page.evaluate((layers) => {
            const sheet = document.styleSheets[0];
            if (!sheet) return;
            for (let i = sheet.cssRules.length - 1; i >= 0; i--) {
                const rule = sheet.cssRules[i];
                const keep =
                    rule instanceof CSSLayerStatementRule ||
                    (rule instanceof CSSLayerBlockRule &&
                        layers.includes(rule.name));
                if (!keep) sheet.deleteRule(i);
            }
        }, keepOnly);
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
    { name: "hovered", attributes: ["data-hover"] },
    {
        name: "focused",
        attributes: ["data-focus", "data-focus-visible", "data-focused"],
    },
    { name: "pressed", attributes: ["data-active", "data-pressed"] },
    { name: "dragged", attributes: ["data-dragging"] },
    { name: "disabled", attributes: ["data-disabled"] },
    { name: "selected", attributes: ["data-selected"] },
    { name: "checked", attributes: ["data-checked"] },
    { name: "indeterminate", attributes: ["data-indeterminate"] },
    { name: "invalid", attributes: ["data-invalid"] },
    { name: "expanded", attributes: ["data-expanded"] },
    { name: "filled", attributes: ["data-filled"] },
    { name: "dark", rootClass: "dark" },
    { name: "in a named theme", theme: "teal" },
];

let pandaCss = "";
let fromPanda: Classes = [];
const fromPlain = plainClasses();
const OPTIONS = { prefix: PREFIX, themeAttribute: THEME_ATTRIBUTE };

// Each adapter's stylesheet, over Panda's reset and base layers. Tailwind's own preflight is
// left out, so only its theme and the adapter's components apply.
const adapters: Record<string, () => Promise<string>> = {
    CSS: async () => compileCss(pureformConfig, OPTIONS),
    Tailwind: async () => {
        const compiler = await compile(
            `@layer theme, base, components, utilities;
@import "tailwindcss/theme.css" layer(theme);
@import "tailwindcss/utilities.css" layer(utilities);
${compileTailwind(pureformConfig, OPTIONS)}`,
            { base: import.meta.dirname, onDependency: () => {} },
        );
        return compiler.build([]);
    },
};
const adapterCss: Record<string, string> = {};

test.beforeAll(async ({ browser }) => {
    const page = await browser.newPage();
    await page.goto("/", { waitUntil: "networkidle" });
    pandaCss = await page.evaluate(() =>
        [...document.styleSheets]
            .flatMap((sheet) => {
                try {
                    return [...sheet.cssRules].map((rule) => rule.cssText);
                } catch {
                    return [];
                }
            })
            .join("\n"),
    );
    fromPanda = await pandaClasses(page);
    await page.close();
    for (const [name, css] of Object.entries(adapters)) {
        adapterCss[name] = await css();
    }
});

for (const [adapter, scenario] of Object.keys(adapters).flatMap((name) =>
    SCENARIOS.map((s) => [name, s] as const),
)) {
    test(`the ${adapter} adapter matches the Panda preset: ${scenario.name}`, async ({
        browser,
    }) => {
        test.setTimeout(120_000);
        const pandaPage = await browser.newPage();
        await pandaPage.emulateMedia({ reducedMotion: "reduce" });
        await render(pandaPage, pandaCss, fromPanda, scenario);
        const panda = await computed(pandaPage);

        const plainPage = await browser.newPage();
        await plainPage.emulateMedia({ reducedMotion: "reduce" });
        await render(plainPage, pandaCss, fromPlain, scenario, [
            "reset",
            "base",
        ]);
        await plainPage.addStyleTag({ content: adapterCss[adapter]! });
        const plain = await computed(plainPage);

        const differences: string[] = [];
        for (const [id, values] of Object.entries(panda)) {
            for (const [property, value] of Object.entries(values)) {
                const other = plain[id]?.[property];
                if (!same(value, other)) {
                    differences.push(
                        `${id} ${property}: panda "${value}", css "${other}"`,
                    );
                }
            }
        }
        expect(Object.keys(panda).length).toBeGreaterThan(30);
        expect(Object.keys(plain)).toEqual(Object.keys(panda));
        expect(differences).toEqual([]);
        await pandaPage.close();
        await plainPage.close();
    });
}
