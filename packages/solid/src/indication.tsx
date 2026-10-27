// Indication in Solid: the provider's default and each component's `indication` prop resolve to
// the indication a component shows; `useComponent` wires it into the parts its anatomy names
// (the layer inside the surface, the effect after mount, and the hover and press forwarded from
// another origin). Apps get the same for their own surfaces with `useIndication`, and share or
// observe a component's interactions with `createInteractionSource` and `useInteractionState`.

import type { IndicationAnatomy } from "@pureform/anatomy";
import { resolveReducedMotion, warnOnce } from "@pureform/binding-core";
import type { PartStates } from "@pureform/binding-core";
import {
    droppedFocusIndicatorMessage,
    dropsFocusIndicator,
} from "@pureform/binding-core/indication";
import {
    createInteractionSource as createSource,
    IDLE_INTERACTION_STATE,
} from "@pureform/binding-core/interaction";
import type {
    InteractionSource,
    InteractionState,
    MutableInteractionSource,
} from "@pureform/binding-core/interaction";
import { systemReducedMotion } from "@pureform/binding-web";
import type { Indication } from "@pureform/binding-web/indication";
import {
    DEFAULT_INDICATION,
    holdsLayer,
    IndicationHost,
    NOT_FORWARDED,
    rippleClasses,
} from "@pureform/binding-web/indication";
import type {
    ForwardedStates,
    IndicationRole,
} from "@pureform/binding-web/indication";
import {
    InteractionEmitter,
    pressableItemProps,
} from "@pureform/machines/interaction";
import { isDev, isServer } from "@solidjs/web";
import type { JSX } from "@solidjs/web";
import {
    type Accessor,
    createEffect,
    createMemo,
    createSignal,
    onCleanup,
    Show,
    untrack,
} from "solid-js";

import { normalizeProps } from "./internal/zag";
import { usePureform } from "./provider";
import type { PureformState } from "./provider";

/** A stable interaction source, to share between components (`interactionSource={source}`),
 *  observe with `useInteractionState`, or emit to. Call it once, in a component's setup. */
export const createInteractionSource = (): MutableInteractionSource =>
    createSource();

/** What a source's interactions add up to, following each change: hovered, focused, pressed,
 *  dragged. Idle on the server. */
export function useInteractionState(
    source: InteractionSource,
): Accessor<InteractionState> {
    // The same nodes on the server, where nothing emits, so hydration finds them.
    const [state, setState] = createSignal(
        isServer ? IDLE_INTERACTION_STATE : source.state,
        { ownedWrite: true },
    );
    createEffect(
        () => source,
        (current) => {
            setState(current.state);
            return current.subscribe((_, next) => setState(next));
        },
    );
    return state;
}

const checked = new WeakSet<Indication>();

// Warns once in development when an indication hides the focus indicator.
const check = (indication: Indication): Indication => {
    if (isDev && !checked.has(indication)) {
        checked.add(indication);
        if (dropsFocusIndicator(indication)) {
            warnOnce(droppedFocusIndicatorMessage(indication));
        }
    }
    return indication;
};

/** The indication in effect: the component's own, else the nearest provider's, else Material's. */
export const resolveIndication = (
    own: Indication | undefined,
    state: PureformState,
): Indication => check(own ?? state.indication ?? DEFAULT_INDICATION);

/** What a component's parts share to show its indication. */
export interface IndicationScope {
    readonly host: IndicationHost;
    readonly entries: readonly IndicationAnatomy[];
    /** The indication in effect. */
    readonly indication: Accessor<Indication>;
    /** Whether the component is interactive now; a card or list item only with an action. */
    readonly interactive: Accessor<boolean>;
    /** Whether an entry, by index, shows now, while the component is interactive. */
    readonly entryActive: (entry: number) => boolean;
    /** The component's own source, for the parts that don't pass an item's. */
    readonly source: Accessor<InteractionSource | undefined>;
}

/** Makes a component's indication scope; `indication` is its prop. */
export function createIndicationScope(
    entries: readonly IndicationAnatomy[],
    options: {
        readonly indication?: Accessor<Indication | undefined> | undefined;
        readonly interactive?: Accessor<boolean> | undefined;
        readonly entryActive?:
            | ((entry: IndicationAnatomy) => boolean)
            | undefined;
        readonly source?: Accessor<InteractionSource | undefined> | undefined;
    },
): IndicationScope {
    const state = usePureform();
    const indication = createMemo(() =>
        resolveIndication(options.indication?.(), state()),
    );
    const host = new IndicationHost(entries, {
        reducedMotion: () =>
            resolveReducedMotion(
                untrack(() => state().motion),
                systemReducedMotion(),
            ),
        dir: () => untrack(() => state().dir),
    });
    createEffect(
        () => [indication(), state().registry] as const,
        ([current, registry]) => host.configure(current, registry),
    );
    return {
        host,
        entries,
        indication,
        interactive: options.interactive ?? (() => true),
        entryActive: (index) => {
            const entry = entries[index];
            return !entry || !options.entryActive || options.entryActive(entry);
        },
        source: options.source ?? (() => undefined),
    };
}

/** The layer's attributes: hidden from assistive technology, and marked for the ripple. It's
 *  styled as the ripple's root, but isn't a part of the component, so it carries no
 *  `data-pf-part`. */
const LAYER_ATTRIBUTES = {
    "aria-hidden": "true",
    "data-ripple-layer": "",
} as const;

/** A part's indication: its states with what's forwarded to it, and the layer it holds. */
export interface PartIndication {
    /** The part's states, with a forwarded hover or press added. */
    states(own: PartStates | undefined): PartStates | undefined;
    /** The layer to render first inside the part, when it's a surface and the indication draws
     *  in one. */
    readonly layer: JSX.Element;
}

/** Ties a part to its component's indication, for the roles it has there. Call it from the
 *  part's render with its element, once mounted. */
export function usePartIndication(
    scope: IndicationScope,
    roles: readonly { readonly entry: number; readonly role: IndicationRole }[],
    source: Accessor<InteractionSource | undefined>,
    element: Accessor<Element | undefined>,
    unstyled: Accessor<boolean>,
): PartIndication {
    const state = usePureform();
    // The roles holding the layer: a surface's, or the part an entry names to hold it.
    const holding = roles.filter(({ entry, role }) =>
        holdsLayer(scope.entries[entry], role),
    );
    const shows = roles.some(({ role }) => role === "state");
    const [forwarded, setForwarded] = createSignal<ForwardedStates>(
        NOT_FORWARDED,
        { ownedWrite: true },
    );
    // Created on the server too, where it doesn't run, so hydration finds the same nodes. The
    // layer isn't tracked: the indication finds it in the surface when it draws.
    createEffect(
        () =>
            [
                scope.interactive() ? source() : undefined,
                element() as HTMLElement | undefined,
                roles.filter(({ entry }) => scope.entryActive(entry)),
            ] as const,
        ([current, el, active]) => {
            if (!current || !el || active.length === 0) return;
            const cleanups = active.map(({ entry, role }) =>
                scope.host.instance(entry, current).attach(role, el),
            );
            const stated = active.find(({ role }) => role === "state");
            if (stated) {
                cleanups.push(
                    scope.host
                        .instance(stated.entry, current)
                        .subscribeForwarded(setForwarded),
                );
            }
            return () => {
                for (const cleanup of cleanups) cleanup();
                setForwarded(NOT_FORWARDED);
            };
        },
    );
    const layerClass = () =>
        unstyled() ? undefined : rippleClasses(state().registry)?.root?.class;
    // A call in `when`, which the compiler doesn't wrap in a memo of its own.
    const layered = () =>
        scope.interactive() &&
        !!scope.indication().layer &&
        holding.some(({ entry }) => scope.entryActive(entry));
    return {
        states: (own) => (shows ? withForwarded(own, forwarded()) : own),
        layer:
            holding.length > 0 ? (
                <Show when={layered()}>
                    <span class={layerClass()} {...LAYER_ATTRIBUTES} />
                </Show>
            ) : undefined,
    };
}

/** A part's states with a forwarded hover or press added. */
const withForwarded = (
    own: PartStates | undefined,
    forwarded: ForwardedStates,
): PartStates | undefined => {
    if (!forwarded.hover && !forwarded.pressed) return own;
    return {
        ...own,
        ...(forwarded.hover ? { hover: true } : {}),
        ...(forwarded.pressed ? { pressed: true } : {}),
    };
};

/** What `useIndication` takes. */
export interface UseIndicationOptions {
    /** Ripple from the surface's center rather than where it was pressed. */
    readonly centered?: boolean | undefined;
}

/** The props `useIndication` gives an app's surface: its ref, its handlers, and the forwarded
 *  hover and press. */
export type SurfaceProps = Omit<JSX.HTMLAttributes<HTMLElement>, "ref"> & {
    readonly ref: (element: HTMLElement) => void;
};

/** What `useIndication` gives an app's own surface. */
export interface SurfaceIndication {
    /** Spread on the surface: its ref, the handlers that emit its presses, hover, and focus to
     *  the source, and the hover and press forwarded from elsewhere. Give the surface
     *  `position: relative`, and style its states (`:hover`, `[data-pf-hover]`, …). */
    readonly surface: SurfaceProps;
    /** Render it first inside the surface: the layer the ripple draws in, when the indication
     *  has one. */
    readonly layer: JSX.Element;
}

const SURFACE_ENTRIES: readonly IndicationAnatomy[] = [
    {
        trigger: "surface",
        surface: "surface",
        centered: false,
        focus: "surface",
    },
];
const CENTERED_ENTRIES: readonly IndicationAnatomy[] = [
    {
        trigger: "surface",
        surface: "surface",
        centered: true,
        focus: "surface",
    },
];
const SURFACE_ROLES = [
    { entry: 0, role: "trigger" },
    { entry: 0, role: "surface" },
    { entry: 0, role: "state" },
] as const;

/** The provider's indication on an app's own clickable element: presses, hover, and focus on the
 *  surface emit to `source`, the ripple draws in the layer, and a hover or press emitted from
 *  elsewhere marks the surface (`data-pf-hover`, `data-pf-active`). */
export function useIndication(
    source: MutableInteractionSource,
    options: UseIndicationOptions = {},
): SurfaceIndication {
    const scope = createIndicationScope(
        options.centered ? CENTERED_ENTRIES : SURFACE_ENTRIES,
        { source: () => source },
    );
    const [element, setElement] = createSignal<Element | undefined>(undefined, {
        ownedWrite: true,
    });
    const part = usePartIndication(
        scope,
        SURFACE_ROLES,
        () => source,
        element,
        () => false,
    );
    const emitter = new InteractionEmitter(() => source);
    onCleanup(() => emitter.end(untrack(element)));
    const handlers = pressableItemProps(
        {},
        emitter,
        false,
        normalizeProps,
    ) as JSX.HTMLAttributes<HTMLElement>;
    const states = createMemo(() => part.states(undefined));
    const surface = {
        ...handlers,
        ref: (el: HTMLElement) => setElement(el),
        get "data-pf-hover"() {
            return states()?.hover ? "" : undefined;
        },
        get "data-pf-active"() {
            return states()?.pressed ? "" : undefined;
        },
    } as SurfaceProps;
    return { surface, layer: part.layer };
}
