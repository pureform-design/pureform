// The splitter: Root on Zag's splitter machine, its `Panel`s and a `ResizeTrigger` (Material's
// vertical drag handle) between each pair, and the ready-made Splitter over them. A drag or the
// arrow keys resize the panes; when a drag lets go, the divider snaps to the nearest anchor (or
// the next one the way it was flung), as Compose's pane expansion does.

import { splitterAnatomy } from "@pureform/anatomy";
import {
    createDragVelocity,
    SPLITTER_ANCHORS,
    SPLITTER_ROOT_PROPS,
    splitterLimits,
    splitterMachineProps,
    splitterOrientation,
    splitterSelection,
    splitterSnap,
    splitterTriggerId,
    splitterTriggerProps,
} from "@pureform/binding-core";
import type {
    SplitterContentProps,
    SplitterRootOwnProps,
} from "@pureform/binding-core";
import * as splitter from "@pureform/machines/splitter";
import { normalizeProps } from "@zag-js/react";
import type { PropTypes } from "@zag-js/react";
import type { ElementType, PointerEvent, ReactNode } from "react";
import { Fragment, useId, useRef } from "react";

import { useMachine } from "../machine";
import { createPartContext } from "../part-context";
import { useComponent, useSlotProps } from "../parts";
import type { ComponentScope, SlotKeyedProps } from "../parts";
import { combinePartProps, omitProps } from "../props";
import type { PartProps } from "../props";
import { useDirection } from "../provider";

type Anatomy = typeof splitterAnatomy;

/** A drag under way: its divider and its speed. */
interface Drag {
    trigger: string | null;
    readonly velocity: ReturnType<typeof createDragVelocity>;
}

/** What Root shares with its parts. */
interface SplitterContextValue {
    readonly scope: ComponentScope<Anatomy>;
    readonly api: splitter.Api<PropTypes>;
    readonly drag: Drag;
    readonly along: (event: { clientX: number; clientY: number }) => number;
}

const context = createPartContext<SplitterContextValue>("Splitter");

/** Root's props: the panes, their sizes and anchors, the variants and tokens, `testId` and
 *  `unstyled` for every part, `as`, and the element's own props. */
export interface SplitterRootProps
    extends Omit<PartProps, keyof SplitterRootOwnProps>, SplitterRootOwnProps {
    /** Another element or component to render instead of `<div>`. */
    readonly as?: ElementType | undefined;
}

/** A pane's props: its `id` (one of Root's `panels`), the element's own, and `unstyled`. */
export interface SplitterPanelProps extends PartProps {
    readonly id: string;
    readonly unstyled?: boolean | undefined;
}

/** A divider's props: the panes it sits between (`"list:detail"`), its name, and `unstyled`. */
export interface SplitterResizeTriggerProps extends PartProps {
    readonly id: `${string}:${string}`;
    /** Its name, for assistive technology. @default "Resize panes" */
    readonly label?: string | undefined;
    readonly disabled?: boolean | undefined;
    readonly unstyled?: boolean | undefined;
}

/** The panes' room along the axis: the root less its dividers. */
const roomOf = (root: HTMLElement | null, horizontal: boolean): number => {
    if (!root) return 0;
    const length = (element: Element) => {
        const rect = element.getBoundingClientRect();
        return horizontal ? rect.width : rect.height;
    };
    let room = length(root);
    for (const child of root.children)
        if (child.getAttribute("data-part") === "resize-trigger")
            room -= length(child);
    return room;
};

/** The splitter's root: it runs the machine that sizes the panes. */
function Root(props: SplitterRootProps): ReactNode {
    const generated = useId();
    const dir = useDirection();
    const rootRef = useRef<HTMLElement>(null);
    const latest = useRef(props);
    latest.current = props;
    const drag = useRef<Drag>({
        trigger: null,
        velocity: createDragVelocity(),
    }).current;
    const horizontal = splitterOrientation(props) === "horizontal";
    const service = useMachine(splitter.machine, {
        dir,
        ...splitterMachineProps({ id: generated, ...props }),
        onResizeEnd: (details) => {
            const trigger = drag.trigger;
            drag.trigger = null;
            if (trigger === null) return;
            const current = latest.current;
            const index = current.panels.findIndex(
                (panel) => panel.id === trigger.split(":")[0],
            );
            const room = roomOf(rootRef.current, horizontal);
            const snapped = splitterSnap({
                sizes: details.size,
                index,
                room,
                anchors: current.anchors ?? SPLITTER_ANCHORS,
                limits: splitterLimits(current.panels, room),
                velocity: drag.velocity.velocity(),
            });
            if (snapped.some((size, at) => size !== details.size[at]))
                service.send({ type: "SIZE.SET", size: snapped });
        },
    });
    const api = splitter.connect(service, normalizeProps);
    const scope = useComponent(splitterAnatomy, {
        selection: splitterSelection(props),
        testId: props.testId,
        unstyled: props.unstyled,
    });
    const along = (event: { clientX: number; clientY: number }) =>
        horizontal
            ? dir === "rtl"
                ? -event.clientX
                : event.clientX
            : event.clientY;
    const { as, ...rest } = omitProps(props, SPLITTER_ROOT_PROPS);
    return (
        <context.Provider value={{ scope, api, drag, along }}>
            {scope.render("root", {
                element: "div",
                as,
                ref: rootRef,
                machine: api.getRootProps(),
                props: rest,
            })}
        </context.Provider>
    );
}

/** A pane. Its content scrolls natively when it overflows. */
function Panel({ id, unstyled, ...props }: SplitterPanelProps): ReactNode {
    const { scope, api } = context.use("Panel");
    return scope.render("panel", {
        element: "div",
        machine: api.getPanelProps({ id }),
        unstyled,
        props,
    });
}

/** The divider between two panes, holding Material's drag handle pill. */
function ResizeTrigger({
    id,
    label,
    disabled,
    unstyled,
    ...props
}: SplitterResizeTriggerProps): ReactNode {
    const { scope, api, drag, along } = context.use("ResizeTrigger");
    const state = api.getResizeTriggerState({ id, disabled });
    return scope.render("resizeTrigger", {
        element: "div",
        machine: combinePartProps([
            api.getResizeTriggerProps({ id, disabled }),
            splitterTriggerProps({ label, dragging: state.dragging }),
            {
                onPointerDown: (event: PointerEvent) => {
                    if (event.button !== 0 || disabled) return;
                    drag.trigger = id;
                    drag.velocity.reset();
                    drag.velocity.add(along(event), event.timeStamp);
                },
                onPointerMove: (event: PointerEvent) => {
                    if (drag.trigger === id)
                        drag.velocity.add(along(event), event.timeStamp);
                },
            },
        ]),
        unstyled,
        props: {
            ...props,
            children: scope.render("resizeTriggerIndicator", {
                element: "div",
                machine: {
                    ...api.getResizeTriggerIndicator({ id, disabled }),
                    "aria-hidden": "true",
                },
            }),
        },
    });
}

/** The ready-made splitter's props: Root's (less `panels`, which `panes` gives), with
 *  `className`, `style`, and `slotProps` keyed by part, and its panes. */
export interface SplitterProps
    extends
        Omit<
            SplitterRootProps,
            keyof SlotKeyedProps<Anatomy> | "children" | "panels"
        >,
        SlotKeyedProps<Anatomy>,
        SplitterContentProps<ReactNode> {}

/** The ready-made splitter: each pane, with a divider between each pair. */
function ReadyMade(props: SplitterProps): ReactNode {
    const slot = useSlotProps(props);
    const {
        className: _className,
        style: _style,
        slotProps: _slotProps,
        panes,
        resizeLabel,
        ...rootProps
    } = props;
    const panels = panes.map(({ content: _content, ...panel }) => panel);
    return (
        <Root {...rootProps} {...slot("root")} panels={panels}>
            {panes.map((pane, index) => {
                const next = panes[index + 1];
                return (
                    <Fragment key={pane.id}>
                        <Panel {...slot("panel")} id={pane.id}>
                            {pane.content}
                        </Panel>
                        {next && (
                            <ResizeTrigger
                                {...slot("resizeTrigger")}
                                id={splitterTriggerId(pane.id, next.id)}
                                label={resizeLabel}
                            />
                        )}
                    </Fragment>
                );
            })}
        </Root>
    );
}

/** Material's resizable panes: `<Splitter panes={[{ id: "list", content: list, minSize:
 *  "240px" }, { id: "detail", content: detail }]} />`, or compose its parts under
 *  `Splitter.Root`: `Panel` and `ResizeTrigger`. */
export const Splitter = Object.assign(ReadyMade, {
    Root,
    Panel,
    ResizeTrigger,
});
