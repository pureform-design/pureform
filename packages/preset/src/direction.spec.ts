// Styles flip with the writing direction. Logical properties (`insetInlineStart`,
// `paddingInline`) flip on their own; a physical horizontal style doesn't, so this spec fails
// on one (`left`, `right`, `marginLeft`, `borderTopLeftRadius`, `translateX`, a `left`
// keyword, …) in any component, base style, or keyframes, unless:
//
// - it's symmetric: `left: 0` with `right: 0` or `width: 100%` (and the same for `right`), or
//   centering with `left: 50%` and `translate(-50%, …)`;
// - it's under a direction condition: a `when("rtl", …)` or `when("ltr", …)` value, a
//   `states.rtl` or `states.ltr` block, or keyframes only an animation under one names;
// - it's in `ALLOWED` below, with the reason it can stay physical.

import {
    animation,
    numeric,
    pct,
    px,
    transform,
    translate,
    translateX,
    when,
} from "@pureform/core/ast";
import type {
    Condition,
    ConditionalNode,
    StyleMap,
    TransformNode,
} from "@pureform/core/ast";
import type { AnyComponentSpec } from "@pureform/core/types";
import { describe, expect, it } from "vitest";

import { pureform } from "./pureform";

/** Physical styles that may stay, each with its reason. `where` is the path the spec reports
 *  (`component.slot`, ignoring variants), `property` the style property. */
const ALLOWED: { where: string; property: string; reason: string }[] = [
    {
        where: "ripple.ripple",
        property: "left",
        reason: "the ripple is placed from pointer coordinates, which are physical",
    },
];

const PHYSICAL_PROPERTY = /^(left|right)$|Left|Right/;
const PHYSICAL_KEYWORD = new Set<unknown>(["left", "right"]);
const DIRECTIONS = new Set<unknown>(["ltr", "rtl"]);

type Node = { type?: string } & Record<string, unknown>;

const isNode = (value: unknown): value is Node =>
    typeof value === "object" && value !== null && "type" in value;

const isNumeric = (value: unknown, amount: number, unit?: string) =>
    isNode(value) &&
    value.type === "numeric" &&
    value.value === amount &&
    (unit === undefined || value.unit === unit);

const isZero = (value: unknown) => isNumeric(value, 0);

const onDirection = (node: ConditionalNode) =>
    node.cases.some(({ on }) =>
        (Array.isArray(on) ? on : [on]).some((c: Condition) =>
            DIRECTIONS.has(c),
        ),
    );

/** A finding: where it is and what is physical there. */
interface Finding {
    where: string;
    variant: string;
    property: string;
    detail: string;
}

interface Walk {
    findings: Finding[];
    /** Keyframe names an animation names outside a direction condition. */
    animated: Set<string>;
    /** Keyframe names an animation names under a direction condition. */
    directional: Set<string>;
}

/** Every keyframe name an animation inside `value` names. */
const animationNames = (value: unknown): string[] => {
    if (typeof value !== "object" || value === null) return [];
    const own =
        isNode(value) &&
        value.type === "animation" &&
        typeof value.name === "string"
            ? [value.name]
            : [];
    return [...own, ...Object.values(value).flatMap(animationNames)];
};

/** Report each physical value inside `value`, a style property's value, unless it sits under a
 *  direction condition. */
const checkValue = (
    value: unknown,
    report: (detail: string) => void,
    walk: Walk,
    centered: boolean,
): void => {
    if (Array.isArray(value)) {
        for (const item of value) checkValue(item, report, walk, centered);
        return;
    }
    if (typeof value !== "object" || value === null) return;
    if (isNode(value)) {
        if (value.type === "conditional" && onDirection(value as never)) {
            for (const name of animationNames(value))
                walk.directional.add(name);
            return;
        }
        if (value.type === "keyword" && PHYSICAL_KEYWORD.has(value.value)) {
            report(`keyword ${String(value.value)}`);
        }
        if (value.type === "transform") {
            for (const { fn, args } of (value as unknown as TransformNode)
                .ops) {
                const [x] = args;
                if (fn === "translateX" && !isZero(x)) report(fn);
                if (
                    fn === "translate" &&
                    !isZero(x) &&
                    !(centered && isNumeric(x, -50, "%"))
                ) {
                    report(fn);
                }
                if (fn === "scaleX" && !isNumeric(x, 1)) report(fn);
            }
        }
        if (value.type === "animation" && typeof value.name === "string") {
            walk.animated.add(value.name);
        }
    }
    for (const child of Object.values(value)) {
        checkValue(child, report, walk, centered);
    }
};

/** Whether a physical inset is one half of a symmetric pair, or centers the element. */
const symmetric = (style: StyleMap, property: string) => {
    if (property !== "left" && property !== "right") return false;
    const { left, right, width } = style;
    if (isZero(property === "left" ? left : right)) {
        return (
            isZero(property === "left" ? right : left) ||
            isNumeric(width, 100, "%")
        );
    }
    return property === "left" && centers(style);
};

/** Whether the style centers itself with `left: 50%` and `translate(-50%, …)`. */
const centers = (style: StyleMap) => {
    const transform = style.transform as unknown;
    return (
        isNumeric(style.left, 50, "%") &&
        isNode(transform) &&
        transform.type === "transform" &&
        (transform as unknown as TransformNode).ops.some(
            ({ fn, args }) =>
                fn === "translate" && isNumeric(args[0], -50, "%"),
        )
    );
};

const checkStyle = (
    style: StyleMap | undefined,
    where: string,
    variant: string,
    walk: Walk,
): void => {
    if (!style) return;
    const centered = centers(style);
    for (const [property, value] of Object.entries(style)) {
        if (property === "states") {
            for (const [condition, block] of Object.entries(
                value as Record<string, StyleMap>,
            )) {
                if (DIRECTIONS.has(condition)) continue;
                checkStyle(
                    block,
                    where,
                    `${variant}states.${condition} `,
                    walk,
                );
            }
            continue;
        }
        if (property === "rawRules") {
            for (const rules of Object.values(
                value as Record<string, Record<string, StyleMap>>,
            )) {
                for (const [selector, block] of Object.entries(rules)) {
                    checkStyle(block, where, `${variant}${selector} `, walk);
                }
            }
            continue;
        }
        const report = (detail: string) =>
            walk.findings.push({ where, variant, property, detail });
        if (
            PHYSICAL_PROPERTY.test(property) &&
            !symmetric(style, property) &&
            !(
                isNode(value) &&
                value.type === "conditional" &&
                onDirection(value as never)
            )
        ) {
            report("physical property");
            continue;
        }
        checkValue(value, report, walk, centered);
    }
};

const checkComponent = (name: string, spec: AnyComponentSpec, walk: Walk) => {
    if (spec.kind === "component") {
        const { base, variants = {}, compoundVariants = [] } = spec.recipe;
        checkStyle(base, name, "", walk);
        for (const [group, values] of Object.entries(variants)) {
            for (const [value, style] of Object.entries(values)) {
                checkStyle(style, name, `${group}=${value} `, walk);
            }
        }
        for (const { match, style } of compoundVariants) {
            checkStyle(style, name, `${JSON.stringify(match)} `, walk);
        }
        return;
    }
    const slots = (styles: Record<string, StyleMap>, variant: string) => {
        for (const [slot, style] of Object.entries(styles)) {
            checkStyle(style, `${name}.${slot}`, variant, walk);
        }
    };
    const { base, variants = {}, compoundVariants = [] } = spec.recipe;
    slots(base, "");
    for (const [group, values] of Object.entries(variants)) {
        for (const [value, styles] of Object.entries(values)) {
            slots(styles, `${group}=${value} `);
        }
    }
    for (const { match, style } of compoundVariants) {
        slots(style, `${JSON.stringify(match)} `);
    }
};

/** Every physical style in the config that isn't allowed, as `where: property (detail)`. */
const physicalStyles = (config: ReturnType<typeof pureform>) => {
    const walk: Walk = {
        findings: [],
        animated: new Set(),
        directional: new Set(),
    };
    for (const [name, spec] of Object.entries(config.components)) {
        if (spec) checkComponent(name, spec as AnyComponentSpec, walk);
    }
    checkStyle(config.componentBaseStyles, "componentBaseStyles", "", walk);
    // Keyframes are checked last, once every animation outside a direction condition is known.
    const frames: Walk = {
        findings: [],
        animated: new Set(),
        directional: new Set(),
    };
    for (const [name, steps] of Object.entries(config.keyframes ?? {})) {
        if (walk.directional.has(name) && !walk.animated.has(name)) continue;
        for (const [step, style] of Object.entries(steps)) {
            checkStyle(style, `@keyframes ${name}`, `${step} `, frames);
        }
    }
    return [...walk.findings, ...frames.findings]
        .filter(
            ({ where, property }) =>
                !ALLOWED.some(
                    (allowed) =>
                        allowed.where === where &&
                        allowed.property === property,
                ),
        )
        .map(
            ({ where, variant, property, detail }) =>
                `${where}: ${variant}${property} (${detail})`,
        );
};

describe("direction", () => {
    it("uses no physical horizontal style outside a direction condition", () => {
        expect(physicalStyles(pureform())).toEqual([]);
    });

    it("finds a physical style, and lets symmetric and direction-aware ones pass", () => {
        // The check itself, on a config holding one of each.
        const slide = (name: string) =>
            animation({ name, duration: numeric(0, "ms") });
        const probe = {
            components: {
                probe: {
                    kind: "slotComponent",
                    name: "probe",
                    slots: ["inset", "pair", "centered", "flipped", "moved"],
                    recipe: {
                        base: {
                            inset: { left: px(4) },
                            pair: { left: px(0), right: px(0) },
                            centered: {
                                left: pct(50),
                                transform: transform(
                                    translate(pct(-50), pct(0)),
                                ),
                            },
                            flipped: {
                                marginLeft: when("rtl", px(4), px(0)),
                                animation: when(
                                    "rtl",
                                    slide("slideRtl"),
                                    slide("slide"),
                                ),
                            },
                            moved: {
                                transform: transform(translateX(px(4))),
                                states: {
                                    rtl: { paddingRight: px(4) },
                                    hover: { paddingRight: px(4) },
                                },
                            },
                        },
                    },
                },
            },
            keyframes: {
                slide: { to: { transform: transform(translateX(px(4))) } },
                slideRtl: { to: { transform: transform(translateX(px(-4))) } },
                unused: { to: { right: px(4) } },
            },
        } as unknown as ReturnType<typeof pureform>;
        expect(physicalStyles(probe)).toEqual([
            "probe.inset: left (physical property)",
            "probe.moved: transform (translateX)",
            "probe.moved: states.hover paddingRight (physical property)",
            "@keyframes unused: to right (physical property)",
        ]);
    });
});
