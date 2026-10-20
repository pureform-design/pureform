// The bottom sheet: Root on Zag's dialog machine, an unstyled element around the trigger and the
// sheet; the trigger, a `<button>` or any component (`as={Button}`); a modal sheet's backdrop,
// drawn by the scrim; Zag's positioner, fixed to the bottom of the viewport; the sheet's surface
// (`Content`) with its drag handle and body; and the ready-made BottomSheet over them. Everything
// renders in place, inside Root: while a modal sheet is open, Zag keeps focus inside it, hides the
// rest of the page from assistive technology, and stops the page scrolling. A standard sheet
// (`modal={false}`) leaves the page usable. The drag handle closes the sheet on a press, and on a
// drag down past a quarter of its height.

import {
    bottomSheetBackdropAnatomy,
    bottomSheetOverlayAnatomy,
} from "@pureform/anatomy";
import type { TestIdOverride } from "@pureform/anatomy";
import {
    BOTTOM_SHEET_ROOT_PROPS,
    bottomSheetPositionerLayout,
    bottomSheetSelection,
    isPresent,
    sheetContentLayout,
    sheetDragHandleLayout,
    sheetMachineProps,
    sheetModal,
} from "@pureform/binding-core";
import type {
    BottomSheetContentProps,
    BottomSheetPart,
    BottomSheetRootOwnProps,
    Unstyled,
} from "@pureform/binding-core";
import { dragToDismiss } from "@pureform/binding-core/dom";
import { mergeProps, normalizeProps } from "@zag-js/react";
import { type ElementType, type ReactNode, useCallback } from "react";

import { Button } from "../button";
import { dialogParts } from "../dialog-parts";
import { DragHandle as DragHandleComponent } from "../drag-handle";
import { useSlotProps } from "../parts";
import type { SlotKeyedProps } from "../parts";
import type { PartProps } from "../props";

type Anatomy = typeof bottomSheetOverlayAnatomy;

/** Root's props: `modal` and the tokens, the machine's props (`open`, `closeOnEscape`, …),
 *  `testId` and `unstyled` for every part, `as`, and the element's own props. */
export interface BottomSheetRootProps
    extends
        Omit<PartProps, keyof BottomSheetRootOwnProps>,
        BottomSheetRootOwnProps {
    /** Another element or component to render instead of `<div>`. */
    readonly as?: ElementType | undefined;
}

/** A part's props: the element's own, and the part's `unstyled`. */
export interface BottomSheetPartProps extends PartProps {
    readonly unstyled?: boolean | undefined;
}

/** A trigger's props: a part's, and `as` to render a component instead of `<button>` (`as={
 *  Button}`), which takes the rest of the props. */
export interface BottomSheetTriggerProps extends BottomSheetPartProps {
    readonly as?: ElementType | undefined;
    readonly [prop: string]: unknown;
}

const chrome = dialogParts({
    name: "BottomSheet",
    anatomy: bottomSheetOverlayAnatomy,
    backdropAnatomy: bottomSheetBackdropAnatomy,
    rootProps: BOTTOM_SHEET_ROOT_PROPS,
    selection: (props: BottomSheetRootProps) => bottomSheetSelection(props),
    machineProps: sheetMachineProps,
    modal: sheetModal,
    positionerLayout: (present, props) =>
        bottomSheetPositionerLayout(present, sheetModal(props)),
    contentLayout: sheetContentLayout,
});

const { context } = chrome;

/** The sheet's root, a `<div>` around the trigger and the sheet. The registry doesn't style
 *  it. */
const Root: (props: BottomSheetRootProps) => ReactNode = chrome.Root;

/** The button that opens the sheet. */
const Trigger: (props: BottomSheetTriggerProps) => ReactNode = chrome.Trigger;

/** Dims the page behind a modal sheet, drawn by the scrim; hidden once it's closed and its exit
 *  animation is over. A standard sheet's stays hidden. */
const Backdrop: (props: BottomSheetPartProps) => ReactNode = chrome.Backdrop;

/** Holds the sheet at the bottom of the viewport, stacked at its surface's layer; hidden once
 *  it's closed and its exit animation is over. The registry doesn't style it. */
const Positioner: (props: BottomSheetPartProps) => ReactNode =
    chrome.Positioner;

/** The sheet's surface. It stays while its exit animation runs. */
const Content: (props: BottomSheetPartProps) => ReactNode = chrome.Content;

/** The content, which describes the sheet. It scrolls when it's taller than the sheet. */
const Body: (props: BottomSheetPartProps) => ReactNode = chrome.part(
    "body",
    "Body",
    "div",
    (api) => api.getDescriptionProps(),
);

/** The drag handle at the top edge: a press closes the sheet, and so does a drag down past a
 *  quarter of its height. Name it with `aria-label`. It renders the drag handle component; give
 *  `as` to render another. */
function DragHandle({
    unstyled,
    as,
    ...props
}: BottomSheetTriggerProps): ReactNode {
    const { scope, api, latestApi, surface } = context.use("DragHandle");
    const ref = useCallback(
        (element: HTMLElement | null) =>
            element
                ? dragToDismiss(
                      element,
                      () => surface.current,
                      () => latestApi.current.setOpen(false),
                  )
                : undefined,
        [surface, latestApi],
    );
    return scope.render("dragHandle", {
        element: "button",
        as: (as as ElementType | undefined) ?? DragHandleComponent,
        ref,
        machine: mergeProps(
            api.getCloseTriggerProps(),
            normalizeProps.element(sheetDragHandleLayout),
        ),
        unstyled,
        props,
    });
}

/** The ready-made sheet's props: Root's, with `className`, `style`, and `slotProps` keyed by
 *  part, the trigger's label, the drag handle and its name, and the body as content. */
export interface BottomSheetProps
    extends
        Omit<BottomSheetRootProps, keyof SlotKeyedProps<Anatomy> | "children">,
        SlotKeyedProps<Anatomy>,
        BottomSheetContentProps<ReactNode> {
    readonly testId?: TestIdOverride<BottomSheetPart>;
    readonly unstyled?: Unstyled<BottomSheetPart>;
}

/** The ready-made sheet: the trigger, drawn as a button, when given a label, a modal sheet's
 *  backdrop, and the sheet with its drag handle (unless `dragHandle={false}`) and body. */
function ReadyMade(props: BottomSheetProps): ReactNode {
    const {
        className: _className,
        style: _style,
        slotProps: _slotProps,
        trigger,
        dragHandle,
        dragHandleLabel,
        body,
        ...rootProps
    } = props;
    const slot = useSlotProps(props);
    return (
        <Root {...rootProps} {...(slot("root") as object)}>
            {isPresent(trigger) ? (
                <Trigger as={Button} label={trigger} {...slot("trigger")} />
            ) : null}
            <Backdrop />
            <Positioner {...slot("positioner")}>
                <Content {...slot("content")}>
                    {dragHandle !== false ? (
                        <DragHandle
                            aria-label={dragHandleLabel ?? "Close sheet"}
                            {...(slot("dragHandle") as object)}
                        />
                    ) : null}
                    {isPresent(body) ? (
                        <Body {...slot("body")}>{body}</Body>
                    ) : null}
                </Content>
            </Positioner>
        </Root>
    );
}

/** Material's bottom sheet. Use it ready-made, `<BottomSheet trigger="Share" body={…} />` (a
 *  standard sheet with `modal={false}`), or compose its parts under `BottomSheet.Root`:
 *  `Trigger` (`as={Button}` draws it as a button), `Backdrop`, then `Positioner` holding
 *  `Content`, which holds `DragHandle` and `Body`. */
export const BottomSheet = Object.assign(ReadyMade, {
    Root,
    Trigger,
    Backdrop,
    Positioner,
    Content,
    DragHandle,
    Body,
});
