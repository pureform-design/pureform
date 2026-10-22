// The list item: its leading icon, its lines (overline, headline, supporting text), and its
// trailing icon or text. With `onPress` it's interactive: it takes the state layer and ripples.
// Given a `region`, it's expandable: a button whose indicator turns over, showing the region under
// it while expanded (React state, as the accordion's; there's no Zag here). Given a `swipeAction`,
// it sits in a frame with the action under it, and slides to uncover it; an expandable item too.

import { listItemAnatomy } from "@pureform/anatomy";
import type { TestIdOverride } from "@pureform/anatomy";
import {
    isPresent,
    LIST_ITEM_SWIPE_SLOP,
    LIST_ITEM_SWIPE_WIDTH,
    listItemLines,
    listItemSelection,
    listItemVariants,
    swipeKeyAction,
    swipeOffsetOf,
    swipeRestOffset,
    swipeSettlesOpen,
    swipeTokens,
} from "@pureform/binding-core";
import type {
    InteractiveProps,
    ListItemContentProps,
    ListItemExpandProps,
    ListItemSwipeProps,
    ListItemPart,
    ListItemVariantProps,
    ListVariantProps,
} from "@pureform/binding-core";
import { createContext, use, useEffect, useRef, useState } from "react";
import type { ReactNode } from "react";
import { PanResponder } from "react-native";

import { iconParts } from "../icon-style";
import { useSurfaceIndication } from "../indication";
import { testIdOf, unselectable, useControllable, withEngine } from "../parts";
import { useDirection } from "../provider";
import { useComponentSlots } from "../styles";

const [INDICATION] = listItemAnatomy.indication!;

export interface ListItemProps
    extends
        ListItemVariantProps,
        ListItemContentProps<ReactNode>,
        ListItemExpandProps,
        ListItemSwipeProps,
        InteractiveProps {
    /** The current item, such as the page a navigation list is on. */
    readonly selected?: boolean | undefined;
    readonly disabled?: boolean | undefined;
    /** Makes the item act. An expandable item (given a `region`) acts as well: it expands. A
     *  swipeable item (one with a `swipeAction`) takes the drag instead, so it can't also be
     *  pressed, but for an expandable one: put the press on its content. */
    readonly onPress?: (() => void) | undefined;
    /** An interactive item's role in place of `button`: a selection list's options are `option`s,
     *  marked with `aria-selected`. */
    readonly role?: "option" | undefined;
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
    const swipeable = props.swipeable ?? isPresent(props.swipeAction);
    const interactive =
        expandable || (props.onPress !== undefined && !swipeable);
    const rtl = useDirection() === "rtl";
    const width = props.swipeWidth ?? LIST_ITEM_SWIPE_WIDTH;
    const [own, setOwn] = useState(props.defaultRevealed ?? false);
    const revealed = props.revealed ?? own;
    // Where a drag has the row, as its slid offset; `undefined` when it isn't held.
    const [drag, setDrag] = useState<number | undefined>(undefined);
    // How fast a released drag had the row sliding, in pixels per second, which the snap-back's
    // spring carries on from; for the render after the release only.
    const [fling, setFling] = useState<number | undefined>(undefined);
    useEffect(() => {
        if (fling !== undefined) setFling(undefined);
    }, [fling]);
    const offset = drag ?? swipeRestOffset(revealed, width);
    const setRevealed = (next: boolean) => {
        if (next === revealed) return;
        if (props.revealed === undefined) setOwn(next);
        props.onRevealedChange?.({ revealed: next });
    };
    // The responder is made once; it reads the latest render's values from here.
    const latest = useRef({ offset, width, rtl, setRevealed });
    latest.current = { offset, width, rtl, setRevealed };
    const start = useRef(0);
    const pan = useRef(
        PanResponder.create({
            // Asked on the way down, so a horizontal drag is the frame's even over a pressable
            // (expandable) row.
            onMoveShouldSetPanResponderCapture: (_event, gesture) =>
                Math.abs(gesture.dx) > LIST_ITEM_SWIPE_SLOP &&
                Math.abs(gesture.dx) > Math.abs(gesture.dy),
            onPanResponderGrant: () => {
                start.current = latest.current.offset;
            },
            onPanResponderMove: (_event, gesture) =>
                setDrag(
                    swipeOffsetOf(
                        start.current,
                        0,
                        gesture.dx,
                        latest.current.width,
                        latest.current.rtl,
                    ),
                ),
            onPanResponderRelease: (_event, gesture) => {
                const { width, rtl, setRevealed } = latest.current;
                // `vx` is in pixels per millisecond, along the screen; the offset grows toward
                // the inline start.
                setFling(gesture.vx * 1000 * (rtl ? 1 : -1));
                setRevealed(
                    swipeSettlesOpen(
                        swipeOffsetOf(start.current, 0, gesture.dx, width, rtl),
                        width,
                    ),
                );
                setDrag(undefined);
            },
            onPanResponderTerminate: () => setDrag(undefined),
        }),
    ).current;
    const indication = useSurfaceIndication(INDICATION!, {
        indication: props.indication,
        interactionSource: props.interactionSource,
        disabled: props.disabled,
        interactive,
    });
    const slots = useComponentSlots<ListItemPart>(
        "listItem",
        indication.select(
            listItemSelection(
                {
                    ...listItemVariants(list, props),
                    swipeable,
                    lines: props.lines ?? listItemLines(props),
                    ...(swipeable
                        ? {
                              tokens: {
                                  ...props.tokens,
                                  ...swipeTokens(offset, width),
                              },
                          }
                        : {}),
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
            : swipeable && drag !== undefined
              ? { pressed: true }
              : {},
        fling === undefined ? undefined : { swipeOffset: fling },
    );
    const { styles: s, selected, views: v } = slots;
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
    const icon = iconParts(slots, id);
    const action = isPresent(props.swipeAction) ? (
        <v.action.View
            aria-hidden={revealed ? undefined : true}
            importantForAccessibility={
                revealed ? "auto" : "no-hide-descendants"
            }
            pointerEvents={revealed ? "auto" : "none"}
            style={s.action}
            testID={id("action")}
        >
            {props.swipeAction}
        </v.action.View>
    ) : null;
    const content = (
        <>
            {icon("leading", props.leading)}
            <v.content.View style={s.content} testID={id("content")}>
                {line("overline", props.overline)}
                {line("headline", props.headline)}
                {line("supportingText", props.supportingText)}
            </v.content.View>
            {icon("trailing", props.trailing)}
            {line("trailingText", props.trailingText)}
        </>
    );
    // The arrow keys reveal and close a swipeable row's action, on the web.
    const keys = swipeable
        ? ({
              onKeyDown: (event: { nativeEvent: { key?: string } }) => {
                  const next = swipeKeyAction(event.nativeEvent.key ?? "", rtl);
                  if (next) setRevealed(next === "reveal");
              },
          } as object)
        : {};
    // A swipeable item's frame: the row, which takes the drag, and the action after it (so it
    // comes after the row in the accessibility order), drawn under the row.
    const framed = (row: ReactNode) =>
        swipeable ? (
            <v.frame.View
                {...pan.panHandlers}
                style={s.frame}
                testID={id("frame")}
            >
                {row}
                {action}
            </v.frame.View>
        ) : (
            row
        );
    // A swipeable row takes the drag rather than the press, unless it expands.
    if (swipeable && !expandable)
        return framed(
            <v.root.View
                {...keys}
                focusable
                role="listitem"
                style={{ ...s.root, ...unselectable }}
                testID={id("root")}
            >
                {content}
            </v.root.View>,
        );
    const onPress = expandable
        ? () => {
              setExpanded(!expanded);
              props.onPress?.();
          }
        : props.onPress;
    const row = (
        <v.root.Pressable
            {...(interactive ? indication.handlers : {})}
            role={interactive ? (props.role ?? "button") : "listitem"}
            {...(interactive && props.role === "option"
                ? { "aria-selected": props.selected ?? false }
                : {})}
            {...(expandable ? { "aria-expanded": expanded } : {})}
            {...(interactive
                ? { onPress, disabled: props.disabled }
                : { disabled: true })}
            {...keys}
            style={{ ...s.root, ...unselectable }}
            testID={id("root")}
        >
            {content}
            {expandable ? icon("indicator", "⌄") : null}
            {indication.layer(selected)}
        </v.root.Pressable>
    );
    if (!expandable) return row;
    return (
        <>
            {framed(row)}
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
