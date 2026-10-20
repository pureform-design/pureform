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
    BOTTOM_SHEET_CONTENT_PROPS,
    BOTTOM_SHEET_ROOT_PROPS,
    bottomSheetPositionerLayout,
    bottomSheetSelection,
    dialogBackdropLayout,
    isPresent,
    presentProps,
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
import { dragToDismiss, stackPositioner } from "@pureform/binding-core/dom";
import * as dialog from "@pureform/machines/dialog";
import type { JSX, ValidComponent } from "@solidjs/web";
import {
    type Accessor,
    createMemo,
    createUniqueId,
    omit,
    onCleanup,
    Show,
} from "solid-js";

import { Button } from "../button";
import { useControllable } from "../controllable";
import { DragHandle as DragHandleComponent } from "../drag-handle";
import { mergeProps, normalizeProps, useMachine } from "../internal/zag";
import type { PropTypes } from "../internal/zag";
import { createPartContext } from "../part-context";
import { createSlotProps, useComponent } from "../parts";
import type { ComponentScope, SlotKeyedProps } from "../parts";
import { usePresence } from "../presence";
import type { Presence } from "../presence";
import type { PartProps } from "../props";
import { useDirection } from "../provider";

type Anatomy = typeof bottomSheetOverlayAnatomy;
type BackdropAnatomy = typeof bottomSheetBackdropAnatomy;

/** What Root shares with its parts. */
interface BottomSheetContextValue {
    readonly scope: ComponentScope<Anatomy>;
    readonly backdrop: ComponentScope<BackdropAnatomy>;
    readonly api: Accessor<dialog.Api<PropTypes>>;
    readonly presence: Presence;
    readonly modal: Accessor<boolean>;
    readonly setPositioner: (element: HTMLElement) => void;
    readonly setSurface: (element: HTMLElement) => void;
    readonly surface: () => HTMLElement | undefined;
}

const context = createPartContext<BottomSheetContextValue>("BottomSheet");

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

// The backdrop's test id and `unstyled`, from Root's, which name it `backdrop`.
const backdropTestId = (
    testId: TestIdOverride<BottomSheetPart> | undefined,
): TestIdOverride<"root"> | undefined =>
    typeof testId !== "object"
        ? testId
        : testId.backdrop === undefined
          ? undefined
          : { root: testId.backdrop };

const backdropUnstyled = (
    unstyled: Unstyled<BottomSheetPart> | undefined,
): Unstyled<"root"> | undefined =>
    typeof unstyled !== "object"
        ? unstyled
        : unstyled.backdrop === undefined
          ? undefined
          : { root: unstyled.backdrop };

/** The sheet's root, a `<div>` around the trigger and the sheet. The registry doesn't style
 *  it. */
function Root(props: BottomSheetRootProps): JSX.Element {
    const id = createUniqueId();
    const dir = useDirection();
    const open = useControllable<"open", boolean>("BottomSheet", "open", props);
    const service = useMachine(dialog.machine, () => ({
        id,
        dir: dir(),
        ...sheetMachineProps(props),
        ...open.machineProps(),
    }));
    const api = createMemo(() => dialog.connect(service, normalizeProps));
    let positioner: HTMLElement | undefined;
    let surface: HTMLElement | undefined;
    const presence = usePresence(
        () => api().open,
        (element) =>
            positioner ? stackPositioner(positioner, element) : undefined,
    );
    const scope = useComponent(bottomSheetOverlayAnatomy, {
        selection: () => bottomSheetSelection(props),
        testId: () => props.testId as TestIdOverride<keyof Anatomy["parts"]>,
        unstyled: () => props.unstyled as Unstyled<keyof Anatomy["parts"]>,
    });
    const backdrop = useComponent(bottomSheetBackdropAnatomy, {
        selection: () => ({}),
        testId: () => backdropTestId(props.testId),
        unstyled: () => backdropUnstyled(props.unstyled),
    });
    return (
        <context.Provider
            value={{
                scope,
                backdrop,
                api,
                presence,
                modal: () => sheetModal(props),
                setPositioner: (element) => {
                    positioner = element;
                },
                setSurface: (element) => {
                    surface = element;
                    presence.ref(element);
                },
                surface: () => surface,
            }}
        >
            {scope.render("root", {
                element: "div",
                as: () => props.as,
                props: omit(props, "as", ...BOTTOM_SHEET_ROOT_PROPS),
            })}
        </context.Provider>
    );
}

/** The button that opens the sheet. */
function Trigger(props: BottomSheetTriggerProps): JSX.Element {
    const { scope, api } = context.use("Trigger");
    return scope.render("trigger", {
        element: "button",
        as: () => props.as,
        machine: () => api().getTriggerProps(),
        unstyled: () => props.unstyled,
        props: omit(props, "unstyled", "as"),
    });
}

/** Dims the page behind a modal sheet, drawn by the scrim; hidden once it's closed and its exit
 *  animation is over. A standard sheet's stays hidden. */
function Backdrop(props: BottomSheetPartProps): JSX.Element {
    const { backdrop, api, presence, modal } = context.use("Backdrop");
    return backdrop.render("root", {
        element: "div",
        machine: () =>
            mergeProps(
                api().getBackdropProps(),
                normalizeProps.element(
                    dialogBackdropLayout(modal() && presence.present()),
                ),
            ),
        unstyled: () => props.unstyled,
        props: omit(props, "unstyled"),
    });
}

/** Holds the sheet at the bottom of the viewport, stacked at its surface's layer; hidden once
 *  it's closed and its exit animation is over. The registry doesn't style it. */
function Positioner(props: BottomSheetPartProps): JSX.Element {
    const { scope, api, presence, modal, setPositioner } =
        context.use("Positioner");
    return scope.render("positioner", {
        element: "div",
        ref: setPositioner,
        machine: () =>
            mergeProps(
                api().getPositionerProps(),
                normalizeProps.element(
                    bottomSheetPositionerLayout(presence.present(), modal()),
                ),
            ),
        unstyled: () => props.unstyled,
        props: omit(props, "unstyled"),
    });
}

/** The sheet's surface. It stays while its exit animation runs. */
function Content(props: BottomSheetPartProps): JSX.Element {
    const { scope, api, presence, setSurface } = context.use("Content");
    return scope.render("content", {
        element: "div",
        ref: setSurface,
        machine: () =>
            mergeProps(
                presentProps(api().getContentProps(), presence.present()),
                normalizeProps.element(sheetContentLayout),
            ),
        unstyled: () => props.unstyled,
        props: omit(props, "unstyled"),
    });
}

/** The drag handle at the top edge: a press closes the sheet, and so does a drag down past a
 *  quarter of its height. Name it with `aria-label`. It renders the drag handle component; give
 *  `as` to render another. */
function DragHandle(props: BottomSheetTriggerProps): JSX.Element {
    const { scope, api, surface } = context.use("DragHandle");
    let stop: (() => void) | undefined;
    onCleanup(() => stop?.());
    return scope.render("dragHandle", {
        element: "button",
        as: () => props.as ?? DragHandleComponent,
        ref: (element: HTMLElement) => {
            stop?.();
            stop = dragToDismiss(element, surface, () => api().setOpen(false));
        },
        machine: () =>
            mergeProps(
                api().getCloseTriggerProps(),
                normalizeProps.element(sheetDragHandleLayout),
            ),
        unstyled: () => props.unstyled,
        props: omit(props, "unstyled", "as"),
    });
}

/** The content, which describes the sheet. It scrolls when it's taller than the sheet. */
function Body(props: BottomSheetPartProps): JSX.Element {
    const { scope, api } = context.use("Body");
    return scope.render("body", {
        element: "div",
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
                            aria-label={props.dragHandleLabel ?? "Close sheet"}
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
