// Zag's combobox, re-exported so bindings take every machine from one package: the autocomplete's
// editable field and the search view's query run on it. Each suggestion emits to its own
// interaction source: the highlighted one hovers, the pointer presses one, and Enter presses the
// highlighted one (Space types). Everything ends when the list closes or the combobox becomes disabled.

import type {
    Machine as AnyMachine,
    Service as AnyService,
} from "@zag-js/core";
import {
    connect as zagConnect,
    machine as zagMachine,
    type Api,
    type Machine as ZagMachine,
} from "@zag-js/combobox";
import type { NormalizeProps, PropTypes } from "@zag-js/types";

import {
    chainProps,
    emittersOf,
    type ItemInteractionProps,
    type SchemaOf,
    withInteraction,
    type WithProps,
} from "../interaction";
import { itemPressProps, trackHighlight } from "../interaction/highlight";

export * from "@zag-js/combobox";
export { anatomy, parts, searchViewAnatomy } from "./combobox.anatomy";

export type Schema = WithProps<SchemaOf<ZagMachine>, ItemInteractionProps>;
export type Props = Schema["props"];
export type Machine = AnyMachine<Schema>;
export type Service = AnyService<Schema>;

const zag = zagMachine as unknown as AnyMachine<SchemaOf<ZagMachine>>;

/** Zag's combobox machine, its highlight hovering the suggestion, and everything ending when it
 *  closes or becomes disabled. */
export const machine: Machine = withInteraction(zag, (params, emitters) => {
    const { track, prop } = params;
    trackHighlight(params, emitters, () => params.state.hasTag("open"));
    track([() => prop("disabled")], () => {
        if (prop("disabled")) emitters.end();
    });
});

/** Zag's connect, with each suggestion emitting to its interaction source. */
export function connect<T extends PropTypes>(
    service: Service,
    normalize: NormalizeProps<T>,
): Api<T> {
    const api = zagConnect(service as never, normalize);
    const emitters = emittersOf(service);
    return {
        ...api,
        // Enter presses the highlighted suggestion; Space types a space.
        getInputProps: () =>
            chainProps(
                api.getInputProps(),
                normalize.input({
                    onKeyDown(event) {
                        const highlighted = api.highlightedValue;
                        if (highlighted === null || event.key !== "Enter")
                            return;
                        const emitter = emitters.item(highlighted);
                        if (emitter.keyDown(event, undefined)) emitter.keyUp();
                    },
                }),
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
