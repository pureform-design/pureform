// Accessibility checks over the components and the default theme.
//
// - Contrast: every pair in `COMPONENT_CONTRAST` and every color group's pairs (see
//   `contrast.ts`), in light and dark. Each pair must also resolve, so a token rename can't
//   quietly skip it.
// - Touch targets: every interactive component reaches the theme's touch target.
// - Focus: every interactive component shows the focus ring.

import type { SlottedComponentSpec } from "@pureform/core/types";
import { resolveColor } from "@pureform/theme";
import { describe, expect, it } from "vitest";

import {
    COMPONENT_CONTRAST,
    componentContrastFailures,
    groupContrast,
} from "./contrast";
import type { ContrastSide } from "./contrast";
import { pureform } from "./pureform";

const config = pureform();
const color = config.theme.color;

describe("contrast", () => {
    it("reaches WCAG AA for every component and color group", () => {
        expect(componentContrastFailures(color, config.components)).toEqual([]);
    });

    const resolves = (spec: unknown, side: ContrastSide) =>
        (["light", "dark"] as const).every((scheme) => {
            const value =
                "role" in side
                    ? color.roles[side.role]
                    : (
                          spec as {
                              tokens?: Record<string, { default?: unknown }>;
                          }
                      ).tokens?.[side.token]?.default;
            return resolveColor(color, value, scheme) !== undefined;
        });

    it.each(Object.entries(COMPONENT_CONTRAST))(
        "%s's pairs all resolve to colors",
        (name, pairs) => {
            const spec = config.components[name];
            expect(spec).toBeDefined();
            for (const { draw, on } of pairs) {
                expect(resolves(spec, draw), JSON.stringify(draw)).toBe(true);
                expect(resolves(spec, on), JSON.stringify(on)).toBe(true);
            }
        },
    );

    it.each(color.groups)("group %s's pairs all resolve to colors", (group) => {
        for (const { draw, on } of groupContrast(group)) {
            expect(resolves(undefined, draw) && resolves(undefined, on)).toBe(
                true,
            );
        }
    });
});

const INTERACTIVE = [
    "button",
    "iconButton",
    "fab",
    "chip",
    "card",
    "checkbox",
    "radio",
    "switchControl",
] as const;

const slotted = (name: string) => {
    const spec = config.components[name];
    if (spec?.kind !== "slotComponent")
        throw new Error(`${name} is not slotted`);
    return spec as SlottedComponentSpec;
};

describe("touch targets", () => {
    it("are at least 44px in the default theme", () => {
        const target = config.tokens.sizes?.touchTarget as {
            value: number;
            unit: string;
        };
        expect(target.unit).toBe("px");
        expect(target.value).toBeGreaterThanOrEqual(44);
    });

    it.each(INTERACTIVE)("%s reaches the touch target", (name) => {
        const spec = slotted(name);
        expect(spec.slots).toContain("touchTarget");
        expect(spec.recipe.base.touchTarget).toMatchObject({
            minWidth: {
                type: "alias",
                path: ["tokens", "sizes", "touchTarget"],
            },
            minHeight: {
                type: "alias",
                path: ["tokens", "sizes", "touchTarget"],
            },
        });
    });
});

describe("focus", () => {
    it.each(INTERACTIVE)("%s shows the focus ring", (name) => {
        const root = slotted(name).recipe.base.root as Record<string, unknown>;
        expect(root.outlineStyle).toMatchObject({
            type: "conditional",
            base: { type: "keyword", value: "none" },
            cases: [{ value: { type: "keyword", value: "solid" } }],
        });
        expect(root.outlineWidth).toEqual({
            type: "numeric",
            value: 3,
            unit: "px",
        });
    });
});

// Rows and tabs span their container and are at least 48px tall, so they need no touch target
// slot; their focus ring sits on the item rather than the root.
const ITEMS: [string, (spec: SlottedComponentSpec) => unknown, string][] = [
    ["menu", (s) => s.recipe.base.item, "itemHeight"],
    ["tabs", (s) => s.recipe.base.tab, "height"],
    [
        "listItem",
        (s) =>
            (s.recipe.variants?.interactive?.true as { root?: unknown })?.root,
        "heightOne",
    ],
];

describe("items", () => {
    it.each(ITEMS)("%s's item shows the focus ring", (name, item) => {
        const style = item(slotted(name)) as Record<string, unknown>;
        expect(style.outlineWidth).toEqual({
            type: "numeric",
            value: 3,
            unit: "px",
        });
    });

    it.each(ITEMS)("%s's item is at least 44px tall", (name, _, token) => {
        const node = slotted(name).tokens?.[token] as {
            default?: { value: number; unit: string };
        };
        expect(node.default?.unit).toBe("px");
        expect(node.default?.value).toBeGreaterThanOrEqual(44);
    });
});
