import { compilePreset } from "@pureform/panda-adapter";
import { describe, expect, it } from "vitest";

import { configWith } from "../__fixtures__/config";
import { scrim } from "./scrim";

describe("scrim", () => {
    it("validates against a full pureform config", () => {
        expect(() => configWith(scrim)).not.toThrow();
    });

    it("dims with the scrim color at the scrim opacity", () => {
        const preset = compilePreset(configWith(scrim));
        expect(preset.theme?.slotRecipes?.scrim?.base?.root).toMatchObject({
            backgroundColor:
                "color-mix(in srgb, transparent, token(colors.scrim) token(opacity.scrim))",
        });
    });
});
