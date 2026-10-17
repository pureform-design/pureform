// How an interactive surface answers the user: the state layer, the ripple, and the focus
// indicator, in Material's names, as one pluggable `Indication` that draws from the component's
// interaction source. This module is the interface, the web halves of the built-ins (Material's
// and none), how the web writes an indication's tokens, and the wiring the web bindings share.
// React Native fills in the built-ins' native halves.

import type { TokenValue } from "@pureform/styling";

import type { InteractionSource } from "./interaction";
import type { AnyRegistry, Direction } from "./provider";

/**
 * The token values an indication sets, by the component tokens' names: every interactive
 * component has all seven, each defaulting to the theme's (its state opacities, its focus
 * indicator's thickness and outer offset, and `secondary`) and set back to the theme's on the
 * component's root. They're static, so the server renders them: on the web as CSS vars
 * (theme-level from the provider, on the component's root from its `indication` prop), on React
 * Native in the selection's overrides. Each left out keeps the theme's value. Numbers are React
 * Native's units: an opacity is a fraction (`0.08`, which the web writes as `8%`), and a length
 * is in pixels.
 */
export interface IndicationTokens {
    /** The state layer's opacity while hovered. */
    readonly stateHoverOpacity?: TokenValue | undefined;
    /** The state layer's opacity while focused. */
    readonly stateFocusOpacity?: TokenValue | undefined;
    /** The state layer's opacity while pressed. */
    readonly statePressedOpacity?: TokenValue | undefined;
    /** The state layer's opacity while dragged. */
    readonly stateDraggedOpacity?: TokenValue | undefined;
    /** The focus indicator's thickness. Keyboard users need a visible focus: 0 warns in
     *  development. */
    readonly focusIndicatorThickness?: TokenValue | undefined;
    /** How far outside the focus part the focus indicator is drawn. */
    readonly focusIndicatorOuterOffset?: TokenValue | undefined;
    /** The focus indicator's color. */
    readonly focusIndicatorColor?: TokenValue | undefined;
}

/** The elements an indication draws on, from the component's anatomy. */
export interface IndicationTarget {
    /** The element whose interactions feed the source. */
    readonly trigger: HTMLElement;
    /** The element the state layer tints and the ripple fills; it clips the ripple. */
    readonly surface: HTMLElement;
    /** The layer element inside the surface, when the indication asks for one (`layer`). */
    readonly layer?: HTMLElement | undefined;
}

/** What an indication's effect reads from the component and its provider. */
export interface IndicationContext {
    /** Ripple from the surface's center rather than the press origin. */
    readonly centered: boolean;
    /** Whether motion is reduced: the ripple stops, the state layer and focus indicator stay. */
    reducedMotion(): boolean;
    dir(): Direction;
    /** The provider's registry, whose `ripple` entry draws Material's ripple. */
    readonly registry: AnyRegistry;
}

/** The surface a native indication draws in: its resolved style (content color, corners), and
 *  the shape it draws, when it draws one, for an indication that clips to it. */
export interface NativeIndicationSurface {
    readonly style: Readonly<Record<string, unknown>>;
    readonly drawing?: unknown;
}

/** What a native indication is rendered with, inside the surface. */
export interface NativeIndicationProps {
    readonly source: InteractionSource;
    readonly surface: NativeIndicationSurface;
    /** Ripple from the surface's center rather than the press origin. */
    readonly centered: boolean;
    readonly reducedMotion: boolean;
    readonly dir: Direction;
    /** The provider's registry, whose `ripple` entry draws Material's ripple. */
    readonly registry: AnyRegistry;
}

/** A React Native component taking `NativeIndicationProps`. Typed structurally, so this package
 *  doesn't depend on React: any function or class component fits. */
export type NativeIndicationComponent =
    | ((props: NativeIndicationProps) => unknown)
    | (new (props: NativeIndicationProps) => unknown);

/**
 * Turns an interaction source into feedback on a surface. It has a static half, the tokens it
 * sets, which render on the server, and a live half: an effect on the web, a component on React
 * Native. Write one with `defineIndication`; a provider's `indication` sets the default, and an
 * interactive component's `indication` prop overrides it for that component.
 */
export interface Indication {
    /** Identifies the indication, for development messages and equality. */
    readonly name: string;
    /** The token values it sets: the state layer's opacities and the focus indicator's
     *  thickness, offset, and color. */
    readonly tokens?: IndicationTokens | undefined;
    /** Whether the surface holds a layer element for the effect to draw in. The bindings render
     *  it on the server too, so hydration matches. */
    readonly layer?: boolean | undefined;
    /**
     * Web: the live half. It runs after mount, at the latest before the first interaction
     * reaches it; it's not promised to run at mount, nor on the first interaction, so it may
     * move later. It runs again when the indication or its elements change. Returns its cleanup.
     */
    readonly web?:
        | ((
              target: IndicationTarget,
              source: InteractionSource,
              context: IndicationContext,
          ) => () => void)
        | undefined;
    /** React Native: the live half, rendered inside the surface. */
    readonly native?: NativeIndicationComponent | undefined;
}

/** An indication, checked against the interface: returns it unchanged. */
export function defineIndication(indication: Indication): Indication {
    return indication;
}

export {
    componentIndicationTokens,
    droppedFocusIndicatorMessage,
    dropsFocusIndicator,
    INDICATION_TOKEN_NAMES,
    indicationTokenValue,
    indicationTokenValues,
    providerIndicationOverrides,
    THEME_INDICATION_TOKENS,
} from "./indication-tokens";
export type { IndicationTokenName } from "./indication-tokens";
export {
    DEFAULT_INDICATION,
    materialIndication,
    noIndication,
    rippleClasses,
} from "./indication-material";
export type {
    MaterialIndicationOptions,
    MaterialRipple,
    RippleClasses,
} from "./indication-material";
export {
    IndicationHost,
    IndicationInstance,
    indicationRoles,
    NOT_FORWARDED,
    stateIndicationPart,
} from "./indication-host";
export type {
    ForwardedStates,
    IndicationEnvironment,
    IndicationRole,
} from "./indication-host";
