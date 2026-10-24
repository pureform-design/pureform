// Zag's select, re-exported so bindings take every machine from one package, with pureform's form
// rules on its machine: the browser's fieldset rule around the hidden native select, and no reset
// of its own (the bindings own it; Zag's would put back the value at creation). Each option emits
// to its own interaction source: the highlighted option hovers, the pointer presses an option, and
// Enter or Space presses the highlighted one. The selected items are derived from the value and the
// collection, with the items that left the collection remembered outside the machine's context.

import {
    type CollectionItem,
    createSelectedItemMap,
    deriveSelectionState,
    resolveSelectedItems,
} from "@zag-js/collection";
import type {
    Machine as AnyMachine,
    Params,
    Service as AnyService,
} from "@zag-js/core";
import {
    connect as zagConnect,
    machine as zagMachine,
    type Api,
    type Machine as ZagMachine,
} from "@zag-js/select";
import type { NormalizeProps, PropTypes } from "@zag-js/types";
import { isEqual } from "@zag-js/utils";

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

type ZagSchema = SchemaOf<ZagMachine>;

/** Zag's select schema with the selection memory moved from the context to the refs. */
type SelectionSchema = Omit<ZagSchema, "context" | "refs"> & {
    context: Omit<ZagSchema["context"], "selectedItemMap">;
    refs: ZagSchema["refs"] & {
        /** The items last found for the selected values, by value, kept for those that leave
         *  the collection. */
        selectedItemMap: Map<string, CollectionItem>;
    };
};

export type Schema = WithProps<SelectionSchema, ItemInteractionProps>;
export type Props = Schema["props"];
export type Machine = AnyMachine<Schema>;
export type Service = AnyService<Schema>;

// Zag keeps the selected items in context, rewritten by watches on the value and the collection.
// A watch on a prop runs after the change it follows, so readers of the selected items ran once
// for the change and again for the rewrite. Here readers find each selected item in the
// collection, and only one that has left it in a ref, which the same watches keep without
// notifying anyone: what they record is already what readers see.
const remember = ({ context, prop, refs }: Params<SelectionSchema>) => {
    refs.set(
        "selectedItemMap",
        deriveSelectionState({
            values: context.get("value"),
            collection: prop("collection"),
            selectedItemMap: refs.get("selectedItemMap"),
        }).nextSelectedItemMap,
    );
};

const zagSelection = zagMachine as unknown as AnyMachine<SelectionSchema>;

/** Zag's select machine with its selected items derived: its context, ported from
 *  `@zag-js/select` 1.46.0 (MIT) without `selectedItemMap`, which moves to the refs. */
const derivedSelection: AnyMachine<SelectionSchema> = {
    ...zagSelection,
    context({ prop, bindable, getRefs }) {
        return {
            value: bindable(() => ({
                defaultValue: prop("defaultValue"),
                value: prop("value"),
                isEqual,
                // Reports the items without recording them; the value's watch records the value
                // the machine ends up with, which a controlled select's owner may turn down.
                onChange(value) {
                    prop("onValueChange")?.({
                        value,
                        items: resolveSelectedItems({
                            values: value,
                            collection: prop("collection"),
                            selectedItemMap: getRefs().get("selectedItemMap"),
                        }),
                    });
                },
            })),
            highlightedValue: bindable(() => ({
                defaultValue: prop("defaultHighlightedValue") || null,
                value: prop("highlightedValue"),
                onChange(value) {
                    prop("onHighlightChange")?.({
                        highlightedValue: value,
                        highlightedItem: prop("collection").find(value),
                        highlightedIndex: prop("collection").indexOf(value),
                    });
                },
            })),
            currentPlacement: bindable<
                ZagSchema["context"]["currentPlacement"]
            >(() => ({
                defaultValue: undefined,
            })),
            fieldsetDisabled: bindable(() => ({ defaultValue: false })),
            highlightedItem: bindable<ZagSchema["context"]["highlightedItem"]>(
                () => ({
                    defaultValue: null,
                }),
            ),
        };
    },
    refs(params) {
        const { prop } = params;
        const collection = prop("collection");
        return {
            ...zagSelection.refs!(params),
            selectedItemMap: createSelectedItemMap({
                selectedItems: collection.findMany(
                    prop("value") ?? prop("defaultValue") ?? [],
                ),
                collection,
            }),
        };
    },
    computed: {
        ...zagSelection.computed!,
        selectedItems: ({ context, prop, refs }) =>
            resolveSelectedItems({
                values: context.get("value"),
                collection: prop("collection"),
                selectedItemMap: refs.get("selectedItemMap"),
            }),
    },
    // Typed on the closed select, the list opens on the first option starting with the text
    // (WAI-ARIA APG's select-only combobox), rather than Zag's choosing it without opening, as a
    // native select does. Nothing is chosen by typing; the keys typed next in the list add up.
    states: {
        ...zagSelection.states,
        focused: {
            ...zagSelection.states.focused,
            on: {
                ...zagSelection.states.focused.on,
                "TRIGGER.TYPEAHEAD": [
                    {
                        guard: "isOpenControlled",
                        actions: [
                            "clearHighlightedItem",
                            "highlightMatchingItem",
                            "invokeOnOpen",
                        ],
                    },
                    {
                        target: "open",
                        actions: [
                            "setInitialFocus",
                            "invokeOnOpen",
                            "clearHighlightedItem",
                            "highlightMatchingItem",
                        ],
                    },
                ],
            },
        },
    },
    implementations: {
        ...zagSelection.implementations,
        actions: {
            ...zagSelection.implementations!.actions!,
            syncSelectedItems: remember,
            syncCollection(params) {
                const { context, prop } = params;
                const highlightedItem = prop("collection").find(
                    context.get("highlightedValue"),
                );
                if (highlightedItem)
                    context.set("highlightedItem", highlightedItem);
                remember(params);
            },
        },
    },
};

/** Zag's select machine, with pureform's fieldset rule and no reset of its own, its highlight
 *  hovering the option, and everything ending when it closes or becomes disabled. */
export const machine: Machine = withInteraction(
    withFieldsetRule(
        derivedSelection,
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
