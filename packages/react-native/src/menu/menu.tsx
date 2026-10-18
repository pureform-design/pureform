// The menu's surface and its items. Each item is a pressable row with its leading icon, label,
// and trailing icon or text, rippling when pressed. Where the menu shows is the app's (a `Modal`
// around it, as the select does); given `open`, it grows in and fades out.

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
import { useOverlayPresence } from "../presence";
import { useEngine } from "../provider";
import { useComponentSlots } from "../styles";

/** The menu's parts this binding renders. */
type Part = PartName<typeof menuAnatomy>;

const [INDICATION] = menuAnatomy.indication!;

export interface MenuProps extends MenuVariantProps, IndicationProps {
    readonly items: readonly MenuItem<ReactNode>[];
    /** Whether it shows: it grows in when this turns true and fades out when it turns false,
     *  rendering nothing once it's gone. Without it, the surface is always shown, still. */
    readonly open?: boolean | undefined;
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
    const indication = useSurfaceIndication(INDICATION!, {
        indication: props.indication,
        interactionSource: item.interactionSource,
        disabled: item.disabled,
    });
    const {
        styles: s,
        selected,
        views: v,
    } = useComponentSlots<Part>(
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
    const icon = (part: "itemLeading" | "itemTrailing", node: ReactNode) => {
        const Slot = v[part];
        return isPresent(node) ? (
            <Slot.View style={s[part]} testID={id(part)}>
                <IconSlot {...iconSlot(selected, part)} motion={s[part]}>
                    {node}
                </IconSlot>
            </Slot.View>
        ) : null;
    };
    return (
        <v.item.Pressable
            {...indication.handlers}
            role="menuitem"
            disabled={item.disabled}
            onPress={() => props.onSelect(item.value)}
            style={{ ...s.item, ...unselectable }}
            testID={id("item")}
        >
            {icon("itemLeading", item.leadingIcon)}
            <v.itemLabel.Text
                selectable={false}
                style={s.itemLabel}
                testID={id("itemLabel")}
            >
                {item.label}
            </v.itemLabel.Text>
            {icon("itemTrailing", item.trailingIcon)}
            {isPresent(item.trailingText) ? (
                <v.itemTrailingText.Text
                    selectable={false}
                    style={s.itemTrailingText}
                    testID={id("itemTrailingText")}
                >
                    {item.trailingText}
                </v.itemTrailingText.Text>
            ) : null}
            {indication.layer(selected)}
        </v.item.Pressable>
    );
}

const Item = memo(withEngine(MenuItemImpl, "MenuItem"));

function MenuImpl(props: MenuProps): ReactNode {
    const engine = useEngine();
    const selection = useStableSelection(menuSelection(props));
    const select = useStableCallback((value: string) =>
        props.onSelect?.({ value }),
    );
    const { styles: s, views: v } = useComponentSlots<Part>("menu", selection);
    const presence = useOverlayPresence(props.open, "popup");
    if (!presence.present) return null;
    // The engine's view where it enters and leaves, the slot's own while it's still.
    const Root = props.open === undefined ? v.root : engine;
    return (
        <Root.View
            {...presence.props}
            role="menu"
            {...(props["aria-label"] === undefined
                ? {}
                : { "aria-label": props["aria-label"] })}
            style={{ ...s.root, ...presence.style }}
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
        </Root.View>
    );
}

/** Material's menu surface: `<Menu items={[{ value: "cut", label: "Cut" }]} onSelect={…} />`. */
export const Menu = withEngine(MenuImpl, "Menu");
