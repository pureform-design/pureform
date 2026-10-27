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
    DIALOG_CONTENT_PROPS,
    DIALOG_ROOT_PROPS,
    dialogSelection,
    isPresent,
} from "@pureform/binding-core";
import type {
    DialogContentProps,
    DialogPart,
    DialogRootOwnProps,
    Unstyled,
} from "@pureform/binding-core";
import {
    dialogMachineProps,
    dialogPositionerLayout,
} from "@pureform/binding-web";
import type { DialogFocusProps } from "@pureform/binding-web";
import type { JSX, ValidComponent } from "@solidjs/web";
import { omit, Show } from "solid-js";

import { Button } from "../button";
import { dialogParts } from "../dialog-parts";
import { createSlotProps, asRoot } from "../parts";
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
    readonly as?: ValidComponent | undefined;
}

/** A part's props: the element's own, and the part's `unstyled`. */
export interface DialogPartProps extends PartProps {
    readonly unstyled?: boolean | undefined;
}

/** A trigger's props: a part's, and `as` to render a component instead of `<button>` (`as={
 *  Button}`), which takes the rest of the props. */
export interface DialogTriggerProps extends DialogPartProps {
    readonly as?: ValidComponent | undefined;
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
    // oxlint-disable-next-line solid/reactivity -- a callback the shared part calls where it tracks, not a component
    onClose: (props) => props.onClose,
});

const { context } = chrome;

/** The dialog's root, a `<div>` around the trigger and the dialog. The registry doesn't style
 *  it. */
const Root: (props: DialogRootProps) => JSX.Element = chrome.Root;

/** The button that opens the dialog. */
const Trigger: (props: DialogTriggerProps) => JSX.Element = chrome.Trigger;

/** Dims the page behind the dialog, drawn by the scrim; hidden once it's closed and its exit
 *  animation is over. */
const Backdrop: (props: DialogPartProps) => JSX.Element = chrome.Backdrop;

/** Covers the viewport and centers the dialog, stacked at its surface's layer; hidden once it's
 *  closed and its exit animation is over. The registry doesn't style it. */
const Positioner: (props: DialogPartProps) => JSX.Element = chrome.Positioner;

/** The dialog's surface. It stays while its exit animation runs. */
const Content: (props: DialogPartProps) => JSX.Element = chrome.Content;

/** An icon above the headline, hidden from assistive technology. Turn on Root's `icon` with it. */
function Icon(props: DialogIconProps): JSX.Element {
    const { scope } = context.use("Icon");
    const rest = omit(props, "unstyled", "mirror");
    return scope.render("icon", {
        element: "span",
        machine: () => ({ "aria-hidden": "true" }),
        states: () => ({ mirrored: props.mirror }),
        unstyled: () => props.unstyled,
        props: rest,
    });
}

/** The title, an `<h2>`, which names the dialog. */
const Headline: (props: DialogPartProps) => JSX.Element = chrome.part(
    "headline",
    "Headline",
    "h2",
    (api) => api.getTitleProps(),
);

/** The message, which describes the dialog. */
const Body: (props: DialogPartProps) => JSX.Element = chrome.part(
    "body",
    "Body",
    "div",
    (api) => api.getDescriptionProps(),
);

/** The buttons at the end. */
const Actions: (props: DialogPartProps) => JSX.Element = chrome.part(
    "actions",
    "Actions",
    "div",
);

/** A button that closes the dialog, such as Cancel: `as={Button}` draws it as one. The registry
 *  doesn't style it. */
const CloseTrigger: (props: DialogTriggerProps) => JSX.Element =
    chrome.closeTrigger("closeTrigger", "CloseTrigger");

/** The ready-made dialog's props: Root's, with `class`, `style`, and `slotProps` keyed by part,
 *  the trigger's label, and the icon, headline, body, and actions as content. */
export interface DialogProps
    extends
        Omit<
            DialogRootProps,
            keyof SlotKeyedProps<Anatomy, "backdrop"> | "children" | "icon"
        >,
        SlotKeyedProps<Anatomy, "backdrop">,
        DialogContentProps<JSX.Element> {
    readonly testId?: TestIdOverride<DialogPart>;
    readonly unstyled?: Unstyled<DialogPart>;
}

const READY_MADE_PROPS = [
    "class",
    "style",
    "slotProps",
    "icon",
    ...DIALOG_CONTENT_PROPS,
] as const;

/** The ready-made dialog: the trigger, drawn as a button, when given a label, the backdrop, and the
 *  dialog with its icon, headline, body, and actions, each only when given. */
function ReadyMade(props: DialogProps): JSX.Element {
    const slots = createSlotProps(props);
    const backdrop = slots("backdrop");
    const own = omit(props, ...READY_MADE_PROPS) as DialogRootProps;
    const root = slots("root") as object;
    const trigger = slots("trigger");
    const positioner = slots("positioner");
    const content = slots("content");
    const icon = slots("icon");
    const headline = slots("headline");
    const body = slots("body");
    const actions = slots("actions");
    return (
        <Root {...own} icon={isPresent(props.icon) || undefined} {...root}>
            <Show when={isPresent(props.trigger)}>
                <Trigger
                    as={Button}
                    label={props.trigger}
                    {...asRoot(trigger)}
                />
            </Show>
            <Backdrop {...backdrop} />
            <Positioner {...positioner}>
                <Content {...content}>
                    <Show when={isPresent(props.icon)}>
                        <Icon mirror={props.mirrorIcon} {...icon}>
                            {props.icon}
                        </Icon>
                    </Show>
                    <Show when={isPresent(props.headline)}>
                        <Headline {...headline}>{props.headline}</Headline>
                    </Show>
                    <Show when={isPresent(props.body)}>
                        <Body {...body}>{props.body}</Body>
                    </Show>
                    <Show when={isPresent(props.actions)}>
                        <Actions {...actions}>{props.actions}</Actions>
                    </Show>
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
