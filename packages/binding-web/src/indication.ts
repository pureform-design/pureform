// The web half of indication: the built-ins' web halves, and the wiring the web bindings share to
// tie an indication to a component's elements. Its `Indication` and `IndicationTarget` type
// the elements as `HTMLElement`; binding-core's are generic over the platform's element.

import type {
    Indication as CoreIndication,
    IndicationTarget as CoreIndicationTarget,
} from "@pureform/binding-core/indication";

/** An indication whose web half draws on `HTMLElement`s. */
export type Indication = CoreIndication<HTMLElement>;

/** The elements a web indication draws on. */
export type IndicationTarget = CoreIndicationTarget<HTMLElement>;

export {
    componentIndicationTokens,
    indicationTokenValue,
    indicationTokenValues,
    providerIndicationOverrides,
} from "./indication-tokens";

/** An indication, checked against the interface with the web's elements: returns it
 *  unchanged. */
export const defineIndication = (indication: Indication): Indication =>
    indication;

export {
    DEFAULT_INDICATION,
    materialIndication,
    rippleClasses,
    webIndication,
} from "./indication-material";
export type { RippleClasses } from "./indication-material";
export {
    holdsLayer,
    IndicationHost,
    IndicationInstance,
    indicationRoles,
    NOT_FORWARDED,
    stateIndicationPart,
    surfaceLayer,
} from "./indication-host";
export type {
    ForwardedStates,
    IndicationEnvironment,
    IndicationRole,
} from "./indication-host";
