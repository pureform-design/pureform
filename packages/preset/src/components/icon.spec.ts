import { compilePreset } from "@pureform/panda-adapter";
import { describe, expect, it } from "vitest";

import { configWith } from "../__fixtures__/config";
import { createIcon, icon } from "./icon";
import { touchTarget } from "./touch-target";

describe("icon", () => {
    it("compiles to a stable Panda recipe", () => {
        expect(
            compilePreset(configWith(icon)).theme?.recipes?.icon,
        ).toMatchSnapshot();
    });

    it("has a size per icon size and a color per group", () => {
        const spec = createIcon(["primary", "brand"]);
        expect(Object.keys(spec.recipe.variants?.size ?? {})).toEqual([
            "small",
            "medium",
            "large",
        ]);
        expect(Object.keys(spec.recipe.variants?.color ?? {})).toEqual([
            "current",
            "primary",
            "brand",
        ]);
    });
});

describe("touchTarget", () => {
    it("compiles to a stable Panda recipe", () => {
        expect(
            compilePreset(configWith(touchTarget)).theme?.recipes?.touchTarget,
        ).toMatchSnapshot();
    });
});
