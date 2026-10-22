import { materialColor } from "@pureform/material";
import { compilePreset } from "@pureform/panda-adapter";
import { describe, expect, it } from "vitest";

import { configWith } from "../__fixtures__/config";
import { pureform } from "../pureform";
import { TOAST_TYPES, toast } from "./toast";

const recipe = () =>
    compilePreset(configWith(toast)).theme?.slotRecipes?.toast as unknown as {
        base: Record<string, Record<string, unknown>>;
        variants: { type: Record<string, { icon?: Record<string, unknown> }> };
    };

describe("toast", () => {
    it("validates against a full pureform config", () => {
        expect(() => configWith(toast)).not.toThrow();
    });

    it("has Zag's toast parts and an icon", () => {
        expect(toast.slots).toEqual([
            "group",
            "root",
            "icon",
            "title",
            "description",
            "actionTrigger",
            "closeTrigger",
        ]);
    });

    it("tints the icon by type from the theme's color groups, with no compound", () => {
        expect(Object.keys(toast.recipe.variants?.type ?? {})).toEqual([
            ...TOAST_TYPES,
        ]);
        expect(toast.recipe.defaultVariants).toEqual({ type: "info" });
        expect(toast.recipe.compoundVariants ?? []).toHaveLength(0);
        const types = JSON.stringify(recipe().variants.type);
        for (const group of ["success", "warning", "error", "primary"]) {
            expect(types).toContain(`colors.${group}`);
        }
        expect(JSON.stringify(recipe().base.icon)).toContain(
            "--components-toast-accent",
        );
    });

    it("moves and resizes in the stack on a spatial spring, and fades on an effects spring", () => {
        expect(recipe().base.root!.transition).toEqual({
            base:
                "transform token(springs.spatialFast.duration) token(springs.spatialFast.easing), " +
                "height token(springs.spatialFast.duration) token(springs.spatialFast.easing), " +
                "opacity token(springs.effectsFast.duration) token(springs.effectsFast.easing)",
            _motionReduce:
                "opacity token(springs.effectsFast.duration) token(springs.effectsFast.easing)",
        });
    });

    it("shrinks to 80% as it fades out with the popups' overlayShrinkOut, and only fades under reduced motion", () => {
        expect(recipe().base.root!["&[data-state=closed]"]).toEqual({
            animation: {
                base: "token(springs.spatialFast.duration) token(springs.spatialFast.easing) forwards overlayShrinkOut",
                _motionReduce: "none",
            },
        });
    });

    it("stacks its region at the snackbar's layer", () => {
        expect(recipe().base.group?.zIndex).toBe("token(zIndex.snackbar)");
    });

    it("gets success and warning colors from a static theme and a runtime seed", () => {
        for (const config of [
            pureform(),
            pureform({ color: materialColor({ seed: "#006A60" }) }),
        ]) {
            const colors = config.tokens.colors ?? {};
            for (const role of [
                "successLight",
                "successDark",
                "onSuccessLight",
                "successContainerLight",
                "warningLight",
                "warningDark",
                "onWarningLight",
                "warningContainerLight",
            ]) {
                expect(colors, role).toHaveProperty(role);
            }
        }
    });
});
