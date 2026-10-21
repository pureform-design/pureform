import { compilePreset } from "@pureform/panda-adapter";
import { describe, expect, it } from "vitest";

import { configWith } from "../__fixtures__/config";
import { toolbar } from "./toolbar";

type Styles = Record<string, unknown>;

const recipe = () =>
    compilePreset(configWith(toolbar)).theme?.slotRecipes
        ?.toolbar as unknown as {
        slots: string[];
        base: { root: Styles };
        variants: Record<string, Record<string, { root?: Styles }>>;
    };

describe("toolbar", () => {
    it("validates against a full pureform config", () => {
        expect(() => configWith(toolbar)).not.toThrow();
    });

    it("is one container with placement, orientation, color and overflow, and no compound", () => {
        expect(recipe().slots).toEqual(["root"]);
        expect(Object.keys(toolbar.recipe.variants ?? {})).toEqual([
            "placement",
            "orientation",
            "color",
            "overflow",
        ]);
        expect(toolbar.recipe.compoundVariants ?? []).toHaveLength(0);
        expect(toolbar.recipe.defaultVariants).toEqual({
            placement: "floating",
            orientation: "horizontal",
            color: "standard",
            overflow: "false",
        });
    });

    it("draws the surface container, or the primary container when vibrant", () => {
        const { base, variants } = recipe();
        expect(JSON.stringify(base.root)).toContain(
            "components-toolbar-container",
        );
        expect(variants.color?.vibrant?.root).toEqual({
            "--components-toolbar-container": "token(colors.primaryContainer)",
            "--components-toolbar-content": "token(colors.onPrimaryContainer)",
        });
    });

    it("rounds a floating toolbar from the theme, and squares and spreads a docked one", () => {
        const { variants } = recipe();
        expect(
            JSON.stringify(variants.placement?.floating?.root?.borderRadius),
        ).toContain("components-toolbar-radius");
        const docked = variants.placement?.docked?.root ?? {};
        expect(docked.borderRadius).toBeUndefined();
        expect(docked.justifyContent).toBe("space-between");
        expect(docked.width).toBe("100%");
        expect(docked["--components-toolbar-padding"]).toBe("token(spacing.4)");
    });

    it("pads along the bar with logical properties, and is dense across it", () => {
        const { variants } = recipe();
        const horizontal = variants.orientation?.horizontal?.root ?? {};
        expect(horizontal.flexDirection).toBe("row");
        expect(JSON.stringify(horizontal.paddingInlineStart)).toContain(
            "components-toolbar-padding",
        );
        expect(JSON.stringify(horizontal.height)).toContain("densityOffset");
        const vertical = variants.orientation?.vertical?.root ?? {};
        expect(vertical.flexDirection).toBe("column");
        expect(JSON.stringify(vertical.paddingBlockStart)).toContain(
            "components-toolbar-padding",
        );
        expect(JSON.stringify(vertical.width)).toContain("densityOffset");
    });

    it("clips an overflowing toolbar instead of letting it grow", () => {
        expect(recipe().variants.overflow?.true?.root).toMatchObject({
            overflow: "hidden",
            maxWidth: "100%",
        });
    });
});
