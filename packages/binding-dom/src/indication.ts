// The web half of indication: the built-ins' web halves, and the wiring the web bindings share to
// tie an indication to a component's elements. It types an indication's elements as
// `HTMLElement`, which binding-core leaves to the platform.

import "@pureform/binding-core/indication";

declare module "@pureform/binding-core/indication" {
    interface IndicationPlatform {
        readonly element: HTMLElement;
    }
}

export {
    DEFAULT_INDICATION,
    materialIndication,
    webIndication,
} from "./indication-material";
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
