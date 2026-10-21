// Path resolution and config validation.
//
// `getByPath` resolves an `alias`/`dynamic`-style path against a `CoreConfig`, returning the
// token entry (bare node or `meta(...)` envelope) or throwing a path-not-found error that
// names the nearest existing ancestor. `validateConfig` runs the hard-error pass that
// `defineConfig` performs at author time: every alias path must resolve, the alias graph must
// be acyclic, and every `apply` must name a defined utility (and, for a scaled dynamic
// utility, a key the scale tier contains). The adapter reuses the same guarded traversal
// defensively.

import type { AliasNode, ValueNode } from "./ast";
import type { CoreConfig, Token, UtilityDef } from "./types";

/** Thrown when a path does not resolve to a config entry. */
export class ConfigPathError extends Error {
    constructor(message: string) {
        super(message);
        this.name = "ConfigPathError";
    }
}

/** Thrown when the alias graph contains a cycle. */
export class AliasCycleError extends Error {
    constructor(message: string) {
        super(message);
        this.name = "AliasCycleError";
    }
}

/** Thrown when an `apply` entry names an unknown utility or an unknown scale key. */
export class UtilityRefError extends Error {
    constructor(message: string) {
        super(message);
        this.name = "UtilityRefError";
    }
}

/** Thrown when a slot condition names an unknown slot, or a slot it cannot read: one that is
 *  neither its ancestor nor its descendant in the component's `structure`. */
export class SlotConditionError extends Error {
    constructor(message: string) {
        super(message);
        this.name = "SlotConditionError";
    }
}

const isRecord = (v: unknown): v is Record<string, unknown> =>
    v !== null && typeof v === "object" && !Array.isArray(v);

/** Unwrap a token entry to its value node, whether bare or `meta(...)`-wrapped. Kept local so
 *  `path.ts` stays free of a dependency on `define.ts` (which re-exports this as
 *  `tokenValue`). */
const unwrap = (entry: unknown): unknown =>
    isRecord(entry) && "$value" in entry ? entry.$value : entry;

/** Resolve a path to the container that holds its final key, applying the `components`
 *  namespace rule: `["components", <cmp>, <key>]` reads the component's own `tokens` map, so a
 *  `tokens` segment is spliced in. Every other namespace is a direct property of the config. */
const containerFor = (
    config: CoreConfig,
    path: string[],
): { container: unknown; keys: string[]; base: string } => {
    const [ns, ...rest] = path;
    if (ns === "components") {
        const [cmp, ...keys] = rest;
        const comp = config.components?.[cmp as string];
        if (comp === undefined) {
            throw new ConfigPathError(
                `${path.join(".")} not found, nearest: components (no component "${cmp}")`,
            );
        }
        return {
            container: comp.tokens,
            keys,
            base: `components.${cmp}.tokens`,
        };
    }
    return {
        container: (config as unknown as Record<string, unknown>)[ns as string],
        keys: rest,
        base: ns as string,
    };
};

/** Resolve a path to the token entry it names (a bare node or a `meta(...)` envelope), or
 *  throw naming the full path and the nearest existing ancestor. */
export const getByPath = (
    config: CoreConfig,
    path: string[],
): Token<ValueNode> => {
    const { container, keys, base } = containerFor(config, path);
    let current: unknown = container;
    let reached = base;
    if (current === undefined) {
        throw new ConfigPathError(
            `${path.join(".")} not found, nearest: (root)`,
        );
    }
    for (const key of keys) {
        if (!isRecord(current) || !(key in current)) {
            throw new ConfigPathError(
                `${path.join(".")} not found, nearest: ${reached}`,
            );
        }
        current = current[key];
        reached = `${reached}.${key}`;
    }
    return current as Token<ValueNode>;
};

/** Follow an alias chain, unwrapping metadata and detecting cycles. Returns the first
 *  non-alias node the chain resolves to. The resolution stack is keyed by canonical path, so
 *  revisiting a path already on the stack throws with the chain. This runs even when the
 *  adapter emits `token(...)` refs, since a cyclic ref would break the target too. */
export const resolveAlias = (
    config: CoreConfig,
    alias: AliasNode,
    stack: string[] = [],
): ValueNode => {
    const key = alias.path.join(".");
    if (stack.includes(key)) {
        throw new AliasCycleError(
            `alias cycle: ${[...stack, key].join(" -> ")}`,
        );
    }
    const node = unwrap(getByPath(config, alias.path)) as ValueNode;
    if (isRecord(node) && node.type === "alias") {
        return resolveAlias(config, node as AliasNode, [...stack, key]);
    }
    return node;
};

/** Walk every value in the config, invoking `onNode` for each AST node (an object with a
 *  `type` discriminant) and `onApply` for each `StyleMap.apply` block. Skips `$meta`
 *  envelopes, whose `extensions` and `platformHints` are opaque foreign data. */
const walk = (
    value: unknown,
    onNode: (node: Record<string, unknown>) => void,
    onApply: (apply: Record<string, unknown>) => void,
): void => {
    if (Array.isArray(value)) {
        for (const item of value) walk(item, onNode, onApply);
        return;
    }
    if (!isRecord(value)) return;
    if (typeof value.type === "string") onNode(value);
    for (const [k, v] of Object.entries(value)) {
        if (k === "$meta") continue;
        if (k === "apply" && isRecord(v)) onApply(v);
        walk(v, onNode, onApply);
    }
};

const validateApply = (
    config: CoreConfig,
    apply: Record<string, unknown>,
): void => {
    const utilities: Record<string, UtilityDef> = config.utilities ?? {};
    for (const [name, value] of Object.entries(apply)) {
        const util = utilities[name];
        if (!util) {
            throw new UtilityRefError(
                `apply references unknown utility: ${name}`,
            );
        }
        if (typeof value !== "string") continue;
        if (util.kind === "static") {
            if (!(value in util.values)) {
                throw new UtilityRefError(
                    `apply.${name} = "${value}" is not a defined step; expected one of ${Object.keys(util.values).join(", ")}`,
                );
            }
        } else if (util.scale) {
            // A string arg is a key into the scale tier; it must resolve there.
            getByPath(config, [...util.scale, value]);
        }
    }
};

// Each slot's ancestors in a component's structure, nearest first.
const ancestorsOf = (
    structure: Record<string, string[]>,
): Map<string, string[]> => {
    const parent = new Map<string, string>();
    for (const [outer, inner] of Object.entries(structure)) {
        for (const child of inner) parent.set(child, outer);
    }
    const out = new Map<string, string[]>();
    for (const child of parent.keys()) {
        const chain: string[] = [];
        for (let p = parent.get(child); p !== undefined; p = parent.get(p)) {
            if (chain.includes(p)) break;
            chain.push(p);
        }
        out.set(child, chain);
    }
    return out;
};

// Check every slot condition: in a slotted component, naming a declared slot that is the
// styled slot itself, one of its ancestors, or one of its descendants.
const validateSlotConditions = (config: CoreConfig): void => {
    const checked = new Set<unknown>();
    for (const [name, spec] of Object.entries(config.components)) {
        if (spec.kind !== "slotComponent") continue;
        const slots = new Set(spec.slots);
        const structure = spec.structure ?? {};
        for (const [outer, inner] of Object.entries(structure)) {
            for (const slot of [outer, ...inner]) {
                if (!slots.has(slot)) {
                    throw new SlotConditionError(
                        `${name} structure names unknown slot "${slot}"; expected one of ${spec.slots.join(", ")}`,
                    );
                }
            }
        }
        const ancestors = ancestorsOf(structure);
        const check = (styled: string, style: unknown) =>
            walk(
                style,
                (node) => {
                    if (node.type !== "slot") return;
                    checked.add(node);
                    const target = node.slot as string;
                    if (!slots.has(target)) {
                        throw new SlotConditionError(
                            `${name} slot "${styled}" reads unknown slot "${target}"; expected one of ${spec.slots.join(", ")}`,
                        );
                    }
                    if (target === styled) return;
                    if (!spec.structure) {
                        throw new SlotConditionError(
                            `${name} slot "${styled}" reads slot "${target}"; declare structure to read another slot's state`,
                        );
                    }
                    if (
                        !ancestors.get(styled)?.includes(target) &&
                        !ancestors.get(target)?.includes(styled)
                    ) {
                        throw new SlotConditionError(
                            `${name} slot "${styled}" reads slot("${target}", …), which is neither its ancestor nor its descendant in structure`,
                        );
                    }
                },
                () => {},
            );
        const { base, variants, compoundVariants } = spec.recipe;
        const bySlot = [
            base,
            ...Object.values(variants ?? {}).flatMap((group) =>
                Object.values(group),
            ),
            ...(compoundVariants ?? []).map((c) => c.style),
        ];
        for (const styles of bySlot) {
            for (const [styled, style] of Object.entries(styles)) {
                check(styled, style);
            }
        }
    }
    walk(
        config,
        (node) => {
            if (node.type === "slot" && !checked.has(node)) {
                throw new SlotConditionError(
                    `slot("${String(node.slot)}", "${String(node.state)}") is only valid inside a slotted component's recipe`,
                );
            }
        },
        () => {},
    );
};

/** Every `providedTokens` key must name a token of its component, as an alias would, when the
 *  config has that component: one left out (or pruned) has nothing inside to provide to. */
const validateProvided = (config: CoreConfig, value: unknown): void => {
    if (Array.isArray(value)) {
        for (const item of value) validateProvided(config, item);
        return;
    }
    if (!isRecord(value)) return;
    for (const [k, v] of Object.entries(value)) {
        if (k === "$meta") continue;
        if (k === "providedTokens" && isRecord(v)) {
            for (const path of Object.keys(v)) {
                const [, component] = path.split(".");
                if (config.components?.[component as string] === undefined)
                    continue;
                getByPath(config, path.split("."));
            }
        }
        validateProvided(config, v);
    }
};

/** Run the hard-error pass. Throws on the first problem; returns normally when the config is
 *  valid. */
export const validateConfig = (config: CoreConfig): void => {
    validateProvided(config, config.components);
    walk(
        config,
        (node) => {
            if (node.type === "alias" && Array.isArray(node.path)) {
                resolveAlias(config, node as unknown as AliasNode);
            }
        },
        (apply) => validateApply(config, apply),
    );
    validateSlotConditions(config);
};
