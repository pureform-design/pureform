import type {
    MenuBehaviorProps,
    MenuItemBehaviorProps,
} from "@pureform/binding-core";

/** Zag's menu props from Root's, besides `id`, `dir`, and the controllable `open`. */
export const menuMachineProps = (props: MenuBehaviorProps) => ({
    onSelect: props.onSelect,
    closeOnSelect: props.closeOnSelect,
    loopFocus: props.loopFocus,
    typeahead: props.typeahead,
    positioning: { placement: "bottom-start" as const, ...props.positioning },
    "aria-label": props["aria-label"],
    ids: {
        trigger: props.ids?.trigger,
        positioner: props.ids?.positioner,
        content: props.ids?.content,
    },
});

type Item = Pick<
    MenuItemBehaviorProps,
    "value" | "valueText" | "disabled" | "closeOnSelect"
>;
/** Zag's item props, a toggleable item's (`getOptionItemProps`) when it has a type. */
export const menuItemMachineProps = <P>(
    api: {
        getItemProps(item: Item): P;
        getOptionItemProps(
            item: Item & {
                type: "checkbox" | "radio";
                checked: boolean;
                onCheckedChange?: ((checked: boolean) => void) | undefined;
            },
        ): P;
    },
    item: MenuItemBehaviorProps,
): P => {
    const base = {
        value: item.value,
        valueText: item.valueText,
        disabled: item.disabled,
        closeOnSelect: item.closeOnSelect,
    };
    return item.type === undefined
        ? api.getItemProps(base)
        : api.getOptionItemProps({
              ...base,
              type: item.type,
              checked: item.checked ?? false,
              onCheckedChange: item.onCheckedChange,
          });
};
