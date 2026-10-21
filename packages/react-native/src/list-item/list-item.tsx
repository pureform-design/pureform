// The list item: its leading icon, its lines (overline, headline, supporting text), and its
// trailing icon or text. With `onPress` it's interactive: it takes the state layer and ripples.
// Given a `region`, it's expandable: a button whose indicator turns over, showing the region under
// it while expanded (React state, as the accordion's; there's no Zag here).

import { listItemAnatomy } from "@pureform/anatomy";
import type { TestIdOverride } from "@pureform/anatomy";
import {
    isPresent,
    listItemLines,
    listItemSelection,
    listItemVariants,
} from "@pureform/binding-core";
import type {
    InteractiveProps,
    ListItemContentProps,
    ListItemExpandProps,
    ListItemPart,
    ListItemVariantProps,
    ListVariantProps,
} from "@pureform/binding-core";
import { createContext, use } from "react";
import type { ReactNode } from "react";

import { IconSlot, iconSlot } from "../icon-style";
import { useSurfaceIndication } from "../indication";
import { testIdOf, unselectable, useControllable, withEngine } from "../parts";
import { useComponentSlots } from "../styles";

const [INDICATION] = listItemAnatomy.indication!;

export interface ListItemProps
    extends
        ListItemVariantProps,
        ListItemContentProps<ReactNode>,
        ListItemExpandProps,
        InteractiveProps {
    /** The current item, such as the page a navigation list is on. */
    readonly selected?: boolean | undefined;
    readonly disabled?: boolean | undefined;
    /** Makes the item act. An expandable item (given a `region`) acts as well: it expands. */
    readonly onPress?: (() => void) | undefined;
    readonly testId?: TestIdOverride<ListItemPart> | undefined;
}

/** A list's variants, its items' defaults: an item's own win. */
export const ListDefaults = createContext<ListVariantProps | null>(null);

function ListItemImpl(props: ListItemProps): ReactNode {
    const list = use(ListDefaults);
    const expandable = isPresent(props.region);
    const [expanded, setExpanded] = useControllable<"expanded", boolean>(
        "ListItem",
        "expanded",
        props.expanded,
        props.defaultExpanded,
        props.onExpandedChange,
        false,
    );
    const interactive = expandable || props.onPress !== undefined;
    const indication = useSurfaceIndication(INDICATION!, {
        indication: props.indication,
        interactionSource: props.interactionSource,
        disabled: props.disabled,
        interactive,
    });
    const {
        styles: s,
        selected,
        views: v,
    } = useComponentSlots<ListItemPart>(
        "listItem",
        indication.select(
            listItemSelection(
                {
                    ...listItemVariants(list, props),
                    lines: props.lines ?? listItemLines(props),
                },
                interactive ? "button" : "div",
            ),
        ),
        interactive
            ? indication.states({
                  selected: props.selected ?? false,
                  ...(expandable ? { expanded } : {}),
                  ...(props.disabled ? { disabled: true } : {}),
                  ...(props.mirrorLeading || props.mirrorTrailing
                      ? { mirrored: true }
                      : {}),
              })
            : {},
    );
    const id = (part: ListItemPart) =>
        testIdOf(listItemAnatomy, part, props.testId);
    const line = (part: ListItemPart, value: ReactNode) => {
        const Slot = v[part];
        return isPresent(value) ? (
            <Slot.Text selectable={false} style={s[part]} testID={id(part)}>
                {value}
            </Slot.Text>
        ) : null;
    };
    const icon = (
        part: "leading" | "trailing" | "indicator",
        value: ReactNode,
    ) => {
        const Slot = v[part];
        return isPresent(value) ? (
            <Slot.View style={s[part]} testID={id(part)}>
                <IconSlot {...iconSlot(selected, part)} motion={s[part]}>
                    {value}
                </IconSlot>
            </Slot.View>
        ) : null;
    };
    const onPress = expandable
        ? () => {
              setExpanded(!expanded);
              props.onPress?.();
          }
        : props.onPress;
    const row = (
        <v.root.Pressable
            {...(interactive ? indication.handlers : {})}
            role={interactive ? "button" : "listitem"}
            {...(expandable ? { "aria-expanded": expanded } : {})}
            {...(interactive
                ? { onPress, disabled: props.disabled }
                : { disabled: true })}
            style={{ ...s.root, ...unselectable }}
            testID={id("root")}
        >
            {icon("leading", props.leading)}
            <v.content.View style={s.content} testID={id("content")}>
                {line("overline", props.overline)}
                {line("headline", props.headline)}
                {line("supportingText", props.supportingText)}
            </v.content.View>
            {icon("trailing", props.trailing)}
            {line("trailingText", props.trailingText)}
            {expandable ? icon("indicator", "⌄") : null}
            {indication.layer(selected)}
        </v.root.Pressable>
    );
    if (!expandable) return row;
    return (
        <>
            {row}
            {expanded ? (
                <v.region.View style={s.region} testID={id("region")}>
                    {props.region}
                </v.region.View>
            ) : null}
        </>
    );
}

/** Material's list item: `<ListItem headline="Inbox" leading={<Glyph glyph="✉" />} />`. */
export const ListItem = withEngine(ListItemImpl, "ListItem");
