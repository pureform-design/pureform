// The parts a select-like field shares (the select, the autocomplete): the label, the icons and
// affixes, the supporting text, and the list drawn as a menu with its groups, items and item
// labels. Each component passes its contexts; their machines' APIs (Zag's select and combobox)
// name these parts' props alike.

import type { ComponentAnatomy } from "@pureform/anatomy";
import { presentProps } from "@pureform/binding-core";
import type { MutableInteractionSource } from "@pureform/binding-core/interaction";
import type { JSX } from "@solidjs/web";
import { type Accessor, merge, omit } from "solid-js";

import type { ItemInteractionSources } from "./interaction";
import type { PartContext } from "./part-context";
import type { ComponentScope } from "./parts";
import type { Presence } from "./presence";
import type { PartProps } from "./props";

/** What the shared parts read of the machine's API. */
export interface SelectFieldApi {
    getLabelProps(): object;
    getPositionerProps(): object;
    getContentProps(): object;
    getItemGroupProps(props: { id: string }): object;
    getItemGroupLabelProps(props: { htmlFor: string }): object;
    getItemProps(props: { item: never }): object;
    getItemState(props: { item: never }): { readonly highlighted: boolean };
    getItemTextProps(props: { item: never }): object;
}

/** What Root shares with the shared parts. */
export interface SelectFieldContext {
    readonly scope: ComponentScope<ComponentAnatomy>;
    readonly menu: ComponentScope<ComponentAnatomy>;
    readonly api: Accessor<SelectFieldApi>;
    readonly supportingTextId: Accessor<string>;
    readonly errorText: Accessor<string | undefined>;
    readonly sources: ItemInteractionSources;
    readonly presence: Presence;
}

/** An item of the list: its value, and the app's source if it passes one. */
export interface SelectFieldItem {
    readonly value: string;
    readonly interactionSource?: MutableInteractionSource | undefined;
}

/** A part's props: the element's own, and the part's `unstyled`. */
export interface SelectFieldPartProps extends PartProps {
    readonly unstyled?: boolean | undefined;
}

/** An icon's props: a part's, and `mirror` to flip it under `rtl`. */
export interface SelectFieldIconProps extends SelectFieldPartProps {
    readonly mirror?: boolean | undefined;
}

/** Builds the shared parts of a select-like field over its Root's and items' contexts. */
export function selectFieldParts<I extends SelectFieldItem>(
    context: PartContext<SelectFieldContext>,
    itemContext: PartContext<{ readonly item: Accessor<I> }>,
) {
    function Label(props: SelectFieldPartProps): JSX.Element {
        const { scope, api } = context.use("Label");
        return scope.render("label", {
            element: "label",
            machine: () => api().getLabelProps(),
            unstyled: () => props.unstyled,
            props: omit(props, "unstyled"),
        });
    }

    function LeadingIcon(props: SelectFieldIconProps): JSX.Element {
        const { scope } = context.use("LeadingIcon");
        return scope.render("leadingIcon", {
            element: "span",
            machine: () => ({ "aria-hidden": "true" }),
            states: () => ({ mirrored: props.mirror }),
            unstyled: () => props.unstyled,
            props: omit(props, "unstyled", "mirror"),
        });
    }

    const affix = (part: "prefixText" | "suffixText", name: string) =>
        function Affix(props: SelectFieldPartProps): JSX.Element {
            const { scope } = context.use(name);
            return scope.render(part, {
                element: "span",
                unstyled: () => props.unstyled,
                props: omit(props, "unstyled"),
            });
        };

    function SupportingText(props: SelectFieldPartProps): JSX.Element {
        const { scope, supportingTextId, errorText } =
            context.use("SupportingText");
        const children = {
            get children() {
                return errorText() ?? props.children;
            },
        };
        return scope.render("supportingText", {
            element: "span",
            machine: () => ({ id: supportingTextId() }),
            unstyled: () => props.unstyled,
            props: merge(omit(props, "unstyled"), children),
        });
    }

    function Positioner(props: SelectFieldPartProps): JSX.Element {
        const { menu, api, presence } = context.use("Positioner");
        return menu.render("positioner", {
            element: "div",
            machine: () =>
                presentProps(api().getPositionerProps(), presence.present()),
            unstyled: () => props.unstyled,
            props: omit(props, "unstyled"),
        });
    }

    function Content(props: SelectFieldPartProps): JSX.Element {
        const { menu, api, presence } = context.use("Content");
        return menu.render("root", {
            element: "div",
            ref: presence.ref,
            machine: () =>
                presentProps(api().getContentProps(), presence.present()),
            unstyled: () => props.unstyled,
            props: omit(props, "unstyled"),
        });
    }

    function ItemGroup(
        props: SelectFieldPartProps & { readonly id: string },
    ): JSX.Element {
        const { menu, api } = context.use("ItemGroup");
        return menu.render("itemGroup", {
            element: "div",
            machine: () => api().getItemGroupProps({ id: props.id }),
            unstyled: () => props.unstyled,
            props: omit(props, "unstyled", "id"),
        });
    }

    function ItemGroupLabel(
        props: SelectFieldPartProps & { readonly htmlFor: string },
    ): JSX.Element {
        const { menu, api } = context.use("ItemGroupLabel");
        return menu.render("itemGroupLabel", {
            element: "div",
            machine: () =>
                api().getItemGroupLabelProps({ htmlFor: props.htmlFor }),
            unstyled: () => props.unstyled,
            props: omit(props, "unstyled", "htmlFor"),
        });
    }

    function Item(
        props: SelectFieldPartProps & { readonly item: I },
    ): JSX.Element {
        const { menu, api, sources } = context.use("Item");
        const item = () => props.item;
        const source = sources.item(
            () => props.item.value,
            () => props.item.interactionSource,
        );
        return (
            <itemContext.Provider value={{ item }}>
                {menu.render("item", {
                    element: "div",
                    interactionSource: source,
                    machine: () =>
                        api().getItemProps({ item: item() as never }),
                    states: () => ({
                        hover: api().getItemState({ item: item() as never })
                            .highlighted,
                    }),
                    unstyled: () => props.unstyled,
                    props: omit(props, "unstyled", "item"),
                })}
            </itemContext.Provider>
        );
    }

    function ItemLabel(props: SelectFieldPartProps): JSX.Element {
        const { menu, api } = context.use("ItemLabel");
        const { item } = itemContext.use("ItemLabel");
        return menu.render("itemLabel", {
            element: "span",
            machine: () => api().getItemTextProps({ item: item() as never }),
            unstyled: () => props.unstyled,
            props: omit(props, "unstyled"),
        });
    }

    return {
        Label,
        LeadingIcon,
        PrefixText: affix("prefixText", "PrefixText"),
        SuffixText: affix("suffixText", "SuffixText"),
        SupportingText,
        Positioner,
        Content,
        ItemGroup,
        ItemGroupLabel,
        Item,
        ItemLabel,
    };
}
