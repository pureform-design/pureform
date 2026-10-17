// Zag's checkbox, re-exported so bindings take every machine from one package, emitting to an
// interaction source: the root (the label around the control) is pressed and hovered, and the
// native input takes focus and the Space key.

import {
    connect as zagConnect,
    machine as zagMachine,
    type Api,
    type Machine as ZagMachine,
} from "@zag-js/checkbox";
import type {
    Machine as AnyMachine,
    Service as AnyService,
} from "@zag-js/core";
import type { NormalizeProps, PropTypes } from "@zag-js/types";

import {
    emittersOf,
    type InteractionProps,
    type SchemaOf,
    withInteraction,
    type WithProps,
} from "./interaction";
import { checkableInteraction } from "./interaction/checkable";

export * from "@zag-js/checkbox";

export type Schema = WithProps<SchemaOf<ZagMachine>, InteractionProps>;
export type Props = Schema["props"];
export type Machine = AnyMachine<Schema>;
export type Service = AnyService<Schema>;

/** Zag's checkbox machine, ending what's in progress when it becomes disabled. */
export const machine: Machine = withInteraction(
    zagMachine,
    ({ track, computed }, emitters) => {
        track([() => computed("disabled")], () => {
            if (computed("disabled")) emitters.end();
        });
    },
);

/** Zag's connect, with the root and the native input emitting to the interaction source. */
export function connect<T extends PropTypes>(
    service: Service,
    normalize: NormalizeProps<T>,
): Api<T> {
    return checkableInteraction(
        zagConnect(service as never, normalize),
        emittersOf(service).own,
        service.computed("disabled"),
        normalize,
    );
}
