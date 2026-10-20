import { compilePreset } from "@pureform/panda-adapter";
import { describe, expect, it } from "vitest";

import { configWith } from "../__fixtures__/config";
import { pureform } from "../pureform";
import { bottomSheet } from "./bottom-sheet";
import { dragHandle } from "./drag-handle";
import { SHEET_KEYFRAMES } from "./sheet";
import { sideSheet } from "./side-sheet";

describe.each([
    ["bottomSheet", bottomSheet],
    ["sideSheet", sideSheet],
    ["dragHandle", dragHandle],
] as const)("%s", (name, spec) => {
    it("validates against a full pureform config", () => {
        expect(() => configWith(spec)).not.toThrow();
    });

    it("compiles to a stable Panda slot recipe", () => {
        expect(
            compilePreset(configWith(spec)).theme?.slotRecipes?.[name],
        ).toMatchSnapshot();
    });

    it("adds no compound variants", () => {
        expect(spec.recipe.compoundVariants ?? []).toEqual([]);
    });
});

const json = (value: unknown) => JSON.stringify(value);

describe("bottomSheet", () => {
    it("has a drag handle over its content", () => {
        expect(bottomSheet.slots).toEqual(["root", "dragHandle", "content"]);
        expect(bottomSheet.structure).toEqual({
            root: ["dragHandle", "content"],
        });
    });

    it("rounds only its top corners, from the theme's extra-large role", () => {
        const root = bottomSheet.recipe.base!.root as Record<string, unknown>;
        expect(json(root.borderStartStartRadius)).toBe(
            json(root.borderStartEndRadius),
        );
        expect(json(root.borderStartStartRadius)).toContain("bottomSheet");
        expect(json(root.borderEndStartRadius)).toBe(
            json(root.borderEndEndRadius),
        );
        expect(json(root.borderEndStartRadius)).not.toContain("bottomSheet");
    });

    it("stacks a modal sheet at the dialog layer and a standard one at the raised layer", () => {
        const modal = bottomSheet.recipe.variants!.modal!;
        expect(json(modal.true)).toContain("dialog");
        expect(json(modal.false)).toContain("raised");
        expect(bottomSheet.recipe.defaultVariants).toEqual({ modal: "true" });
    });
});

describe("sideSheet", () => {
    it("has a header with a back button, headline and close button, content, and actions", () => {
        expect(sideSheet.slots).toEqual([
            "root",
            "header",
            "backButton",
            "headline",
            "closeTrigger",
            "content",
            "actions",
        ]);
        expect(sideSheet.structure).toEqual({
            root: ["header", "content", "actions"],
            header: ["backButton", "headline", "closeTrigger"],
        });
    });

    it("rounds a modal sheet's start corners and lifts it on the low container; a standard one is square", () => {
        const root = sideSheet.recipe.base!.root as Record<string, unknown>;
        expect(root).not.toHaveProperty("borderStartStartRadius");
        const modal = sideSheet.recipe.variants!.modal!.true!.root as Record<
            string,
            unknown
        >;
        expect(json(modal.borderStartStartRadius)).toBe(
            json(modal.borderEndStartRadius),
        );
        expect(json(modal.borderStartEndRadius)).toBe(
            json(modal.borderEndEndRadius),
        );
        expect(json(modal.borderStartEndRadius)).not.toContain("sideSheet");
        expect(json(modal.tokens)).toContain("surfaceContainerLow");
    });

    it("puts a coplanar sheet on the page's own layer", () => {
        expect(json(sideSheet.recipe.variants!.coplanar!.true)).toContain(
            "base",
        );
    });
});

describe("dragHandle", () => {
    it("stands its pill up when vertical", () => {
        const vertical = dragHandle.recipe.variants!.orientation!.vertical!
            .handle as Record<string, unknown>;
        expect(json(vertical.width)).toContain("thickness");
        expect(json(vertical.height)).toContain("verticalLength");
    });
});

describe("sheet motion", () => {
    it("adds its keyframes to the config, and slides the side sheet the other way under rtl", () => {
        const keyframes = pureform().keyframes ?? {};
        for (const name of Object.keys(SHEET_KEYFRAMES)) {
            expect(keyframes).toHaveProperty(name);
        }
        const root = json(sideSheet.recipe.base!.root);
        expect(root).toContain("sideSheetInRtl");
        expect(root).toContain("reducedMotion");
    });
});
