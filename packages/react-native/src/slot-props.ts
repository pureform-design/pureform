// Per-part props of a ready-made, React Native's form of the web's `useSlotProps`: `style` and
// `slotProps` keyed by the component's parts. Each component declares by hand which host each
// part renders (`View`, `Text`, `Pressable`, `TextInput`, …), which picks a part's style type and
// the props its `slotProps` take. The component wins for what it sets: a part's user props are
// spread first, its own after; handlers it sets compose with the user's, its own first. Merged
// values are cached on the identity of what they merge, so nothing is built again while the
// props stay the same, and nothing at all for a part the user doesn't customize.

import type { ComponentAnatomy } from "@pureform/anatomy";
import {
    createSlotReader,
    isPerInstance,
    ownedKeysIn,
    ownedKeysMessage,
    warnOnce,
} from "@pureform/binding-core";
import type { InnerProps, PerInstance } from "@pureform/binding-core";
import type { ComponentName } from "@pureform/styling";
import { useMemo } from "react";
import { StyleSheet } from "react-native";
import type {
    ImageProps,
    ImageStyle,
    PressableProps,
    ScrollViewProps,
    StyleProp,
    TextInputProps,
    TextProps,
    TextStyle,
    ViewProps,
    ViewStyle,
} from "react-native";

import { isDev } from "./env";
import { unselectable } from "./parts";
import { usePureform } from "./provider";

/** What a part renders as. */
export type NativeHost =
    | "View"
    | "Text"
    | "Pressable"
    | "TextInput"
    | "ScrollView"
    | "Image";

interface HostStyles {
    readonly View: ViewStyle;
    readonly Text: TextStyle;
    readonly Pressable: ViewStyle;
    readonly TextInput: TextStyle;
    readonly ScrollView: ViewStyle;
    readonly Image: ImageStyle;
}

interface HostProps {
    readonly View: ViewProps;
    readonly Text: TextProps;
    readonly Pressable: PressableProps;
    readonly TextInput: TextInputProps;
    readonly ScrollView: ScrollViewProps;
    readonly Image: Omit<ImageProps, "source">;
}

/** A component's parts and what each renders as: `{ root: "Pressable", label: "Text" }`. */
export type PartHosts<H = object> = { readonly [P in keyof H]: NativeHost };

/** A part's style: `ViewStyle` or `TextStyle` (or `ImageStyle`) by what it renders as. */
export type NativePartStyle<H extends NativeHost> = StyleProp<HostStyles[H]>;

/** A part's own props: its host's, but for what the component sets itself (`style`, `testID`,
 *  `children`). */
export type NativePartProps<H extends NativeHost> = Partial<
    Omit<HostProps[H], "style" | "testID" | "children">
>;

/** A ready-made's per-part props on React Native: `style` and `slotProps` keyed by its parts
 *  (`style={{ root: { margin: 8 }, label: { fontWeight: "600" } }}`). */
export interface NativeSlotProps<H extends PartHosts<H>, I = {}> {
    readonly style?:
        | {
              readonly [P in keyof H]?: P extends keyof I
                  ? PerInstance<NativePartStyle<H[P]>, I[P]>
                  : NativePartStyle<H[P]>;
          }
        | undefined;
    readonly slotProps?:
        | {
              readonly [P in keyof H]?: P extends keyof I
                  ? PerInstance<NativePartProps<H[P]>, I[P]>
                  : NativePartProps<H[P]>;
          }
        | undefined;
}

/** What a ready-made takes to customize a component it draws (`listItemProps`, `menuProps`): the
 *  inner component's own `style`, `slotProps`, `testId`, and `tokens`. */
export type InnerPropsOf<P> = InnerProps<
    Pick<P, Extract<keyof P, "style" | "slotProps" | "testId" | "tokens">>
>;

type Dict = Readonly<Record<string, unknown>>;
type Handler = (...args: never[]) => unknown;

const EMPTY: Dict = Object.freeze({});

/** Handlers a component depends on itself: its measuring `onLayout` isn't composed. */
const OWN_HANDLERS = new Set(["onLayout"]);

/** What a component always sets on a part itself, after the user's props: its test id, the
 *  children it places, and its ref. The types leave `testID` and `children` out of `slotProps`;
 *  a key set anyway is dropped, and reported in development. */
const OWNED_KEYS: ReadonlySet<string> = new Set(["testID", "children", "ref"]);

const isOwnedKey = (key: string): boolean => OWNED_KEYS.has(key);

const isHandler = (key: string, value: unknown): value is Handler =>
    key.startsWith("on") &&
    typeof value === "function" &&
    !OWN_HANDLERS.has(key);

// Caches keyed by identity: what a merge was built from to what it built.
const pairCache = <V>() => new WeakMap<object, WeakMap<object, V>>();
const cached = <V>(
    cache: WeakMap<object, WeakMap<object, V>>,
    first: object,
    second: object,
    build: () => V,
): V => {
    let inner = cache.get(first);
    if (!inner) cache.set(first, (inner = new WeakMap()));
    let value = inner.get(second);
    if (value === undefined) inner.set(second, (value = build()));
    return value;
};

const styles = pairCache<object>();
const composed = pairCache<Handler>();
const spreads = pairCache<object>();
const partMerges = pairCache<Dict>();

/** Provider defaults merge outer first, then inner, as on the web. Internal handlers still
 *  run before these when the component consumes the resulting slot reader. */
export const mergeNativePartProps = (outer: object, inner: object): Dict =>
    cached(partMerges, outer, inner, () => {
        const merged: Record<string, unknown> = { ...outer };
        for (const [key, value] of Object.entries(inner)) {
            if (value === undefined) continue;
            const before = merged[key];
            merged[key] =
                key === "style" && before != null && value != null
                    ? {
                          ...StyleSheet.flatten(before as StyleProp<ViewStyle>),
                          ...StyleSheet.flatten(value as StyleProp<ViewStyle>),
                      }
                    : key.startsWith("on") &&
                        typeof before === "function" &&
                        typeof value === "function"
                      ? compose(before as Handler, value as Handler)
                      : value;
        }
        return merged;
    });

const compose = (own: Handler, user: Handler): Handler =>
    cached(composed, own, user, () => (...args: never[]) => {
        own(...args);
        return user(...args);
    });

const styleOver = <S>(base: S, extra: unknown): S => {
    if (extra == null || extra === false) return base;
    const extraKey =
        typeof extra === "object"
            ? extra
            : StyleSheet.flatten(extra as StyleProp<ViewStyle>);
    if (!extraKey) return base;
    const before = base ?? EMPTY;
    const key =
        typeof before === "object"
            ? before
            : (StyleSheet.flatten(before as StyleProp<ViewStyle>) ?? EMPTY);
    return cached(styles, key, extraKey, () => ({
        ...StyleSheet.flatten(base as StyleProp<ViewStyle>),
        ...StyleSheet.flatten(extra as StyleProp<ViewStyle>),
    })) as S;
};

/** A component's parts, customized by the user's keyed `style` and `slotProps`. A repeated part's
 *  copy passes what it is (`instance`), which a function of the copy is called with; build it only
 *  when `each(part)` says one was passed. */
export interface PartSlots {
    /** The user's props for `part`, to spread first on its element, so what the component sets
     *  after wins. The same object while `slotProps` is. */
    readonly props: (part: string, instance?: unknown) => object;
    /** `own` (the part's own style) with the user's style for `part` over it; `own` itself when
     *  there's none. */
    readonly style: <S>(part: string, own: S, instance?: unknown) => S;
    /** A handler the component sets on `part`, run before the user's own of that name; `own`
     *  itself when the user has none. */
    readonly on: <F>(
        part: string,
        name: string,
        own: F,
        instance?: unknown,
    ) => F;
    /** Props the component spreads on `part` (its press handlers), with the user's handlers of
     *  the same names composed after its own; `own` itself when the user has none. */
    readonly with: <O>(part: string, own: O, instance?: unknown) => O;
    /** Whether a function of the copy was passed for this repeated part, so its copy is needed. */
    readonly each: (part: string) => boolean;
}

const never = () => false;

const plain: PartSlots = {
    props: () => EMPTY,
    style: (_part, own) => own,
    on: (_part, _name, own) => own,
    with: (_part, own) => own,
    each: never,
};

const same = (part: string) => part;

const build = (
    style: Dict,
    slotProps: Dict,
    keyOf: (part: string) => string,
    provided: Dict,
    component: string | undefined,
): PartSlots => {
    const warnOwned = (
        part: string,
        source: Dict | undefined,
        from: string,
    ) => {
        if (!isDev) return;
        const dropped = ownedKeysIn(source, isOwnedKey);
        if (dropped.length > 0)
            warnOnce(
                ownedKeysMessage(component ?? "component", part, dropped, from),
            );
    };
    const userProps = (part: string, instance?: unknown) => {
        const own =
            (createSlotReader(keyOf(part), () => instance)(slotProps) as
                | Dict
                | undefined) ?? EMPTY;
        const defaults = provided[keyOf(part)] as Dict | undefined;
        warnOwned(part, defaults, "the provider's slotProps");
        warnOwned(part, own, "slotProps");
        return defaults
            ? own === EMPTY
                ? defaults
                : mergeNativePartProps(defaults, own)
            : own;
    };
    const keyed = [style, slotProps];
    return {
        props: userProps,
        each: (part) => isPerInstance(keyed, keyOf(part)),
        style: (part, own, instance) => {
            const user = createSlotReader(keyOf(part), () => instance)(style);
            const defaults = (provided[keyOf(part)] as Dict | undefined)?.[
                "style"
            ];
            return styleOver(styleOver(own, defaults), user);
        },
        on: (part, name, own, instance) => {
            const user = userProps(part, instance)[name];
            if (!isHandler(name, user)) return own;
            // A handler the component doesn't set this time is the user's alone.
            if (typeof own !== "function") return (own ?? user) as typeof own;
            return compose(own as Handler, user) as typeof own;
        },
        with: (part, own, instance) => {
            const user = userProps(part, instance);
            if (user === EMPTY || own == null) return own;
            const base = own as Dict;
            let any = false;
            for (const key in base) {
                if (
                    isHandler(key, user[key]) &&
                    typeof base[key] === "function"
                )
                    any = true;
            }
            if (!any) return own;
            return cached(spreads, base, user, () => {
                const merged: Record<string, unknown> = { ...base };
                for (const key in base) {
                    const value = base[key];
                    const theirs = user[key];
                    if (typeof value === "function" && isHandler(key, theirs))
                        merged[key] = compose(value as Handler, theirs);
                }
                return merged;
            }) as typeof own;
        },
    } satisfies PartSlots as PartSlots;
};

const built = new WeakMap<
    object,
    WeakMap<
        (part: string) => string,
        WeakMap<object, WeakMap<object, PartSlots>>
    >
>();

/** A ready-made's parts customized by its `style` and `slotProps`: the same object while they
 *  stay the same, and a plain one, which changes nothing, when neither is given. Not a hook: any
 *  render function may call it. */
export const nativeSlots = (
    props:
        | {
              readonly style?: object | undefined;
              readonly slotProps?: object | undefined;
          }
        | undefined,
    keyOf: (part: string) => string = same,
    provided: object = EMPTY,
    component?: string,
): PartSlots => {
    const style = props?.style as Dict | undefined;
    const slotProps = props?.slotProps as Dict | undefined;
    if (
        !style &&
        !slotProps &&
        (provided === EMPTY || Object.keys(provided).length === 0)
    )
        return plain;
    let byKey = built.get(provided);
    if (!byKey) built.set(provided, (byKey = new WeakMap()));
    let cache = byKey.get(keyOf);
    if (!cache) byKey.set(keyOf, (cache = pairCache<PartSlots>()));
    return cached(cache, style ?? EMPTY, slotProps ?? EMPTY, () =>
        build(
            style ?? EMPTY,
            slotProps ?? EMPTY,
            keyOf,
            provided as Dict,
            component,
        ),
    );
};

/** Read provider defaults once, unconditionally in the component owner. The returned pure
 *  reader may also be used in callbacks and for composed children. Provider keys are anatomy part
 *  names, as an instance's keyed props are; a component addresses its parts by preset slot, and
 *  `keyOf` translates a slot to the part both read. */
export const useNativeSlotReader = (
    name: ComponentName,
): typeof nativeSlots => {
    const provided = usePureform().slotProps[name] ?? EMPTY;
    return useMemo(
        () => (props, keyOf) => nativeSlots(props, keyOf, provided, name),
        [provided, name],
    );
};

/** An overlay's parts named as the web names them, from the slot each draws: the surface (the
 *  preset's `root` slot) is `content`, a sheet's `content` slot its `body`. Pass it to
 *  `nativeSlots` and use it for test ids, so one key reaches the same element on every
 *  renderer. The same function for the same anatomy. */
export const overlayKeys = (
    anatomy: ComponentAnatomy,
): ((slot: string) => string) => {
    let keyOf = overlayKeyCache.get(anatomy);
    if (!keyOf) {
        const bySlot = new Map<string, string>();
        for (const name of anatomy.partNames) {
            const part = anatomy.parts[name] as {
                readonly slot?: string | null;
            };
            if (typeof part.slot === "string") bySlot.set(part.slot, name);
        }
        for (const name of anatomy.partNames) {
            const part = anatomy.parts[name] as {
                readonly slot?: string | null;
            };
            if (part.slot === undefined && !bySlot.has(name))
                bySlot.set(name, name);
        }
        const map = bySlot;
        keyOf = (slot: string) => map.get(slot) ?? slot;
        overlayKeyCache.set(anatomy, keyOf);
    }
    return keyOf;
};

const overlayKeyCache = new WeakMap<object, (slot: string) => string>();

const unselectables = new WeakMap<object, object>();

/** A pressable part's own style, which a drag doesn't select: the same object for the same
 *  style. */
export const withUnselectable = <S>(own: S): S => {
    if (own == null) return unselectable as S;
    let value = unselectables.get(own as object);
    if (!value)
        unselectables.set(
            own as object,
            (value = { ...(own as object), ...unselectable }),
        );
    return value as S;
};

/** A dialog's or sheet's scrim, customized by the owner's `backdrop` key: pass it to
 *  `nativeSlots` with the owner's props for the scrim's `slot`. */
export const backdropKeys = (part: string): string =>
    part === "root" ? "backdrop" : part;

const scrimKeys = (part: string): string => (part === "root" ? "scrim" : part);

/** The reader for a scrim an `owner` draws (a dialog's or a sheet's backdrop, the rail's scrim):
 *  the provider's props for every scrim (`scrim.root`), then the owner's own, under the part name
 *  the owner's instance props use (`backdrop`, or `scrim`). Unlike `useNativeSlotReader`, which
 *  reads one component's key. */
export const useNativeScrimSlots = (
    owner: ComponentName,
    part: "backdrop" | "scrim" = "backdrop",
): ((
    props:
        | {
              readonly style?: object | undefined;
              readonly slotProps?: object | undefined;
          }
        | undefined,
) => PartSlots) => {
    const provided = usePureform().slotProps as Readonly<
        Record<string, Readonly<Record<string, Dict | undefined>> | undefined>
    >;
    const shared = provided["scrim"]?.["root"];
    const own = provided[owner]?.[part];
    return useMemo(() => {
        const merged =
            shared && own ? mergeNativePartProps(shared, own) : (own ?? shared);
        const keyed = merged ? { [part]: merged } : EMPTY;
        const keyOf = part === "backdrop" ? backdropKeys : scrimKeys;
        return (props) => nativeSlots(props, keyOf, keyed, owner);
    }, [shared, own, part, owner]);
};
