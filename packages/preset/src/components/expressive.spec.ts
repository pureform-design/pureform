import { compilePreset } from "@pureform/panda-adapter";
import { describe, expect, it } from "vitest";

import { configWith } from "../__fixtures__/config";
import { button } from "./button";
import { fab } from "./fab";
import { iconButton } from "./icon-button";
import { listItem } from "./list-item";
import { navigationBar } from "./navigation-bar";
import { navigationRail } from "./navigation-rail";
import { circularProgress, linearProgress } from "./progress";
import { searchBar } from "./search-bar";
import { separator } from "./separator";
import { slider } from "./slider";
import { switchControl } from "./switch";
import { toolbar } from "./toolbar";

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
        const width = JSON.stringify(
            recipe?.variants?.size?.large?.root?.width,
        );
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

    it("moves an overflowing inset icon past the handle, in the inactive track's content colour", () => {
        const icon = slider.recipe.base.insetIcon as {
            states?: { overflowing?: object; rtl?: object };
        };
        expect(icon.states?.overflowing).toHaveProperty("insetInlineStart");
        expect(icon.states?.overflowing).toHaveProperty("color");
        // The icon box's mirroring stays.
        expect(icon.states).toHaveProperty("rtl");
        expect(slider.tokens).toMatchObject({
            insetIconPadding: expect.anything(),
            insetIconColor: expect.anything(),
            insetIconOutsideColor: expect.anything(),
        });
    });

    it("draws the bar slider by default and keeps the round one", () => {
        expect(slider.recipe.defaultVariants).toMatchObject({
            handleShape: "bar",
            size: "xsmall",
        });
        const shapes = slotRecipe(slider, "slider")?.variants?.handleShape;
        expect(shapes?.bar?.stateLayer).toEqual({ display: "none" });
        // The shape is a flag the geometry blends by, so the round handle (deprecated, with no
        // Expressive equivalent) still draws.
        expect(shapes?.bar?.root).toEqual({ "--components-slider-bar": "1" });
        expect(shapes?.round?.root).toEqual({ "--components-slider-bar": "0" });
        expect(shapes?.round?.stateLayer).toBeUndefined();
    });

    it("shows the slider's inset icon from medium up, on the bar handle only", () => {
        const sizes = slotRecipe(slider, "slider")?.variants?.size;
        const shown = (size: string) =>
            (sizes?.[size]?.root as Record<string, unknown> | undefined)?.[
                "--components-slider-insetIconShown"
            ];
        expect(["xsmall", "small"].map(shown)).toEqual(["0", "0"]);
        expect(["medium", "large", "xlarge"].map(shown)).toEqual([
            "1",
            "1",
            "1",
        ]);
        expect(slider.recipe.base.insetIcon).toHaveProperty("opacity");
    });

    it("slides a swipeable list item's parts over its action, and clips them", () => {
        const swipeable = slotRecipe(listItem, "listItem")?.variants?.swipeable;
        expect(swipeable?.false).toEqual({});
        expect(Object.keys(swipeable?.true ?? {}).sort()).toEqual([
            "content",
            "leading",
            "root",
            "trailing",
            "trailingText",
        ]);
        expect(swipeable?.true?.root).toMatchObject({ overflow: "hidden" });
        expect(listItem.recipe.base.action).toMatchObject({
            position: { value: "absolute" },
        });
        expect(listItem.recipe.defaultVariants).toMatchObject({
            swipeable: "false",
        });
    });

    it("caps the search bar's width at 720px", () => {
        expect(searchBar.recipe.base.root).toHaveProperty("maxWidth");
    });

    it("draws the search bar flat: Compose's shadow and tonal elevation are level 0", () => {
        expect(searchBar.recipe.base.root).toMatchObject({
            apply: { shadowElevation: "level0" },
        });
    });

    it("thickens both progress indicators", () => {
        expect(linearProgress.recipe.variants?.thickness?.thick).toHaveProperty(
            "root.tokens",
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

    it("docks or floats one toolbar, standing it up and taking the vibrant colors", () => {
        expect(Object.keys(toolbar.recipe.variants?.placement ?? {})).toEqual([
            "floating",
            "docked",
        ]);
        expect(toolbar.recipe.variants?.orientation?.vertical).toHaveProperty(
            "root.flexDirection",
        );
        expect(toolbar.recipe.variants?.color?.vibrant).toHaveProperty(
            "root.tokens",
        );
        expect(toolbar.recipe.compoundVariants ?? []).toHaveLength(0);
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
        for (const [nav, name] of [
            [navigationBar, "navigationBar"],
            [navigationRail, "navigationRail"],
        ] as const) {
            const root = nav.recipe.variants?.color?.tertiary?.root as
                | { tokens: Record<string, unknown> }
                | undefined;
            const tokens = root?.tokens ?? {};
            const token = (key: string) =>
                JSON.stringify(tokens[`components.${name}.${key}`]);
            expect(token("activeLabelColor")).toContain('"tertiary"');
            // A horizontal destination's label sits on the pill, in the icon's color.
            expect(token("horizontalActiveLabelColor")).toContain(
                "onTertiaryContainer",
            );
        }
    });

    it("labels a horizontal destination in the icon's color, inside the pill", () => {
        const bar = navigationBar.recipe.variants?.itemLayout?.horizontal;
        const rail = navigationRail.recipe.variants?.expanded?.true;
        for (const layout of [bar, rail]) {
            expect(JSON.stringify(layout?.item)).toContain(
                "horizontalActiveLabelColor",
            );
            // The pill covers the destination, so the label sits on it.
            expect(layout?.indicator?.position).toEqual(
                expect.objectContaining({ value: "absolute" }),
            );
        }
        expect(navigationBar.recipe.defaultVariants?.itemLayout).toBe(
            "vertical",
        );
        expect(navigationRail.recipe.defaultVariants?.expanded).toBe("false");
    });

    it("gives the rail a header, and a raised surface when modal", () => {
        expect(navigationRail.slots).toContain("header");
        expect(navigationBar.slots).not.toContain("header");
        const modal = navigationRail.recipe.variants?.modal?.true?.root;
        expect(modal?.apply).toEqual({ shadowElevation: "level1" });
        expect(JSON.stringify(modal?.backgroundColor)).toContain(
            "modalContainer",
        );
    });

    it("eases the bar handle's narrowing, and drops it under reduced motion", () => {
        const handle = JSON.stringify(slider.recipe.base?.handle?.transition);
        expect(handle).toContain("width");
        expect(handle).toContain("reducedMotion");
    });

    it("stands the slider up, every placed part moving to the block axis", () => {
        const recipe = slotRecipe(slider, "slider");
        const vertical = recipe?.variants?.orientation?.vertical;
        for (const part of [
            "startTrack",
            "track",
            "activeTrack",
            "marker",
            "handle",
            "valueIndicator",
        ] as const) {
            const base = Object.keys(recipe?.base?.[part] ?? {}).filter((key) =>
                key.startsWith("inset"),
            );
            // Every inset the horizontal slider sets, the vertical one sets too, so none leaks.
            expect(Object.keys(vertical?.[part] ?? {}), part).toEqual(
                expect.arrayContaining(base),
            );
        }
        expect(recipe?.variants?.orientation?.horizontal).toEqual({});
    });
});
