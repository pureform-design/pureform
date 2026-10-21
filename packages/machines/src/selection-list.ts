// Zag's listbox, re-exported so bindings take every machine from one package, behind the selection
// list. Focus stays on the list while the arrow keys move a highlight across its options; the
// highlighted option hovers (on its own interaction source), the pointer presses an option, and
// Enter or Space presses the highlighted one. Everything ends, and the highlight clears, when the
// list loses focus; a disabled list leaves the tab order.

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
        const { context, track } = params;
        const focused = () => Boolean(context.get("focused"));
        trackHighlight(params, emitters, focused);
        // The highlight goes with focus, so focus coming back highlights afresh (the selected
        // option, else the first) rather than where the pointer last was.
        track([focused], () => {
            if (!focused()) context.set("highlightedValue", null);
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
                {
                    ...api.getContentProps(),
                    // A disabled list is out of the tab order.
                    ...normalize.element({ tabIndex: api.disabled ? -1 : 0 }),
                },
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
