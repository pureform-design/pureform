import { materialColor } from "@pureform/material";
import { compilePreset } from "@pureform/panda-adapter";
import { describe, expect, it } from "vitest";

import { configWith } from "../__fixtures__/config";
import { pureform } from "../pureform";
import { accordion } from "./accordion";
import { tree } from "./tree";

type Recipe = {
    base: Record<string, Record<string, unknown>>;
    variants: Record<string, Record<string, Record<string, unknown>>>;
};

const recipe = (name: "accordion" | "tree", config = pureform()) =>
    compilePreset(config).theme?.slotRecipes?.[name] as unknown as Recipe;

describe("accordion", () => {
    it("validates against a full pureform config", () => {
        expect(() => configWith(accordion)).not.toThrow();
    });

    it("has Zag's item, trigger, content and indicator, with list row parts in the header", () => {
        expect(accordion.slots).toEqual([
            "root",
            "item",
            "trigger",
            "leading",
            "text",
            "title",
            "description",
            "indicator",
            "content",
        ]);
        expect(accordion.indication).toEqual([
            {
                trigger: "trigger",
                surface: "trigger",
                centered: false,
                focus: "trigger",
            },
        ]);
    });

    it("takes only a density, with no compound", () => {
        expect(Object.keys(accordion.recipe.variants ?? {})).toEqual([
            "density",
        ]);
        expect(accordion.recipe.compoundVariants ?? []).toHaveLength(0);
    });

    it("rounds each item from the theme's medium role, the header's bottom square while expanded", () => {
        const base = recipe("accordion").base;
        expect(JSON.stringify(base.item)).toContain(
            "--components-accordion-radius",
        );
        expect(JSON.stringify(accordion.recipe.base?.item)).not.toContain(
            '"unit":"px","value":12',
        );
        const trigger = JSON.stringify(base.trigger);
        expect(trigger).toContain("aria-expanded=true");
        expect(trigger).toContain("--components-accordion-densityOffset");
    });

    it("turns the indicator over while expanded, and keeps it still under reduced motion", () => {
        const indicator = JSON.stringify(recipe("accordion").base.indicator);
        expect(indicator).toContain("rotate(180deg)");
        expect(indicator).toContain("_motionReduce");
    });

    it("draws from a named theme's colors and a runtime seed's", () => {
        for (const config of [
            pureform(),
            pureform({ color: materialColor({ seed: "#006A60" }) }),
        ]) {
            const item = JSON.stringify(recipe("accordion", config).base.item);
            expect(item).toContain("--components-accordion-container");
            expect(JSON.stringify(config.components.accordion)).toContain(
                "surfaceContainer",
            );
        }
    });
});

describe("tree", () => {
    it("validates against a full pureform config", () => {
        expect(() => configWith(tree)).not.toThrow();
    });

    it("has Zag's label, tree, branch and group, with list row parts in each node", () => {
        expect(tree.slots).toEqual([
            "root",
            "label",
            "tree",
            "branch",
            "node",
            "leading",
            "text",
            "indicator",
            "group",
        ]);
        expect(tree.indication).toEqual([
            {
                trigger: "node",
                surface: "node",
                centered: false,
                focus: "node",
            },
        ]);
    });

    it("takes a density and a color, with no compound, and no group sets what another does", () => {
        expect(Object.keys(tree.recipe.variants ?? {})).toEqual([
            "density",
            "color",
        ]);
        expect(tree.recipe.compoundVariants ?? []).toHaveLength(0);
        expect(tree.recipe.defaultVariants).toEqual({
            density: "inherit",
            color: "primary",
        });
    });

    it("indents a group from the start by its token, and leaves its display to Zag's hidden", () => {
        const group = recipe("tree").base.group!;
        expect(JSON.stringify(group)).toContain("--components-tree-indent");
        expect(Object.keys(group)).not.toContain("display");
        expect(JSON.stringify(group)).not.toMatch(/padding-?[lL]eft/);
    });

    it("rounds a node from the theme's full role and turns a branch's indicator over while expanded", () => {
        const base = recipe("tree").base;
        expect(JSON.stringify(base.node)).toContain(
            "--components-tree-nodeRadius",
        );
        expect(JSON.stringify(base.indicator)).toContain("rotate(180deg)");
    });
});
