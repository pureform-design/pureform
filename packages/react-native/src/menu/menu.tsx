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
import type { Indication } from "@pureform/binding-core/indication";
import type { Selection } from "@pureform/styling";
import { memo } from "react";
import type { ReactNode } from "react";

import { IconSlot, iconSlot } from "../icon-style";
import { useSurfaceIndication } from "../indication";
import {
    testIdOf,
    unselectable,
    useStableCallback,
    useStableSelection,
    withEngine,
} from "../parts";
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

// An item gets only what it reads, each stable while the menu renders with the same props, so an
// item renders again when it or its selection changes, not with every render of the menu.
interface ItemProps {
    readonly item: MenuItem<ReactNode>;
    readonly selection: Selection<"menu">;
    readonly indication: Indication | undefined;
    readonly testId: TestIdOverride<Part> | undefined;
    readonly selected: boolean;
    readonly onSelect: (value: string) => void;
}

function MenuItemImpl(props: ItemProps): ReactNode {
    const { item } = props;
    const engine = useEngine();
    const indication = useSurfaceIndication(INDICATION!, {
        indication: props.indication,
        interactionSource: item.interactionSource,
        disabled: item.disabled,
    });
    const { styles: s, selected } = useComponentSlots(
        "menu",
        indication.select(props.selection),
        indication.states({
            selected: props.selected,
            disabled: item.disabled ?? false,
            ...(item.mirrorLeadingIcon || item.mirrorTrailingIcon
                ? { mirrored: true }
                : {}),
        }),
    );
    const id = (part: Part) => testIdOf(menuAnatomy, part, props.testId);
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
            onPress={() => props.onSelect(item.value)}
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

const Item = memo(withEngine(MenuItemImpl, "MenuItem"));

function MenuImpl(props: MenuProps): ReactNode {
    const engine = useEngine();
    const selection = useStableSelection(menuSelection(props));
    const select = useStableCallback((value: string) =>
        props.onSelect?.({ value }),
    );
    const { styles: s } = useComponentSlots("menu", selection);
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
                <Item
                    key={item.value}
                    item={item}
                    selection={selection}
                    indication={props.indication}
                    testId={props.testId}
                    selected={props.value === item.value}
                    onSelect={select}
                />
            ))}
        </engine.View>
    );
}

/** Material's menu surface: `<Menu items={[{ value: "cut", label: "Cut" }]} onSelect={…} />`. */
export const Menu = withEngine(MenuImpl, "Menu");
