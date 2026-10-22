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
            springs: [],
        });
    });

    it("gives a single-slot component one root slot and no groups", () => {
        expect(
            componentShape({
                kind: "component",
                name: "divider",
                recipe: { base: {} },
            }),
        ).toEqual({
            variants: {},
            defaults: {},
            slots: ["root"],
            tokens: [],
            springs: [],
        });
    });

    it("names the spring tokens, following an alias to another component's", () => {
        const tabs: AnyComponentSpec = {
            kind: "component",
            name: "tabs",
            tokens: {
                move: { type: "spring", stiffness: 800, damping: 0.6, mass: 1 },
                role: { type: "alias", path: ["springs", "spatialFast"] },
                width: { kind: "raw", value: "2px" } as never,
            },
            recipe: { base: {} },
        };
        const picker: AnyComponentSpec = {
            kind: "component",
            name: "picker",
            tokens: {
                hand: { type: "alias", path: ["components", "tabs", "move"] },
                size: { type: "alias", path: ["components", "tabs", "width"] },
            },
            recipe: { base: {} },
        };
        const config = { components: { tabs, picker } } as never;
        expect(componentShape(tabs).springs).toEqual(["move", "role"]);
        expect(componentShape(picker, config).springs).toEqual(["hand"]);
        expect(componentShape(picker).springs).toEqual([]);
    });
});
