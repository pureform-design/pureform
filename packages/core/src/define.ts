// Spec and config builders, exported from the `@pureform/core` root.
//
// Component specs are the only AST construct you would otherwise hand-write with a literal
// `kind`. These builders inject it and return the typed discriminated spec. They are named for
// what they build, a component (name plus tokens plus recipe) rather than just the `recipe`
// sub-field, and the Panda adapter lowers them to `defineRecipe` / `defineSlotRecipe`.

import { deepMerge } from "@pureform/utils";

import { unitless } from "./ast";
import type { NumericScalarNode } from "./ast";
import { validateConfig } from "./path";
import type {
    ComponentSpec,
    CoreConfig,
    DynamicUtilityDef,
    Metadata,
    SlottedComponentSpec,
    StaticUtilityDef,
    Token,
    WithMeta,
} from "./types";

/** Single-slot component (name plus tokens plus recipe); the Panda adapter emits a
 *  `defineRecipe`. Injects `kind: "component"`. */
export const defineComponent = (
    spec: Omit<ComponentSpec, "kind">,
): ComponentSpec => ({ kind: "component", ...spec });

/** Multi-slot component; the Panda adapter emits a `defineSlotRecipe`. Injects
 *  `kind: "slotComponent"`. */
export const defineSlotComponent = (
    spec: Omit<SlottedComponentSpec, "kind">,
): SlottedComponentSpec => ({ kind: "slotComponent", ...spec });

/** Fixed named-step utility (lowering to a Panda enum `utilities`). Injects `kind: "static"`. */
export const defineStaticUtility = (
    def: Omit<StaticUtilityDef, "kind">,
): StaticUtilityDef => ({ kind: "static", ...def });

/** Value-parameterized utility (lowering to a Panda function `utilities`). Injects
 *  `kind: "dynamic"`. Reference the call-site value in `template` through `arg()` or
 *  `arg(key)`. */
export const defineDynamicUtility = (
    def: Omit<DynamicUtilityDef, "kind">,
): DynamicUtilityDef => ({ kind: "dynamic", ...def });

/** Identity and validation entry point for a whole config. Runs a hard-error pass: every
 *  `alias` path must resolve (else a path-not-found error naming the nearest ancestor), the
 *  alias graph must be acyclic (else a cycle error listing the chain), and every `apply` must
 *  name a defined utility (and a valid scale key for a scaled dynamic utility). It fails fast
 *  at author time and returns the config unchanged when valid. */
export const defineConfig = (config: CoreConfig): CoreConfig => {
    validateConfig(config);
    return config;
};

/** Deep-merge a base config with overrides (later wins; maps merge; leaf nodes and arrays
 *  replace). Built on `@pureform/utils` `deepMerge`. */
export const mergeConfigs = (
    base: CoreConfig,
    ...overrides: Partial<CoreConfig>[]
): CoreConfig =>
    overrides.reduce<CoreConfig>(
        (acc, o) =>
            deepMerge(
                acc as unknown as Record<string, unknown>,
                o as unknown as Record<string, unknown>,
                { arrayMergeMode: "replace" },
            ) as unknown as CoreConfig,
        base,
    );

/** Annotate a token value with metadata, for example
 *  `meta(oklch(...), { description: "Brand", deprecated: "use brand" })`. Produces a `WithMeta`
 *  envelope (`{ $value, $meta }`); leaving a value bare is the un-annotated shorthand. */
export const meta = <T>(value: T, m: Metadata): WithMeta<T> => ({
    $value: value,
    $meta: m,
});

/** Read a token entry's value node, whether bare or metadata-wrapped. The adapter resolver and
 *  `getByPath` call this so metadata is transparent to value resolution. */
export const tokenValue = <T>(t: Token<T>): T =>
    t !== null && typeof t === "object" && "$value" in t
        ? (t as WithMeta<T>).$value
        : (t as T);

/** Build an ordered stacking scale for `CoreConfig.zIndices`: an array of layer names in
 *  ascending order becomes `{ name: unitless(z) }`, spaced by `step` (default 100) from `base`
 *  (default 0). Authors declare relative order, never magic numbers; spread or override
 *  individual entries afterward for one-offs. Referenced through `alias("zIndices", <name>)`.
 *  For example `stack(["base", "dropdown", "overlay", "modal", "popover", "toast", "tooltip"])`. */
export const stack = (
    names: string[],
    opts: { base?: number; step?: number } = {},
): Record<string, NumericScalarNode> => {
    const { base = 0, step = 100 } = opts;
    return Object.fromEntries(
        names.map((name, i) => [name, unitless(base + i * step)]),
    );
};
