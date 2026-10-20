// The drag handle: a `<button>` holding the pill, which a sheet or a pane renders where it can be
// dragged. Name it with `aria-label` for what a press does. Styling only: what a press or a drag
// does is the component's around it (a bottom sheet closes).

import { dragHandleAnatomy } from "@pureform/anatomy";
import type { PartName, TestIdOverride } from "@pureform/anatomy";
import {
    DRAG_HANDLE_ROOT_PROPS,
    dragHandleSelection,
} from "@pureform/binding-core";
import type { DragHandleRootOwnProps, Unstyled } from "@pureform/binding-core";
import type { ElementType, ReactNode } from "react";

import { useComponent } from "../parts";
import { omitProps } from "../props";
import type { PartProps } from "../props";

type Anatomy = typeof dragHandleAnatomy;

/** The drag handle's props: its own (`orientation`, tokens, `testId`, `unstyled`), `as`, and the
 *  element's own props. */
export interface DragHandleProps
    extends
        Omit<PartProps, keyof DragHandleRootOwnProps>,
        DragHandleRootOwnProps {
    /** Another element or component to render instead of `<button>`. */
    readonly as?: ElementType | undefined;
    readonly [prop: string]: unknown;
}

/** Material's drag handle: `<DragHandle aria-label="Close sheet" onClick={close} />`, or
 *  `orientation="vertical"` on a pane divider. */
export function DragHandle(props: DragHandleProps): ReactNode {
    const scope = useComponent(dragHandleAnatomy, {
        selection: dragHandleSelection(props),
        testId: props.testId as TestIdOverride<PartName<Anatomy>> | undefined,
        unstyled: props.unstyled as Unstyled<PartName<Anatomy>> | undefined,
    });
    const { as, ...rest } = omitProps(props, DRAG_HANDLE_ROOT_PROPS);
    return scope.render("root", {
        element: "button",
        as: as as ElementType | undefined,
        machine: { type: "button" },
        props: {
            ...rest,
            children: scope.render("handle", {
                element: "span",
                machine: { "aria-hidden": "true" },
            }),
        },
    });
}
