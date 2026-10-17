// Zag's switch, re-exported so bindings take every machine from one package, with pureform's form
// rules on its machine: the browser's fieldset rule around the native input, and no reset of its
// own (the bindings own it; Zag's sends an untrusted change during the `reset` event). It emits to
// an interaction source: the root (the label around the control) is pressed and hovered, and the
// native input takes focus and the Space key.

import type {
    Machine as AnyMachine,
    Service as AnyService,
} from "@zag-js/core";
import {
    connect as zagConnect,
    machine as zagMachine,
    type Api,
    type Machine as ZagMachine,
} from "@zag-js/switch";
import type { NormalizeProps, PropTypes } from "@zag-js/types";

import {
    emittersOf,
    type InteractionProps,
    type SchemaOf,
    withInteraction,
    type WithProps,
} from "./interaction";
import { checkableInteraction } from "./interaction/checkable";
import { withFieldsetRule, zagElement } from "./zag-form";

export * from "@zag-js/switch";

export type Schema = WithProps<SchemaOf<ZagMachine>, InteractionProps>;
export type Props = Schema["props"];
export type Machine = AnyMachine<Schema>;
export type Service = AnyService<Schema>;

/** Zag's switch machine, with pureform's fieldset rule and no reset of its own, ending what's in
 *  progress when it becomes disabled. */
export const machine: Machine = withInteraction(
    withFieldsetRule(
        zagMachine,
        zagElement("hiddenInput", (id) => `switch:${id}:input`),
    ),
    ({ track, computed }, emitters) => {
        track([() => computed("isDisabled")], () => {
            if (computed("isDisabled")) emitters.end();
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
        !!service.computed("isDisabled"),
        normalize,
    );
}
