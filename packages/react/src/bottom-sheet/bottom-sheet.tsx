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
import type { PartName, TestIdOverride } from "@pureform/anatomy";
import {
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
import { mergeProps, normalizeProps } from "@zag-js/react";
import type { PropTypes } from "@zag-js/react";
import {
    type ElementType,
    type ReactNode,
    type RefObject,
    useCallback,
    useId,
    useRef,
} from "react";

import { Button } from "../button";
import { useControllable } from "../controllable";
import { DragHandle as DragHandleComponent } from "../drag-handle";
import { useMachine } from "../machine";
import { createPartContext } from "../part-context";
import { useComponent, useSlotProps } from "../parts";
import type { ComponentScope, SlotKeyedProps } from "../parts";
import { usePresence } from "../presence";
import type { Presence } from "../presence";
import { omitProps } from "../props";
import type { PartProps } from "../props";
import { useDirection } from "../provider";

type Anatomy = typeof bottomSheetOverlayAnatomy;
type BackdropAnatomy = typeof bottomSheetBackdropAnatomy;

/** What Root shares with its parts. */
interface BottomSheetContextValue {
    readonly scope: ComponentScope<Anatomy>;
    readonly backdrop: ComponentScope<BackdropAnatomy>;
    readonly api: dialog.Api<PropTypes>;
    readonly latestApi: RefObject<dialog.Api<PropTypes>>;
    readonly presence: Presence;
    readonly modal: boolean;
    readonly positioner: RefObject<HTMLElement | null>;
    readonly surface: RefObject<HTMLElement | null>;
}

const context = createPartContext<BottomSheetContextValue>("BottomSheet");

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
function Root(props: BottomSheetRootProps): ReactNode {
    const id = useId();
    const dir = useDirection();
    const open = useControllable<"open", boolean>("BottomSheet", "open", props);
    const service = useMachine(dialog.machine, {
        id,
        dir,
        ...sheetMachineProps(props),
        ...open.machineProps,
    });
    const api = dialog.connect(service, normalizeProps);
    const latestApi = useRef(api);
    latestApi.current = api;
    const positioner = useRef<HTMLElement | null>(null);
    const surface = useRef<HTMLElement | null>(null);
    const presence = usePresence(api.open, (element) =>
        positioner.current
            ? stackPositioner(positioner.current, element)
            : undefined,
    );
    const scope = useComponent(bottomSheetOverlayAnatomy, {
        selection: bottomSheetSelection(props),
        testId: props.testId as TestIdOverride<PartName<Anatomy>> | undefined,
        unstyled: props.unstyled as Unstyled<PartName<Anatomy>> | undefined,
    });
    const backdrop = useComponent(bottomSheetBackdropAnatomy, {
        selection: {},
        testId: backdropTestId(props.testId),
        unstyled: backdropUnstyled(props.unstyled),
    });
    const { as, ...rest } = omitProps(props, BOTTOM_SHEET_ROOT_PROPS);
    return (
        <context.Provider
            value={{
                scope,
                backdrop,
                api,
                latestApi,
                presence,
                modal: sheetModal(props),
                positioner,
                surface,
            }}
        >
            {scope.render("root", { element: "div", as, props: rest })}
        </context.Provider>
    );
}

/** The button that opens the sheet. */
function Trigger({
    unstyled,
    as,
    ...props
}: BottomSheetTriggerProps): ReactNode {
    const { scope, api } = context.use("Trigger");
    return scope.render("trigger", {
        element: "button",
        as: as as ElementType | undefined,
        machine: api.getTriggerProps(),
        unstyled,
        props,
    });
}

/** Dims the page behind a modal sheet, drawn by the scrim; hidden once it's closed and its exit
 *  animation is over. A standard sheet renders none. */
function Backdrop({ unstyled, ...props }: BottomSheetPartProps): ReactNode {
    const { backdrop, api, presence, modal } = context.use("Backdrop");
    if (!modal) return null;
    return backdrop.render("root", {
        element: "div",
        machine: mergeProps(
            api.getBackdropProps(),
            normalizeProps.element(dialogBackdropLayout(presence.present)),
        ),
        unstyled,
        props,
    });
}

/** Holds the sheet at the bottom of the viewport, stacked at its surface's layer; hidden once
 *  it's closed and its exit animation is over. The registry doesn't style it. */
function Positioner({ unstyled, ...props }: BottomSheetPartProps): ReactNode {
    const { scope, api, presence, modal, positioner } =
        context.use("Positioner");
    return scope.render("positioner", {
        element: "div",
        ref: positioner,
        machine: mergeProps(
            api.getPositionerProps(),
            normalizeProps.element(
                bottomSheetPositionerLayout(presence.present, modal),
            ),
        ),
        unstyled,
        props,
    });
}

/** The sheet's surface. It stays while its exit animation runs. */
function Content({ unstyled, ...props }: BottomSheetPartProps): ReactNode {
    const { scope, api, presence, surface } = context.use("Content");
    const { ref: presenceRef } = presence;
    const ref = useCallback(
        (element: HTMLElement | null) => {
            surface.current = element;
            presenceRef(element);
        },
        [surface, presenceRef],
    );
    return scope.render("content", {
        element: "div",
        ref,
        machine: mergeProps(
            presentProps(api.getContentProps(), presence.present),
            normalizeProps.element(sheetContentLayout),
        ),
        unstyled,
        props,
    });
}

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

/** The content, which describes the sheet. It scrolls when it's taller than the sheet. */
function Body({ unstyled, ...props }: BottomSheetPartProps): ReactNode {
    const { scope, api } = context.use("Body");
    return scope.render("body", {
        element: "div",
        machine: api.getDescriptionProps(),
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
