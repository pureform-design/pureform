import { compilePreset } from "@pureform/panda-adapter";
import { describe, expect, it } from "vitest";

import { configWith } from "../__fixtures__/config";
import { pureform } from "../pureform";
import { searchBar } from "./search-bar";
import { SEARCH_VIEW_KEYFRAMES, searchView } from "./search-view";

const compiled = () =>
    compilePreset(configWith(searchView)).theme?.slotRecipes?.searchView;

describe("searchView", () => {
    it("validates against a full pureform config", () => {
        expect(() => configWith(searchView)).not.toThrow();
    });

    it("has M3's parts: a header over a divider and the content", () => {
        expect(searchView.slots).toEqual([
            "root",
            "header",
            "leading",
            "input",
            "trailing",
            "divider",
            "content",
        ]);
        expect(searchView.structure).toEqual({
            root: ["header", "divider", "content"],
            header: ["leading", "input", "trailing"],
        });
    });

    it("is full-screen, docked or contained, with no compounds", () => {
        expect(Object.keys(searchView.recipe.variants?.variant ?? {})).toEqual([
            "fullScreen",
            "docked",
            "contained",
        ]);
        expect(searchView.recipe.defaultVariants).toEqual({
            variant: "fullScreen",
        });
        expect(searchView.recipe.compoundVariants ?? []).toEqual([]);
    });

    it("rounds the docked and contained views from the theme's roles", () => {
        const variant = compiled()?.variants?.variant;
        for (const name of ["docked", "contained"]) {
            expect(JSON.stringify(variant?.[name]?.root)).toContain(
                "components-searchView-radius",
            );
        }
        expect(JSON.stringify(variant?.fullScreen?.root)).not.toContain(
            "radius",
        );
    });

    it("contains its header in a pill without a divider, and moves the icons outward", () => {
        const contained = searchView.recipe.variants?.variant?.contained;
        expect(contained?.header).toHaveProperty("backgroundColor");
        expect(contained?.divider).toHaveProperty("display");
        const leading = JSON.stringify(contained?.leading);
        expect(leading).toContain("searchViewFromEnd");
        expect(leading).toContain("searchViewFromStart");
        expect(leading).toContain('"on":"reducedMotion"');
        expect(leading).toContain('"on":"rtl"');
    });

    it("adds its keyframes to the config", () => {
        const keyframes = pureform().keyframes ?? {};
        for (const name of Object.keys(SEARCH_VIEW_KEYFRAMES))
            expect(keyframes).toHaveProperty(name);
    });

    it("compiles to a stable Panda slot recipe", () => {
        expect(compiled()).toMatchSnapshot();
    });
});

describe("searchBar scrolled", () => {
    it("takes the scrolled container through its token", () => {
        expect(
            Object.keys(
                searchBar.recipe.variants?.scrolled?.true?.root?.tokens ?? {},
            ),
        ).toEqual(["components.searchBar.container"]);
        expect(searchBar.recipe.defaultVariants?.scrolled).toBe("false");
    });
});
