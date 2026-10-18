// The style registry's hooks. `useStyles` is what components use: each slot's style for a
// selection, its states among it, over the provider's defaults, in the provider's environment.
// `useStyleFactory` gives the factory itself, to call outside rendering. A lazy entry suspends to
// the nearest `<Suspense>` until it loads. Each call is one cached, frozen lookup.

import { requireRegistry, withDefaults } from "@pureform/binding-core";
import type {
    NativeFactory,
    NativeSelection,
    NativeSlots,
    NativeStyleFactory,
    Selected,
    State,
    ThemeValues,
} from "@pureform/rn-adapter/factory";
import {
    useComponentState,
    useReducedMotion,
    useStyleEnvironment,
} from "@pureform/rn-adapter/react";
import type { ComponentName, Selection } from "@pureform/styling";
import { use, useMemo } from "react";
import type { ComponentType } from "react";
import { Pressable, Text, TextInput, View } from "react-native";

import { pressNow } from "./engine";
import type { MotionEngine, MotionStyles } from "./engine";
import { usePureform } from "./provider";

// The registry entry's factory, loading a lazy one.
const useEntryFactory = (name: string): NativeFactory => {
    const entry = requireRegistry(usePureform()).entry(name);
    return (
        entry.kind === "static" ? entry.factory : use(entry.load())
    ) as NativeFactory;
};

/** A component's `StyleFactory` in the provider's environment (its theme, scheme, overrides,
 *  drawing, and the widths around the caller), to call outside rendering: in handlers, tests,
 *  and lists of previews. A lazy entry suspends until it loads. */
export function useStyleFactory<N extends ComponentName>(
    name: N,
): NativeStyleFactory<N> {
    const factory = useEntryFactory(name);
    const environment = useStyleEnvironment();
    return useMemo(
        () => factory.for(environment),
        [factory, environment],
    ) as unknown as NativeStyleFactory<N>;
}

/** Each slot's style, drawing, and motion for `selection`, its states among it (`pressed`,
 *  `disabled`, …), over the provider's `defaults` for the component, under the provider's
 *  direction and reduced motion. The same selection returns the same frozen object. */
export function useStyles<N extends ComponentName>(
    name: N,
    selection: NativeSelection<N>,
): NativeSlots<N> {
    const state = usePureform();
    const factory = useStyleFactory(name);
    const reducedMotion = useReducedMotion();
    const selected = withDefaults(
        state.defaults[name] as Selection<N> | undefined,
        selection as Selection<N>,
    );
    return factory({
        reducedMotion,
        ...(state.dir === "rtl" ? { rtl: true } : {}),
        ...selected,
    } as NativeSelection<N>);
}

/** The views a slot renders with. */
export interface SlotViews {
    readonly View: ComponentType<any>;
    readonly Text: ComponentType<any>;
    readonly TextInput: ComponentType<any>;
    readonly Pressable: ComponentType<any>;
}

/** React Native's own views, for slots that never move: they mount for about half what the
 *  engines' animated ones do. */
const STILL: SlotViews = {
    View,
    Text,
    TextInput,
    Pressable: pressNow(Pressable),
};

/** Each slot's views, by slot. */
export type SlotViewsBySlot<P extends string = string> = Readonly<
    Record<P, SlotViews>
>;

// Each engine's and component's slot views, decided once from the component's styles.
const slotViews = new WeakMap<
    MotionEngine,
    WeakMap<NativeFactory, SlotViewsBySlot>
>();

const viewsOf = (
    engine: MotionEngine,
    factory: NativeFactory,
): SlotViewsBySlot => {
    let byFactory = slotViews.get(engine);
    if (!byFactory) slotViews.set(engine, (byFactory = new WeakMap()));
    let views = byFactory.get(factory);
    if (!views) {
        // A factory that can't say which slots move (made by hand) moves them all.
        const moving = factory.moving as ReadonlySet<string> | undefined;
        views = new Proxy({} as SlotViewsBySlot, {
            get: (_, slot) =>
                !moving || (typeof slot === "string" && moving.has(slot))
                    ? engine
                    : STILL,
        });
        byFactory.set(factory, views);
    }
    return views;
};

/** What a component renders with: its styles from the provider's engine, transitions and
 *  animations running, its plain selection (drawings, icon fills, and styles at rest), and each
 *  slot's views. */
export interface ComponentSlots<P extends string = string> {
    readonly styles: MotionStyles;
    readonly selected: Selected;
    /** Each slot's views: the engine's where the component's styles ever move it (a transition
     *  or a keyframe animation, in any variant or state), React Native's plain ones elsewhere.
     *  It's decided from the component, never its state, so a slot keeps its views while
     *  mounted: `<views.label.Text style={styles.label}>`. */
    readonly views: SlotViewsBySlot<P>;
}

// A selection's variants, and its instance tokens by theme key, which tweens follow.
const splitSelection = (
    factory: NativeFactory,
    selection: Record<string, unknown>,
): {
    variants: Record<string, string | boolean | undefined>;
    tokens: ThemeValues | undefined;
} => {
    const { tokens, ...variants } = selection as {
        tokens?: Record<string, string | number | undefined>;
    } & Record<string, string | boolean | undefined>;
    if (!tokens) return { variants, tokens: undefined };
    const keyed: ThemeValues = {};
    for (const [token, value] of Object.entries(tokens)) {
        if (value !== undefined) keyed[factory.tokens[token] ?? token] = value;
    }
    return {
        variants,
        tokens: Object.keys(keyed).length > 0 ? keyed : undefined,
    };
};

/** A component's styles through the provider's engine, for its selection (variants and
 *  instance tokens, over the provider's defaults) and its state, and its slots' views (`P`, its
 *  slots' names). Instance tokens tween. */
export function useComponentSlots<P extends string = string>(
    name: string,
    selection: Record<string, unknown>,
    state: State = {},
): ComponentSlots<P> {
    const provider = usePureform();
    const factory = useEntryFactory(name);
    const { variants, tokens } = splitSelection(
        factory,
        withDefaults(
            provider.defaults[name as ComponentName] as
                | Selection<string>
                | undefined,
            selection as Selection<string>,
        ) as Record<string, unknown>,
    );
    const styles = provider.engine.useStyles(name, variants, state, tokens);
    const selected = useComponentState(name, variants, state, tokens);
    return { styles, selected, views: viewsOf(provider.engine, factory) };
}

/** A component's plain selection, without an engine: styles at rest, drawings, and icon fills,
 *  for its selection over the provider's defaults and its state. Instance tokens tween. Slots
 *  are `""` for a component without them. */
export function useSelectedStyles(
    name: string,
    selection: Record<string, unknown>,
    state: State = {},
): Selected {
    const provider = usePureform();
    const factory = useEntryFactory(name);
    const { variants, tokens } = splitSelection(
        factory,
        withDefaults(
            provider.defaults[name as ComponentName] as
                | Selection<string>
                | undefined,
            selection as Selection<string>,
        ) as Record<string, unknown>,
    );
    return useComponentState(name, variants, state, tokens);
}
