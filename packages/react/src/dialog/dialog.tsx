// The dialog: Root on Zag's dialog machine, an unstyled element around the trigger and the dialog;
// the trigger, a `<button>` or any component (`as={Button}`); the backdrop, drawn by the scrim;
// Zag's positioner, fixed over the viewport and centering the dialog; the dialog's surface
// (`Content`) with its icon, headline, body, and actions; a close trigger; and the ready-made
// Dialog over them. Everything renders in place, inside Root: while a modal dialog is open, Zag
// keeps focus inside it, hides the rest of the page from assistive technology, and stops the
// page scrolling.

import { dialogBackdropAnatomy, dialogOverlayAnatomy } from "@pureform/anatomy";
import type { TestIdOverride } from "@pureform/anatomy";
import {
    DIALOG_ROOT_PROPS,
    dialogMachineProps,
    dialogPositionerLayout,
    dialogSelection,
    isPresent,
} from "@pureform/binding-core";
import type {
    DialogContentProps,
    DialogPart,
    DialogRootOwnProps,
    Unstyled,
} from "@pureform/binding-core";
import type { DialogFocusProps } from "@pureform/binding-web";
import { type ElementType, type ReactNode } from "react";

import { Button } from "../button";
import { dialogParts } from "../dialog-parts";
import { useSlotProps, asRoot } from "../parts";
import type { SlotKeyedProps } from "../parts";
import type { PartProps } from "../props";

type Anatomy = typeof dialogOverlayAnatomy;

/** Root's props: the `icon` variant and tokens, the machine's props (`open`, `modal`, `role`,
 *  …), `testId` and `unstyled` for every part, `as`, and the element's own props. */
export interface DialogRootProps
    extends
        Omit<PartProps, keyof DialogRootOwnProps>,
        DialogRootOwnProps,
        DialogFocusProps {
    /** Another element or component to render instead of `<div>`. */
    readonly as?: ElementType | undefined;
}

/** A part's props: the element's own, and the part's `unstyled`. */
export interface DialogPartProps extends PartProps {
    readonly unstyled?: boolean | undefined;
}

/** A trigger's props: a part's, and `as` to render a component instead of `<button>` (`as={
 *  Button}`), which takes the rest of the props. */
export interface DialogTriggerProps extends DialogPartProps {
    readonly as?: ElementType | undefined;
    readonly [prop: string]: unknown;
}

/** The icon's props: a part's, and `mirror` to flip it under `rtl`. */
export interface DialogIconProps extends DialogPartProps {
    readonly mirror?: boolean | undefined;
}

const chrome = dialogParts({
    name: "Dialog",
    anatomy: dialogOverlayAnatomy,
    backdropAnatomy: dialogBackdropAnatomy,
    rootProps: DIALOG_ROOT_PROPS,
    selection: (props: DialogRootProps) => dialogSelection(props),
    machineProps: dialogMachineProps,
    positionerLayout: (present) => dialogPositionerLayout(present),
    onClose: (props) => props.onClose,
});

const { context } = chrome;

/** The dialog's root, a `<div>` around the trigger and the dialog. The registry doesn't style
 *  it. */
const Root: (props: DialogRootProps) => ReactNode = chrome.Root;

/** The button that opens the dialog. */
const Trigger: (props: DialogTriggerProps) => ReactNode = chrome.Trigger;

/** Dims the page behind the dialog, drawn by the scrim; hidden once it's closed and its exit
 *  animation is over. */
const Backdrop: (props: DialogPartProps) => ReactNode = chrome.Backdrop;

/** Covers the viewport and centers the dialog, stacked at its surface's layer; hidden once it's
 *  closed and its exit animation is over. The registry doesn't style it. */
const Positioner: (props: DialogPartProps) => ReactNode = chrome.Positioner;

/** The dialog's surface. It stays while its exit animation runs. */
const Content: (props: DialogPartProps) => ReactNode = chrome.Content;

/** The title, an `<h2>`, which names the dialog. */
const Headline: (props: DialogPartProps) => ReactNode = chrome.part(
    "headline",
    "Headline",
    "h2",
    (api) => api.getTitleProps(),
);

/** The message, which describes the dialog. */
const Body: (props: DialogPartProps) => ReactNode = chrome.part(
    "body",
    "Body",
    "div",
    (api) => api.getDescriptionProps(),
);

/** The buttons at the end. */
const Actions: (props: DialogPartProps) => ReactNode = chrome.part(
    "actions",
    "Actions",
    "div",
);

/** A button that closes the dialog, such as Cancel: `as={Button}` draws it as one. The registry
 *  doesn't style it. */
const CloseTrigger: (props: DialogTriggerProps) => ReactNode =
    chrome.closeTrigger("closeTrigger", "CloseTrigger");

/** An icon above the headline, hidden from assistive technology. Turn on Root's `icon` with it. */
function Icon({ unstyled, mirror, ...props }: DialogIconProps): ReactNode {
    const { scope } = context.use("Icon");
    return scope.render("icon", {
        element: "span",
        machine: { "aria-hidden": "true" },
        states: { mirrored: mirror },
        unstyled,
        props,
    });
}

/** The ready-made dialog's props: Root's, with `className`, `style`, and `slotProps` keyed by
 *  part, the trigger's label, and the icon, headline, body, and actions as content. */
export interface DialogProps
    extends
        Omit<
            DialogRootProps,
            keyof SlotKeyedProps<Anatomy, "backdrop"> | "children" | "icon"
        >,
        SlotKeyedProps<Anatomy, "backdrop">,
        DialogContentProps<ReactNode> {
    readonly testId?: TestIdOverride<DialogPart>;
    readonly unstyled?: Unstyled<DialogPart>;
}

/** The ready-made dialog: the trigger, drawn as a button, when given a label, the backdrop, and the
 *  dialog with its icon, headline, body, and actions, each only when given. */
function ReadyMade(props: DialogProps): ReactNode {
    const {
        className: _className,
        style: _style,
        slotProps: _slotProps,
        trigger,
        icon,
        mirrorIcon,
        headline,
        body,
        actions,
        ...rootProps
    } = props;
    const slot = useSlotProps(props);
    return (
        <Root
            {...rootProps}
            icon={isPresent(icon) || undefined}
            {...(slot("root") as object)}
        >
            {isPresent(trigger) ? (
                <Trigger
                    as={Button}
                    label={trigger}
                    {...asRoot(slot("trigger"))}
                />
            ) : null}
            <Backdrop {...slot("backdrop")} />
            <Positioner {...slot("positioner")}>
                <Content {...slot("content")}>
                    {isPresent(icon) ? (
                        <Icon mirror={mirrorIcon} {...slot("icon")}>
                            {icon}
                        </Icon>
                    ) : null}
                    {isPresent(headline) ? (
                        <Headline {...slot("headline")}>{headline}</Headline>
                    ) : null}
                    {isPresent(body) ? (
                        <Body {...slot("body")}>{body}</Body>
                    ) : null}
                    {isPresent(actions) ? (
                        <Actions {...slot("actions")}>{actions}</Actions>
                    ) : null}
                </Content>
            </Positioner>
        </Root>
    );
}

/** Material's basic dialog. Use it ready-made, `<Dialog trigger="Discard" headline="Discard
 *  draft?" body="…" actions={…} />`, or compose its parts under `Dialog.Root`: `Trigger`
 *  (`as={Button}` draws it as a button), `Backdrop`, then `Positioner` holding `Content`, which
 *  holds `Icon`, `Headline`, `Body`, and `Actions` (with a `CloseTrigger`, say). */
export const Dialog = Object.assign(ReadyMade, {
    Root,
    Trigger,
    Backdrop,
    Positioner,
    Content,
    Icon,
    Headline,
    Body,
    Actions,
    CloseTrigger,
});
