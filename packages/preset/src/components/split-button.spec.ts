import { compilePreset } from "@pureform/panda-adapter";
import { describe, expect, it } from "vitest";

import { configWith } from "../__fixtures__/config";
import { fabMenu } from "./fab-menu";
import { splitButton } from "./split-button";

const recipe = () =>
    compilePreset(configWith(splitButton)).theme?.slotRecipes?.splitButton;

const EXPANDED = "&:is([aria-expanded=true], :has([aria-expanded=true]))";

describe("split button", () => {
    it("validates against a full pureform config", () => {
        expect(() => configWith(splitButton)).not.toThrow();
    });

    it("rounds the outside corners and keeps the inner ones small", () => {
        const base = recipe()?.base;
        expect(base?.leadingButton?.borderStartStartRadius).toContain(
            "splitButton-radius",
        );
        expect(
            JSON.stringify(base?.leadingButton?.borderStartEndRadius),
        ).toContain("splitButton-innerRadius");
        expect(base?.trailingButton?.borderEndEndRadius).toContain(
            "splitButton-radius",
        );
    });

    it("rounds the trailing button and turns its icon over while open", () => {
        const base = recipe()?.base;
        expect(
            (
                base?.trailingButton?.borderStartStartRadius as Record<
                    string,
                    string
                >
            )[EXPANDED],
        ).toContain("splitButton-radius");
        expect(JSON.stringify(base?.trailingIcon?.transform)).toContain(
            "rotate(180deg)",
        );
    });

    it("draws both buttons in the fill, with no compound variants", () => {
        const filled = recipe()?.variants?.variant?.filled;
        expect(JSON.stringify(filled?.leadingButton)).toContain(
            "splitButton-accent",
        );
        expect(filled?.trailingButton).toEqual(filled?.leadingButton);
        expect(splitButton.recipe.compoundVariants ?? []).toHaveLength(0);
    });

    it("compiles to a stable Panda slot recipe", () => {
        expect(recipe()).toMatchSnapshot();
    });
});

describe("FAB menu", () => {
    const fab = () =>
        compilePreset(configWith(fabMenu)).theme?.slotRecipes?.fabMenu;

    it("validates against a full pureform config", () => {
        expect(() => configWith(fabMenu)).not.toThrow();
    });

    it("turns the FAB into a round close button in the main color while open", () => {
        const close = fab()?.base?.closeTrigger;
        expect(
            (close?.backgroundColor as Record<string, string>)[EXPANDED],
        ).toContain("fabMenu-accent,");
        expect(
            (
                fab()?.variants?.size?.default?.closeTrigger
                    ?.borderRadius as Record<string, string>
            )[EXPANDED],
        ).toContain("fabMenu-closeRadius");
    });

    it("stacks its items at the end, as pills in the container color", () => {
        const base = fab()?.base;
        expect(base?.list?.alignItems).toBe("end");
        expect(JSON.stringify(base?.item?.backgroundColor)).toContain(
            "fabMenu-accentContainer",
        );
        expect(fabMenu.recipe.compoundVariants ?? []).toHaveLength(0);
    });

    it("compiles to a stable Panda slot recipe", () => {
        expect(fab()).toMatchSnapshot();
    });
});
