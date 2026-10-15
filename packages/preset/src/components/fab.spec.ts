import { compilePreset } from "@pureform/panda-adapter";
import { describe, expect, it } from "vitest";

import { configWith } from "../__fixtures__/config";
import { MATERIAL_SHAPES } from "../shapes";
import { createFab, fab } from "./fab";

// One shape keeps the snapshot readable.
const oneShape = createFab(undefined, { circle: MATERIAL_SHAPES.circle });
const compiled = () =>
    compilePreset(configWith(oneShape)).theme?.slotRecipes?.fab;

describe("fab", () => {
    it("validates against a full pureform config", () => {
        expect(() => configWith(fab)).not.toThrow();
    });

    it("rests at level 3 and lifts to level 4 on hover", () => {
        expect(compiled()?.base?.root).toMatchObject({
            filterElevation: "level3",
            _hover: { filterElevation: "level4" },
        });
    });

    it("tints its container by elevation level, level 0 when disabled", () => {
        const image = JSON.stringify(
            compiled()?.base?.container?.backgroundImage,
        );
        expect(image).toContain("elevationTintLevel3");
        expect(image).toContain("elevationTintLevel4");
        expect(image).toContain("elevationTintLevel0");
    });

    it("is square unless extended", () => {
        const square = compiled()?.compoundVariants?.find(
            (c) => c.size === "large" && c.extended === false,
        );
        expect(square?.css?.root).toEqual({
            width: "var(--components-fab-sizeLarge, 96px)",
        });
        expect(compiled()?.variants?.extended?.true?.container).toHaveProperty(
            "paddingInlineStart",
        );
    });

    it("puts the surface FAB on the high surface container", () => {
        const surface = fab.recipe.compoundVariants?.find(
            (c) => c.match.variant === "surface" && c.match.color === "primary",
        );
        expect(
            JSON.stringify(surface?.style.container?.backgroundColor),
        ).toContain("surfaceContainerHigh");
    });

    it("offers the given color groups", () => {
        const spec = createFab(["primary", "brand"]);
        expect(Object.keys(spec.recipe.variants?.color ?? {})).toEqual([
            "primary",
            "brand",
        ]);
    });

    it("compiles to a stable Panda slot recipe", () => {
        expect(compiled()).toMatchSnapshot();
    });
});
