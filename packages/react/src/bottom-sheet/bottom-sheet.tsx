// The bottom sheet: Root on Zag's dialog machine, an unstyled element around the trigger and the
// sheet; the trigger, a `<button>` or any component (`as={Button}`); a modal sheet's backdrop,
// drawn by the scrim; Zag's positioner, fixed to the bottom of the viewport; the sheet's surface
// (`Content`) with its drag handle and body; and the ready-made BottomSheet over them. Everything
// renders in place, inside Root: while a modal sheet is open, Zag keeps focus inside it, hides the
// rest of the page from assistive technology, and stops the page scrolling. A standard sheet
// (`modal={false}`) leaves the page usable. The drag handle closes the sheet on a press, and on a
// drag down; a sheet taller than half the screen rests partly open (unless
// `partiallyExpandable={false}`) and moves between partly and fully open instead. The body is
// in the tab order only while it overflows.

import {
    bottomSheetBackdropAnatomy,
    bottomSheetOverlayAnatomy,
} from "@pureform/anatomy";
import type { TestIdOverride } from "@pureform/anatomy";
import {
    BOTTOM_SHEET_ROOT_PROPS,
    bottomSheetPositionerLayout,
    bottomSheetSelection,
    closeTriggerProps,
    isPresent,
    sheetContentLayout,
    sheetDragHandleLabel,
    sheetDragHandleLayout,
    sheetMachineProps,
    sheetModal,
    sheetOpeningRest,
    sheetPartiallyExpandable,
} from "@pureform/binding-core";
import type {
    BottomSheetContentProps,
    BottomSheetPart,
    BottomSheetRootOwnProps,
    SheetRest,
    Unstyled,
} from "@pureform/binding-core";
import {
    dragToDismiss,
    focusableWhileOverflowing,
} from "@pureform/binding-core/dom";
import type { SheetDrag } from "@pureform/binding-core/dom";
import { mergeProps, normalizeProps } from "@zag-js/react";
import {
    type ElementType,
    type ReactNode,
    useCallback,
    useEffect,
    useRef,
    useState,
} from "react";

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
    onClose: (props) => props.onClose,
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

/** The content, which describes the sheet. It scrolls natively when it's taller than the
 *  sheet, and is in the tab order only then, so a keyboard can scroll it. */
function Body({ unstyled, ...props }: BottomSheetPartProps): ReactNode {
    const { scope, api } = context.use("Body");
    const ref = useCallback(
        (element: HTMLElement | null) =>
            element ? focusableWhileOverflowing(element) : undefined,
        [],
    );
    return scope.render("body", {
        element: "div",
        ref,
        machine: api.getDescriptionProps(),
        unstyled,
        props,
    });
}

/** The drag handle at the top edge: a press closes the sheet, and so does a drag down (as
 *  Compose's: 56px past where it rested, or a flick). On a sheet that rests partly open (taller
 *  than half the screen, unless `partiallyExpandable={false}`), a drag or a press moves it
 *  between partly and fully open (`expanded`, `onExpandedChange`), and a drag down from partly
 *  open closes it. Without `aria-label`, it's named for what a press does. It renders the drag handle
 *  component; give `as` to render another. */
function DragHandle({
    unstyled,
    as,
    ...props
}: BottomSheetTriggerProps): ReactNode {
    const {
        scope,
        api,
        latestApi,
        surface,
        asker,
        requestClose,
        onClose,
        props: rootProps,
    } = context.use("DragHandle");
    const latestRoot = useRef(rootProps);
    latestRoot.current = rootProps;
    // Where it rests, and whether it can move between partly and fully open.
    const [rest, setRest] = useState<{
        readonly rest: SheetRest;
        readonly movable: boolean;
    }>({ rest: "expanded", movable: false });
    const lastRest = useRef<SheetRest>("expanded");
    const drag = useRef<SheetDrag | undefined>(undefined);
    // A controlled `expanded`: once each render has committed, the sheet rests where it says
    // (it moves when the prop changes, and goes back when a drag's change wasn't taken).
    const expanded = rootProps.expanded;
    useEffect(() => {
        if (expanded === undefined) return;
        lastRest.current = expanded ? "expanded" : "partial";
        drag.current?.rest(lastRest.current);
    });
    // After a drag closed it: once that render has committed, a sheet still open (one the app
    // kept open) settles back.
    const [left, setLeft] = useState<{ readonly kept: () => void }>();
    useEffect(() => {
        if (left && latestApi.current.open) left.kept();
    }, [left, latestApi]);
    const ref = useCallback(
        (element: HTMLElement | null) => {
            if (!element) return undefined;
            const stop = dragToDismiss(
                element,
                () => surface.current,
                (kept) => {
                    latestApi.current.setOpen(false);
                    setLeft({ kept });
                },
                () => onClose()?.() ?? true,
                asker,
                {
                    partial: () => sheetPartiallyExpandable(latestRoot.current),
                    opening: () => sheetOpeningRest(latestRoot.current),
                    onRest: (next, movable, byUser) => {
                        // Only the user's drag or press reports, not an opening at another
                        // rest (an uncontrolled sheet reopening partly open).
                        if (byUser && lastRest.current !== next)
                            latestRoot.current.onExpandedChange?.({
                                expanded: next === "expanded",
                            });
                        lastRest.current = next;
                        setRest({ rest: next, movable });
                    },
                },
            );
            drag.current = stop;
            return () => {
                drag.current = undefined;
                stop();
            };
        },
        [surface, latestApi, asker, onClose],
    );
    const close = api.getCloseTriggerProps();
    return scope.render("dragHandle", {
        element: "button",
        as: (as as ElementType | undefined) ?? DragHandleComponent,
        ref,
        // A press asks `onClose` too, rather than closing through Zag at once.
        machine: mergeProps(
            closeTriggerProps(close, onClose(), requestClose),
            normalizeProps.element(sheetDragHandleLayout),
        ),
        unstyled,
        props: {
            "aria-label": sheetDragHandleLabel(rest.rest, rest.movable),
            ...props,
        },
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
        <Root
            {...rootProps}
            dragHandle={dragHandle}
            {...(slot("root") as object)}
        >
            {isPresent(trigger) ? (
                <Trigger as={Button} label={trigger} {...slot("trigger")} />
            ) : null}
            <Backdrop />
            <Positioner {...slot("positioner")}>
                <Content {...slot("content")}>
                    {dragHandle !== false ? (
                        <DragHandle
                            {...(dragHandleLabel === undefined
                                ? {}
                                : { "aria-label": dragHandleLabel })}
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
