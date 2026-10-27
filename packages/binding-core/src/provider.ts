// What a `PureformProvider` takes and how nested providers combine, for every binding. A
// provider's own options resolve over its parent's: the registry, direction, and motion are
// inherited unless set, and defaults and slot props merge per component.

import type { MotionSetting } from "@pureform/core";
import type {
    ComponentName,
    Registry,
    Selection,
    SlotOf,
    TokenValue,
} from "@pureform/styling";

import type { Indication } from "./indication";
import { withDefaults } from "./selection";

/** Text direction for content and interactions. */
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

/** A provider's own options. Every one is optional; left out, it's inherited. `R` is the
 *  registry the platform's provider takes: a web binding takes the web registry. */
export interface ProviderOptions<
    P = object,
    R extends AnyRegistry = AnyRegistry,
> {
    /** The generated registry (`.pureform`'s `registry`), or a fake one in tests. */
    readonly registry?: R | undefined;
    /** Text direction. `"ltr"` at the root. */
    readonly dir?: Direction | undefined;
    /** How much motion to allow. `"system"` follows the platform's setting, or the nearest
     *  provider that says `"reduce"` or `"full"`. */
    readonly motion?: MotionSetting | undefined;
    /** Default variants and tokens per component. */
    readonly defaults?: ComponentDefaults | undefined;
    /** Props per component and slot. */
    readonly slotProps?: ProviderSlotProps<P> | undefined;
    /** How interactive components under the provider show hover, focus, and press: Material's
     *  (`materialIndication()`, the default), `noIndication`, or the app's own
     *  (`defineIndication`). A component's own `indication` prop overrides it. */
    readonly indication?: Indication | undefined;
}

/** What a provider resolves to: its own options over its parent's. */
export interface ProviderState<
    P = object,
    R extends AnyRegistry = AnyRegistry,
> {
    readonly registry: R | undefined;
    readonly dir: Direction;
    /** The setting in effect: the nearest `"reduce"` or `"full"`, else `"system"`. */
    readonly motion: MotionSetting;
    readonly defaults: ComponentDefaults;
    readonly slotProps: ProviderSlotProps<P>;
    /** The nearest provider's `indication`; `undefined` for the binding's default. */
    readonly indication: Indication | undefined;
    /** The focus indicator's color the nearest indication that sets one chooses. It has no
     *  theme-level token, so each component writes it on its root. */
    readonly focusIndicatorColor: TokenValue | undefined;
}

/** What components see with no provider above them. */
export const ROOT_PROVIDER: ProviderState<never, never> = Object.freeze({
    registry: undefined,
    dir: "ltr",
    motion: "system",
    defaults: Object.freeze({}),
    slotProps: Object.freeze({}),
    indication: undefined,
    focusIndicatorColor: undefined,
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
 *  which defines platform-specific precedence. */
export const resolveProvider = <P, R extends AnyRegistry = AnyRegistry>(
    parent: ProviderState<P, R> | undefined,
    own: ProviderOptions<P, R>,
    merge: MergePartProps<P> = shallowMerge,
): ProviderState<P, R> => {
    const base: ProviderState<P, R> = parent ?? ROOT_PROVIDER;
    return {
        registry: own.registry ?? base.registry,
        dir: own.dir ?? base.dir,
        motion:
            own.motion !== undefined && own.motion !== "system"
                ? own.motion
                : base.motion,
        defaults: mergeDefaults(base.defaults, own.defaults),
        slotProps: mergeSlotProps(base.slotProps, own.slotProps, merge),
        indication: own.indication ?? base.indication,
        focusIndicatorColor:
            own.indication?.tokens?.focusIndicatorColor ??
            base.focusIndicatorColor,
    };
};

/** The provider's registry, or an error naming what's missing. */
export const requireRegistry = <R extends AnyRegistry>(state: {
    readonly registry: R | undefined;
}): R => {
    if (state.registry) return state.registry;
    throw new Error(
        "pureform: no registry. Wrap the app in <PureformProvider registry={registry}>, with the registry from `.pureform` (run `pureform generate` or the bundler plugin).",
    );
};
