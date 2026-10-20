// Zag's tags input, re-exported so bindings take every machine from one package, with the parts
// the preset draws: the field's container, and an input chip per value (its root, label and
// remove button). Tags aren't edited in place unless `editable` is passed: an input chip has no
// editing part. Each chip emits to its own interaction source, keyed by its item id: the pointer
// presses and hovers it, and the highlight (the chip Backspace or the arrow keys reached)
// hovers it.

import type {
    Machine as AnyMachine,
    Service as AnyService,
} from "@zag-js/core";
import {
    connect as zagConnect,
    machine as zagMachine,
    type Api as TagsInputApi,
    type ItemProps,
    type Machine as ZagMachine,
} from "@zag-js/tags-input";
import type { NormalizeProps, PropTypes } from "@zag-js/types";

import {
    chainProps,
    emittersOf,
    type ItemInteractionProps,
    type SchemaOf,
    withInteraction,
    type WithProps,
} from "../interaction";
import { pressableItemProps } from "../interaction/pressable";

export * from "@zag-js/tags-input";
export { anatomy, chipAnatomy, parts } from "./tags-input.anatomy";

type TagsInputSchema = SchemaOf<ZagMachine>;

export type Schema = WithProps<TagsInputSchema, ItemInteractionProps>;
export type Props = Schema["props"];
export type Machine = AnyMachine<Schema>;
export type Service = AnyService<Schema>;

/** A chip's place among the values: its index and value, as Zag's item props. */
export type ChipProps = ItemProps;

/** Zag's API with the preset's parts. */
export interface Api<T extends PropTypes = PropTypes> extends TagsInputApi<T> {
    /** The field's container: Zag's control. */
    getContainerProps(): T["element"];
    /** A chip's root: Zag's item preview and item on one element. */
    getChipProps(props: ChipProps): T["element"];
    /** A chip's label: Zag's item text. */
    getChipLabelProps(props: ChipProps): T["element"];
    /** A chip's remove button: Zag's item delete trigger. */
    getChipRemoveProps(props: ChipProps): T["button"];
    /** A chip's avatar or icon, hidden from assistive technology. */
    getChipDecorationProps(): T["element"];
}

const zag = zagMachine as unknown as AnyMachine<TagsInputSchema>;

/** Zag's tags input machine, not editing tags in place by default, keeping an interaction
 *  emitter per chip, and hovering the highlighted chip. */
export const machine: Machine = withInteraction(
    {
        ...zag,
        props: (params) =>
            zag.props!({
                ...params,
                props: { editable: false, ...params.props },
            }),
    },
    ({ track, context }, emitters) => {
        track([() => context.get("highlightedTagId")], () => {
            const next = context.get("highlightedTagId") ?? null;
            const previous = emitters.highlighted;
            if (previous !== null && previous !== next) {
                emitters.item(previous).hoverExit();
            }
            if (next !== null) emitters.item(next).hoverEnter();
            emitters.highlighted = next;
        });
    },
);

/** Zag's connect, with the preset's parts, each chip emitting to its source. */
export function connect<T extends PropTypes>(
    service: Service,
    normalize: NormalizeProps<T>,
): Api<T> {
    const api = zagConnect(service as never, normalize) as TagsInputApi<T>;
    const emitters = emittersOf(service);
    return {
        ...api,
        getContainerProps: () => api.getControlProps(),
        getChipProps(props) {
            const { id, disabled } = api.getItemState(props);
            return pressableItemProps(
                // The preview's part name wins: Zag finds the chips by it.
                chainProps(
                    api.getItemPreviewProps(props),
                    api.getItemProps(props),
                ),
                emitters.item(id),
                disabled,
                normalize,
            );
        },
        getChipLabelProps: (props) => api.getItemTextProps(props),
        getChipRemoveProps: (props) => api.getItemDeleteTriggerProps(props),
        getChipDecorationProps: () =>
            normalize.element({ "aria-hidden": "true" }),
    };
}
