import { compilePreset } from "@pureform/panda-adapter";
import { describe, expect, it } from "vitest";

import { configWith } from "../__fixtures__/config";
import { pureform } from "../pureform";
import { listItem } from "./list-item";
import { navigationRail } from "./navigation-rail";

type Recipe = {
    base: Record<string, Record<string, unknown>>;
    variants: Record<string, Record<string, Record<string, unknown>>>;
};

const recipe = (name: "listItem" | "navigationRail") =>
    compilePreset(pureform()).theme?.slotRecipes?.[name] as unknown as Recipe;

describe("expandable list item", () => {
    it("validates against a full pureform config", () => {
        expect(() => configWith(listItem)).not.toThrow();
    });

    it("has an indicator in the row and a region beside it", () => {
        expect(listItem.slots).toContain("indicator");
        expect(listItem.slots).toContain("region");
        expect(listItem.structure?.root).toContain("indicator");
        expect(Object.values(listItem.structure ?? {}).flat()).not.toContain(
            "region",
        );
    });

    it("turns the indicator over while the row is expanded", () => {
        const indicator = JSON.stringify(recipe("listItem").base.indicator);
        expect(indicator).toContain("rotate(180deg)");
        expect(indicator).toContain("aria-expanded=true");
        expect(indicator).toContain("_motionReduce");
    });

    it("indents the region by its token, and leaves its display to hidden", () => {
        const region = recipe("listItem").base.region!;
        expect(JSON.stringify(region)).toContain(
            "--components-listItem-regionIndent",
        );
        expect(Object.keys(region)).not.toContain("display");
    });

    it("adds no variant group and no compound", () => {
        expect(Object.keys(listItem.recipe.variants ?? {})).toEqual([
            "lines",
            "interactive",
            "leadingType",
            "position",
            "density",
            "color",
        ]);
        expect(listItem.recipe.compoundVariants ?? []).toHaveLength(0);
    });
});

describe("navigation rail section label", () => {
    it("hides it while collapsed and shows it, in its own color, while expanded", () => {
        const rail = recipe("navigationRail");
        expect(rail.base.sectionLabel).toEqual({ display: "none" });
        const expanded = JSON.stringify(
            rail.variants.expanded!.true!.sectionLabel,
        );
        expect(expanded).toContain("flex");
        expect(expanded).toContain(
            "--components-navigationRail-sectionLabelColor",
        );
        expect(expanded).toContain(
            "--components-navigationRail-sectionLabelHeight",
        );
    });

    it("sits between the header and the destinations", () => {
        expect(navigationRail.structure?.root).toEqual([
            "header",
            "sectionLabel",
            "item",
        ]);
    });
});
