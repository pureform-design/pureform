// Indication in React: the provider's default and each component's `indication` prop resolve to
// the indication a component shows; `useComponent` wires it into the parts its anatomy names
// (the layer inside the surface, the effect after mount, and the hover and press forwarded from
// another origin). Apps get the same for their own surfaces with `useIndication`, and share or
// observe a component's interactions with `useInteractionSource` and `useInteractionState`.

import type { IndicationAnatomy } from "@pureform/anatomy";
import { resolveReducedMotion, warnOnce } from "@pureform/binding-core";
import type { PartStates } from "@pureform/binding-core";
import {
    droppedFocusIndicatorMessage,
    dropsFocusIndicator,
} from "@pureform/binding-core/indication";
import {
    createInteractionSource,
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
import { normalizeProps } from "@zag-js/react";
import {
    type DOMAttributes,
    type ReactElement,
    type RefCallback,
    useCallback,
    useEffect,
    useMemo,
    useRef,
    useState,
    useSyncExternalStore,
} from "react";

import { isDev } from "./env";
import { useComponentState } from "./provider";
import type { ComponentState } from "./provider";

/** A stable interaction source, the same on every render: share it between components
 *  (`interactionSource={source}`), observe it with `useInteractionState`, or emit to it. */
export function useInteractionSource(): MutableInteractionSource {
    return useState(createInteractionSource)[0];
}

/** What a source's interactions add up to, following each change: hovered, focused, pressed,
 *  dragged. Idle on the server and while hydrating. */
export function useInteractionState(
    source: InteractionSource,
): InteractionState {
    const subscribe = useCallback(
        (onChange: () => void) => source.subscribe(() => onChange()),
        [source],
    );
    return useSyncExternalStore(
        subscribe,
        () => source.state,
        () => IDLE_INTERACTION_STATE,
    );
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
    state: ComponentState,
): Indication => check(own ?? state.indication ?? DEFAULT_INDICATION);

/** What a component's parts share to show its indication. */
export interface IndicationScope {
    readonly host: IndicationHost;
    readonly entries: readonly IndicationAnatomy[];
    /** The indication in effect. */
    readonly indication: Indication;
    /** Whether the component is interactive now; a card or list item only with an action. */
    readonly interactive: boolean;
    /** Whether an entry, by index, shows now, while the component is interactive. */
    readonly entryActive: (entry: number) => boolean;
    /** The component's own source, for the parts that don't pass an item's. */
    readonly source: InteractionSource | undefined;
    /** The ripple's layer class, from the registry. */
    readonly layerClass: string | undefined;
}

/** A component's indication scope; `indication` is its prop. */
export function useIndicationScope(
    entries: readonly IndicationAnatomy[],
    options: {
        readonly indication?: Indication | undefined;
        readonly interactive?: boolean | undefined;
        readonly entryActive?:
            | ((entry: IndicationAnatomy) => boolean)
            | undefined;
        readonly source?: InteractionSource | undefined;
    },
): IndicationScope {
    const state = useComponentState();
    const indication = resolveIndication(options.indication, state);
    const latest = useRef(state);
    // oxlint-disable-next-line react/refs -- the latest value for callbacks that run after render, not read while rendering
    latest.current = state;
    const [host] = useState(
        // oxlint-disable-next-line react/refs -- the callback reads the ref when it runs, after render
        () =>
            new IndicationHost(entries, {
                reducedMotion: () =>
                    resolveReducedMotion(
                        latest.current.motion,
                        systemReducedMotion(),
                    ),
                dir: () => latest.current.dir,
            }),
    );
    const { registry } = state;
    useEffect(() => {
        host.configure(indication, registry);
    }, [host, indication, registry]);
    return {
        host,
        entries,
        indication,
        interactive: options.interactive ?? true,
        entryActive: (index) => {
            const entry = entries[index];
            return !entry || !options.entryActive || options.entryActive(entry);
        },
        source: options.source,
        layerClass: rippleClasses(registry)?.root?.class,
    };
}

/** A part's place in its component's indication, for `PartElement`. */
export interface PartIndication {
    readonly scope: IndicationScope;
    readonly roles: readonly {
        readonly entry: number;
        readonly role: IndicationRole;
    }[];
    readonly source: InteractionSource | undefined;
    /** Whether the part is unstyled, which leaves its layer unstyled too. */
    readonly unstyled: boolean;
}

/** The layer's attributes: hidden from assistive technology, and marked for the ripple. It's
 *  styled as the ripple's root, but isn't a part of the component, so it carries no
 *  `data-pf-part`. */
const LAYER_ATTRIBUTES = {
    "aria-hidden": "true",
    "data-ripple-layer": "",
} as const;

/** Ties a part to its component's indication: the ref that attaches its element as it mounts
 *  (a ref rather than state, so the part doesn't render again once it knows its element), what's
 *  forwarded to it, and the layer it holds when it's a surface. */
export function usePartIndication(part: PartIndication | undefined): {
    readonly ref: RefCallback<HTMLElement>;
    readonly forwarded: ForwardedStates;
    readonly layer: ReactElement | null;
} {
    const [forwarded, setForwarded] = useState(NOT_FORWARDED);
    const host = part?.scope.host;
    const source = part?.scope.interactive ? part.source : undefined;
    // The roles of the entries that show now, the same list while they don't change.
    const active = part?.roles.filter(({ entry }) =>
        part.scope.entryActive(entry),
    );
    const activeKey = active
        ?.map(({ entry, role }) => `${entry}:${role}`)
        .join();
    // oxlint-disable-next-line react-hooks/exhaustive-deps -- keyed by the contents' key on purpose, not the array's identity
    const roles = useMemo(() => active, [part?.roles, activeKey]);
    const ref = useCallback(
        (element: HTMLElement | null) => {
            if (!host || !roles?.length || !source || !element) return;
            const cleanups = roles.map(({ entry, role }) =>
                host.instance(entry, source).attach(role, element),
            );
            for (const { entry, role } of roles) {
                if (role === "state") {
                    cleanups.push(
                        host
                            .instance(entry, source)
                            .subscribeForwarded(setForwarded),
                    );
                }
            }
            return () => {
                for (const cleanup of cleanups) cleanup();
                setForwarded(NOT_FORWARDED);
            };
        },
        [host, roles, source],
    );
    const holds =
        roles?.some(({ entry, role }) =>
            holdsLayer(part?.scope.entries[entry], role),
        ) ?? false;
    return {
        ref,
        forwarded,
        // The layer isn't tracked: the indication finds it in the surface when it draws.
        layer:
            part &&
            holds &&
            part.scope.interactive &&
            part.scope.indication.layer ? (
                <span
                    className={
                        part.unstyled ? undefined : part.scope.layerClass
                    }
                    {...LAYER_ATTRIBUTES}
                />
            ) : null,
    };
}

/** A part's props with a forwarded hover or press marked. */
export const withForwarded = <P extends object>(
    props: P,
    forwarded: ForwardedStates,
): P => {
    if (!forwarded.hover && !forwarded.pressed) return props;
    return {
        ...props,
        ...(forwarded.hover ? { "data-pf-hover": "" } : {}),
        ...(forwarded.pressed ? { "data-pf-active": "" } : {}),
    };
};

/** A part's states with a forwarded hover or press added. */
export const forwardedStates = (
    own: PartStates | undefined,
    forwarded: ForwardedStates,
): PartStates | undefined =>
    !forwarded.hover && !forwarded.pressed
        ? own
        : {
              ...own,
              ...(forwarded.hover ? { hover: true } : {}),
              ...(forwarded.pressed ? { pressed: true } : {}),
          };

/** What `useIndication` takes. */
export interface UseIndicationOptions {
    /** Ripple from the surface's center rather than where it was pressed. */
    readonly centered?: boolean | undefined;
}

/** The props `useIndication` gives an app's surface: its ref, the handlers that emit its
 *  interactions, and the forwarded hover and press. */
export type SurfaceProps = DOMAttributes<HTMLElement> & {
    readonly ref: RefCallback<HTMLElement>;
    readonly "data-pf-hover"?: "" | undefined;
    readonly "data-pf-active"?: "" | undefined;
};

/** What `useIndication` gives an app's own surface. */
export interface SurfaceIndication {
    /** Spread on the surface: its ref, the handlers that emit its presses, hover, and focus to
     *  the source, and the hover and press forwarded from elsewhere. Give the surface
     *  `position: relative`, and style its states (`:hover`, `[data-pf-hover]`, …). */
    readonly surface: SurfaceProps;
    /** Render it first inside the surface: the layer the ripple draws in, when the indication
     *  has one. */
    readonly layer: ReactElement | null;
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
    const scope = useIndicationScope(
        options.centered ? CENTERED_ENTRIES : SURFACE_ENTRIES,
        { source },
    );
    const { ref, forwarded, layer } = usePartIndication({
        scope,
        roles: SURFACE_ROLES,
        source,
        unstyled: false,
    });
    const latest = useRef(source);
    // oxlint-disable-next-line react/refs -- the latest value for callbacks that run after render, not read while rendering
    latest.current = source;
    const [emitter] = useState(
        // oxlint-disable-next-line react/refs -- the callback reads the ref when it runs, after render
        () => new InteractionEmitter(() => latest.current),
    );
    useEffect(() => () => emitter.end(), [emitter]);
    const handlers = pressableItemProps(
        {},
        emitter,
        false,
        normalizeProps,
    ) as DOMAttributes<HTMLElement>;
    return {
        surface: withForwarded({ ...handlers, ref }, forwarded),
        layer,
    };
}
