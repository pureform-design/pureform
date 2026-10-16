import { px } from "@pureform/core/ast";
import type { AnyComponentSpec } from "@pureform/core/types";
import { describe, expect, it } from "vitest";

import { instanceTokenVars } from "./config";

const spec = {
    kind: "component",
    name: "iconButton",
    tokens: {
        radius: {
            type: "dynamic",
            path: ["components", "iconButton", "radius"],
        },
        size: { type: "dynamic", path: ["sizes", "icon"] },
        gap: { $value: px(8) },
    },
    recipe: { base: {} },
} as unknown as AnyComponentSpec;

describe("instanceTokenVars", () => {
    it("names a dynamic token's var by its path, else the component's var for it", () => {
        expect(instanceTokenVars("iconButton", spec, "pf")).toEqual({
            radius: "--pf-components-iconButton-radius",
            size: "--pf-sizes-icon",
            gap: "--pf-components-iconButton-gap",
        });
    });

    it("has nothing for a component without tokens", () => {
        expect(
            instanceTokenVars(
                "divider",
                {
                    ...spec,
                    tokens: undefined,
                } as unknown as AnyComponentSpec,
                undefined,
            ),
        ).toEqual({});
    });
});
