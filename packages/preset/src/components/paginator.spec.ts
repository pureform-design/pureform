import { compilePreset } from "@pureform/panda-adapter";
import { describe, expect, it } from "vitest";

import { configWith } from "../__fixtures__/config";
import { pureform } from "../pureform";
import { paginator } from "./paginator";

describe("paginator", () => {
    it("validates against a full pureform config", () => {
        expect(() => configWith(paginator)).not.toThrow();
    });

    it("has the page-size, range and action parts, and the four triggers", () => {
        expect(paginator.slots).toEqual([
            "root",
            "pageSize",
            "pageSizeLabel",
            "pageSizeSelect",
            "rangeLabel",
            "actions",
            "firstTrigger",
            "prevTrigger",
            "nextTrigger",
            "lastTrigger",
        ]);
    });

    it("takes only a density, with no compound, following the theme's by default", () => {
        expect(Object.keys(paginator.recipe.variants ?? {})).toEqual([
            "density",
        ]);
        expect(paginator.recipe.compoundVariants ?? []).toEqual([]);
        expect(paginator.recipe.defaultVariants).toEqual({
            density: "inherit",
        });
    });

    it("is 56px at the default density, a grid unit less per step", () => {
        const recipe = compilePreset(configWith(paginator)).theme?.slotRecipes
            ?.paginator;
        expect(recipe?.base?.root?.minHeight).toBe(
            "calc(var(--components-paginator-height, 56px) + var(--components-paginator-densityOffset, token(sizes.densityOffset)))",
        );
        expect(recipe?.variants?.density?.inherit).toEqual({
            root: {
                "--components-paginator-densityOffset":
                    "token(sizes.densityOffset)",
            },
        });
        expect(recipe?.variants?.density?.["0"]).toEqual({
            root: { "--components-paginator-densityOffset": "0px" },
        });
        for (const step of [-1, -2, -3]) {
            expect(recipe?.variants?.density?.[String(step)]).toEqual({
                root: {
                    "--components-paginator-densityOffset": `calc(token(spacing.1) * ${step})`,
                },
            });
        }
    });

    it("draws its page buttons' icons on-surface-variant, and on-surface at 38% disabled", () => {
        const actions = JSON.stringify(paginator.recipe.base?.actions);
        expect(actions).toContain("iconButton");
        expect(actions).toContain("iconColor");
        expect(actions).toContain("disabledIconColor");
        expect(JSON.stringify(paginator.tokens)).toContain("onSurfaceVariant");
    });

    it("uses logical properties only, so right to left needs nothing extra", () => {
        const json = JSON.stringify(paginator.recipe);
        expect(json).not.toMatch(/"(margin|padding)(Left|Right)"/);
    });

    it("is part of pureform's components and compiles", () => {
        expect(pureform().components["paginator"]).toBeDefined();
        expect(() => compilePreset(pureform())).not.toThrow();
    });
});
