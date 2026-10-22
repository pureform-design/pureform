// Zag's menu, re-exported so bindings take every machine from one package. A menu isn't a form
// control, so its form behavior is unchanged. Each item, and each toggleable (checkbox or radio)
// item, emits to its own interaction source: the highlighted item hovers, the pointer presses an
// item, and Enter or Space presses the highlighted one. Zag's item groups and their labels
// (`getItemGroupProps`, `getItemGroupLabelProps`) pass through; a group's `first`/`last`, when
// given, override the surface's own marking (`markMenuGroupEdges`). A submenu is another
// menu: its trigger item (`getTriggerItemProps`) emits to the parent's source under the child's
// trigger id, the value the parent highlights it by. A key a submenu's content handles stops
// there (Zag's), so it presses nothing in the parent's around it.

import type {
    Machine as AnyMachine,
    Service as AnyService,
} from "@zag-js/core";
import {
    connect as zagConnect,
    machine as zagMachine,
    type Api as ZagApi,
    type ItemGroupProps as ZagItemGroupProps,
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

/** A group's props: its `id` and, as an override, whether it's the first or last of the menu's
 *  groups. The bindings mark the groups from where they are (`markMenuGroupEdges`); an explicit
 *  `first`/`last` wins over that, `false` included. */
export interface ItemGroupProps extends ZagItemGroupProps {
    readonly first?: boolean | undefined;
    readonly last?: boolean | undefined;
}

/** Zag's menu API, its groups' edges overridable. */
export interface Api<T extends PropTypes = PropTypes> extends Omit<
    ZagApi<T>,
    "getItemGroupProps"
> {
    getItemGroupProps(options: ItemGroupProps): T["element"];
}

// An explicit edge: `data-first` while it holds, and `data-pf-first` saying it was given, which
// `markMenuGroupEdges` leaves alone.
const edgeProps = (name: "first" | "last", value: boolean | undefined) =>
    value === undefined
        ? {}
        : {
              [`data-pf-${name}`]: String(value),
              ...(value ? { [`data-${name}`]: "" } : {}),
          };

type MenuParams = Parameters<NonNullable<ZagMachine["watch"]>>[0];

const contentOf = (params: Pick<MenuParams, "prop" | "scope">) =>
    params.scope.getById(
        (params.prop("ids") as { content?: string } | undefined)?.content ??
            `menu:${params.prop("id")}:content`,
    );

/** A submenu's content sits inside its parent's, where Zag won't move focus to the parent's
 *  content (focus is already inside it): when the submenu closes holding focus, its parent's
 *  content takes it, as Zag's does for a submenu rendered elsewhere. */
function returnFocusToParent(params: MenuParams): void {
    const open = () => params.state.hasTag("open");
    params.track([open], () => {
        if (open()) return;
        const parent = params.refs.get("parent") as MenuParams | null;
        const content = contentOf(params);
        if (!parent || !content?.contains(params.scope.getActiveElement()))
            return;
        contentOf(parent)?.focus({ preventScroll: true });
    });
}

/** Zag's menu machine, its highlight hovering the item, and everything ending when it closes. */
export const machine: Machine = withInteraction(
    zagMachine,
    (params, emitters) => {
        trackHighlight(params, emitters, () => params.state.hasTag("open"));
        returnFocusToParent(params as unknown as MenuParams);
    },
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
        getItemGroupProps: ({ first, last, ...props }) => ({
            ...api.getItemGroupProps(props),
            ...edgeProps("first", first),
            ...edgeProps("last", last),
        }),
        getContentProps: () =>
            highlightedPressProps(
                api.getContentProps(),
                emitters,
                api.highlightedValue,
                normalize,
            ),
        getTriggerItemProps: (childApi) =>
            itemPressProps(
                api.getTriggerItemProps(childApi),
                emitters,
                (childApi.getTriggerProps() as { id: string }).id,
                false,
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
