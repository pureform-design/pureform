// Indication on React Native: the provider's default and each component's `indication` prop
// resolve to the indication a component shows. Its tokens join the selection (theme-level ones in
// the provider's overrides, the prop's as instance tokens), and its native half renders inside
// the anatomy's surface, drawing from the component's interaction source. Material's native half
// is the engine's press ripple; apps get the same on their own surfaces with `useIndication`.

import type { IndicationAnatomy } from "@pureform/anatomy";
import { requireRegistry, warnOnce } from "@pureform/binding-core";
import {
    materialIndication as webMaterialIndication,
    droppedFocusIndicatorMessage,
    dropsFocusIndicator,
} from "@pureform/binding-core/indication";
import type {
    Indication,
    MaterialIndicationOptions,
    NativeIndicationProps,
    NativeIndicationSurface,
} from "@pureform/binding-core/indication";
import type {
    InteractionSource,
    InteractionState,
    MutableInteractionSource,
} from "@pureform/binding-core/interaction";
import type { Drawing, Selected, State } from "@pureform/rn-adapter/factory";
import { useReducedMotion, useTokens } from "@pureform/rn-adapter/react";
import type { TokenValue } from "@pureform/styling";
import { createElement, useEffect, useRef } from "react";
import type { ComponentType, ReactElement, ReactNode } from "react";

import { isDev } from "./env";
import {
    instanceIndicationTokens,
    withIndicationTokens,
} from "./indication-tokens";
import {
    interactionStates,
    useInteraction,
    useNativeInteraction,
} from "./interaction";
import type { NativeInteraction, PressableHandlers } from "./interaction";
import { withEngine } from "./parts";
import { useEngine, usePureform } from "./provider";
import type { PureformState } from "./provider";
import { colorText } from "./styles";

// Material's ripple: the engine's press ripples in the surface's content color (the theme's
// `onSurface` where the surface sets none) and corners, clipped to the shape it draws, from each
// press the source hears, whichever surface it came from.
function MaterialRippleImpl(props: NativeIndicationProps): ReactNode {
    const engine = useEngine();
    const tokens = useTokens();
    const style = props.surface.style;
    const radius = style["borderRadius"];
    const ripples = engine.useRipple({
        clip: props.surface.drawing as Drawing | undefined,
        color:
            colorText(style["color"]) ??
            colorText(tokens["colors.onSurface"]) ??
            "rgb(0, 0, 0)",
        ...(typeof radius === "number" || typeof radius === "string"
            ? { radius }
            : {}),
        ...(props.centered ? { centered: true } : {}),
    });
    const latest = useRef(ripples);
    // oxlint-disable-next-line react/refs -- the latest value for callbacks and gestures that run after render
    latest.current = ripples;
    useEffect(() => {
        const held = new Set<number>();
        return props.source.subscribe((interaction) => {
            switch (interaction.type) {
                case "press": {
                    held.add(interaction.id);
                    const { origin } = interaction;
                    // A press from the center has no point, which the ripple centers.
                    latest.current.handlers.onPressIn({
                        nativeEvent:
                            origin === "center"
                                ? {}
                                : { pageX: origin.x, pageY: origin.y },
                    });
                    return;
                }
                case "release":
                case "cancel":
                    if (held.delete(interaction.id)) {
                        latest.current.handlers.onPressOut();
                    }
                    return;
            }
        });
    }, [props.source]);
    return ripples.layer;
}

/** Material's ripple on React Native, starting over when the provider's engine changes. */
const MaterialRipple = withEngine(MaterialRippleImpl, "MaterialRipple");

const natives = new Map<Indication, Indication>();

// Binding-core's Material indication with React Native's half added, the same object each time.
const withNativeRipple = (web: Indication): Indication => {
    if (!web.layer) return web;
    let indication = natives.get(web);
    if (!indication) {
        indication = Object.freeze({ ...web, native: MaterialRipple });
        natives.set(web, indication);
    }
    return indication;
};

/** Material's indication, the default: the state layer at the theme's opacities, the motion
 *  engine's press ripple inside each surface, and the focus indicator. Named as on the web
 *  (`"material"`, `"material:ink-sparkle"`, `"material:no-ripple"`), and the same object for the
 *  same options. React Native draws the ink well for `"ink-sparkle"` too. */
export const materialIndication = (
    options: MaterialIndicationOptions = {},
): Indication => withNativeRipple(webMaterialIndication(options));

/** The indication with no provider or component choosing one: Material's, with the ink well. */
export const DEFAULT_INDICATION: Indication = materialIndication();

const isWebMaterial = (indication: Indication): boolean =>
    indication === webMaterialIndication() ||
    indication === webMaterialIndication({ ripple: "ink-sparkle" });

/** An indication with its native half: binding-core's Material indications (which have only the
 *  web's) become React Native's; any other is as given. */
export const nativeIndication = (indication: Indication): Indication =>
    isWebMaterial(indication) ? withNativeRipple(indication) : indication;

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
    state: Pick<PureformState, "indication">,
): Indication => {
    return check(
        nativeIndication(own ?? state.indication ?? DEFAULT_INDICATION),
    );
};

/** A surface's style and drawing from a component's plain selection, for its native indication. */
export const surfaceOf = (
    selected: Selected,
    slot: string,
): NativeIndicationSurface => {
    const drawing = selected.drawings[slot];
    return {
        style: (selected.styles[slot] ?? {}) as Readonly<
            Record<string, unknown>
        >,
        ...(drawing === undefined ? {} : { drawing }),
    };
};

/** Renders an indication's native half inside a surface; nothing for one without. */
export function IndicationLayer(props: {
    readonly indication: Indication;
    readonly source: InteractionSource;
    readonly surface: NativeIndicationSurface;
    readonly centered: boolean;
}): ReactNode {
    const state = usePureform();
    const reducedMotion = useReducedMotion();
    const Native = props.indication.native as
        | ComponentType<NativeIndicationProps>
        | undefined;
    if (!Native) return null;
    return createElement(Native, {
        source: props.source,
        surface: props.surface,
        centered: props.centered,
        reducedMotion,
        dir: state.dir,
        registry: requireRegistry(state),
    });
}

/** What a component's interactive surface shows its indication with. */
export interface SurfaceIndicationScope {
    /** The surface's source: the app's, else the component's own. */
    readonly source: MutableInteractionSource;
    /** What emits the surface's interactions to its source. */
    readonly interaction: NativeInteraction;
    /** The callbacks to spread on the surface's `Pressable`. */
    readonly handlers: PressableHandlers;
    /** The indication in effect. */
    readonly indication: Indication;
    /** Whether the surface is interactive now; a card or list item only with an action. */
    readonly interactive: boolean;
    /** What the source's interactions add up to; idle while disabled or not interactive. */
    readonly state: InteractionState;
    /** The component's states for its selection: its own, and its source's. */
    states(
        own?: Omit<
            State,
            "pressed" | "hover" | "focus" | "focusVisible" | "active"
        >,
    ): State;
    /** A selection with the indication's instance tokens under its own. */
    select<S extends object>(selection: S): S;
    /** The indication's native half, to render last inside the anatomy's surface. */
    layer(selected: Selected): ReactNode;
}

/** A component surface's indication, for its anatomy `entry`: its source and handlers, the
 *  indication in effect (`indication`, its prop, over the provider's), its tokens, and its layer. */
export function useSurfaceIndication(
    entry: IndicationAnatomy,
    options: {
        readonly indication?: Indication | undefined;
        readonly interactionSource?: MutableInteractionSource | undefined;
        readonly disabled?: boolean | undefined;
        readonly interactive?: boolean | undefined;
    },
): SurfaceIndicationScope {
    const state = usePureform();
    const interactive = options.interactive ?? true;
    const {
        source,
        interaction,
        state: interactionState,
    } = useInteraction(
        options.interactionSource,
        (options.disabled ?? false) || !interactive,
    );
    const indication = resolveIndication(options.indication, state);
    const tokens: Readonly<Record<string, TokenValue>> | undefined = interactive
        ? instanceIndicationTokens(
              options.indication,
              state.focusIndicatorColor,
          )
        : undefined;
    return {
        source,
        interaction,
        handlers: interaction.handlers,
        indication,
        interactive,
        state: interactionState,
        states: (own) => interactionStates(interactionState, own),
        select: (selection) => withIndicationTokens(selection, tokens),
        layer: (selected) =>
            interactive ? (
                <IndicationLayer
                    indication={indication}
                    source={source}
                    surface={surfaceOf(selected, entry.surface)}
                    centered={entry.centered}
                />
            ) : null,
    };
}

/** What `useIndication` takes. */
export interface UseIndicationOptions {
    /** Ripple from the surface's center rather than where it was pressed. */
    readonly centered?: boolean | undefined;
    /** The surface's style: its `color` colors the ripple and its `borderRadius` rounds it. */
    readonly style?: Readonly<Record<string, unknown>> | undefined;
    /** The shape the surface draws, for a ripple that clips to it (an SVG engine's drawing). */
    readonly drawing?: unknown;
}

/** What `useIndication` gives an app's own surface. */
export interface SurfaceIndication {
    /** Spread on the surface's `Pressable`: the callbacks that emit its presses, hover, and focus
     *  to the source. */
    readonly surface: PressableHandlers;
    /** Render it last inside the surface: the indication's native half, when it has one. Give the
     *  surface `overflow: "hidden"` or corners for the ripple to stay inside. */
    readonly layer: ReactElement | null;
}

/** The provider's indication on an app's own pressable: presses, hover, and focus on the surface
 *  emit to `source`, and the ripple draws in the layer from every press the source hears. Read
 *  the source's state with `useInteractionState` to style the surface's states. */
export function useIndication(
    source: MutableInteractionSource,
    options: UseIndicationOptions = {},
): SurfaceIndication {
    const state = usePureform();
    const interaction = useNativeInteraction(source);
    const indication = resolveIndication(undefined, state);
    return {
        surface: interaction.handlers,
        layer: indication.native ? (
            <IndicationLayer
                indication={indication}
                source={source}
                surface={{
                    style: options.style ?? {},
                    ...(options.drawing === undefined
                        ? {}
                        : { drawing: options.drawing }),
                }}
                centered={options.centered ?? false}
            />
        ) : null,
    };
}
