// The splitter: Root on Zag's splitter machine, its `Panel`s and a `ResizeTrigger` (Material's
// vertical drag handle) between each pair, and the ready-made Splitter over them. A drag or the
// arrow keys resize the panes; when a drag lets go, the divider snaps to the nearest anchor (or
// the next one the way it was flung), as Compose's pane expansion does, settling
// there on its spring from the drag's speed.

import { splitterAnatomy } from "@pureform/anatomy";
import {
    createDragVelocity,
    SPLITTER_ANCHORS,
    SPLITTER_ROOT_PROPS,
    SPLITTER_SETTLE,
    splitterLimits,
    splitterMachineProps,
    splitterOrientation,
    splitterSelection,
    splitterSizeProps,
    splitterSnap,
    splitterTriggerId,
    splitterTriggerProps,
} from "@pureform/binding-core";
import type {
    SplitterContentProps,
    SplitterPane,
    SplitterRootOwnProps,
    SplitterSize,
    SplitterSizeDetails,
} from "@pureform/binding-core";
import { settleOnSpring } from "@pureform/binding-core/dom";
import type { PropTypes } from "@pureform/machines";
import * as splitter from "@pureform/machines/splitter";
import type { JSX, ValidComponent } from "@solidjs/web";
import {
    type Accessor,
    createMemo,
    createUniqueId,
    For,
    merge,
    omit,
    Show,
} from "solid-js";

import { useControllable } from "../controllable";
import { normalizeProps, useMachine } from "../internal/zag";
import { createPartContext } from "../part-context";
import { createSlotProps, useComponent } from "../parts";
import type { ComponentScope, SlotKeyedProps } from "../parts";
import { combinePartProps } from "../props";
import type { PartProps } from "../props";
import { useDirection } from "../provider";

type Anatomy = typeof splitterAnatomy;

/** A drag under way: its divider and its speed. */
interface Drag {
    trigger: string | null;
    readonly velocity: ReturnType<typeof createDragVelocity>;
    stopSettle: () => void;
}

/** What Root shares with its parts. */
interface SplitterContextValue {
    readonly scope: ComponentScope<Anatomy>;
    readonly api: Accessor<splitter.Api<PropTypes>>;
    readonly drag: Drag;
    readonly along: (event: { clientX: number; clientY: number }) => number;
}

const context = createPartContext<SplitterContextValue>("Splitter");

/** Root's props: the panes, their sizes and anchors, the variants and tokens, `testId` and
 *  `unstyled` for every part, `as`, and the element's own props. */
export interface SplitterRootProps
    extends Omit<PartProps, keyof SplitterRootOwnProps>, SplitterRootOwnProps {
    /** Another element or component to render instead of `<div>`. */
    readonly as?: ValidComponent | undefined;
}

/** A pane's props: its `id` (one of Root's `panels`), the element's own, and `unstyled`. */
export interface SplitterPanelProps extends Omit<PartProps, "id"> {
    readonly id: string;
    readonly unstyled?: boolean | undefined;
}

/** A divider's props: the panes it sits between (`"list:detail"`), its name, and `unstyled`. */
export interface SplitterResizeTriggerProps extends Omit<PartProps, "id"> {
    readonly id: `${string}:${string}`;
    /** Its name, for assistive technology. @default "Resize panes" */
    readonly label?: string | undefined;
    readonly disabled?: boolean | undefined;
    readonly unstyled?: boolean | undefined;
}

/** The panes' room along the axis: the root less its dividers. */
const roomOf = (root: HTMLElement | undefined, horizontal: boolean): number => {
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
function Root(props: SplitterRootProps): JSX.Element {
    const generated = createUniqueId();
    const dir = useDirection();
    let root: HTMLElement | undefined;
    const drag: Drag = {
        trigger: null,
        velocity: createDragVelocity(),
        stopSettle: () => {},
    };
    const horizontal = () => splitterOrientation(props) === "horizontal";
    const size = useControllable<
        "size",
        readonly SplitterSize[],
        SplitterSizeDetails
    >("Splitter", "size", props);
    const service = useMachine(splitter.machine, () => ({
        dir: dir(),
        ...splitterMachineProps({ ...props, id: props.id ?? generated }),
        ...splitterSizeProps(size.machineProps(), props.panels),
        onResizeEnd: (details: { size: number[] }) => {
            const trigger = drag.trigger;
            drag.trigger = null;
            if (trigger === null) return;
            const index = props.panels.findIndex(
                (panel) => panel.id === trigger.split(":")[0],
            );
            const room = roomOf(root, horizontal());
            const snapped = splitterSnap({
                sizes: details.size,
                index,
                room,
                anchors: props.anchors ?? SPLITTER_ANCHORS,
                limits: splitterLimits(props.panels, room),
                velocity: drag.velocity.velocity(),
            });
            if (snapped.some((size, at) => size !== details.size[at])) {
                // The two panes beside the divider settle on Compose's spring from the drag's
                // speed (px/ms toward the end).
                const panels = [...(root?.children ?? [])].filter(
                    (child) => child.getAttribute("data-part") === "panel",
                ) as HTMLElement[];
                drag.stopSettle = settleOnSpring(
                    panels.slice(index, index + 2),
                    "flex-grow",
                    SPLITTER_SETTLE,
                    ((snapped[index]! - details.size[index]!) / 100) * room,
                    drag.velocity.velocity() / 1000,
                );
                service.send({ type: "SIZE.SET", size: snapped });
            }
        },
    }));
    const api = createMemo(() => splitter.connect(service, normalizeProps));
    const scope = useComponent(splitterAnatomy, {
        selection: () => splitterSelection(props),
        testId: () => props.testId,
        unstyled: () => props.unstyled,
    });
    const along = (event: { clientX: number; clientY: number }) =>
        horizontal()
            ? dir() === "rtl"
                ? -event.clientX
                : event.clientX
            : event.clientY;
    return (
        <context.Provider value={{ scope, api, drag, along }}>
            {scope.render("root", {
                element: "div",
                as: () => props.as,
                ref: (element) => {
                    root = element;
                },
                machine: () => api().getRootProps(),
                props: omit(props, "as", ...SPLITTER_ROOT_PROPS),
            })}
        </context.Provider>
    );
}

/** A pane. Its content scrolls natively when it overflows. */
function Panel(props: SplitterPanelProps): JSX.Element {
    const { scope, api } = context.use("Panel");
    return scope.render("panel", {
        element: "div",
        machine: () => api().getPanelProps({ id: props.id }),
        unstyled: () => props.unstyled,
        props: omit(props, "id", "unstyled"),
    });
}

/** The divider between two panes, holding Material's drag handle pill. */
function ResizeTrigger(props: SplitterResizeTriggerProps): JSX.Element {
    const { scope, api, drag, along } = context.use("ResizeTrigger");
    const trigger = () => ({ id: props.id, disabled: props.disabled });
    return scope.render("resizeTrigger", {
        element: "div",
        machine: () =>
            combinePartProps([
                api().getResizeTriggerProps(trigger()),
                splitterTriggerProps({
                    label: props.label,
                    dragging: api().getResizeTriggerState(trigger()).dragging,
                }),
                {
                    onPointerDown: (event: PointerEvent) => {
                        if (event.button !== 0 || props.disabled) return;
                        drag.stopSettle();
                        drag.trigger = props.id;
                        drag.velocity.reset();
                        drag.velocity.add(along(event), event.timeStamp);
                    },
                    onPointerMove: (event: PointerEvent) => {
                        if (drag.trigger === props.id)
                            drag.velocity.add(along(event), event.timeStamp);
                    },
                },
            ]),
        unstyled: () => props.unstyled,
        props: merge(omit(props, "id", "label", "disabled", "unstyled"), {
            get children() {
                return scope.render("resizeTriggerIndicator", {
                    element: "div",
                    machine: () => ({
                        ...api().getResizeTriggerIndicator(trigger()),
                        "aria-hidden": "true",
                    }),
                });
            },
        }),
    });
}

/** The ready-made splitter's props: Root's (less `panels`, which `panes` gives), with `class`,
 *  `style`, and `slotProps` keyed by part, and its panes. */
export interface SplitterProps
    extends
        Omit<
            SplitterRootProps,
            keyof SlotKeyedProps<Anatomy> | "children" | "panels"
        >,
        SlotKeyedProps<Anatomy>,
        SplitterContentProps<JSX.Element> {}

const READY_MADE_PROPS = [
    "class",
    "style",
    "slotProps",
    "panes",
    "resizeLabel",
] as const;

/** The ready-made splitter: each pane, with a divider between each pair. */
function ReadyMade(props: SplitterProps): JSX.Element {
    const slots = createSlotProps(props);
    const own = omit(props, ...READY_MADE_PROPS) as Omit<
        SplitterRootProps,
        "panels"
    >;
    const panels = createMemo(() =>
        props.panes.map(({ content: _content, ...panel }) => panel),
    );
    return (
        <Root {...own} {...(slots("root") as object)} panels={panels()}>
            <For each={props.panes} keyed={false}>
                {(pane: Accessor<SplitterPane<JSX.Element>>, index) => (
                    <>
                        <Panel {...(slots("panel") as object)} id={pane().id}>
                            {pane().content}
                        </Panel>
                        <Show when={props.panes[index + 1]}>
                            {(next: Accessor<SplitterPane<JSX.Element>>) => (
                                <ResizeTrigger
                                    {...(slots("resizeTrigger") as object)}
                                    id={splitterTriggerId(pane().id, next().id)}
                                    label={props.resizeLabel}
                                />
                            )}
                        </Show>
                    </>
                )}
            </For>
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
