import { compilePreset } from "@pureform/panda-adapter";
import { describe, expect, it } from "vitest";

import { configWith } from "../__fixtures__/config";
import { button } from "./button";
import { buttonGroup } from "./button-group";
import { iconButton } from "./icon-button";

const slotRecipe = (
    component: Parameters<typeof configWith>[0],
    name: string,
) => compilePreset(configWith(component)).theme?.slotRecipes?.[name];

describe("buttonGroup", () => {
    it("is a row spaced by its size's gap, or 2px apart when connected", () => {
        const recipe = slotRecipe(buttonGroup, "buttonGroup");
        expect(recipe?.slots).toEqual(["root"]);
        const gap = JSON.stringify(recipe?.base?.root?.gap);
        expect(gap).toContain("components-buttonGroup-gap");
        expect(gap).toContain("components-buttonGroup-connectedGap");
        expect(recipe?.variants?.size?.xsmall?.root).toEqual({
            "--components-buttonGroup-gap": "18px",
        });
        expect(recipe?.variants?.connected?.true?.root).toEqual({
            "--components-buttonGroup-connected": "1",
        });
        expect(buttonGroup.recipe.compoundVariants ?? []).toEqual([]);
    });

    it("gives buttons and icon buttons a position, with no compound added", () => {
        const positions = ["none", "first", "middle", "last", "single"];
        for (const component of [button, iconButton]) {
            expect(
                Object.keys(component.recipe.variants?.position ?? {}),
            ).toEqual(positions);
            expect(component.recipe.defaultVariants?.position).toBe("none");
            for (const compound of component.recipe.compoundVariants ?? []) {
                expect(Object.keys(compound.match)).not.toContain("position");
            }
        }
    });

    it("squares a connected button's inner corners on the inline axis", () => {
        const recipe = slotRecipe(button, "button");
        const first = recipe?.variants?.position?.first?.root ?? {};
        const start = JSON.stringify(first.borderStartStartRadius);
        const end = JSON.stringify(first.borderStartEndRadius);
        // The run's start is the button's own morphing corner, its end the inner radius.
        expect(start).toContain("components-button-radius");
        expect(end).toContain("components-button-innerRadius");
        expect(end).toContain("components-button-pressedInnerRadius");
        expect(JSON.stringify(first.borderEndStartRadius)).toBe(start);
        expect(JSON.stringify(first.borderEndEndRadius)).toBe(end);
        const last = recipe?.variants?.position?.last?.root ?? {};
        expect(JSON.stringify(last.borderStartStartRadius)).toBe(end);
        expect(JSON.stringify(last.borderStartEndRadius)).toBe(start);
        // The icon button rounds its container and outline the same way.
        const icon = slotRecipe(iconButton, "iconButton");
        const middle = icon?.variants?.position?.middle ?? {};
        for (const slot of ["root", "container", "outline"]) {
            expect(
                JSON.stringify(middle[slot]?.borderStartStartRadius),
            ).toContain("components-iconButton-innerRadius");
        }
    });

    it("keeps a connected run's outside corners while pressed and rounds a selected button fully", () => {
        const recipe = slotRecipe(button, "button");
        const first = recipe?.variants?.position?.first?.root ?? {};
        const outer = first.borderStartStartRadius as Record<string, string>;
        const pressed = Object.entries(outer).find(([key]) =>
            key.includes(":active"),
        )?.[1];
        const selected = Object.entries(outer).find(([key]) =>
            key.includes("aria-pressed"),
        )?.[1];
        // Compose's connected leading shape keeps `CornerFull` outside while pressed.
        expect(pressed).toBe(outer.base);
        expect(pressed).not.toContain("components-button-pressedRadius");
        // `connectedButtonCheckedShape` is `CornerFull` on every corner: the outside blends to
        // the round radius by the toggle flag, never to the square one.
        expect(selected).toContain("components-button-toggles");
        const round =
            "var(--components-button-radius, var(--components-button-defaultRadius, token(radii.full)))";
        expect(selected).toContain(`calc(${round} - calc(${round}`);
        const inner = first.borderStartEndRadius as Record<string, string>;
        expect(
            Object.entries(inner).find(([key]) => key.includes(":active"))?.[1],
        ).toContain("components-button-pressedInnerRadius");
    });

    it("widens a single button in a standard group while pressed", () => {
        const recipe = slotRecipe(button, "button");
        expect(recipe?.variants?.position?.single?.root).toMatchObject({
            "--components-button-pressedGrowth": "token(spacing.3)",
        });
        const padding = JSON.stringify(
            recipe?.variants?.size?.small?.root?.paddingInlineStart,
        );
        expect(padding).toContain("data-pf-active");
        expect(padding).toContain("components-button-pressedGrowth");
        const width = JSON.stringify(
            slotRecipe(iconButton, "iconButton")?.variants?.size?.small?.root
                ?.width,
        );
        expect(width).toContain("components-iconButton-pressedGrowth");
    });
});
