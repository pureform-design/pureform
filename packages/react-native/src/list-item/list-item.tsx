// The list item: its leading icon, its lines (overline, headline, supporting text), and its
// trailing icon or text. With `onPress` it's interactive: it takes the state layer and ripples.

import { listItemAnatomy } from "@pureform/anatomy";
import type { TestIdOverride } from "@pureform/anatomy";
import {
    isPresent,
    listItemLines,
    listItemSelection,
} from "@pureform/binding-core";
import type {
    InteractiveProps,
    ListItemContentProps,
    ListItemPart,
    ListItemVariantProps,
} from "@pureform/binding-core";
import type { ReactNode } from "react";

import { IconSlot, iconSlot } from "../icon-style";
import { useSurfaceIndication } from "../indication";
import { testIdOf, unselectable, withEngine } from "../parts";
import { useEngine } from "../provider";
import { useComponentSlots } from "../styles";

const [INDICATION] = listItemAnatomy.indication!;

export interface ListItemProps
    extends
        ListItemVariantProps,
        ListItemContentProps<ReactNode>,
        InteractiveProps {
    /** The current item, such as the page a navigation list is on. */
    readonly selected?: boolean | undefined;
    readonly disabled?: boolean | undefined;
    /** Makes the item act. */
    readonly onPress?: (() => void) | undefined;
    readonly testId?: TestIdOverride<ListItemPart> | undefined;
}

function ListItemImpl(props: ListItemProps): ReactNode {
    const engine = useEngine();
    const interactive = props.onPress !== undefined;
    const indication = useSurfaceIndication(INDICATION!, {
        indication: props.indication,
        interactionSource: props.interactionSource,
        disabled: props.disabled,
        interactive,
    });
    const { styles: s, selected } = useComponentSlots(
        "listItem",
        indication.select(
            listItemSelection(
                { ...props, lines: props.lines ?? listItemLines(props) },
                interactive ? "button" : "div",
            ),
        ),
        interactive
            ? indication.states({
                  selected: props.selected ?? false,
                  ...(props.disabled ? { disabled: true } : {}),
                  ...(props.mirrorLeading || props.mirrorTrailing
                      ? { mirrored: true }
                      : {}),
              })
            : {},
    );
    const id = (part: ListItemPart) =>
        testIdOf(listItemAnatomy, part, props.testId);
    const line = (part: ListItemPart, value: ReactNode) =>
        isPresent(value) ? (
            <engine.Text selectable={false} style={s[part]} testID={id(part)}>
                {value}
            </engine.Text>
        ) : null;
    const icon = (part: "leading" | "trailing", value: ReactNode) =>
        isPresent(value) ? (
            <engine.View style={s[part]} testID={id(part)}>
                <IconSlot {...iconSlot(selected, part)} motion={s[part]}>
                    {value}
                </IconSlot>
            </engine.View>
        ) : null;
    return (
        <engine.Pressable
            {...(interactive ? indication.handlers : {})}
            role={interactive ? "button" : "listitem"}
            {...(interactive
                ? { onPress: props.onPress, disabled: props.disabled }
                : { disabled: true })}
            style={{ ...s.root, ...unselectable }}
            testID={id("root")}
        >
            {icon("leading", props.leading)}
            <engine.View style={s.content} testID={id("content")}>
                {line("overline", props.overline)}
                {line("headline", props.headline)}
                {line("supportingText", props.supportingText)}
            </engine.View>
            {icon("trailing", props.trailing)}
            {line("trailingText", props.trailingText)}
            {indication.layer(selected)}
        </engine.Pressable>
    );
}

/** Material's list item: `<ListItem headline="Inbox" leading={<Glyph glyph="✉" />} />`. */
export const ListItem = withEngine(ListItemImpl, "ListItem");
