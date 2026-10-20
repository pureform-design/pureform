import { compilePreset } from "@pureform/panda-adapter";
import { describe, expect, it } from "vitest";

import { configWith } from "../__fixtures__/config";
import { inputChip } from "./input-chip";

const compiled = () =>
    compilePreset(configWith(inputChip)).theme?.slotRecipes?.inputChip;

describe("input chip", () => {
    it("validates against a full pureform config", () => {
        expect(() => configWith(inputChip)).not.toThrow();
    });

    it("has the draft anatomy's parts, with the remove button as its own surface", () => {
        expect(inputChip.slots).toEqual([
            "root",
            "avatar",
            "icon",
            "label",
            "remove",
            "touchTarget",
        ]);
        expect(inputChip.indication).toEqual([
            {
                trigger: "root",
                surface: "root",
                centered: false,
                focus: "root",
            },
            {
                trigger: "remove",
                surface: "remove",
                centered: true,
                focus: "remove",
            },
        ]);
    });

    it("fills a selected chip with the secondary container", () => {
        const root = compiled()?.base?.root as Record<string, unknown>;
        expect(
            JSON.stringify(
                root[
                    "&:is([aria-selected=true], [aria-pressed=true], [aria-current]:not([aria-current=false]))"
                ],
            ),
        ).toContain("components-inputChip-selectedContainer");
    });

    it("pulls the avatar, icon and remove button out to their own insets", () => {
        const base = JSON.stringify(compiled()?.base);
        expect(base).toContain("components-inputChip-avatarInset");
        expect(base).toContain("components-inputChip-iconInset");
        expect(base).toContain("components-inputChip-removeInset");
    });

    it("morphs its corners from the shared tokens, square at rest, with no compound", () => {
        const recipe = compiled();
        const radius = JSON.stringify(recipe?.base?.root?.borderRadius);
        expect(radius).toContain("components-inputChip-square");
        expect(radius).toContain("components-inputChip-toggles");
        expect(radius).toContain(":active");
        expect(inputChip.recipe.defaultVariants).toMatchObject({
            corner: "square",
            toggle: "false",
        });
        expect(recipe?.variants?.corner?.round?.root).toEqual({
            "--components-inputChip-square": "0",
        });
        expect(inputChip.recipe.compoundVariants ?? []).toEqual([]);
    });

    it("colors a selected chip with its group's container", () => {
        const error = JSON.stringify(compiled()?.variants?.color?.error);
        expect(error).toContain(
            '"--components-inputChip-selectedContainer":"token(colors.errorContainer)"',
        );
    });

    it("compiles to a stable Panda slot recipe", () => {
        expect(compiled()).toMatchSnapshot();
    });
});
