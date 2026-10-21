import { compilePreset } from "@pureform/panda-adapter";
import { describe, expect, it } from "vitest";

import { configWith } from "../__fixtures__/config";
import { pureform } from "../pureform";
import { APP_BAR_KEYFRAMES, appBar } from "./app-bar";

const compiled = () =>
    compilePreset(configWith(appBar)).theme?.slotRecipes?.appBar;

const json = (value: unknown) => JSON.stringify(value);

describe("appBar", () => {
    it("validates against a full pureform config", () => {
        expect(() => configWith(appBar)).not.toThrow();
    });

    it("has M3's parts: a leading button, the headline and subtitle, and trailing actions", () => {
        expect(appBar.slots).toEqual([
            "root",
            "leading",
            "content",
            "headline",
            "subtitle",
            "trailing",
        ]);
        expect(appBar.structure).toEqual({
            root: ["leading", "content", "trailing"],
            content: ["headline", "subtitle"],
        });
    });

    it("is small, medium flexible or large flexible, with no compounds", () => {
        expect(Object.keys(appBar.recipe.variants?.size ?? {})).toEqual([
            "small",
            "mediumFlexible",
            "largeFlexible",
        ]);
        expect(appBar.recipe.defaultVariants).toEqual({
            size: "small",
            centered: "false",
            search: "false",
            scrolled: "false",
            collapsed: "false",
        });
        expect(appBar.recipe.compoundVariants ?? []).toEqual([]);
    });

    it("puts a flexible bar's headline on a line of its own, in a larger type", () => {
        const size = appBar.recipe.variants?.size;
        for (const name of ["mediumFlexible", "largeFlexible"] as const) {
            expect(json(size?.[name]?.content)).toContain('"flexBasis"');
            expect(size?.[name]?.headline).toHaveProperty("textStyle");
        }
        expect(json(size?.mediumFlexible?.headline)).toContain(
            "headlineMedium",
        );
        expect(json(size?.largeFlexible?.headline)).toContain("displaySmall");
        expect(json(appBar.recipe.base?.root)).toContain('"wrap"');
    });

    it("takes the scrolled container through its token", () => {
        expect(
            Object.keys(
                appBar.recipe.variants?.scrolled?.true?.root?.tokens ?? {},
            ),
        ).toEqual(["components.appBar.container"]);
    });

    it("fades its colors with the state tween, which reduced motion keeps", () => {
        const transition = json(appBar.recipe.base?.root?.transition);
        expect(transition).toContain("backgroundColor");
        expect(transition).not.toContain("reducedMotion");
    });

    it("raises the headline into a collapsed bar, and not under reduced motion", () => {
        const content = json(appBar.recipe.variants?.collapsed?.true?.content);
        expect(content).toContain('"on":"reducedMotion"');
        expect(content).toContain("appBarCollapseIn");
        expect(json(APP_BAR_KEYFRAMES.appBarCollapseIn)).toContain("transform");
        expect(json(APP_BAR_KEYFRAMES.appBarCollapseIn)).not.toContain(
            "opacity",
        );
    });

    it("has no radius: the bar is square under every shape theme", () => {
        expect(json(appBar.recipe)).not.toContain("borderRadius");
    });

    it("uses logical insets only", () => {
        expect(json(appBar.recipe)).not.toMatch(
            /"(paddingLeft|paddingRight|marginLeft|marginRight|left|right)"/,
        );
    });

    it("adds its keyframes to the config", () => {
        const keyframes = pureform().keyframes ?? {};
        for (const name of Object.keys(APP_BAR_KEYFRAMES))
            expect(keyframes).toHaveProperty(name);
    });

    it("compiles to a stable Panda slot recipe", () => {
        expect(compiled()).toMatchSnapshot();
    });
});
