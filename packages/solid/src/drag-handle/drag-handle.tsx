// The drag handle: a `<button>` holding the pill, which a sheet or a pane renders where it can be
// dragged. Name it with `aria-label` for what a press does. Styling only: what a press or a drag
// does is the component's around it (a bottom sheet closes).

import { dragHandleAnatomy } from "@pureform/anatomy";
import type { TestIdOverride } from "@pureform/anatomy";
import {
    DRAG_HANDLE_ROOT_PROPS,
    dragHandleSelection,
} from "@pureform/binding-core";
import type { DragHandleRootOwnProps, Unstyled } from "@pureform/binding-core";
import type { JSX, ValidComponent } from "@solidjs/web";
import { merge, omit } from "solid-js";

import { useComponent } from "../parts";
import type { PartProps } from "../props";

type Anatomy = typeof dragHandleAnatomy;

/** The drag handle's props: its own (`orientation`, tokens, `testId`, `unstyled`), `as`, and the
 *  element's own props. */
export interface DragHandleProps
    extends
        Omit<PartProps, keyof DragHandleRootOwnProps>,
        DragHandleRootOwnProps {
    /** Another element or component to render instead of `<button>`. */
    readonly as?: ValidComponent | undefined;
    readonly [prop: string]: unknown;
}

/** Material's drag handle: `<DragHandle aria-label="Close sheet" onClick={close} />`, or
 *  `orientation="vertical"` on a pane divider. */
export function DragHandle(props: DragHandleProps): JSX.Element {
    const scope = useComponent(dragHandleAnatomy, {
        selection: () => dragHandleSelection(props),
        testId: () => props.testId as TestIdOverride<keyof Anatomy["parts"]>,
        unstyled: () => props.unstyled as Unstyled<keyof Anatomy["parts"]>,
    });
    return scope.render("root", {
        element: "button",
        as: () => props.as,
        machine: () => ({ type: "button" }),
        props: merge(omit(props, "as", ...DRAG_HANDLE_ROOT_PROPS), {
            get children() {
                return scope.render("handle", {
                    element: "span",
                    machine: () => ({ "aria-hidden": "true" }),
                });
            },
        }),
    });
}
