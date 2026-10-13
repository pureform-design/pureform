import { compilePreset } from "@pureform/panda-adapter";
import { describe, expect, it } from "vitest";

import { configWith } from "../__fixtures__/config";
import { iconButton } from "./icon-button";

describe("iconButton", () => {
    it("validates against a full pureform config", () => {
        expect(() => configWith(iconButton)).not.toThrow();
    });

    it("draws the standard variant with no container", () => {
        const standard = iconButton.recipe.compoundVariants?.find(
            (c) =>
                c.match.color === "primary" && c.match.variant === "standard",
        );
        expect(standard?.style.root?.backgroundColor).toMatchObject({
            type: "conditional",
            base: { type: "keyword", value: "transparent" },
        });
    });

    it("compiles to a stable Panda slot recipe", () => {
        const preset = compilePreset(configWith(iconButton));
        expect(preset.theme?.slotRecipes).toMatchSnapshot();
    });
});
