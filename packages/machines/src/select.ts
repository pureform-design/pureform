// Zag's select, re-exported so bindings take every machine from one package, with pureform's form
// rules on its machine: the browser's fieldset rule around the hidden native select, and no reset
// of its own (the bindings own it; Zag's would put back the value at creation). Each option emits
// to its own interaction source: the highlighted option hovers, the pointer presses an option, and
// Enter or Space presses the highlighted one.

import type {
    Machine as AnyMachine,
    Service as AnyService,
} from "@zag-js/core";
import {
    connect as zagConnect,
    machine as zagMachine,
    type Api,
    type Machine as ZagMachine,
} from "@zag-js/select";
import type { NormalizeProps, PropTypes } from "@zag-js/types";

import {
    emittersOf,
    type ItemInteractionProps,
    type SchemaOf,
    withInteraction,
    type WithProps,
} from "./interaction";
import {
    highlightedPressProps,
    itemPressProps,
    trackHighlight,
} from "./interaction/highlight";
import { withFieldsetRule, zagElement } from "./zag-form";

export * from "@zag-js/select";

export type Schema = WithProps<SchemaOf<ZagMachine>, ItemInteractionProps>;
export type Props = Schema["props"];
export type Machine = AnyMachine<Schema>;
export type Service = AnyService<Schema>;

/** Zag's select machine, with pureform's fieldset rule and no reset of its own, its highlight
 *  hovering the option, and everything ending when it closes or becomes disabled. */
export const machine: Machine = withInteraction(
    withFieldsetRule(
        zagMachine,
        zagElement("hiddenSelect", (id) => `select:${id}:select`),
    ),
    (params, emitters) => {
        const { track, computed } = params;
        trackHighlight(params, emitters, () => params.state.hasTag("open"));
        track([() => computed("isDisabled")], () => {
            if (computed("isDisabled")) emitters.end();
        });
    },
);

/** Zag's connect, with each option emitting to the option's interaction source. */
export function connect<T extends PropTypes>(
    service: Service,
    normalize: NormalizeProps<T>,
): Api<T> {
    const api = zagConnect(service as never, normalize);
    const emitters = emittersOf(service);
    return {
        ...api,
        getContentProps: () =>
            highlightedPressProps(
                api.getContentProps(),
                emitters,
                api.highlightedValue,
                normalize,
            ),
        getItemProps: (props) => {
            const { value, disabled } = api.getItemState(props);
            return itemPressProps(
                api.getItemProps(props),
                emitters,
                value,
                disabled,
                normalize,
            );
        },
    };
}
