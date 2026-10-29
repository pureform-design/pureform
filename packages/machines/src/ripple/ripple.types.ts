import type {
    RippleTiming,
    RippleVariant,
    SparkleOptions,
} from "@pureform/js-effects";
import type { Machine, Service } from "@zag-js/core";
import type { CommonProperties, PropTypes, RequiredBy } from "@zag-js/types";

export interface ElementIds {
    layer?: string | undefined;
}

export interface RippleProps extends CommonProperties {
    /** The ids of the elements in the ripple. Useful for composition. */
    ids?: ElementIds | undefined;
    /** Skip ripples, for example while the surface is disabled. A disabled form control is
     *  skipped without this. */
    disabled?: boolean | undefined;
    /** Whether motion is reduced, which skips ripples (the pressed state layer still shows
     *  the press). Bindings pass their `useReducedMotion()`; left undefined, the system
     *  setting decides. */
    reducedMotion?: boolean | undefined;
    /** How the ripple is drawn. @default "ink-well" */
    variant?: RippleVariant | undefined;
    /** Always grow from the center, as icon buttons do. */
    centered?: boolean | undefined;
    /** Classes for each ripple element, usually the preset's ripple slot class. */
    rippleClass?: string | undefined;
    /** Binding-owned decoration of the imperative ink element. */
    decorateElement?: ((element: HTMLElement) => void) | undefined;
    /** The ripple color. Default: the ink well takes it from its class, and the sparkle uses
     *  the layer's text color. */
    color?: string | undefined;
    /** Fixed timing. Default: read from the layer's transition. */
    timing?: Partial<RippleTiming> | undefined;
    /** Let an ancestor surface ripple for the same press too. */
    allowPropagation?: boolean | undefined;
    /** Tuning for the `ink-sparkle` variant. */
    sparkle?: SparkleOptions | undefined;
    /** The surface whose presses ripple. @default the layer's parent element */
    getSurfaceEl?: ((layer: HTMLElement) => HTMLElement | null) | undefined;
}

type PropsWithDefault = "variant";

export interface RippleSchema {
    state: "ready";
    props: RequiredBy<RippleProps, PropsWithDefault>;
    context: Record<never, never>;
    event: { type: string };
    action: string;
    effect: string;
    guard: string;
}

export type RippleService = Service<RippleSchema>;
export type RippleMachine = Machine<RippleSchema>;

export interface RippleApi<T extends PropTypes = PropTypes> {
    /** Props for the layer the ripples are drawn in: an empty element inside the surface,
     *  styled with the preset's ripple slot. */
    getLayerProps: () => T["element"];
}
