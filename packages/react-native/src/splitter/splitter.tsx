// The splitter: panes side by side (or stacked) with Material's vertical drag handle between each
// pair. A drag on a divider resizes the two panes beside it, and when it lets go, the divider
// snaps to the nearest anchor (or the next one the way it was flung), as Compose's pane expansion
// does. Assistive technology adjusts it (increment, decrement), and on the web the arrow keys do.
// A pane's content scrolls in its own `ScrollView` if the app gives it one; the splitter never
// scrolls anything.

import { splitterAnatomy } from "@pureform/anatomy";
import type { PartName, TestIdOverride } from "@pureform/anatomy";
import {
    SPLITTER_ANCHORS,
    splitterInitialSizes,
    splitterLimits,
    splitterMoveBy,
    splitterOrientation,
    splitterPercent,
    splitterSelection,
    splitterSnap,
} from "@pureform/binding-core";
import type {
    SplitterAnchor,
    SplitterContentProps,
    SplitterSize,
    SplitterSizeDetails,
    SplitterVariantProps,
} from "@pureform/binding-core";
import { Fragment, useRef, useState } from "react";
import type { ReactNode } from "react";
import { PanResponder } from "react-native";
import type { LayoutChangeEvent } from "react-native";

import { testIdOf, unselectable, withEngine } from "../parts";
import { useDirection } from "../provider";
import { useComponentSlots } from "../styles";

/** The splitter's parts: `"root" | "panel" | "resizeTrigger" | "resizeTriggerIndicator"`. */
type Part = PartName<typeof splitterAnatomy>;

const ADJUSTABLE = [{ name: "increment" }, { name: "decrement" }];

export interface SplitterProps
    extends SplitterVariantProps, SplitterContentProps<ReactNode> {
    /** Each pane's size, controlled. */
    readonly size?: readonly SplitterSize[] | undefined;
    /** Each pane's size to start with. Left out, they share the room. */
    readonly defaultSize?: readonly SplitterSize[] | undefined;
    /** Called as the sizes change: while dragging, on an adjustment, on a snap. */
    readonly onSizeChange?:
        | ((details: SplitterSizeDetails) => void)
        | undefined;
    /** Where a dragged divider snaps when let go. `[]` lets it rest where it's let go.
     *  @default SPLITTER_ANCHORS */
    readonly anchors?: readonly SplitterAnchor[] | undefined;
    /** How far an adjustment or an arrow key moves a divider, in percent. @default 1 */
    readonly keyboardResizeBy?: number | undefined;
    readonly testId?: TestIdOverride<Part> | undefined;
}

interface TriggerProps {
    readonly splitter: SplitterProps;
    readonly index: number;
    readonly sizes: readonly number[];
    readonly room: number;
    readonly horizontal: boolean;
    readonly rtl: boolean;
    readonly set: (next: number[]) => void;
    readonly onLayout?: ((event: LayoutChangeEvent) => void) | undefined;
}

/** The divider after pane `index`: it takes the drag, the adjustments and the keys. */
function ResizeTrigger(props: TriggerProps): ReactNode {
    const { splitter, index } = props;
    const [dragging, setDragging] = useState(false);
    const { styles: s, views: v } = useComponentSlots<Part>(
        "splitter",
        splitterSelection(splitter),
        { pressed: dragging },
    );
    const limits = splitterLimits(splitter.panes, props.room);
    // The responder is made once; it reads the latest render's values from here.
    const latest = useRef({ ...props, limits });
    latest.current = { ...props, limits };
    const start = useRef<readonly number[]>(props.sizes);
    const along = (dx: number, dy: number) => {
        const { horizontal, rtl } = latest.current;
        return horizontal ? (rtl ? -dx : dx) : dy;
    };
    const pan = useRef(
        PanResponder.create({
            onStartShouldSetPanResponder: () => true,
            onMoveShouldSetPanResponder: () => true,
            onPanResponderGrant: () => {
                start.current = latest.current.sizes;
                setDragging(true);
            },
            onPanResponderMove: (_event, gesture) => {
                const { room, set, limits } = latest.current;
                if (room <= 0) return;
                set(
                    splitterMoveBy(
                        start.current,
                        index,
                        (along(gesture.dx, gesture.dy) / room) * 100,
                        limits,
                    ),
                );
            },
            onPanResponderRelease: (_event, gesture) => {
                setDragging(false);
                const { room, set, limits, splitter: current } = latest.current;
                if (room <= 0) return;
                const moved = splitterMoveBy(
                    start.current,
                    index,
                    (along(gesture.dx, gesture.dy) / room) * 100,
                    limits,
                );
                // `vx`/`vy` are in pixels per millisecond.
                set(
                    splitterSnap({
                        sizes: moved,
                        index,
                        room,
                        anchors: current.anchors ?? SPLITTER_ANCHORS,
                        limits,
                        velocity: along(gesture.vx, gesture.vy) * 1000,
                    }),
                );
            },
            onPanResponderTerminate: () => setDragging(false),
        }),
    ).current;
    const by = splitter.keyboardResizeBy ?? 1;
    const moveBy = (delta: number) =>
        props.set(splitterMoveBy(props.sizes, index, delta, limits));
    const forward = props.horizontal
        ? props.rtl
            ? "ArrowLeft"
            : "ArrowRight"
        : "ArrowDown";
    const backward = props.horizontal
        ? props.rtl
            ? "ArrowRight"
            : "ArrowLeft"
        : "ArrowUp";
    const onKeyDown = (event: {
        nativeEvent: { key?: string; shiftKey?: boolean };
    }) => {
        const step = event.nativeEvent.shiftKey ? 10 : by;
        const key = event.nativeEvent.key;
        if (key === forward) moveBy(step);
        else if (key === backward) moveBy(-step);
        else if (key === "Home") moveBy(-100);
        else if (key === "End") moveBy(100);
    };
    const now = props.sizes[index] ?? 0;
    const id = (part: Part) => testIdOf(splitterAnatomy, part, splitter.testId);
    return (
        <v.resizeTrigger.View
            role="adjustable"
            aria-label={splitter.resizeLabel ?? "Resize panes"}
            aria-valuenow={Math.round(now)}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-orientation={props.horizontal ? "vertical" : "horizontal"}
            focusable
            accessibilityActions={ADJUSTABLE}
            onAccessibilityAction={(event: {
                nativeEvent: { actionName: string };
            }) =>
                moveBy(event.nativeEvent.actionName === "increment" ? by : -by)
            }
            {...({ onKeyDown } as object)}
            {...pan.panHandlers}
            {...(props.onLayout === undefined
                ? {}
                : { onLayout: props.onLayout })}
            style={{ ...s.resizeTrigger, ...unselectable }}
            testID={id("resizeTrigger")}
        >
            <v.resizeTriggerIndicator.View
                style={s.resizeTriggerIndicator}
                testID={id("resizeTriggerIndicator")}
            />
        </v.resizeTrigger.View>
    );
}

function SplitterImpl(props: SplitterProps): ReactNode {
    const { styles: s, views: v } = useComponentSlots<Part>(
        "splitter",
        splitterSelection(props),
    );
    const horizontal = splitterOrientation(props) === "horizontal";
    const rtl = useDirection() === "rtl";
    const [length, setLength] = useState(0);
    const [triggers, setTriggers] = useState(0);
    const room = Math.max(0, length - triggers);
    const [own, setOwn] = useState<number[] | undefined>(undefined);
    const sizes =
        props.size === undefined
            ? (own ??
              splitterInitialSizes(props.panes, props.defaultSize, room))
            : props.size.map((size) => splitterPercent(size, room, 0));
    const set = (next: number[]) => {
        if (next.every((size, at) => size === sizes[at])) return;
        if (props.size === undefined) setOwn(next);
        props.onSizeChange?.({ size: next });
    };
    const onLayout = (event: LayoutChangeEvent) => {
        const { width, height } = event.nativeEvent.layout;
        setLength(horizontal ? width : height);
    };
    const onTriggerLayout = (event: LayoutChangeEvent) => {
        const { width, height } = event.nativeEvent.layout;
        const across = horizontal ? width : height;
        setTriggers(across * Math.max(0, props.panes.length - 1));
    };
    const id = (part: Part) => testIdOf(splitterAnatomy, part, props.testId);
    return (
        <v.root.View style={s.root} onLayout={onLayout} testID={id("root")}>
            {props.panes.map((pane, index) => (
                <Fragment key={pane.id}>
                    <v.panel.View
                        style={{
                            ...s.panel,
                            flexGrow: sizes[index] ?? 0,
                            flexShrink: 1,
                            flexBasis: 0,
                        }}
                        testID={id("panel")}
                    >
                        {pane.content}
                    </v.panel.View>
                    {index < props.panes.length - 1 ? (
                        <ResizeTrigger
                            splitter={props}
                            index={index}
                            sizes={sizes}
                            room={room}
                            horizontal={horizontal}
                            rtl={rtl}
                            set={set}
                            onLayout={index === 0 ? onTriggerLayout : undefined}
                        />
                    ) : null}
                </Fragment>
            ))}
        </v.root.View>
    );
}

/** Material's resizable panes: `<Splitter panes={[{ id: "list", content: list, minSize:
 *  "240px" }, { id: "detail", content: detail }]} />`. */
export const Splitter = withEngine(SplitterImpl, "Splitter");
