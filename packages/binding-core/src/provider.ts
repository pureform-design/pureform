// What a `PureformProvider` takes and how nested providers combine, for every binding. A
// provider's own options resolve over its parent's: the registry, direction, and motion are
// inherited unless set, and defaults and slot props merge per component.

import type { MotionSetting } from "@pureform/core";
import { MOTION_ATTRIBUTE } from "@pureform/core";
import type {
    ComponentName,
    Registry,
    Selection,
    SlotOf,
    TokenValue,
} from "@pureform/styling";

import { withDefaults } from "./selection";

/** Text direction, which the provider writes on its element and passes to every machine. */
export type Direction = "ltr" | "rtl";

/** Any registry, whatever its entries. */
export type AnyRegistry = Registry<any>;

/** Default variants and tokens per component: `{ button: { variant: "tonal" } }`. */
export type ComponentDefaults = {
    readonly [N in ComponentName]?: Selection<N>;
};

/** Props per component and slot, applied to every part under the provider:
 *  `{ button: { label: { class: "caps" } } }`. `P` is the binding's props for one part. */
export type ProviderSlotProps<P> = {
    readonly [N in ComponentName]?: { readonly [S in SlotOf<N>]?: P };
};

/** A static theme's name, as the config names it. */
export type ThemeName = string;

/** `dynamic` token values set for everything under the provider, by token path. */
export type ThemeOverrides = Readonly<Record<string, TokenValue>>;

/** How the client gets a server-rendered runtime theme: keep the server's block, or generate it
 *  again while hydrating. */
export type ThemeHydration = "reuse" | "regenerate";

/** A provider's own options. Every one is optional; left out, it's inherited. */
export interface ProviderOptions<P = object> {
    /** The generated registry (`.pureform`'s `registry`), or a fake one in tests. */
    readonly registry?: AnyRegistry | undefined;
    /** Text direction. `"ltr"` at the root. */
    readonly dir?: Direction | undefined;
    /** How much motion to allow. `"system"` follows `prefers-reduced-motion`, or the nearest
     *  provider that says `"reduce"` or `"full"`. */
    readonly motion?: MotionSetting | undefined;
    /** Default variants and tokens per component. */
    readonly defaults?: ComponentDefaults | undefined;
    /** Props per component and slot. */
    readonly slotProps?: ProviderSlotProps<P> | undefined;
    /** A named theme from the config, for everything under the provider. The provider writes
     *  the registry's `themeAttributes(theme)` on its element, the target's own scope
     *  (`data-theme`, `data-panda-theme`). Runtime themes land with the runtime themes phase
     *  (p5b). */
    readonly theme?: ThemeName | undefined;
    /** Stub: token overrides, written as CSS vars by the runtime themes phase (p5b). */
    readonly overrides?: ThemeOverrides | undefined;
    /** Stub: how a runtime theme hydrates (p5b). Default `"reuse"`. */
    readonly hydrate?: ThemeHydration | undefined;
}

/** What a provider resolves to: its own options over its parent's. */
export interface ProviderState<P = object> {
    readonly registry: AnyRegistry | undefined;
    readonly dir: Direction;
    /** The setting in effect: the nearest `"reduce"` or `"full"`, else `"system"`. This is what
     *  the CSS follows too. */
    readonly motion: MotionSetting;
    readonly defaults: ComponentDefaults;
    readonly slotProps: ProviderSlotProps<P>;
    readonly theme: ThemeName | undefined;
    readonly overrides: ThemeOverrides;
    readonly hydrate: ThemeHydration;
}

/** What components see with no provider above them. */
export const ROOT_PROVIDER: ProviderState<never> = Object.freeze({
    registry: undefined,
    dir: "ltr",
    motion: "system",
    defaults: Object.freeze({}),
    slotProps: Object.freeze({}),
    theme: undefined,
    overrides: Object.freeze({}),
    hydrate: "reuse",
});

/** How the binding merges two props objects for one part, the inner one's taking precedence. */
export type MergePartProps<P> = (outer: P, inner: P) => P;

type Dict = Readonly<Record<string, unknown>>;

const shallowMerge = <P>(outer: P, inner: P): P =>
    ({ ...(outer as Dict), ...(inner as Dict) }) as P;

const mergeDefaults = (
    outer: ComponentDefaults,
    inner: ComponentDefaults | undefined,
): ComponentDefaults => {
    if (!inner) return outer;
    const merged: Record<string, Selection<string> | undefined> = {
        ...outer,
    };
    for (const [name, selection] of Object.entries(inner)) {
        if (!selection) continue;
        const parent = merged[name];
        merged[name] = parent
            ? withDefaults(parent, selection as Selection<string>)
            : (selection as Selection<string>);
    }
    return merged as ComponentDefaults;
};

const mergeSlotProps = <P>(
    outer: ProviderSlotProps<P>,
    inner: ProviderSlotProps<P> | undefined,
    merge: MergePartProps<P>,
): ProviderSlotProps<P> => {
    if (!inner) return outer;
    const merged: Record<string, Record<string, P>> = { ...outer } as Record<
        string,
        Record<string, P>
    >;
    for (const [name, slots] of Object.entries(
        inner as Record<string, Record<string, P> | undefined>,
    )) {
        if (!slots) continue;
        const parent = merged[name];
        if (!parent) {
            merged[name] = slots;
            continue;
        }
        const next: Record<string, P> = { ...parent };
        for (const [slot, props] of Object.entries(slots)) {
            if (props === undefined) continue;
            const before = next[slot];
            next[slot] = before === undefined ? props : merge(before, props);
        }
        merged[name] = next;
    }
    return merged as ProviderSlotProps<P>;
};

/** A provider's state: its own options over its parent's (`ROOT_PROVIDER` at the root). Slot
 *  props for the same part merge with `merge`, a shallow merge by default; bindings pass theirs,
 *  which joins classes and styles. */
export const resolveProvider = <P>(
    parent: ProviderState<P> | undefined,
    own: ProviderOptions<P>,
    merge: MergePartProps<P> = shallowMerge,
): ProviderState<P> => {
    const base = (parent ?? ROOT_PROVIDER) as ProviderState<P>;
    return {
        registry: own.registry ?? base.registry,
        dir: own.dir ?? base.dir,
        motion:
            own.motion !== undefined && own.motion !== "system"
                ? own.motion
                : base.motion,
        defaults: mergeDefaults(base.defaults, own.defaults),
        slotProps: mergeSlotProps(base.slotProps, own.slotProps, merge),
        theme: own.theme ?? base.theme,
        overrides: own.overrides
            ? { ...base.overrides, ...own.overrides }
            : base.overrides,
        hydrate: own.hydrate ?? base.hydrate,
    };
};

/** The attributes a provider writes on its element: the direction, the motion setting, and its
 *  theme's attributes, which depend on the target. */
export interface ProviderAttributes {
    readonly dir: Direction;
    readonly [MOTION_ATTRIBUTE]: "reduce" | "full" | undefined;
    readonly [themeAttribute: string]: string | undefined;
}

/** A provider's attributes: the direction in effect, its own motion setting unless it's
 *  `"system"` (the CSS reads `data-pf-motion` from the nearest ancestor that has it), and its
 *  own theme's attributes from the registry in effect (an inherited theme's are on an
 *  ancestor already). */
export const providerAttributes = (
    own: Pick<ProviderOptions, "motion" | "theme">,
    state: Pick<ProviderState, "dir"> &
        Partial<Pick<ProviderState, "registry">>,
): ProviderAttributes => ({
    ...(own.theme === undefined
        ? undefined
        : state.registry?.themeAttributes(own.theme)),
    dir: state.dir,
    [MOTION_ATTRIBUTE]:
        own.motion === "reduce" || own.motion === "full"
            ? own.motion
            : undefined,
});

/** The provider's registry, or an error naming what's missing. */
export const requireRegistry = (
    state: Pick<ProviderState, "registry">,
): AnyRegistry => {
    if (state.registry) return state.registry;
    throw new Error(
        "pureform: no registry. Wrap the app in <PureformProvider registry={registry}>, with the registry from `.pureform` (run `pureform generate` or the bundler plugin).",
    );
};
