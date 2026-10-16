// The demo's Panda class factories (`apps/solid-demo/.pureform/`, hand-written until
// `pureform generate` writes them): for every selection, each returns per slot the classes
// Panda's recipe function returns, and Panda's stylesheet, built with the `staticCss` entries
// from `.pureform/`, has a rule for every class the recipe styles. Instance tokens become the
// component's own CSS vars on the root, and the styles read them.

import * as pandaRecipes from "$recipes";
import { varName } from "@pureform/css-lowering";
import type { ClassFactory, ComponentShape } from "@pureform/styling";
import { describe, expect, it } from "vitest";

import { registry } from "../../../apps/solid-demo/.pureform";
import { staticCss } from "../../../apps/solid-demo/.pureform/panda";
import {
    pureformConfig,
    pureformPreset,
} from "../../../apps/solid-demo/panda.pureform";

import pandaCss from "#/App.css?inline";

const PREFIX = "pf";

type Recipe = ((selection: object) => Record<string, string>) & {
    variantMap: Record<string, string[]>;
};
type StyleObject = Record<string, unknown>;
interface SlotRecipe {
    className: string;
    slots: string[];
    base?: Record<string, StyleObject>;
    variants?: Record<string, Record<string, Record<string, StyleObject>>>;
}
interface DynamicNode {
    type: "dynamic";
    path: string[];
}

const recipeOf = (name: string): Recipe => {
    const recipe = (pandaRecipes as unknown as Record<string, Recipe>)[name];
    if (!recipe) throw new Error(`no Panda recipe for ${name}`);
    return recipe;
};

const slotRecipeOf = (name: string): SlotRecipe => {
    const recipes = pureformPreset.theme?.slotRecipes as
        | Record<string, SlotRecipe>
        | undefined;
    const recipe = recipes?.[name];
    if (!recipe) throw new Error(`no slot recipe for ${name} in the preset`);
    return recipe;
};

const factoryOf = (name: string): ClassFactory<ComponentShape> => {
    const entry = registry.entry(name as "button");
    if (entry.kind !== "static") throw new Error(`${name} isn't static`);
    return entry.factory as unknown as ClassFactory<ComponentShape>;
};

// The defaults, then every combination of every group's values.
const selections = (
    variantMap: Record<string, string[]>,
): Record<string, string>[] => [
    {},
    ...Object.entries(variantMap).reduce<Record<string, string>[]>(
        (combos, [group, values]) =>
            combos.flatMap((combo) =>
                values.map((value) => ({ ...combo, [group]: value })),
            ),
        [{}],
    ),
];

const hasStyles = (style: StyleObject | undefined): boolean =>
    style !== undefined && Object.keys(style).length > 0;

// Every class a rule's selector names, through layers and at-rules.
const ruleClasses = (css: string): Set<string> => {
    const sheet = new CSSStyleSheet();
    sheet.replaceSync(css);
    const found = new Set<string>();
    const visit = (rules: CSSRuleList) => {
        for (const rule of rules) {
            if (rule instanceof CSSStyleRule) {
                for (const [, name] of rule.selectorText.matchAll(
                    /\.((?:\\.|[\w-])+)/g,
                ))
                    found.add(name!.replace(/\\(.)/g, "$1"));
            }
            if ("cssRules" in rule) visit((rule as CSSGroupingRule).cssRules);
        }
    };
    visit(sheet.cssRules);
    return found;
};

const styledClasses = ruleClasses(pandaCss);

const NAMES = ["button", "checkbox"] as const;

describe("the demo's Panda registry", () => {
    it("registers button and checkbox as static entries", () => {
        expect(registry.names).toEqual(NAMES);
        for (const name of NAMES)
            expect(registry.entry(name).kind).toBe("static");
    });

    it("keeps every variant of each registered component in staticCss", () => {
        expect(staticCss.recipes).toEqual(
            Object.fromEntries(NAMES.map((name) => [name, ["*"]])),
        );
    });
});

describe.each(NAMES)("the %s factory", (name) => {
    const recipe = recipeOf(name);
    const factory = factoryOf(name);
    const all = selections(recipe.variantMap);

    it("returns Panda's classes for every selection", () => {
        for (const selection of all) {
            const expected = Object.fromEntries(
                Object.entries(recipe(selection)).map(([slot, classes]) => [
                    slot,
                    { class: classes },
                ]),
            );
            expect(factory(selection), JSON.stringify(selection)).toEqual(
                expected,
            );
        }
    });

    it("has a Panda rule for every class the recipe styles", () => {
        const {
            className,
            slots,
            base = {},
            variants = {},
        } = slotRecipeOf(name);
        const expected = slots.flatMap((slot) => [
            ...(hasStyles(base[slot]) ? [`${className}__${slot}`] : []),
            ...Object.entries(variants).flatMap(([group, values]) =>
                Object.entries(values)
                    .filter(([, styles]) => hasStyles(styles[slot]))
                    .map(
                        ([value]) => `${className}__${slot}--${group}_${value}`,
                    ),
            ),
        ]);
        expect(expected.length).toBeGreaterThan(slots.length);
        expect(expected.filter((c) => !styledClasses.has(c))).toEqual([]);
    });

    it("returns every class Panda styles for the component", () => {
        const returned = new Set(
            all.flatMap((selection) =>
                Object.values(factory(selection)).flatMap((slot) =>
                    slot.class.split(" "),
                ),
            ),
        );
        const { className } = slotRecipeOf(name);
        const styled = [...styledClasses].filter((c) =>
            c.startsWith(`${className}__`),
        );
        expect(styled.length).toBeGreaterThan(0);
        expect(styled.filter((c) => !returned.has(c))).toEqual([]);
    });

    it("caches one frozen result per selection, defaults filled in", () => {
        const defaults = Object.fromEntries(
            Object.keys(recipe.variantMap).map((group) => [
                group,
                recipe({})["root"]!.match(
                    new RegExp(`--${group}_([\\w-]+)`),
                )![1]!,
            ]),
        );
        expect(factory(defaults)).toBe(factory({}));
        expect(Object.isFrozen(factory({}))).toBe(true);
        expect(Object.isFrozen(factory({}).root)).toBe(true);
    });

    it("sets each instance token as the component's CSS var on the root", () => {
        const tokens = pureformConfig.components[name]
            .tokens as unknown as Record<string, DynamicNode>;
        expect(Object.keys(tokens).length).toBeGreaterThan(0);
        for (const [token, node] of Object.entries(tokens)) {
            const slots = factory({ tokens: { [token]: "1px" } });
            const variable = varName(node.path, PREFIX);
            expect(slots.root.style, token).toEqual({ [variable]: "1px" });
            expect(slots.root.class).toBe(factory({}).root.class);
            expect(pandaCss, `${variable} is read`).toContain(
                `var(${variable}`,
            );
        }
        expect(factory({ tokens: {} })).toBe(factory({}));
    });
});

describe("instance tokens in the page", () => {
    it("change a checkbox's box size through its root", () => {
        const style = document.createElement("style");
        style.textContent = pandaCss;
        document.head.append(style);
        const slots = factoryOf("checkbox")({ tokens: { boxSize: "30px" } });
        const root = document.createElement("span");
        root.className = slots.root.class;
        for (const [property, value] of Object.entries(slots.root.style ?? {}))
            root.style.setProperty(property, value);
        const box = document.createElement("span");
        box.className = slots.box.class;
        root.append(box);
        document.body.append(root);
        try {
            expect(getComputedStyle(box).width).toBe("30px");
            root.style.removeProperty("--pf-components-checkbox-boxSize");
            expect(getComputedStyle(box).width).toBe("18px");
        } finally {
            root.remove();
            style.remove();
        }
    });
});
