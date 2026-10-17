// The Panda fixture's class factories (`tests/panda-fixture/.pureform/`, written by the Panda
// adapter's codegen): for every component and every selection, each returns per slot the classes
// Panda's recipe function returns, and Panda's stylesheet, built with the `staticCss` entries
// from `.pureform/`, has a rule for every class the recipe styles. Instance tokens become the
// component's own CSS vars on the root, and the styles read them.

import * as pandaRecipes from "$recipes";
import { varName } from "@pureform/css-lowering";
import type { ClassFactory, ComponentShape } from "@pureform/styling";
import { describe, expect, it } from "vitest";

import { registry } from "../../panda-fixture/.pureform";
import { staticCss } from "../../panda-fixture/.pureform/panda";
import {
    PREFIX,
    pureformConfig,
    pureformPreset,
} from "../../panda-fixture/panda.pureform";

import pandaCss from "#/styles.css?inline";

type Recipe = ((selection: object) => string | Record<string, string>) & {
    variantMap: Record<string, string[]>;
};
type StyleObject = Record<string, unknown>;
interface PresetRecipe {
    className: string;
    slots?: string[];
    base?: StyleObject;
    variants?: Record<string, Record<string, StyleObject>>;
}
interface DynamicNode {
    type: "dynamic";
    path: string[];
}

const NAMES = Object.keys(pureformConfig.components);

const recipeOf = (name: string): Recipe => {
    const recipe = (pandaRecipes as unknown as Record<string, Recipe>)[name];
    if (!recipe) throw new Error(`no Panda recipe for ${name}`);
    return recipe;
};

const slotted = (name: string): boolean =>
    pureformConfig.components[name]!.kind === "slotComponent";

const presetRecipeOf = (name: string): PresetRecipe => {
    const theme = pureformPreset.theme as
        | Record<string, Record<string, PresetRecipe> | undefined>
        | undefined;
    const recipe = theme?.[slotted(name) ? "slotRecipes" : "recipes"]?.[name];
    if (!recipe) throw new Error(`no recipe for ${name} in the preset`);
    return recipe;
};

const factoryOf = (name: string): ClassFactory<ComponentShape> => {
    const entry = registry.entry(name as "button");
    if (entry.kind !== "static") throw new Error(`${name} isn't static`);
    return entry.factory as unknown as ClassFactory<ComponentShape>;
};

// Panda types a "true"/"false" group as a boolean and compares strictly, so call its recipe
// with booleans, as the factory does.
const typed = (selection: Record<string, string>) =>
    Object.fromEntries(
        Object.entries(selection).map(([group, value]) => [
            group,
            value === "true" ? true : value === "false" ? false : value,
        ]),
    );

// Panda's result as the factory's slots: a single-slot recipe's string is the root's.
const pandaSlots = (name: string, selection: Record<string, string>) => {
    const result = recipeOf(name)(typed(selection));
    return typeof result === "string"
        ? { root: { class: result } }
        : Object.fromEntries(
              Object.entries(result).map(([slot, classes]) => [
                  slot,
                  { class: classes },
              ]),
          );
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

// Every class the preset's recipe styles: base and each variant value, per slot.
const recipeClasses = (name: string): string[] => {
    const { className, slots, base = {}, variants = {} } = presetRecipeOf(name);
    if (!slots) {
        return [
            ...(hasStyles(base) ? [className] : []),
            ...Object.entries(variants).flatMap(([group, values]) =>
                Object.entries(values)
                    .filter(([, styles]) => hasStyles(styles))
                    .map(([value]) => `${className}--${group}_${value}`),
            ),
        ];
    }
    const bySlot = base as Record<string, StyleObject>;
    return slots.flatMap((slot) => [
        ...(hasStyles(bySlot[slot]) ? [`${className}__${slot}`] : []),
        ...Object.entries(variants).flatMap(([group, values]) =>
            Object.entries(values)
                .filter(([, styles]) =>
                    hasStyles((styles as Record<string, StyleObject>)[slot]),
                )
                .map(([value]) => `${className}__${slot}--${group}_${value}`),
        ),
    ]);
};

// Whether a class in Panda's stylesheet belongs to a component's recipe.
const ownClass = (name: string, value: string): boolean => {
    const { className } = presetRecipeOf(name);
    return slotted(name)
        ? value.startsWith(`${className}__`)
        : value === className || value.startsWith(`${className}--`);
};

describe("the fixture's Panda registry", () => {
    it("registers every component of the config as a static entry", () => {
        expect(registry.names).toEqual(NAMES);
        expect(NAMES.length).toBeGreaterThan(2);
        for (const name of NAMES)
            expect(registry.entry(name as "button").kind).toBe("static");
    });

    it("keeps every variant of each component, and every theme, in staticCss", () => {
        expect(staticCss.recipes).toEqual(
            Object.fromEntries(NAMES.map((name) => [name, ["*"]])),
        );
        expect(staticCss.themes).toEqual(
            Object.keys(pureformConfig.themes ?? {}),
        );
    });
});

describe.each(NAMES)("the %s factory", (name) => {
    const recipe = recipeOf(name);
    const factory = factoryOf(name);
    const all = selections(recipe.variantMap);

    it("returns Panda's classes for every selection", () => {
        const mismatches = all.filter(
            (selection) =>
                JSON.stringify(factory(selection)) !==
                JSON.stringify(pandaSlots(name, selection)),
        );
        expect(all.length).toBeGreaterThan(0);
        expect(mismatches.slice(0, 5)).toEqual([]);
    });

    it("takes booleans for a group of true and false", () => {
        for (const [group, values] of Object.entries(recipe.variantMap)) {
            for (const value of [true, false]) {
                if (!values.includes(String(value))) continue;
                expect(factory({ [group]: value })).toBe(
                    factory({ [group]: String(value) }),
                );
            }
        }
    });

    it("has a Panda rule for every class the recipe styles", () => {
        const expected = recipeClasses(name);
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
        const styled = [...styledClasses].filter((c) => ownClass(name, c));
        expect(styled.filter((c) => !returned.has(c))).toEqual([]);
    });

    it("caches one frozen result per selection, defaults filled in", () => {
        const defaults =
            pureformConfig.components[name]!.recipe.defaultVariants ?? {};
        expect(factory(defaults)).toBe(factory({}));
        expect(Object.isFrozen(factory({}))).toBe(true);
        expect(Object.isFrozen(factory({}).root)).toBe(true);
    });

    it("sets each instance token as the component's CSS var on the root", () => {
        const tokens = (pureformConfig.components[name]!.tokens ??
            {}) as unknown as Record<string, DynamicNode>;
        for (const [token, node] of Object.entries(tokens)) {
            const slots = factory({ tokens: { [token]: "1px" } });
            const variable = varName(node.path, PREFIX);
            expect(slots.root.style, token).toEqual({ [variable]: "1px" });
            expect(slots.root.class).toBe(factory({}).root.class);
        }
        expect(factory({ tokens: {} })).toBe(factory({}));
    });
});

// Tokens the preset declares but none of its styles read (a gap in the preset, not in the
// factories): setting them has no effect.
const UNREAD = [
    "--pf-components-slider-stateLayerColor",
    "--pf-components-menu-supportingColor",
    // A state layer that follows another slot has no drag state.
    ...[
        "iconButton",
        "fab",
        "checkbox",
        "radio",
        "switchControl",
        "slider",
        "navigationBar",
        "navigationRail",
    ].map((name) => `--pf-components-${name}-stateDraggedOpacity`),
];

describe("instance tokens", () => {
    it("are vars Panda's stylesheet reads", () => {
        const unread = NAMES.flatMap((name) =>
            Object.values(
                (pureformConfig.components[name]!.tokens ?? {}) as Record<
                    string,
                    DynamicNode
                >,
            )
                .map((node) => varName(node.path, PREFIX))
                .filter((variable) => !pandaCss.includes(`var(${variable}`)),
        );
        expect(unread.sort()).toEqual([...UNREAD].sort());
    });

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
