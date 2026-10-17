// Zag's tabs, re-exported so bindings take every machine from one package. Tabs aren't form
// controls, so their form behavior is unchanged. Each tab emits to its own interaction source: it's
// pressed (by the pointer, Enter, or Space), hovered, and focused.

import type {
    Machine as AnyMachine,
    Service as AnyService,
} from "@zag-js/core";
import {
    connect as zagConnect,
    machine as zagMachine,
    type Api,
    type Machine as ZagMachine,
} from "@zag-js/tabs";
import type { NormalizeProps, PropTypes } from "@zag-js/types";

import {
    emittersOf,
    type ItemInteractionProps,
    type SchemaOf,
    withInteraction,
    type WithProps,
} from "./interaction";
import { pressableItemProps } from "./interaction/pressable";

export * from "@zag-js/tabs";

export type Schema = WithProps<SchemaOf<ZagMachine>, ItemInteractionProps>;
export type Props = Schema["props"];
export type Machine = AnyMachine<Schema>;
export type Service = AnyService<Schema>;

/** Zag's tabs machine, keeping an interaction emitter per tab. */
export const machine: Machine = withInteraction(zagMachine);

/** Zag's connect, with each tab emitting to the tab's interaction source. */
export function connect<T extends PropTypes>(
    service: Service,
    normalize: NormalizeProps<T>,
): Api<T> {
    const api = zagConnect(service as never, normalize);
    const emitters = emittersOf(service);
    return {
        ...api,
        getTriggerProps: (props) =>
            pressableItemProps(
                api.getTriggerProps(props),
                emitters.item(props.value),
                !!props.disabled,
                normalize,
            ),
    };
}
