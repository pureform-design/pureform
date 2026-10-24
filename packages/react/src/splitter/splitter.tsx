// The splitter: Root on Zag's splitter machine, its `Panel`s and a `ResizeTrigger` (Material's
// vertical drag handle) between each pair, and the ready-made Splitter over them. A drag or the
// arrow keys resize the panes; when a drag lets go, the divider snaps to the nearest anchor (or
// the next one the way it was flung), as Compose's pane expansion does, settling there on its
// spring from the drag's speed.

import { splitterAnatomy } from "@pureform/anatomy";
import {
    createDragVelocity,
    SPLITTER_ROOT_PROPS,
    splitterMachineProps,
    splitterOrientation,
    splitterSelection,
    splitterSizeProps,
    splitterTriggerId,
    splitterTriggerProps,
} from "@pureform/binding-core";
import type {
    SplitterContentProps,
    SplitterRootOwnProps,
    SplitterSize,
    SplitterSizeDetails,
} from "@pureform/binding-core";
import { splitterRelease } from "@pureform/binding-dom";
import * as splitter from "@pureform/machines/splitter";
import { normalizeProps } from "@zag-js/react";
import type { PropTypes } from "@zag-js/react";
import type { ElementType, PointerEvent, ReactNode } from "react";
import { Fragment, useId, useRef } from "react";

import { useControllable } from "../controllable";
import { useMachine } from "../machine";
import { createPartContext } from "../part-context";
import { useComponent, useSlotProps } from "../parts";
import type { ComponentScope, SlotKeyedProps } from "../parts";
import { combinePartProps, omitProps } from "../props";
import type { PartProps } from "../props";
import { useDirection } from "../provider";

type Anatomy = typeof splitterAnatomy;

/** A drag under way: its divider and its speed, and what stops the last snap's settle. */
interface Drag {
    trigger: string | null;
    readonly velocity: ReturnType<typeof createDragVelocity>;
    stopSettle: () => void;
}

/** What Root shares with its parts. */
interface SplitterContextValue {
    readonly scope: ComponentScope<Anatomy>;
    readonly api: splitter.Api<PropTypes>;
    readonly drag: Drag;
    readonly along: (event: { clientX: number; clientY: number }) => number;
    /** Measures the panes if the machine hasn't yet: it has no sizes until it has measured the
     *  root, which its resize observer may not have done when a divider is first used. */
    readonly measure: () => void;
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
    /** The props of the handle's pill, the element the trigger draws inside it. */
    readonly indicatorProps?:
        | (PartProps & { readonly unstyled?: boolean | undefined })
        | undefined;
}

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
        stopSettle: () => {},
    }).current;
    const horizontal = splitterOrientation(props) === "horizontal";
    const size = useControllable<
        "size",
        readonly SplitterSize[],
        SplitterSizeDetails
    >("Splitter", "size", props);
    const service = useMachine(splitter.machine, {
        dir,
        ...splitterMachineProps({ id: generated, ...props }),
        ...splitterSizeProps(size.machineProps, props.panels),
        onResizeEnd: (details) => {
            const trigger = drag.trigger;
            drag.trigger = null;
            if (trigger === null) return;
            const current = latest.current;
            const released = splitterRelease({
                root: rootRef.current,
                horizontal: horizontal,
                trigger,
                sizes: details.size,
                panels: current.panels,
                anchors: current.anchors,
                velocity: drag.velocity.velocity(),
            });
            if (released) {
                drag.stopSettle = released.stopSettle;
                service.send({ type: "SIZE.SET", size: released.sizes });
            }
        },
    });
    const api = splitter.connect(service, normalizeProps);
    const scope = useComponent(splitterAnatomy, {
        selection: splitterSelection(props),
        testId: props.testId,
        unstyled: props.unstyled,
    });
    const measure = () => {
        if (service.context.get("size").length === 0)
            service.send({ type: "ROOT.RESIZE" });
    };
    const along = (event: { clientX: number; clientY: number }) =>
        horizontal
            ? dir === "rtl"
                ? -event.clientX
                : event.clientX
            : event.clientY;
    const { as, ...rest } = omitProps(props, SPLITTER_ROOT_PROPS);
    return (
        <context.Provider value={{ scope, api, drag, along, measure }}>
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
    indicatorProps,
    ...props
}: SplitterResizeTriggerProps): ReactNode {
    const { scope, api, drag, along, measure } = context.use("ResizeTrigger");
    const { unstyled: indicatorUnstyled, ...indicator } = indicatorProps ?? {};
    const state = api.getResizeTriggerState({ id, disabled });
    return scope.render("resizeTrigger", {
        element: "div",
        machine: combinePartProps([
            { onFocus: measure, onKeyDown: measure, onPointerDown: measure },
            api.getResizeTriggerProps({ id, disabled }),
            splitterTriggerProps({ label, dragging: state.dragging }),
            {
                onPointerDown: (event: PointerEvent) => {
                    if (event.button !== 0 || disabled) return;
                    drag.stopSettle();
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
                unstyled: indicatorUnstyled,
                props: indicator,
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
                                indicatorProps={slot("resizeTriggerIndicator")}
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
