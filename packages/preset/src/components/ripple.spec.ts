import { compilePreset } from "@pureform/panda-adapter";
import { describe, expect, it } from "vitest";

import { configWith } from "../__fixtures__/config";
import { ripple } from "./ripple";

describe("ripple", () => {
    it("validates against a full pureform config", () => {
        expect(() => configWith(ripple)).not.toThrow();
    });

    it("clips to the surface and fades the content color at the edge", () => {
        const recipe = compilePreset(configWith(ripple)).theme?.slotRecipes
            ?.ripple;
        expect(recipe?.base?.root).toMatchObject({
            overflow: "hidden",
            borderRadius: "inherit",
            pointerEvents: "none",
        });
        expect(recipe?.base?.ripple).toMatchObject({
            backgroundImage:
                "radial-gradient(closest-side, color-mix(in srgb, transparent, var(--components-ripple-color, currentColor) var(--components-ripple-opacity, var(--components-ripple-surfaceOpacity, token(opacity.statePressed)))) max(calc(100% - 70px), 65%), transparent 100%)",
        });
    });
});
