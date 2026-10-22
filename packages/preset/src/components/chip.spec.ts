import { compilePreset } from "@pureform/panda-adapter";
import { describe, expect, it } from "vitest";

import { configWith } from "../__fixtures__/config";
import { chip, chipSet } from "./chip";

const compiled = () => compilePreset(configWith(chip)).theme?.slotRecipes?.chip;

describe("chip", () => {
    it("validates against a full pureform config", () => {
        expect(() => configWith(chip)).not.toThrow();
    });

    it("fills a selected chip with the secondary container in every variant", () => {
        for (const variant of ["outlined", "elevated"]) {
            const root = compiled()?.variants?.variant?.[variant]
                ?.root as Record<string, unknown>;
            expect(
                JSON.stringify(
                    root?.[
                        "&:is([aria-selected=true], [aria-pressed=true], [aria-current]:not([aria-current=false]))"
                    ],
                ),
            ).toContain("components-chip-selectedContainer");
        }
    });

    it("tints the icon from the chip's selected and disabled states", () => {
        const icon = compiled()?.base?.icon as Record<
            string,
            Record<string, string>
        >;
        const keys = Object.keys(icon.color ?? {});
        expect(
            keys.some((k) =>
                k.startsWith(".chip__root:is([aria-selected=true]"),
            ),
        ).toBe(true);
        expect(keys.some((k) => k.startsWith(".chip__root:is(:disabled"))).toBe(
            true,
        );
    });

    it("compiles to a stable Panda slot recipe", () => {
        expect(compiled()).toMatchSnapshot();
    });
});

describe("chip color", () => {
    it("colors a selected chip with its group's container", () => {
        const error = JSON.stringify(compiled()?.variants?.color?.error);
        expect(error).toContain(
            '"--components-chip-selectedContainer":"token(colors.errorContainer)"',
        );
        expect(error).toContain(
            '"--components-chip-selectedContent":"token(colors.onErrorContainer)"',
        );
    });
});

describe("chip corners and trailing icon", () => {
    it("rests in the medium radius and morphs from tokens, with no compound", () => {
        const recipe = compiled();
        const radius = JSON.stringify(recipe?.base?.root?.borderRadius);
        expect(radius).toContain("components-chip-square");
        expect(radius).toContain("components-chip-toggles");
        expect(radius).toContain(":active");
        expect(chip.recipe.defaultVariants).toMatchObject({
            corner: "square",
            toggle: "false",
        });
        expect(recipe?.variants?.corner?.round?.root).toEqual({
            "--components-chip-square": "0",
        });
        expect(recipe?.variants?.toggle?.true?.root).toEqual({
            "--components-chip-toggles": "1",
        });
        expect(chip.recipe.compoundVariants ?? []).toEqual([]);
    });

    it("has a trailing icon with its own size and spacing", () => {
        const slot = JSON.stringify(compiled()?.base?.trailingIcon);
        expect(slot).toContain("components-chip-trailingIconSize");
        expect(slot).toContain("components-chip-trailingIconSpacing");
    });
});

describe("chip set", () => {
    const set = () =>
        compilePreset(configWith(chipSet)).theme?.slotRecipes?.chipSet;

    it("wraps its chips 8px apart, or keeps them on one scrolling line", () => {
        expect(set()?.base?.root).toMatchObject({
            display: "flex",
            flexDirection: "row",
            gap: "var(--components-chipSet-gap, token(spacing.2))",
        });
        expect(set()?.variants?.singleLine?.false?.root).toEqual({
            flexWrap: "wrap",
        });
        expect(set()?.variants?.singleLine?.true?.root).toEqual({
            flexWrap: "nowrap",
            overflow: "auto",
        });
        expect(chipSet.recipe.compoundVariants ?? []).toEqual([]);
    });
});
