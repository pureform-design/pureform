// Lower a config's components to React Native style templates.
//
// There are no selectors, so conditions become states the component reports: a conditional
// value turns inside out into a base and a rule per case, as the CSS serializer nests rules,
// and a rule applies when all its states hold. A slot condition on the root is the same state,
// since in React Native the whole component has one state, but it outranks an element's own
// condition, as its selector does in CSS.

import { getByPath, inlineStyles, tokenValue } from "@pureform/core";
import type {
    Condition,
    ConditionalNode,
    EasingNode,
    StyleMap,
    ValueNode,
} from "@pureform/core/ast";
import type { AnyComponentSpec, CoreConfig } from "@pureform/core/types";

import { colorNodeRgba } from "./color";
import { rnKeyword, rnProperty } from "./props";
import { formatColor } from "./rgba";
import { TINT, TRANSITION } from "./values";
import type { Value } from "./values";

/** Options for lowering. */
export interface RnOptions {
    /** The target id read from `platform(...)` nodes. Default `rn`. */
    target?: string;
    /** Pixels per `rem`, and per `em` too, since there's no inherited font size. Default 16. */
    remBase?: number;
    /** Only these components. Default all. */
    components?: string[];
    /** A font family's first entry, as React Native needs, or the whole stack, which React
     *  Native Web passes to CSS. Default `first`. */
    fontStack?: "first" | "all";
}

/** A style rule: when its states all hold, its style applies, in order of specificity. */
export interface Rule {
    when: string[];
    /** How specific its conditions are, as their selectors would be: one per element
     *  condition, two per slot condition. Higher wins, then later rules. */
    specificity: number;
    style: Record<string, Value>;
}

/** Styles for one slot from the base, a variant value, or a compound variant. */
export interface Entry {
    /** 0 base, 1 variants, 2 compound variants: the CSS adapter's layers. */
    layer: 0 | 1 | 2;
    /** The variant values it applies to, none for the base. */
    match: Record<string, string>;
    /** The slot, or `""` for a component without slots. */
    slot: string;
    rules: Rule[];
}

/** A component's styles, with values left as templates or resolved. */
export interface ComponentStyles<V = Value> {
    slots?: readonly string[];
    /** Each slot's child slots, for passing inherited properties down. */
    structure?: Record<string, string[]>;
    variants: Record<string, string[]>;
    defaultVariants: Record<string, string>;
    entries: EntryOf<V>[];
}

export type EntryOf<V> = Omit<Entry, "rules"> & {
    rules: (Omit<Rule, "style"> & { style: Record<string, V> })[];
};

/** The lowered components, and what couldn't be lowered. */
export interface Lowered {
    components: Record<string, ComponentStyles>;
    diagnostics: string[];
}

/** A value with its cases: the first entry is the base. */
type Cased = { when: string[]; specificity: number; value: Value }[];

interface Ctx {
    config: CoreConfig;
    target: string;
    remBase: number;
    /** Lowering a token for a known scheme picks its case; otherwise the scheme is a state. */
    scheme?: "light" | "dark";
    /** The CSS property being lowered, for keywords. */
    property?: string;
    fontStack: "first" | "all";
}

class Unsupported extends Error {}

const SLOT_STATE: Record<string, string> = {
    focusWithin: "focus",
    focusVisibleWithin: "focusVisible",
};

// Features React Native never has, so their cases never apply.
const NEVER = new Set(["clipShape", "cornerShape"]);

/** A condition as states, `null` when it never holds, or `[]` when it always does. */
const conditionStates = (
    condition: Condition,
    ctx: Ctx,
): { when: string[]; specificity: number } | null => {
    if (typeof condition === "string") {
        if (NEVER.has(condition)) return null;
        if (ctx.scheme && (condition === "dark" || condition === "light")) {
            return condition === ctx.scheme
                ? { when: [], specificity: 0 }
                : null;
        }
        return { when: [condition], specificity: 1 };
    }
    if (condition.type === "slot") {
        return {
            when: [SLOT_STATE[condition.state] ?? condition.state],
            specificity: 2,
        };
    }
    throw new Unsupported(
        `no React Native equivalent for a ${condition.type} condition`,
    );
};

const allStates = (on: Condition | Condition[], ctx: Ctx) => {
    let when: string[] = [];
    let specificity = 0;
    for (const condition of Array.isArray(on) ? on : [on]) {
        const states = conditionStates(condition, ctx);
        if (!states) return null;
        when = [...new Set([...when, ...states.when])];
        specificity += states.specificity;
    }
    return { when, specificity };
};

// Every combination of the parts' cases, in order, so the last that applies wins for each part.
const product = (parts: Cased[], build: (values: Value[]) => Value): Cased => {
    let combos: Cased[number][][] = [[]];
    for (const part of parts) {
        combos = combos.flatMap((combo) =>
            part.map((entry) => [...combo, entry]),
        );
    }
    return combos.map((combo) => ({
        when: [...new Set(combo.flatMap((e) => e.when))],
        specificity: combo.reduce((sum, e) => sum + e.specificity, 0),
        value: build(combo.map((e) => e.value)),
    }));
};

const plain = (value: Value): Cased => [{ when: [], specificity: 0, value }];

const conditional = (node: ConditionalNode, ctx: Ctx): Cased => {
    const out = lowerNode(node.base, ctx);
    for (const { on, value } of node.cases) {
        const states = allStates(on, ctx);
        if (!states) continue;
        for (const entry of lowerNode(value, ctx)) {
            out.push({
                when: [...new Set([...states.when, ...entry.when])],
                specificity: states.specificity + entry.specificity,
                value: entry.value,
            });
        }
    }
    // A known scheme leaves cases that always hold: the last of them is the value.
    if (ctx.scheme) {
        const always = out.filter((entry) => entry.when.length === 0);
        return [
            always.at(-1)!,
            ...out.filter((entry) => entry.when.length > 0),
        ];
    }
    return out;
};

const REF_NAMESPACES = new Set([
    "tokens",
    "semanticTokens",
    "fonts",
    "durations",
    "easings",
    "zIndices",
]);

/** The theme key a token alias reads: `colors.primary`, `fonts.plain`. */
export const refKey = (path: string[]): string | undefined => {
    const [ns, ...rest] = path;
    if (!ns || !REF_NAMESPACES.has(ns)) return undefined;
    return ns === "tokens" || ns === "semanticTokens"
        ? rest.join(".")
        : [ns, ...rest].join(".");
};

const lowerNumeric = (value: number, unit: string, ctx: Ctx): Value => {
    switch (unit) {
        case "px":
            return value;
        case "none":
            // A unitless line height multiplies the font size, which React Native reads as
            // pixels, so it's marked and settled once the slot's font size is known.
            return ctx.property === "lineHeight" ? `${value}x` : value;
        case "rem":
        case "em":
            return value * ctx.remBase;
        // Durations are milliseconds, as Animated takes them.
        case "ms":
            return value;
        case "s":
            return value * 1000;
        default:
            return `${value}${unit}`;
    }
};

// CSS's named curves, as cubic Béziers.
const EASINGS: Record<string, [number, number, number, number]> = {
    linear: [0, 0, 1, 1],
    ease: [0.25, 0.1, 0.25, 1],
    easeIn: [0.42, 0, 1, 1],
    easeOut: [0, 0, 0.58, 1],
    easeInOut: [0.42, 0, 0.58, 1],
};

/** An easing as `cubic-bezier(...)`, or `linear` for steps, which Animated has no curve for. */
const easingCurve = (node: EasingNode): string => {
    if (node.kind === "steps") return "linear";
    const points =
        node.kind === "cubicBezier" ? node.points : EASINGS[node.name]!;
    return `cubic-bezier(${points.join(", ")})`;
};

/** Lower a value node to its cased values. */
export const lowerNode = (node: ValueNode, ctx: Ctx): Cased => {
    switch (node.type) {
        case "literal":
            return plain(node.value);
        case "numeric":
            return plain(lowerNumeric(node.value, node.unit, ctx));
        case "color":
            return plain(formatColor(colorNodeRgba(node)));
        case "keyword": {
            const value = rnKeyword(ctx.property ?? "", node.value);
            if (value === null)
                throw new Unsupported(`no React Native "${node.value}"`);
            return plain(value);
        }
        case "fontFamily":
            return plain(
                ctx.fontStack === "all"
                    ? [...node.stack, ...(node.generic ? [node.generic] : [])]
                          .map((name) =>
                              /[\s"]/.test(name) ? JSON.stringify(name) : name,
                          )
                          .join(", ")
                    : (node.stack[0] ?? node.generic ?? "System"),
            );
        case "alias": {
            const key = refKey(node.path);
            if (key) return plain({ $ref: key });
            if (node.path[0] === "textStyles") {
                throw new Unsupported("a text style alias outside textStyle");
            }
            // Component tokens and anything else: follow the path.
            return lowerNode(
                tokenValue(getByPath(ctx.config, node.path)) as ValueNode,
                ctx,
            );
        }
        case "dynamic": {
            const key = node.path.join(".");
            if (!node.default) return plain({ $dyn: key });
            return product([lowerNode(node.default, ctx)], ([fallback]) => ({
                $dyn: key,
                default: fallback!,
            }));
        }
        case "platform":
            return lowerNode(node.values[ctx.target] ?? node.default, ctx);
        case "conditional":
            return conditional(node, ctx);
        case "colorMix":
            if (node.space !== "srgb") {
                throw new Unsupported(
                    `mixing in ${node.space}; only srgb mixes for now`,
                );
            }
            return product(
                [node.base, node.with, node.amount].map((n) =>
                    lowerNode(n, ctx),
                ),
                ([base, over, amount]) => ({ $mix: [base!, over!, amount!] }),
            );
        case "calc":
            return product(
                node.operands.map((n) => lowerNode(n, ctx)),
                (args) => ({ $calc: node.op, args }),
            );
        case "mathFn":
            return product(
                node.args.map((n) => lowerNode(n, ctx)),
                (args) => ({ $math: node.fn, args }),
            );
        case "filter": {
            // Drop shadows follow what an element draws, where box shadows follow its box. Here
            // shapes fall back to rounded boxes, so the two cast the same shadow.
            const layers = node.fns.flatMap((fn) =>
                fn.fn === "dropShadow" ? [fn.layer] : [],
            );
            if (layers.length !== node.fns.length) {
                throw new Unsupported("filters other than drop shadows");
            }
            return lowerNode({ type: "shadow", layers } as ValueNode, ctx);
        }
        case "shadow": {
            const fields = node.layers.flatMap((layer) => [
                layer.x,
                layer.y,
                layer.blur,
                layer.spread ?? { type: "numeric", value: 0, unit: "px" },
                layer.color,
            ]);
            return product(
                fields.map((n) => lowerNode(n as ValueNode, ctx)),
                (values) => ({
                    $shadow: node.layers.map((layer, i) => ({
                        x: values[i * 5]!,
                        y: values[i * 5 + 1]!,
                        blur: values[i * 5 + 2]!,
                        spread: values[i * 5 + 3]!,
                        color: values[i * 5 + 4]!,
                        ...(layer.inset ? { inset: true } : {}),
                    })),
                }),
            );
        }
        case "transform": {
            const args = node.ops.flatMap((op) => op.args);
            return product(
                args.map((n) => lowerNode(n, ctx)),
                (values) => {
                    let i = 0;
                    return node.ops.flatMap((op) => {
                        const own = op.args.map(() => values[i++]!);
                        if (op.fn === "translate") {
                            return [
                                { translateX: own[0]! },
                                { translateY: own[1] ?? 0 },
                            ];
                        }
                        if (op.fn === "scale" && own.length === 2) {
                            return [{ scaleX: own[0]! }, { scaleY: own[1]! }];
                        }
                        return [{ [op.fn]: own[0]! }];
                    });
                },
            );
        }
        case "gradient": {
            // A gradient of one color is a layer of that color, as Material paints elevation
            // tints, which the background color can take.
            const [first, ...rest] = node.stops;
            const same = JSON.stringify(first?.color);
            if (
                ctx.property === "backgroundImage" &&
                first &&
                rest.every((stop) => JSON.stringify(stop.color) === same)
            ) {
                return lowerNode(first.color, ctx);
            }
            throw new Unsupported(
                "no React Native gradients; only one-color layers",
            );
        }
        case "easing":
            return plain(easingCurve(node));
        case "transition": {
            const parts = node.parts.flatMap((part) => {
                const property = rnProperty(part.property);
                return property ? [{ part, property }] : [];
            });
            const zero = { type: "numeric", value: 0, unit: "ms" } as const;
            const fields = parts.flatMap(({ part }) => [
                part.duration,
                part.easing ?? {
                    type: "easing",
                    kind: "keyword",
                    name: "ease",
                },
                part.delay ?? zero,
            ]);
            return product(
                fields.map((n) => lowerNode(n as ValueNode, ctx)),
                (values) =>
                    parts.map(({ property }, i) => ({
                        property,
                        duration: values[i * 3]!,
                        easing: values[i * 3 + 1]!,
                        delay: values[i * 3 + 2]!,
                    })),
            );
        }
        default:
            throw new Unsupported(
                `no React Native equivalent for a ${node.type} value`,
            );
    }
};

/** Lower a token's value for a known scheme. */
export const lowerToken = (
    node: ValueNode,
    config: CoreConfig,
    scheme: "light" | "dark",
    options: RnOptions = {},
): Value =>
    lowerNode(node, {
        config,
        target: options.target ?? "rn",
        remBase: options.remBase ?? 16,
        fontStack: options.fontStack ?? "first",
        scheme,
    })[0]!.value;

class Rules {
    private byKey = new Map<string, Rule>();

    add(when: string[], specificity: number, property: string, value: Value) {
        const sorted = [...when].sort();
        const key = `${sorted.join("&")}#${specificity}`;
        let rule = this.byKey.get(key);
        if (!rule) {
            rule = { when: sorted, specificity, style: {} };
            this.byKey.set(key, rule);
        }
        rule.style[property] = value;
    }

    list(): Rule[] {
        return [...this.byKey.values()];
    }
}

const stateKey = (key: string): string[] | undefined =>
    /^[a-zA-Z]+$/.test(key) ? [key] : undefined;

const lowerStyle = (
    map: StyleMap,
    rules: Rules,
    ctx: Ctx,
    where: string,
    diagnostics: Set<string>,
    when: string[] = [],
    specificity = 0,
) => {
    const { states, ...own } = map as StyleMap & {
        states?: Record<string, StyleMap>;
    };
    for (const [property, node] of Object.entries(own)) {
        if (node === undefined) continue;
        // Raw rules are keyed by target, and other targets' rules add nothing here.
        if (property === "rawRules") {
            if ((node as Record<string, unknown>)[ctx.target]) {
                diagnostics.add(
                    `${where}: raw rules for "${ctx.target}" aren't supported`,
                );
            }
            continue;
        }
        const rn =
            property === "backgroundImage"
                ? TINT
                : property === "transition"
                  ? TRANSITION
                  : property === "filter"
                    ? "boxShadow"
                    : rnProperty(property);
        if (rn === null) continue;
        if (rn === undefined) {
            diagnostics.add(
                `${where}: no React Native property for "${property}"`,
            );
            continue;
        }
        try {
            for (const entry of lowerNode(node as ValueNode, {
                ...ctx,
                property,
            })) {
                rules.add(
                    [...new Set([...when, ...entry.when])],
                    specificity + entry.specificity,
                    rn,
                    entry.value,
                );
            }
        } catch (error) {
            if (!(error instanceof Unsupported)) throw error;
            diagnostics.add(`${where}: ${property}: ${error.message}`);
        }
    }
    for (const [condition, style] of Object.entries(states ?? {})) {
        const states = stateKey(condition);
        if (!states) {
            diagnostics.add(
                `${where}: no React Native state for "${condition}"`,
            );
            continue;
        }
        lowerStyle(
            style,
            rules,
            ctx,
            where,
            diagnostics,
            [...new Set([...when, ...states])],
            specificity + 1,
        );
    }
};

const lowerComponent = (
    spec: AnyComponentSpec,
    ctx: Ctx,
    diagnostics: Set<string>,
): ComponentStyles => {
    const { config } = ctx;
    const entries: Entry[] = [];
    const slotted = spec.kind === "slotComponent";
    const slots = slotted ? spec.slots : [""];
    const rootSlot = slotted
        ? spec.slots.includes("root")
            ? "root"
            : spec.slots[0]
        : "";
    const add = (
        layer: Entry["layer"],
        match: Record<string, string>,
        bySlot: Record<string, StyleMap | undefined>,
    ) => {
        for (const slot of slots) {
            let style = bySlot[slot];
            if (
                layer === 0 &&
                slot === rootSlot &&
                config.componentBaseStyles
            ) {
                style = { ...config.componentBaseStyles, ...style };
            }
            if (!style) continue;
            const rules = new Rules();
            lowerStyle(
                inlineStyles(style, config),
                rules,
                ctx,
                `${spec.name}${slot ? `.${slot}` : ""}`,
                diagnostics,
            );
            const list = rules.list();
            if (list.length > 0)
                entries.push({ layer, match, slot, rules: list });
        }
    };
    const bySlot = (style: unknown): Record<string, StyleMap | undefined> =>
        slotted
            ? (style as Record<string, StyleMap | undefined>)
            : { "": style as StyleMap | undefined };
    const { recipe } = spec;
    add(0, {}, bySlot(recipe.base));
    for (const [group, values] of Object.entries(recipe.variants ?? {})) {
        for (const [value, style] of Object.entries(values)) {
            add(1, { [group]: value }, bySlot(style));
        }
    }
    for (const compound of recipe.compoundVariants ?? []) {
        add(
            2,
            Object.fromEntries(
                Object.entries(compound.match).map(([g, v]) => [g, String(v)]),
            ),
            bySlot(compound.style),
        );
    }
    return {
        ...(slotted ? { slots: spec.slots } : {}),
        ...(slotted && spec.structure ? { structure: spec.structure } : {}),
        variants: Object.fromEntries(
            Object.entries(recipe.variants ?? {}).map(([group, values]) => [
                group,
                Object.keys(values),
            ]),
        ),
        defaultVariants: Object.fromEntries(
            Object.entries(recipe.defaultVariants ?? {}).map(([g, v]) => [
                g,
                String(v),
            ]),
        ),
        entries,
    };
};

/** Lower a config's components to React Native style templates. */
export const lowerRn = (
    config: CoreConfig,
    options: RnOptions = {},
): Lowered => {
    const ctx: Ctx = {
        config,
        target: options.target ?? "rn",
        remBase: options.remBase ?? 16,
        fontStack: options.fontStack ?? "first",
    };
    const diagnostics = new Set<string>();
    const names = options.components ?? Object.keys(config.components);
    const components = Object.fromEntries(
        names.map((name) => {
            const spec = config.components[name];
            if (!spec) throw new Error(`unknown component "${name}"`);
            return [name, lowerComponent(spec, ctx, diagnostics)];
        }),
    );
    return { components, diagnostics: [...diagnostics] };
};
