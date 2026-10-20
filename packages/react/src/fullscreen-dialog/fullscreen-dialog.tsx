// The full-screen dialog: Root on Zag's dialog machine, an unstyled element around the trigger and
// the dialog; the trigger, a `<button>` or any component (`as={Button}`); Zag's positioner, fixed
// over the viewport, which the dialog fills; the dialog's surface (`Content`) with its header
// (close trigger, headline, confirm action) and body; and the ready-made FullscreenDialog over
// them. Everything renders in place, inside Root: while a modal dialog is open, Zag keeps focus
// inside it, hides the rest of the page from assistive technology, and stops the page scrolling.
// Nothing shows behind it, so there is no backdrop.

import { fullscreenDialogOverlayAnatomy } from "@pureform/anatomy";
import type { PartName, TestIdOverride } from "@pureform/anatomy";
import {
    dialogMachineProps,
    FULLSCREEN_DIALOG_ROOT_PROPS,
    fullscreenDialogPositionerLayout,
    fullscreenDialogSelection,
    isPresent,
    presentProps,
} from "@pureform/binding-core";
import type {
    FullscreenDialogContentProps,
    FullscreenDialogPart,
    FullscreenDialogRootOwnProps,
    Unstyled,
} from "@pureform/binding-core";
import { stackPositioner } from "@pureform/binding-core/dom";
import * as dialog from "@pureform/machines/dialog";
import { mergeProps, normalizeProps } from "@zag-js/react";
import type { PropTypes } from "@zag-js/react";
import {
    type ElementType,
    type ReactNode,
    type RefObject,
    useId,
    useRef,
} from "react";

import { Button } from "../button";
import { useControllable } from "../controllable";
import { CloseIcon } from "../glyphs";
import { IconButton } from "../icon-button";
import { useMachine } from "../machine";
import { createPartContext } from "../part-context";
import { useComponent, useSlotProps } from "../parts";
import type { ComponentScope, SlotKeyedProps } from "../parts";
import { usePresence } from "../presence";
import type { Presence } from "../presence";
import { omitProps } from "../props";
import type { PartProps } from "../props";
import { useDirection } from "../provider";

type Anatomy = typeof fullscreenDialogOverlayAnatomy;

/** What Root shares with its parts. */
interface FullscreenDialogContextValue {
    readonly scope: ComponentScope<Anatomy>;
    readonly api: dialog.Api<PropTypes>;
    readonly presence: Presence;
    readonly positioner: RefObject<HTMLElement | null>;
}

const context =
    createPartContext<FullscreenDialogContextValue>("FullscreenDialog");

/** Root's props: the tokens, the machine's props (`open`, `modal`, `role`, …), `testId` and
 *  `unstyled` for every part, `as`, and the element's own props. */
export interface FullscreenDialogRootProps
    extends
        Omit<PartProps, keyof FullscreenDialogRootOwnProps>,
        FullscreenDialogRootOwnProps {
    /** Another element or component to render instead of `<div>`. */
    readonly as?: ElementType | undefined;
}

/** A part's props: the element's own, and the part's `unstyled`. */
export interface FullscreenDialogPartProps extends PartProps {
    readonly unstyled?: boolean | undefined;
}

/** A trigger's props: a part's, and `as` to render a component instead of `<button>` (`as={
 *  Button}`), which takes the rest of the props. */
export interface FullscreenDialogTriggerProps extends FullscreenDialogPartProps {
    readonly as?: ElementType | undefined;
    readonly [prop: string]: unknown;
}

/** The full-screen dialog's root, a `<div>` around the trigger and the dialog. The registry
 *  doesn't style it. */
function Root(props: FullscreenDialogRootProps): ReactNode {
    const id = useId();
    const dir = useDirection();
    const open = useControllable<"open", boolean>(
        "FullscreenDialog",
        "open",
        props,
    );
    const service = useMachine(dialog.machine, {
        id,
        dir,
        ...dialogMachineProps(props),
        ...open.machineProps,
    });
    const api = dialog.connect(service, normalizeProps);
    const positioner = useRef<HTMLElement | null>(null);
    const presence = usePresence(api.open, (surface) =>
        positioner.current
            ? stackPositioner(positioner.current, surface)
            : undefined,
    );
    const scope = useComponent(fullscreenDialogOverlayAnatomy, {
        selection: fullscreenDialogSelection(props),
        testId: props.testId as TestIdOverride<PartName<Anatomy>> | undefined,
        unstyled: props.unstyled as Unstyled<PartName<Anatomy>> | undefined,
    });
    const { as, ...rest } = omitProps(props, FULLSCREEN_DIALOG_ROOT_PROPS);
    return (
        <context.Provider value={{ scope, api, presence, positioner }}>
            {scope.render("root", { element: "div", as, props: rest })}
        </context.Provider>
    );
}

/** The button that opens the dialog. */
function Trigger({
    unstyled,
    as,
    ...props
}: FullscreenDialogTriggerProps): ReactNode {
    const { scope, api } = context.use("Trigger");
    return scope.render("trigger", {
        element: "button",
        as: as as ElementType | undefined,
        machine: api.getTriggerProps(),
        unstyled,
        props,
    });
}

/** Covers the viewport, which the dialog fills, stacked at its surface's layer; hidden once it's
 *  closed and its exit animation is over. The registry doesn't style it. */
function Positioner({
    unstyled,
    ...props
}: FullscreenDialogPartProps): ReactNode {
    const { scope, api, presence, positioner } = context.use("Positioner");
    return scope.render("positioner", {
        element: "div",
        ref: positioner,
        machine: mergeProps(
            api.getPositionerProps(),
            normalizeProps.element(
                fullscreenDialogPositionerLayout(presence.present),
            ),
        ),
        unstyled,
        props,
    });
}

/** The dialog's surface. It stays while its exit animation runs. */
function Content({ unstyled, ...props }: FullscreenDialogPartProps): ReactNode {
    const { scope, api, presence } = context.use("Content");
    return scope.render("content", {
        element: "div",
        ref: presence.ref,
        machine: presentProps(api.getContentProps(), presence.present),
        unstyled,
        props,
    });
}

/** The row at the top: the close trigger, the headline, and the confirm action. */
function Header({ unstyled, ...props }: FullscreenDialogPartProps): ReactNode {
    const { scope } = context.use("Header");
    return scope.render("header", { element: "div", unstyled, props });
}

/** A button that closes the dialog: `as={IconButton}` draws it as one. Name it with
 *  `aria-label`. */
function CloseTrigger({
    unstyled,
    as,
    ...props
}: FullscreenDialogTriggerProps): ReactNode {
    const { scope, api } = context.use("CloseTrigger");
    return scope.render("closeTrigger", {
        element: "button",
        as: as as ElementType | undefined,
        machine: api.getCloseTriggerProps(),
        unstyled,
        props,
    });
}

/** The title, an `<h2>`, which names the dialog. */
function Headline({
    unstyled,
    ...props
}: FullscreenDialogPartProps): ReactNode {
    const { scope, api } = context.use("Headline");
    return scope.render("headline", {
        element: "h2",
        machine: api.getTitleProps(),
        unstyled,
        props,
    });
}

/** The confirming action at the end of the header: `as={Button}` draws it as a text button. It
 *  doesn't close the dialog by itself; close it from your handler. */
function ConfirmAction({
    unstyled,
    as,
    ...props
}: FullscreenDialogTriggerProps): ReactNode {
    const { scope } = context.use("ConfirmAction");
    return scope.render("confirmAction", {
        element: "button",
        as: as as ElementType | undefined,
        unstyled,
        props,
    });
}

/** The content, which describes the dialog. It scrolls when it's taller than the screen. */
function Body({ unstyled, ...props }: FullscreenDialogPartProps): ReactNode {
    const { scope, api } = context.use("Body");
    return scope.render("body", {
        element: "div",
        machine: api.getDescriptionProps(),
        unstyled,
        props,
    });
}

/** The ready-made dialog's props: Root's, with `className`, `style`, and `slotProps` keyed by
 *  part, the trigger's label, and the close trigger's name and icon, the headline, the confirm
 *  action, and the body as content. */
export interface FullscreenDialogProps
    extends
        Omit<
            FullscreenDialogRootProps,
            keyof SlotKeyedProps<Anatomy> | "children"
        >,
        SlotKeyedProps<Anatomy>,
        FullscreenDialogContentProps<ReactNode> {
    readonly testId?: TestIdOverride<FullscreenDialogPart>;
    readonly unstyled?: Unstyled<FullscreenDialogPart>;
}

/** The ready-made dialog: the trigger, drawn as a button, when given a label, and the dialog with
 *  its header (the close icon button, the headline, and the confirm action when given) and body. */
function ReadyMade(props: FullscreenDialogProps): ReactNode {
    const {
        className: _className,
        style: _style,
        slotProps: _slotProps,
        trigger,
        closeLabel,
        closeIcon,
        headline,
        confirmAction,
        body,
        ...rootProps
    } = props;
    const slot = useSlotProps(props);
    return (
        <Root {...rootProps} {...(slot("root") as object)}>
            {isPresent(trigger) ? (
                <Trigger as={Button} label={trigger} {...slot("trigger")} />
            ) : null}
            <Positioner {...slot("positioner")}>
                <Content {...slot("content")}>
                    <Header {...slot("header")}>
                        <CloseTrigger
                            as={IconButton}
                            aria-label={closeLabel ?? "Close"}
                            icon={
                                isPresent(closeIcon) ? closeIcon : <CloseIcon />
                            }
                            {...(slot("closeTrigger") as object)}
                        />
                        {isPresent(headline) ? (
                            <Headline {...slot("headline")}>
                                {headline}
                            </Headline>
                        ) : null}
                        {isPresent(confirmAction) ? (
                            <ConfirmAction
                                as={Button}
                                variant="text"
                                label={confirmAction}
                                {...(slot("confirmAction") as object)}
                            />
                        ) : null}
                    </Header>
                    {isPresent(body) ? (
                        <Body {...slot("body")}>{body}</Body>
                    ) : null}
                </Content>
            </Positioner>
        </Root>
    );
}

/** Material's full-screen dialog. Use it ready-made, `<FullscreenDialog trigger="New event"
 *  headline="New event" confirmAction="Save" body="…" />`, or compose its parts under
 *  `FullscreenDialog.Root`: `Trigger` (`as={Button}` draws it as a button), then `Positioner`
 *  holding `Content`, which holds `Header` (with `CloseTrigger`, `Headline`, and `ConfirmAction`)
 *  and `Body`. */
export const FullscreenDialog = Object.assign(ReadyMade, {
    Root,
    Trigger,
    Positioner,
    Content,
    Header,
    CloseTrigger,
    Headline,
    ConfirmAction,
    Body,
});
