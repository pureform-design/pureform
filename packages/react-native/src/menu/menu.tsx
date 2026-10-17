// The menu's surface and its items. Each item is a pressable row with its leading icon, label,
// and trailing icon or text, rippling when pressed. Where the menu shows is the app's (a `Modal`
// around it, as the select does).

import { menuAnatomy } from "@pureform/anatomy";
import type { PartName, TestIdOverride } from "@pureform/anatomy";
import { isPresent, menuSelection } from "@pureform/binding-core";
import type {
    IndicationProps,
    MenuItem,
    MenuSelectDetails,
    MenuVariantProps,
} from "@pureform/binding-core";
import type { ReactNode } from "react";

import { IconSlot, iconSlot } from "../icon-style";
import { useSurfaceIndication } from "../indication";
import { testIdOf, unselectable, withEngine } from "../parts";
import { useEngine } from "../provider";
import { useComponentSlots } from "../styles";

/** The menu's parts this binding renders. */
type Part = PartName<typeof menuAnatomy>;

const [INDICATION] = menuAnatomy.indication!;

export interface MenuProps extends MenuVariantProps, IndicationProps {
    readonly items: readonly MenuItem<ReactNode>[];
    /** The item shown selected, such as a select's value. */
    readonly value?: string | null | undefined;
    /** An item was picked. */
    readonly onSelect?: ((details: MenuSelectDetails) => void) | undefined;
    readonly "aria-label"?: string | undefined;
    readonly testId?: TestIdOverride<Part> | undefined;
}

function MenuItemImpl(props: {
    readonly menu: MenuProps;
    readonly item: MenuItem<ReactNode>;
}): ReactNode {
    const { menu, item } = props;
    const engine = useEngine();
    const indication = useSurfaceIndication(INDICATION!, {
        indication: menu.indication,
        interactionSource: item.interactionSource,
        disabled: item.disabled,
    });
    const { styles: s, selected } = useComponentSlots(
        "menu",
        indication.select(menuSelection(menu)),
        indication.states({
            selected: menu.value === item.value,
            disabled: item.disabled ?? false,
            ...(item.mirrorLeadingIcon || item.mirrorTrailingIcon
                ? { mirrored: true }
                : {}),
        }),
    );
    const id = (part: Part) => testIdOf(menuAnatomy, part, menu.testId);
    const icon = (part: "itemLeading" | "itemTrailing", node: ReactNode) =>
        isPresent(node) ? (
            <engine.View style={s[part]} testID={id(part)}>
                <IconSlot {...iconSlot(selected, part)} motion={s[part]}>
                    {node}
                </IconSlot>
            </engine.View>
        ) : null;
    return (
        <engine.Pressable
            {...indication.handlers}
            role="menuitem"
            disabled={item.disabled}
            onPress={() => menu.onSelect?.({ value: item.value })}
            style={{ ...s.item, ...unselectable }}
            testID={id("item")}
        >
            {icon("itemLeading", item.leadingIcon)}
            <engine.Text
                selectable={false}
                style={s.itemLabel}
                testID={id("itemLabel")}
            >
                {item.label}
            </engine.Text>
            {icon("itemTrailing", item.trailingIcon)}
            {isPresent(item.trailingText) ? (
                <engine.Text
                    selectable={false}
                    style={s.itemTrailingText}
                    testID={id("itemTrailingText")}
                >
                    {item.trailingText}
                </engine.Text>
            ) : null}
            {indication.layer(selected)}
        </engine.Pressable>
    );
}

const Item = withEngine(MenuItemImpl, "MenuItem");

function MenuImpl(props: MenuProps): ReactNode {
    const engine = useEngine();
    const { styles: s } = useComponentSlots("menu", menuSelection(props));
    return (
        <engine.View
            role="menu"
            {...(props["aria-label"] === undefined
                ? {}
                : { "aria-label": props["aria-label"] })}
            style={s.root}
            testID={testIdOf(menuAnatomy, "root", props.testId)}
        >
            {props.items.map((item) => (
                <Item key={item.value} menu={props} item={item} />
            ))}
        </engine.View>
    );
}

/** Material's menu surface: `<Menu items={[{ value: "cut", label: "Cut" }]} onSelect={…} />`. */
export const Menu = withEngine(MenuImpl, "Menu");
