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

/** Run the hard-error pass. Throws on the first problem; returns normally when the config is
 *  valid. */
export const validateConfig = (config: CoreConfig): void => {
    walk(
        config,
        (node) => {
            if (node.type === "alias" && Array.isArray(node.path)) {
                resolveAlias(config, node as unknown as AliasNode);
            }
        },
        (apply) => validateApply(config, apply),
    );
};
