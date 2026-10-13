import { compilePreset } from "@pureform/panda-adapter";
import { describe, expect, it } from "vitest";

import { pureform } from "./pureform";

describe("pureform", () => {
    it("includes every component", () => {
        expect(Object.keys(pureform().components)).toEqual([
            "button",
            "iconButton",
            "card",
            "scrim",
        ]);
    });

    it("regenerates the palette from the seed", () => {
        expect(
            pureform({ seed: "#006A60" }).tokens.colors?.primaryLight,
        ).not.toEqual(pureform().tokens.colors?.primaryLight);
    });

    it("ships both schemes by default", () => {
        const preset = compilePreset(pureform());
        const colors = (preset.theme?.semanticTokens?.colors ?? {}) as Record<
            string,
            { value: unknown }
        >;
        expect(colors.primary?.value).toEqual({
            base: "{colors.primaryLight}",
            _dark: "{colors.primaryDark}",
        });
    });

    it("compiles to a Panda preset with every slot recipe", () => {
        const preset = compilePreset(pureform());
        expect(Object.keys(preset.theme?.slotRecipes ?? {})).toEqual([
            "button",
            "iconButton",
            "card",
            "scrim",
        ]);
    });
});
