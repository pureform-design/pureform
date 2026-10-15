import { compilePreset } from "@pureform/panda-adapter";
import { describe, expect, it } from "vitest";

import { configWith } from "../__fixtures__/config";
import { createFab, fab } from "./fab";

const compiled = () => compilePreset(configWith(fab)).theme?.slotRecipes?.fab;

describe("fab", () => {
    it("validates against a full pureform config", () => {
        expect(() => configWith(fab)).not.toThrow();
    });

    it("rests at level 3 and lifts to level 4 on hover", () => {
        expect(compiled()?.base?.root).toMatchObject({
            shadowElevation: "level3",
            _hover: { shadowElevation: "level4" },
        });
    });

    it("is square unless extended", () => {
        const square = compiled()?.compoundVariants?.find(
            (c) => c.size === "large" && c.extended === false,
        );
        expect(square?.css?.root).toEqual({
            width: "var(--components-fab-sizeLarge, 96px)",
        });
        expect(compiled()?.variants?.extended?.true?.root).toHaveProperty(
            "paddingInlineStart",
        );
    });

    it("puts the surface FAB on the high surface container", () => {
        const surface = fab.recipe.compoundVariants?.find(
            (c) => c.match.variant === "surface" && c.match.color === "primary",
        );
        expect(JSON.stringify(surface?.style.root?.backgroundColor)).toContain(
            "surfaceContainerHigh",
        );
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
