// Zag's combobox, re-exported so bindings take every machine from one package: the autocomplete's
// editable field and the search view's query run on it. Each suggestion emits to its own
// interaction source: the highlighted one hovers, the pointer presses one, and Enter presses the
// highlighted one (Space types). Everything ends when the list closes or the combobox becomes disabled.

import {
    connect as zagConnect,
    machine as zagMachine,
    type Api,
    type Machine as ZagMachine,
} from "@zag-js/combobox";
import type {
    Machine as AnyMachine,
    Service as AnyService,
} from "@zag-js/core";
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
// Zag scrolls the list back to the top each time it closes, mount included. Setting `scrollTop`
// lays the page out, which on mount computes every style before a runtime theme's arrive, so the
// theme's colors then ease in. A hidden list (closed, its exit over) has nothing to scroll.
const zagActions = zag.implementations!.actions!;
const quiet: AnyMachine<SchemaOf<ZagMachine>> = {
    ...zag,
    implementations: {
        ...zag.implementations,
        actions: {
            ...zagActions,
            // Under `preserve`, a value the combobox takes (chosen, or set by its owner) still
            // writes its label into the input: only a choice the owner turns down leaves the
            // text. Zag writes it once it has found the value's items, a microtask later.
            syncSelectedItems(params) {
                const { prop, context } = params;
                const replace =
                    prop("selectionBehavior") === "preserve" &&
                    context.get("value").length > 0;
                zagActions["syncSelectedItems"]!(
                    replace
                        ? {
                              ...params,
                              prop: ((key: string) =>
                                  key === "selectionBehavior"
                                      ? "replace"
                                      : prop(key as never)) as typeof prop,
                          }
                        : params,
                );
            },
            scrollContentToTop(params) {
                const content = params.scope.getById(
                    params.scope.ids?.["content"] ??
                        `combobox:${params.scope.id}:content`,
                );
                if (!content || content.hidden) return;
                zagActions["scrollContentToTop"]!(params);
            },
        },
    },
};

export const machine: Machine = withInteraction(quiet, (params, emitters) => {
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
