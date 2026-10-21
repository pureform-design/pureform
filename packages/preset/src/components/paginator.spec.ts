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

    it("has no variants and no compounds: it follows the theme's density", () => {
        expect(Object.keys(paginator.recipe.variants ?? {})).toEqual([]);
        expect(paginator.recipe.compoundVariants ?? []).toEqual([]);
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
