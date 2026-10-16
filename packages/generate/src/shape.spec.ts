import type { AnyComponentSpec } from "@pureform/core/types";
import { describe, expect, it } from "vitest";

import { componentShape } from "./shape";

const card: AnyComponentSpec = {
    kind: "slotComponent",
    name: "card",
    slots: ["root", "media"],
    tokens: { radius: { kind: "raw", value: "4px" } as never },
    recipe: {
        base: { root: {}, media: {} },
        variants: {
            fill: { filled: {}, outlined: {} },
            interactive: { true: {}, false: {} },
        },
        defaultVariants: { fill: "filled", interactive: "false" },
    },
};

describe("componentShape", () => {
    it("reads groups, values, defaults, slots, and tokens in the config's order", () => {
        expect(componentShape(card)).toEqual({
            variants: {
                fill: ["filled", "outlined"],
                interactive: ["true", "false"],
            },
            defaults: { fill: "filled", interactive: "false" },
            slots: ["root", "media"],
            tokens: ["radius"],
        });
    });

    it("gives a single-slot component one root slot and no groups", () => {
        expect(
            componentShape({
                kind: "component",
                name: "divider",
                recipe: { base: {} },
            }),
        ).toEqual({ variants: {}, defaults: {}, slots: ["root"], tokens: [] });
    });
});
