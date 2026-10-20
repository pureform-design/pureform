// Zag's menu, re-exported so bindings take every machine from one package. A menu isn't a form
// control, so its form behavior is unchanged. Each item, and each toggleable (checkbox or radio)
// item, emits to its own interaction source: the highlighted item hovers, the pointer presses an
// item, and Enter or Space presses the highlighted one. Zag's item groups and their labels
// (`getItemGroupProps`, `getItemGroupLabelProps`) pass through unchanged.

import type {
    Machine as AnyMachine,
    Service as AnyService,
} from "@zag-js/core";
import {
    connect as zagConnect,
    machine as zagMachine,
    type Api,
    type Machine as ZagMachine,
} from "@zag-js/menu";
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

export * from "@zag-js/menu";

export type Schema = WithProps<SchemaOf<ZagMachine>, ItemInteractionProps>;
export type Props = Schema["props"];
export type Machine = AnyMachine<Schema>;
export type Service = AnyService<Schema>;

/** Zag's menu machine, its highlight hovering the item, and everything ending when it closes. */
export const machine: Machine = withInteraction(
    zagMachine,
    (params, emitters) =>
        trackHighlight(params, emitters, () => params.state.hasTag("open")),
);

/** Zag's connect, with each item emitting to the item's interaction source. */
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
        getItemProps: (props) =>
            itemPressProps(
                api.getItemProps(props),
                emitters,
                props.value,
                !!props.disabled,
                normalize,
            ),
        getOptionItemProps: (props) =>
            itemPressProps(
                api.getOptionItemProps(props),
                emitters,
                props.value,
                !!props.disabled,
                normalize,
            ),
    };
}
