// The parts a select-like field shares (the select, the autocomplete): the label, the icons and
// affixes, the supporting text, and the list drawn as a menu with its groups, items and item
// labels. Each component passes its contexts; their machines' APIs (Zag's select and combobox)
// name these parts' props alike.

import type { ComponentAnatomy } from "@pureform/anatomy";
import { presentProps } from "@pureform/binding-core";
import type { MutableInteractionSource } from "@pureform/binding-core/interaction";
import type { ReactNode } from "react";

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
    readonly api: SelectFieldApi;
    readonly supportingTextId: string;
    readonly errorText: string | undefined;
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
    itemContext: PartContext<{ readonly item: I }>,
) {
    function Label({ unstyled, ...props }: SelectFieldPartProps): ReactNode {
        const { scope, api } = context.use("Label");
        return scope.render("label", {
            element: "label",
            machine: api.getLabelProps(),
            unstyled,
            props,
        });
    }

    function LeadingIcon({
        unstyled,
        mirror,
        ...props
    }: SelectFieldIconProps): ReactNode {
        const { scope } = context.use("LeadingIcon");
        return scope.render("leadingIcon", {
            element: "span",
            machine: { "aria-hidden": "true" },
            states: { mirrored: mirror },
            unstyled,
            props,
        });
    }

    const affix = (part: "prefixText" | "suffixText", name: string) =>
        function Affix({
            unstyled,
            ...props
        }: SelectFieldPartProps): ReactNode {
            const { scope } = context.use(name);
            return scope.render(part, { element: "span", unstyled, props });
        };

    function SupportingText({
        unstyled,
        ...props
    }: SelectFieldPartProps): ReactNode {
        const { scope, supportingTextId, errorText } =
            context.use("SupportingText");
        return scope.render("supportingText", {
            element: "span",
            machine: { id: supportingTextId },
            unstyled,
            props: { ...props, children: errorText ?? props.children },
        });
    }

    function Positioner({
        unstyled,
        ...props
    }: SelectFieldPartProps): ReactNode {
        const { menu, api, presence } = context.use("Positioner");
        return menu.render("positioner", {
            element: "div",
            machine: presentProps(api.getPositionerProps(), presence.present),
            unstyled,
            props,
        });
    }

    function Content({ unstyled, ...props }: SelectFieldPartProps): ReactNode {
        const { menu, api, presence } = context.use("Content");
        return menu.render("root", {
            element: "div",
            ref: presence.ref,
            machine: presentProps(api.getContentProps(), presence.present),
            unstyled,
            props,
        });
    }

    function ItemGroup({
        unstyled,
        id,
        ...props
    }: SelectFieldPartProps & { readonly id: string }): ReactNode {
        const { menu, api } = context.use("ItemGroup");
        return menu.render("itemGroup", {
            element: "div",
            machine: api.getItemGroupProps({ id }),
            unstyled,
            props,
        });
    }

    function ItemGroupLabel({
        unstyled,
        group,
        ...props
    }: Omit<SelectFieldPartProps, "id"> & {
        readonly group: string;
    }): ReactNode {
        const { menu, api } = context.use("ItemGroupLabel");
        return menu.render("itemGroupLabel", {
            element: "div",
            machine: api.getItemGroupLabelProps({ htmlFor: group }),
            unstyled,
            props,
        });
    }

    function Item({
        unstyled,
        item,
        ...props
    }: SelectFieldPartProps & { readonly item: I }): ReactNode {
        const { menu, api, sources } = context.use("Item");
        const source = sources.item(item.value, item.interactionSource);
        return (
            <itemContext.Provider value={{ item }}>
                {menu.render("item", {
                    element: "div",
                    interactionSource: source,
                    machine: api.getItemProps({ item: item as never }),
                    states: {
                        hover: api.getItemState({ item: item as never })
                            .highlighted,
                    },
                    unstyled,
                    props,
                })}
            </itemContext.Provider>
        );
    }

    function ItemLabel({
        unstyled,
        ...props
    }: SelectFieldPartProps): ReactNode {
        const { menu, api } = context.use("ItemLabel");
        const { item } = itemContext.use("ItemLabel");
        return menu.render("itemLabel", {
            element: "span",
            machine: api.getItemTextProps({ item: item as never }),
            unstyled,
            props,
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
