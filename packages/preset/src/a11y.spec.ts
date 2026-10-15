// Accessibility checks over the components and the default theme.
//
// - Contrast: each component's color pairs, read from its own token defaults so the check
//   follows the code, and each color group as the color variants use it. Text needs WCAG
//   AA's 4.5:1, and the parts that identify a control (borders, the switch handle, the
//   checkbox outline) need 3:1. Decorative lines (separators, the chip outline, which its
//   label already identifies) are exempt.
// - Touch targets: every interactive component reaches the theme's touch target.
// - Focus: every interactive component shows the focus ring.

import type { SlottedComponentSpec } from "@pureform/core/types";
import { contrastRatio, resolveColor } from "@pureform/theme";
import type { Scheme } from "@pureform/theme";
import { describe, expect, it } from "vitest";

import { checkbox } from "./components/checkbox";
import { chip } from "./components/chip";
import { radio } from "./components/radio";
import { supportingText } from "./components/supporting-text";
import { switchControl } from "./components/switch";
import { textArea } from "./components/text-area";
import { textField } from "./components/text-field";
import { pureform } from "./pureform";

const config = pureform();
const color = config.theme.color;

type Spec = { name: string; tokens?: Record<string, unknown> };

// A component token's default color, followed through the theme to a concrete color.
const tokenColor = (spec: Spec, token: string, scheme: Scheme) => {
    const node = spec.tokens?.[token] as { default?: unknown } | undefined;
    if (!node) throw new Error(`${spec.name} has no token "${token}"`);
    return resolveColor(color, node.default, scheme);
};

const roleColor = (role: string, scheme: Scheme) =>
    resolveColor(color, color.roles[role], scheme);

type Side = { token: string } | { role: string };
const side = (spec: Spec, s: Side, scheme: Scheme) =>
    "token" in s
        ? tokenColor(spec, s.token, scheme)
        : roleColor(s.role, scheme);

const TEXT = 4.5;
const UI = 3;

// [component, what is drawn, on what, minimum ratio]
const PAIRS: [Spec, Side, Side, number][] = [
    [chip, { token: "content" }, { role: "surface" }, TEXT],
    [chip, { token: "content" }, { token: "elevatedContainer" }, TEXT],
    [chip, { token: "selectedContent" }, { token: "selectedContainer" }, TEXT],
    [chip, { token: "iconColor" }, { role: "surface" }, UI],
    [textField, { token: "inputColor" }, { token: "container" }, TEXT],
    [textField, { token: "labelColor" }, { token: "container" }, TEXT],
    [textField, { token: "focusColor" }, { token: "container" }, TEXT],
    [textField, { token: "errorColor" }, { token: "container" }, TEXT],
    [textField, { token: "inputColor" }, { role: "surface" }, TEXT],
    [textField, { token: "labelColor" }, { role: "surface" }, TEXT],
    [textField, { token: "supportingColor" }, { role: "surface" }, TEXT],
    [textField, { token: "errorColor" }, { role: "surface" }, TEXT],
    [textField, { token: "indicatorColor" }, { token: "container" }, UI],
    [textField, { token: "outlineColor" }, { role: "surface" }, UI],
    [textArea, { token: "inputColor" }, { token: "container" }, TEXT],
    [textArea, { token: "outlineColor" }, { role: "surface" }, UI],
    [supportingText, { token: "color" }, { role: "surface" }, TEXT],
    [supportingText, { token: "errorColor" }, { role: "surface" }, TEXT],
    [checkbox, { token: "borderColor" }, { role: "surface" }, UI],
    [checkbox, { token: "checkedColor" }, { role: "surface" }, UI],
    [checkbox, { token: "iconColor" }, { token: "checkedColor" }, UI],
    [checkbox, { token: "errorIconColor" }, { token: "errorColor" }, UI],
    [radio, { token: "borderColor" }, { role: "surface" }, UI],
    [radio, { token: "checkedColor" }, { role: "surface" }, UI],
    [switchControl, { token: "outlineColor" }, { role: "surface" }, UI],
    [switchControl, { token: "handleColor" }, { token: "trackColor" }, UI],
    [
        switchControl,
        { token: "checkedHandleColor" },
        { token: "checkedTrackColor" },
        UI,
    ],
    [switchControl, { token: "checkedTrackColor" }, { role: "surface" }, UI],
    [
        switchControl,
        { token: "iconColor" },
        { token: "checkedHandleColor" },
        UI,
    ],
];

const label = (s: Side) => ("token" in s ? s.token : s.role);

describe("component contrast", () => {
    it.each(
        PAIRS.flatMap(([spec, fg, bg, min]) =>
            (["light", "dark"] as const).map(
                (scheme) =>
                    [
                        spec.name,
                        label(fg),
                        label(bg),
                        scheme,
                        min,
                        spec,
                        fg,
                        bg,
                    ] as const,
            ),
        ),
    )(
        "%s: %s on %s (%s) reaches %s:1",
        (_, __, ___, scheme, min, spec, fg, bg) => {
            const front = side(spec, fg, scheme);
            const back = side(spec, bg, scheme);
            expect(front, "foreground resolves to a color").toBeDefined();
            expect(back, "background resolves to a color").toBeDefined();
            expect(contrastRatio(front!, back!)).toBeGreaterThanOrEqual(min);
        },
    );
});

// Every color group, on the surfaces its components draw it on.
const GROUP_PAIRS: [string, string, number][] =
    config.theme.color.groups.flatMap((g): [string, string, number][] => {
        const on = `on${g.charAt(0).toUpperCase()}${g.slice(1)}`;
        return [
            [g, "surface", TEXT],
            [`${on}Container`, `${g}Container`, TEXT],
            [on, g, UI],
        ];
    });

describe("color group contrast", () => {
    it.each(
        GROUP_PAIRS.flatMap(([fg, bg, min]) =>
            (["light", "dark"] as const).map(
                (scheme) => [fg, bg, scheme, min] as const,
            ),
        ),
    )("%s on %s (%s) reaches %s:1", (fg, bg, scheme, min) => {
        const front = roleColor(fg, scheme);
        const back = roleColor(bg, scheme);
        expect(
            front && back && contrastRatio(front, back),
        ).toBeGreaterThanOrEqual(min);
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
