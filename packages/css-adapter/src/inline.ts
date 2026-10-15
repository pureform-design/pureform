// Plain CSS has no text styles or utilities, so a style map's `textStyle` and `apply` are
// written out in place: the text style's properties, and each utility's styles for its value.
// They come first, so the map's own properties win, as they do in Panda.

import { alias, literal } from "@pureform/core/ast";
import type { StyleMap, ValueNode } from "@pureform/core/ast";
import type { CoreConfig, UtilityDef } from "@pureform/core/types";

type ApplyArg = string | ValueNode | Record<string, ValueNode> | ValueNode[];
type States = NonNullable<StyleMap["states"]>;

const isNode = (value: unknown): value is ValueNode =>
    typeof value === "object" &&
    value !== null &&
    typeof (value as ValueNode).type === "string";

// The value an arg() takes: the single arg, or a member of an object or array arg.
const argFor = (
    key: string | number | undefined,
    arg: ApplyArg,
    scale: string[] | undefined,
): ValueNode => {
    if (typeof arg === "string") {
        return scale ? alias(...scale, arg) : literal(arg);
    }
    if (isNode(arg)) return arg;
    const member = (arg as Record<string | number, ValueNode>)[key ?? 0];
    if (!member) throw new Error(`utility arg "${String(key)}" not given`);
    return member;
};

const substitute = (
    node: unknown,
    arg: ApplyArg,
    scale: string[] | undefined,
): unknown => {
    if (Array.isArray(node)) return node.map((n) => substitute(n, arg, scale));
    if (!isNode(node)) return node;
    if (node.type === "utilityArg") return argFor(node.key, arg, scale);
    return Object.fromEntries(
        Object.entries(node).map(([key, value]) => [
            key,
            substitute(value, arg, scale),
        ]),
    );
};

const utilityStyle = (
    name: string,
    def: UtilityDef | undefined,
    arg: ApplyArg,
): StyleMap => {
    if (!def) throw new Error(`unknown utility "${name}"`);
    if (def.kind === "static") {
        const style = def.values[arg as string];
        if (!style) throw new Error(`utility "${name}" has no value "${arg}"`);
        return style;
    }
    return Object.fromEntries(
        Object.entries(def.template).map(([key, value]) => [
            key,
            substitute(value, arg, def.scale),
        ]),
    ) as StyleMap;
};

/** Two style maps as one, the second winning; their states merge by condition. */
export const mergeStyles = (a: StyleMap, b: StyleMap): StyleMap => {
    const states: Record<string, StyleMap> = { ...(a.states as States) };
    for (const [condition, style] of Object.entries(
        (b.states ?? {}) as Record<string, StyleMap>,
    )) {
        states[condition] = states[condition]
            ? mergeStyles(states[condition], style)
            : style;
    }
    const merged = { ...a, ...b } as StyleMap;
    if (Object.keys(states).length > 0) merged.states = states as States;
    return merged;
};

/** The style map with its text style and utilities written out, through its states. */
export const inlineStyles = (map: StyleMap, config: CoreConfig): StyleMap => {
    const { textStyle, apply, states, ...own } = map as StyleMap & {
        textStyle?: ValueNode;
    };
    let out: StyleMap = {};
    if (textStyle) {
        if (textStyle.type !== "alias" || textStyle.path[0] !== "textStyles") {
            throw new Error("textStyle takes a text style alias");
        }
        const name = textStyle.path.slice(1).join(".");
        const style = config.textStyles?.[name];
        if (!style) throw new Error(`unknown text style "${name}"`);
        out = mergeStyles(out, inlineStyles(style, config));
    }
    for (const [name, arg] of Object.entries(apply ?? {})) {
        out = mergeStyles(
            out,
            inlineStyles(
                utilityStyle(name, config.utilities?.[name], arg),
                config,
            ),
        );
    }
    out = mergeStyles(out, own as StyleMap);
    if (states) {
        out = mergeStyles(out, {
            states: Object.fromEntries(
                Object.entries(states as Record<string, StyleMap>).map(
                    ([condition, style]) => [
                        condition,
                        inlineStyles(style, config),
                    ],
                ),
            ) as States,
        });
    }
    return out;
};
