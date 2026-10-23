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
    BOTTOM_SHEET_CONTENT_PROPS,
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
import type { JSX, ValidComponent } from "@solidjs/web";
import {
    createEffect,
    createSignal,
    merge,
    omit,
    onCleanup,
    Show,
} from "solid-js";

import { Button } from "../button";
import { dialogParts } from "../dialog-parts";
import { DragHandle as DragHandleComponent } from "../drag-handle";
import { mergeProps, normalizeProps } from "../internal/zag";
import { createSlotProps } from "../parts";
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
    readonly as?: ValidComponent | undefined;
}

/** A part's props: the element's own, and the part's `unstyled`. */
export interface BottomSheetPartProps extends PartProps {
    readonly unstyled?: boolean | undefined;
}

/** A trigger's props: a part's, and `as` to render a component instead of `<button>` (`as={
 *  Button}`), which takes the rest of the props. */
export interface BottomSheetTriggerProps extends BottomSheetPartProps {
    readonly as?: ValidComponent | undefined;
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
const Root: (props: BottomSheetRootProps) => JSX.Element = chrome.Root;

/** The button that opens the sheet. */
const Trigger: (props: BottomSheetTriggerProps) => JSX.Element = chrome.Trigger;

/** Dims the page behind a modal sheet, drawn by the scrim; hidden once it's closed and its exit
 *  animation is over. A standard sheet's stays hidden. */
const Backdrop: (props: BottomSheetPartProps) => JSX.Element = chrome.Backdrop;

/** Holds the sheet at the bottom of the viewport, stacked at its surface's layer; hidden once
 *  it's closed and its exit animation is over. The registry doesn't style it. */
const Positioner: (props: BottomSheetPartProps) => JSX.Element =
    chrome.Positioner;

/** The sheet's surface. It stays while its exit animation runs. */
const Content: (props: BottomSheetPartProps) => JSX.Element = chrome.Content;

/** The drag handle at the top edge: a press closes the sheet, and so does a drag down (as
 *  Compose's: 56px past where it rested, or a flick). On a sheet that rests partly open (taller
 *  than half the screen, unless `partiallyExpandable={false}`), a drag or a press moves it
 *  between partly and fully open (`expanded`, `onExpandedChange`), and a drag down from partly
 *  open closes it. Without `aria-label`, it's named for what a press does. It renders the drag handle
 *  component; give `as` to render another. */
function DragHandle(props: BottomSheetTriggerProps): JSX.Element {
    const {
        scope,
        api,
        surface,
        asker,
        requestClose,
        onClose,
        props: root,
    } = context.use("DragHandle");
    // Where it rests, and whether it can move between partly and fully open.
    const [rest, setRest] = createSignal<{
        readonly rest: SheetRest;
        readonly movable: boolean;
    }>({ rest: "expanded", movable: false });
    let lastRest: SheetRest = "expanded";
    let stop: SheetDrag | undefined;
    onCleanup(() => stop?.());
    // A controlled `expanded`: the sheet rests where it says (it moves when the prop changes,
    // and goes back when a drag's change wasn't taken).
    createEffect(
        () => [root.expanded, rest().rest] as const,
        ([expanded]) => {
            if (expanded === undefined) return;
            lastRest = expanded ? "expanded" : "partial";
            stop?.rest(lastRest);
        },
    );
    return scope.render("dragHandle", {
        element: "button",
        as: () => props.as ?? DragHandleComponent,
        ref: (element: HTMLElement) => {
            stop?.();
            stop = dragToDismiss(
                element,
                surface,
                (kept) => {
                    api().setOpen(false);
                    // Solid has rendered the close by now; a sheet still open was kept.
                    queueMicrotask(() => {
                        if (api().open) kept();
                    });
                },
                () => onClose()?.() ?? true,
                asker,
                {
                    partial: () => sheetPartiallyExpandable(root),
                    opening: () => sheetOpeningRest(root),
                    onRest: (next, movable, byUser) => {
                        // Only the user's drag or press reports, not an opening at another
                        // rest (an uncontrolled sheet reopening partly open).
                        if (byUser && next !== lastRest)
                            root.onExpandedChange?.({
                                expanded: next === "expanded",
                            });
                        lastRest = next;
                        setRest({ rest: next, movable });
                    },
                },
            );
        },
        machine: () =>
            mergeProps(
                // A press asks `onClose` too, rather than closing through Zag at once.
                closeTriggerProps(
                    api().getCloseTriggerProps(),
                    onClose(),
                    requestClose,
                ),
                normalizeProps.element(sheetDragHandleLayout),
            ),
        unstyled: () => props.unstyled,
        props: merge(
            {
                get "aria-label"() {
                    return sheetDragHandleLabel(rest().rest, rest().movable);
                },
            },
            omit(props, "unstyled", "as"),
        ),
    });
}

/** The content, which describes the sheet. It scrolls natively when it's taller than the
 *  sheet, and is in the tab order only then, so a keyboard can scroll it. */
function Body(props: BottomSheetPartProps): JSX.Element {
    const { scope, api } = context.use("Body");
    let stop: (() => void) | undefined;
    let gone = false;
    onCleanup(() => {
        gone = true;
        stop?.();
    });
    return scope.render("body", {
        element: "div",
        ref: (element: HTMLElement) => {
            stop?.();
            // Once the app's props are on it, so a `tabindex` it gave stays.
            queueMicrotask(() => {
                if (!gone) stop = focusableWhileOverflowing(element);
            });
        },
        machine: () => api().getDescriptionProps(),
        unstyled: () => props.unstyled,
        props: omit(props, "unstyled"),
    });
}

/** The ready-made sheet's props: Root's, with `class`, `style`, and `slotProps` keyed by part,
 *  the trigger's label, the drag handle and its name, and the body as content. */
export interface BottomSheetProps
    extends
        Omit<BottomSheetRootProps, keyof SlotKeyedProps<Anatomy> | "children">,
        SlotKeyedProps<Anatomy>,
        BottomSheetContentProps<JSX.Element> {
    readonly testId?: TestIdOverride<BottomSheetPart>;
    readonly unstyled?: Unstyled<BottomSheetPart>;
}

const READY_MADE_PROPS = [
    "class",
    "style",
    "slotProps",
    ...BOTTOM_SHEET_CONTENT_PROPS,
] as const;

/** The ready-made sheet: the trigger, drawn as a button, when given a label, a modal sheet's
 *  backdrop, and the sheet with its drag handle (unless `dragHandle={false}`) and body. */
function ReadyMade(props: BottomSheetProps): JSX.Element {
    const slots = createSlotProps(props);
    const own = omit(props, ...READY_MADE_PROPS) as BottomSheetRootProps;
    const root = slots("root") as object;
    const trigger = slots("trigger") as object;
    const positioner = slots("positioner");
    const content = slots("content");
    const dragHandle = slots("dragHandle") as object;
    const body = slots("body");
    return (
        <Root {...own} {...root}>
            <Show when={isPresent(props.trigger)}>
                <Trigger as={Button} label={props.trigger} {...trigger} />
            </Show>
            <Backdrop />
            <Positioner {...positioner}>
                <Content {...content}>
                    <Show when={props.dragHandle !== false}>
                        <DragHandle
                            {...(props.dragHandleLabel === undefined
                                ? {}
                                : { "aria-label": props.dragHandleLabel })}
                            {...dragHandle}
                        />
                    </Show>
                    <Show when={isPresent(props.body)}>
                        <Body {...body}>{props.body}</Body>
                    </Show>
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
