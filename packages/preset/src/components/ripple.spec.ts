import { compilePreset } from "@pureform/panda-adapter";
import { describe, expect, it } from "vitest";

import { configWith } from "../__fixtures__/config";
import { ripple } from "./ripple";

describe("ripple", () => {
    it("validates against a full pureform config", () => {
        expect(() => configWith(ripple)).not.toThrow();
    });

    it("clips to the surface and tints with the content color", () => {
        const recipe = compilePreset(configWith(ripple)).theme?.slotRecipes
            ?.ripple;
        expect(recipe?.base?.root).toMatchObject({
            overflow: "hidden",
            borderRadius: "inherit",
            pointerEvents: "none",
        });
        expect(recipe?.base?.ripple).toMatchObject({
            backgroundColor:
                "color-mix(in srgb, transparent, var(--components-ripple-color, currentColor) var(--components-ripple-opacity, token(opacity.statePressed)))",
        });
    });
});
