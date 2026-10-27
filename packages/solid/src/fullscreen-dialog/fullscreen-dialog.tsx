// The full-screen dialog: Root on Zag's dialog machine, an unstyled element around the trigger and
// the dialog; the trigger, a `<button>` or any component (`as={Button}`); Zag's positioner, fixed
// over the viewport, which the dialog fills; the dialog's surface (`Content`) with its header
// (close trigger, headline, confirm action) and body; and the ready-made FullscreenDialog over
// them. Everything renders in place, inside Root: while a modal dialog is open, Zag keeps focus
// inside it, hides the rest of the page from assistive technology, and stops the page scrolling.
// Nothing shows behind it, so there is no backdrop.

import { fullscreenDialogOverlayAnatomy } from "@pureform/anatomy";
import type { TestIdOverride } from "@pureform/anatomy";
import {
    FULLSCREEN_DIALOG_CONTENT_PROPS,
    FULLSCREEN_DIALOG_ROOT_PROPS,
    fullscreenDialogSelection,
    isPresent,
} from "@pureform/binding-core";
import type {
    FullscreenDialogContentProps,
    FullscreenDialogPart,
    FullscreenDialogRootOwnProps,
    Unstyled,
} from "@pureform/binding-core";
import {
    dialogMachineProps,
    fullscreenDialogPositionerLayout,
} from "@pureform/binding-web";
import type { DialogFocusProps } from "@pureform/binding-web";
import type { JSX, ValidComponent } from "@solidjs/web";
import { omit, Show } from "solid-js";

import { Button } from "../button";
import { dialogParts } from "../dialog-parts";
import { CloseIcon } from "../glyphs";
import { IconButton } from "../icon-button";
import { createSlotProps, asRoot } from "../parts";
import type { SlotKeyedProps } from "../parts";
import type { PartProps } from "../props";

type Anatomy = typeof fullscreenDialogOverlayAnatomy;

/** Root's props: the tokens, the machine's props (`open`, `modal`, `role`, …), `testId` and
 *  `unstyled` for every part, `as`, and the element's own props. */
export interface FullscreenDialogRootProps
    extends
        Omit<PartProps, keyof FullscreenDialogRootOwnProps>,
        FullscreenDialogRootOwnProps,
        DialogFocusProps {
    /** Another element or component to render instead of `<div>`. */
    readonly as?: ValidComponent | undefined;
}

/** A part's props: the element's own, and the part's `unstyled`. */
export interface FullscreenDialogPartProps extends PartProps {
    readonly unstyled?: boolean | undefined;
}

/** A trigger's props: a part's, and `as` to render a component instead of `<button>` (`as={
 *  Button}`), which takes the rest of the props. */
export interface FullscreenDialogTriggerProps extends FullscreenDialogPartProps {
    readonly as?: ValidComponent | undefined;
    readonly [prop: string]: unknown;
}

const chrome = dialogParts({
    name: "FullscreenDialog",
    anatomy: fullscreenDialogOverlayAnatomy,
    rootProps: FULLSCREEN_DIALOG_ROOT_PROPS,
    selection: (props: FullscreenDialogRootProps) =>
        fullscreenDialogSelection(props),
    machineProps: dialogMachineProps,
    positionerLayout: (present) => fullscreenDialogPositionerLayout(present),
    // oxlint-disable-next-line solid/reactivity -- a callback the shared part calls where it tracks, not a component
    onClose: (props) => props.onClose,
});

/** The full-screen dialog's root, a `<div>` around the trigger and the dialog. The registry
 *  doesn't style it. */
const Root: (props: FullscreenDialogRootProps) => JSX.Element = chrome.Root;

/** The button that opens the dialog. */
const Trigger: (props: FullscreenDialogTriggerProps) => JSX.Element =
    chrome.Trigger;

/** Covers the viewport, which the dialog fills, stacked at its surface's layer; hidden once it's
 *  closed and its exit animation is over. The registry doesn't style it. */
const Positioner: (props: FullscreenDialogPartProps) => JSX.Element =
    chrome.Positioner;

/** The dialog's surface. It stays while its exit animation runs. */
const Content: (props: FullscreenDialogPartProps) => JSX.Element =
    chrome.Content;

/** The row at the top: the close trigger, the headline, and the confirm action. */
const Header: (props: FullscreenDialogPartProps) => JSX.Element = chrome.part(
    "header",
    "Header",
    "div",
);

/** A button that closes the dialog: `as={IconButton}` draws it as one. Name it with
 *  `aria-label`. */
const CloseTrigger: (props: FullscreenDialogTriggerProps) => JSX.Element =
    chrome.closeTrigger("closeTrigger", "CloseTrigger");

/** The title, an `<h2>`, which names the dialog. */
const Headline: (props: FullscreenDialogPartProps) => JSX.Element = chrome.part(
    "headline",
    "Headline",
    "h2",
    (api) => api.getTitleProps(),
);

/** The confirming action at the end of the header: `as={Button}` draws it as a text button. It
 *  doesn't close the dialog by itself; close it from your handler. */
const ConfirmAction: (props: FullscreenDialogTriggerProps) => JSX.Element =
    chrome.trigger("confirmAction", "ConfirmAction");

/** The content, which describes the dialog. It scrolls when it's taller than the screen. */
const Body: (props: FullscreenDialogPartProps) => JSX.Element = chrome.part(
    "body",
    "Body",
    "div",
    (api) => api.getDescriptionProps(),
);

/** The ready-made dialog's props: Root's, with `class`, `style`, and `slotProps` keyed by part,
 *  the trigger's label, and the close trigger's name and icon, the headline, the confirm action,
 *  and the body as content. */
export interface FullscreenDialogProps
    extends
        Omit<
            FullscreenDialogRootProps,
            keyof SlotKeyedProps<Anatomy> | "children"
        >,
        SlotKeyedProps<Anatomy>,
        FullscreenDialogContentProps<JSX.Element> {
    readonly testId?: TestIdOverride<FullscreenDialogPart>;
    readonly unstyled?: Unstyled<FullscreenDialogPart>;
}

const READY_MADE_PROPS = [
    "class",
    "style",
    "slotProps",
    ...FULLSCREEN_DIALOG_CONTENT_PROPS,
] as const;

/** The ready-made dialog: the trigger, drawn as a button, when given a label, and the dialog with
 *  its header (the close icon button, the headline, and the confirm action when given) and body. */
function ReadyMade(props: FullscreenDialogProps): JSX.Element {
    const slots = createSlotProps(props);
    const own = omit(props, ...READY_MADE_PROPS) as FullscreenDialogRootProps;
    const root = slots("root") as object;
    const trigger = slots("trigger");
    const positioner = slots("positioner");
    const content = slots("content");
    const header = slots("header");
    const closeTrigger = slots("closeTrigger");
    const headline = slots("headline");
    const confirmAction = slots("confirmAction");
    const body = slots("body");
    return (
        <Root {...own} {...root}>
            <Show when={isPresent(props.trigger)}>
                <Trigger
                    as={Button}
                    label={props.trigger}
                    {...asRoot(trigger)}
                />
            </Show>
            <Positioner {...positioner}>
                <Content {...content}>
                    <Header {...header}>
                        <CloseTrigger
                            as={IconButton}
                            aria-label={props.closeLabel ?? "Close"}
                            icon={
                                isPresent(props.closeIcon) ? (
                                    props.closeIcon
                                ) : (
                                    <CloseIcon />
                                )
                            }
                            {...asRoot(closeTrigger)}
                        />
                        <Show when={isPresent(props.headline)}>
                            <Headline {...headline}>{props.headline}</Headline>
                        </Show>
                        <Show when={isPresent(props.confirmAction)}>
                            <ConfirmAction
                                as={Button}
                                variant="text"
                                label={props.confirmAction}
                                {...asRoot(confirmAction)}
                            />
                        </Show>
                    </Header>
                    <Show when={isPresent(props.body)}>
                        <Body {...body}>{props.body}</Body>
                    </Show>
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
