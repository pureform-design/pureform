// Parity between the adapters: the same markup, styled once by the Panda preset and once by the
// plain CSS adapter's stylesheet for the same config, must compute the same styles. Both pages
// keep Panda's reset and base layers (the app's global styles), so only the components' own
// styles differ. Custom properties are left out: Panda's own preset adds tokens of its own, and
// what matters is the values they resolve to.

import { expect, test } from "@playwright/test";
import type { Page } from "@playwright/test";
import { compileCss, manifestOf, recipes } from "@pureform/css-adapter";
import type { RecipeManifest } from "@pureform/css-adapter";

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

const markup = (classes: Classes): string =>
    ITEMS.map(({ id, slots }, index) => {
        const own = classes[index]!;
        if (!slots)
            return `<div data-id="${id}" class="${own as string}"></div>`;
        const bySlot = own as Record<string, string>;
        return `<div data-id="${id}">${slots
            .map(
                (slot) =>
                    `<div data-id="${id}.${slot}" class="${bySlot[slot]}"></div>`,
            )
            .join("")}</div>`;
    }).join("\n");

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
    keepOnly?: string[],
) => {
    await page.setContent(
        `<!doctype html><html><head><style>${css}</style><style>${PAUSED}</style></head><body>${markup(classes)}</body></html>`,
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

test("the CSS adapter computes the same styles as the Panda preset", async ({
    browser,
    page,
}) => {
    test.setTimeout(120_000);
    await page.emulateMedia({ reducedMotion: "reduce" });
    await page.goto("/", { waitUntil: "networkidle" });
    const pandaCss = await page.evaluate(() =>
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

    const fromPanda = await pandaClasses(page);

    const pandaPage = await browser.newPage();
    await pandaPage.emulateMedia({ reducedMotion: "reduce" });
    await render(pandaPage, pandaCss, fromPanda);
    const panda = await computed(pandaPage);

    const plainPage = await browser.newPage();
    await plainPage.emulateMedia({ reducedMotion: "reduce" });
    await render(plainPage, pandaCss, plainClasses(), ["reset", "base"]);
    await plainPage.addStyleTag({
        content: compileCss(pureformConfig, { prefix: PREFIX }),
    });
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
    expect(Object.keys(panda).length).toBeGreaterThan(100);
    expect(Object.keys(plain)).toEqual(Object.keys(panda));
    expect(differences).toEqual([]);
});
