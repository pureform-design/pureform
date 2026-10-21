// Zag's listbox, re-exported so bindings take every machine from one package, behind the selection
// list. Focus stays on the list while the arrow keys move a highlight across its options; the
// highlighted option hovers (on its own interaction source), the pointer presses an option, and
// Enter or Space presses the highlighted one. Everything ends when the list loses focus.

import type {
    Machine as AnyMachine,
    Service as AnyService,
} from "@zag-js/core";
import {
    connect as zagConnect,
    machine as zagMachine,
    type Api,
    type Machine as ZagMachine,
} from "@zag-js/listbox";
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

export * from "@zag-js/listbox";

export type Schema = WithProps<SchemaOf<ZagMachine>, ItemInteractionProps>;
export type Props = Schema["props"];
export type Machine = AnyMachine<Schema>;
export type Service = AnyService<Schema>;

/** Zag's listbox machine, its highlight hovering the option while the list has focus. */
export const machine: Machine = withInteraction(
    zagMachine as unknown as AnyMachine<SchemaOf<ZagMachine>>,
    (params, emitters) => {
        trackHighlight(params, emitters, () =>
            Boolean(params.context.get("focused")),
        );
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
