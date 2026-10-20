import { compilePreset } from "@pureform/panda-adapter";
import { describe, expect, it } from "vitest";

import { configWith } from "../__fixtures__/config";
import { button } from "./button";
import { fab } from "./fab";
import { iconButton } from "./icon-button";
import { navigationBar } from "./navigation-bar";
import { navigationRail } from "./navigation-rail";
import { circularProgress, linearProgress } from "./progress";
import { searchBar } from "./search-bar";
import { separator } from "./separator";
import { slider } from "./slider";
import { switchControl } from "./switch";

// What the components take from M3 Expressive, kept beside what it deprecates.
const slotRecipe = (
    component: Parameters<typeof configWith>[0],
    name: string,
) => compilePreset(configWith(component)).theme?.slotRecipes?.[name];

describe("M3 Expressive", () => {
    it("sizes buttons and icon buttons from xsmall to xlarge, keeping compact", () => {
        const sizes = [
            "xsmall",
            "small",
            "medium",
            "large",
            "xlarge",
            "compact",
        ];
        expect(Object.keys(button.recipe.variants?.size ?? {})).toEqual(sizes);
        expect(Object.keys(iconButton.recipe.variants?.size ?? {})).toEqual(
            sizes,
        );
        expect(button.recipe.defaultVariants?.size).toBe("small");
        expect(iconButton.recipe.defaultVariants?.size).toBe("small");
    });

    it("morphs a button's corners from tokens the size and corner set, with no compound", () => {
        const recipe = slotRecipe(button, "button");
        const radius = JSON.stringify(recipe?.base?.root?.borderRadius);
        // Round to square by the corner's flag, swapped while on, pressed winning.
        expect(radius).toContain("components-button-square");
        expect(radius).toContain("aria-pressed");
        expect(radius).toContain(":active");
        expect(recipe?.variants?.size?.medium?.root).toMatchObject({
            "--components-button-squareRadius": "token(radii.large)",
            "--components-button-pressedRadius": "token(radii.medium)",
        });
        expect(recipe?.variants?.corner?.square?.root).toEqual({
            "--components-button-square": "1",
        });
        for (const compound of button.recipe.compoundVariants ?? []) {
            expect(compound.match).not.toHaveProperty("corner");
            expect(compound.match).not.toHaveProperty("size");
        }
    });

    it("colors a toggle button per fill, off and on", () => {
        const filled = button.recipe.compoundVariants?.find(
            (c) => c.match.variant === "filled" && c.match.toggle === "true",
        );
        const background = JSON.stringify(filled?.style.root?.backgroundColor);
        expect(background).toContain("surfaceContainer");
        expect(background).toContain("accent");
    });

    it("gives icon buttons narrow and wide widths per size, by the width's flags", () => {
        const recipe = slotRecipe(iconButton, "iconButton");
        const width = String(recipe?.variants?.size?.large?.root?.width);
        expect(width).toContain("components-iconButton-wideLarge");
        expect(width).toContain("components-iconButton-wide,");
        expect(recipe?.variants?.width?.wide?.root).toEqual({
            "--components-iconButton-wide": "1",
        });
        for (const compound of iconButton.recipe.compoundVariants ?? []) {
            expect(compound.match).not.toHaveProperty("width");
            expect(compound.match).not.toHaveProperty("corner");
        }
    });

    it("sizes FABs as Expressive does, keeping the deprecated small FAB", () => {
        expect(Object.keys(fab.recipe.variants?.size ?? {})).toEqual([
            "small",
            "default",
            "medium",
            "large",
        ]);
        expect(fab.recipe.defaultVariants?.size).toBe("default");
        expect(Object.keys(fab.recipe.variants?.variant ?? {})).toContain(
            "surface",
        );
    });

    it("shows a switch's icon when on, in both states, or never", () => {
        const icons = switchControl.recipe.variants?.icons;
        expect(Object.keys(icons ?? {})).toEqual(["selected", "both", "none"]);
        expect(icons?.both?.icon).toMatchObject({ opacity: { value: 1 } });
        expect(icons?.none?.icon).toMatchObject({ display: { value: "none" } });
    });

    it("draws the bar slider by default and keeps the round one", () => {
        expect(slider.recipe.defaultVariants).toMatchObject({
            handleShape: "bar",
            size: "xsmall",
        });
        const bar = slotRecipe(slider, "slider")?.variants?.handleShape?.bar;
        expect(bar?.stateLayer).toEqual({ display: "none" });
        expect(slider.recipe.variants?.handleShape?.round).toEqual({});
    });

    it("thickens both progress indicators", () => {
        expect(linearProgress.recipe.variants?.thickness?.thick).toHaveProperty(
            "root.height",
        );
        expect(
            circularProgress.recipe.variants?.thickness?.thick,
        ).toHaveProperty("root.tokens");
    });

    it("stands a divider upright and centers a search bar's text", () => {
        expect(separator.recipe.variants?.orientation?.vertical).toHaveProperty(
            "width",
        );
        expect(searchBar.recipe.variants?.centered?.true?.input).toHaveProperty(
            "textAlign",
        );
    });

    it("swaps corners only on a toggle: selected also matches aria-current", () => {
        for (const [component, name] of [
            [button, "button"],
            [iconButton, "iconButton"],
        ] as const) {
            const recipe = slotRecipe(component, name);
            expect(recipe?.variants?.toggle?.true?.root).toEqual({
                [`--components-${name}-toggles`]: "1",
            });
            expect(JSON.stringify(recipe?.base?.root?.borderRadius)).toContain(
                `components-${name}-toggles`,
            );
        }
    });

    it("labels the current destination in its color group's main color", () => {
        for (const nav of [navigationBar, navigationRail]) {
            expect(
                JSON.stringify(nav.recipe.variants?.color?.tertiary?.item),
            ).toContain("tertiary");
        }
    });

    it("eases the bar handle's narrowing, and drops it under reduced motion", () => {
        const handle = JSON.stringify(
            slider.recipe.variants?.handleShape?.bar?.handle?.transition,
        );
        expect(handle).toContain("width");
        expect(handle).toContain("reducedMotion");
    });
});
