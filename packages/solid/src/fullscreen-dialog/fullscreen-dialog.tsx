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
    dialogMachineProps,
    FULLSCREEN_DIALOG_CONTENT_PROPS,
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
import type { JSX, ValidComponent } from "@solidjs/web";
import {
    type Accessor,
    createMemo,
    createUniqueId,
    omit,
    Show,
} from "solid-js";

import { Button } from "../button";
import { useControllable } from "../controllable";
import { IconButton } from "../icon-button";
import { mergeProps, normalizeProps, useMachine } from "../internal/zag";
import type { PropTypes } from "../internal/zag";
import { createPartContext } from "../part-context";
import { createSlotProps, useComponent } from "../parts";
import type { ComponentScope, SlotKeyedProps } from "../parts";
import { usePresence } from "../presence";
import type { Presence } from "../presence";
import type { PartProps } from "../props";
import { useDirection } from "../provider";

type Anatomy = typeof fullscreenDialogOverlayAnatomy;

/** What Root shares with its parts. */
interface FullscreenDialogContextValue {
    readonly scope: ComponentScope<Anatomy>;
    readonly api: Accessor<dialog.Api<PropTypes>>;
    readonly presence: Presence;
    readonly setPositioner: (element: HTMLElement) => void;
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

/** The full-screen dialog's root, a `<div>` around the trigger and the dialog. The registry
 *  doesn't style it. */
function Root(props: FullscreenDialogRootProps): JSX.Element {
    const id = createUniqueId();
    const dir = useDirection();
    const open = useControllable<"open", boolean>(
        "FullscreenDialog",
        "open",
        props,
    );
    const service = useMachine(dialog.machine, () => ({
        id,
        dir: dir(),
        ...dialogMachineProps(props),
        ...open.machineProps(),
    }));
    const api = createMemo(() => dialog.connect(service, normalizeProps));
    let positioner: HTMLElement | undefined;
    const presence = usePresence(
        () => api().open,
        (surface) =>
            positioner ? stackPositioner(positioner, surface) : undefined,
    );
    const scope = useComponent(fullscreenDialogOverlayAnatomy, {
        selection: () => fullscreenDialogSelection(props),
        testId: () => props.testId as TestIdOverride<keyof Anatomy["parts"]>,
        unstyled: () => props.unstyled as Unstyled<keyof Anatomy["parts"]>,
    });
    return (
        <context.Provider
            value={{
                scope,
                api,
                presence,
                setPositioner: (element) => {
                    positioner = element;
                },
            }}
        >
            {scope.render("root", {
                element: "div",
                as: () => props.as,
                props: omit(props, "as", ...FULLSCREEN_DIALOG_ROOT_PROPS),
            })}
        </context.Provider>
    );
}

/** The button that opens the dialog. */
function Trigger(props: FullscreenDialogTriggerProps): JSX.Element {
    const { scope, api } = context.use("Trigger");
    return scope.render("trigger", {
        element: "button",
        as: () => props.as,
        machine: () => api().getTriggerProps(),
        unstyled: () => props.unstyled,
        props: omit(props, "unstyled", "as"),
    });
}

/** Covers the viewport, which the dialog fills, stacked at its surface's layer; hidden once it's
 *  closed and its exit animation is over. The registry doesn't style it. */
function Positioner(props: FullscreenDialogPartProps): JSX.Element {
    const { scope, api, presence, setPositioner } = context.use("Positioner");
    return scope.render("positioner", {
        element: "div",
        ref: setPositioner,
        machine: () =>
            mergeProps(
                api().getPositionerProps(),
                normalizeProps.element(
                    fullscreenDialogPositionerLayout(presence.present()),
                ),
            ),
        unstyled: () => props.unstyled,
        props: omit(props, "unstyled"),
    });
}

/** The dialog's surface. It stays while its exit animation runs. */
function Content(props: FullscreenDialogPartProps): JSX.Element {
    const { scope, api, presence } = context.use("Content");
    return scope.render("content", {
        element: "div",
        ref: presence.ref,
        machine: () =>
            presentProps(api().getContentProps(), presence.present()),
        unstyled: () => props.unstyled,
        props: omit(props, "unstyled"),
    });
}

/** The row at the top: the close trigger, the headline, and the confirm action. */
function Header(props: FullscreenDialogPartProps): JSX.Element {
    const { scope } = context.use("Header");
    return scope.render("header", {
        element: "div",
        unstyled: () => props.unstyled,
        props: omit(props, "unstyled"),
    });
}

/** A button that closes the dialog: `as={IconButton}` draws it as one. Name it with
 *  `aria-label`. */
function CloseTrigger(props: FullscreenDialogTriggerProps): JSX.Element {
    const { scope, api } = context.use("CloseTrigger");
    return scope.render("closeTrigger", {
        element: "button",
        as: () => props.as,
        machine: () => api().getCloseTriggerProps(),
        unstyled: () => props.unstyled,
        props: omit(props, "unstyled", "as"),
    });
}

/** The title, an `<h2>`, which names the dialog. */
function Headline(props: FullscreenDialogPartProps): JSX.Element {
    const { scope, api } = context.use("Headline");
    return scope.render("headline", {
        element: "h2",
        machine: () => api().getTitleProps(),
        unstyled: () => props.unstyled,
        props: omit(props, "unstyled"),
    });
}

/** The confirming action at the end of the header: `as={Button}` draws it as a text button. It
 *  doesn't close the dialog by itself; close it from your handler. */
function ConfirmAction(props: FullscreenDialogTriggerProps): JSX.Element {
    const { scope } = context.use("ConfirmAction");
    return scope.render("confirmAction", {
        element: "button",
        as: () => props.as,
        unstyled: () => props.unstyled,
        props: omit(props, "unstyled", "as"),
    });
}

/** The content, which describes the dialog. It scrolls when it's taller than the screen. */
function Body(props: FullscreenDialogPartProps): JSX.Element {
    const { scope, api } = context.use("Body");
    return scope.render("body", {
        element: "div",
        machine: () => api().getDescriptionProps(),
        unstyled: () => props.unstyled,
        props: omit(props, "unstyled"),
    });
}

/** The cross the ready-made close trigger shows unless given another icon. */
const CloseIcon = (): JSX.Element => (
    <svg
        viewBox="0 0 24 24"
        width="1em"
        height="1em"
        fill="currentColor"
        aria-hidden="true"
    >
        <path d="M19 6.41 17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z" />
    </svg>
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
    const trigger = slots("trigger") as object;
    const positioner = slots("positioner");
    const content = slots("content");
    const header = slots("header");
    const closeTrigger = slots("closeTrigger") as object;
    const headline = slots("headline");
    const confirmAction = slots("confirmAction") as object;
    const body = slots("body");
    return (
        <Root {...own} {...root}>
            <Show when={isPresent(props.trigger)}>
                <Trigger as={Button} label={props.trigger} {...trigger} />
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
                            {...closeTrigger}
                        />
                        <Show when={isPresent(props.headline)}>
                            <Headline {...headline}>{props.headline}</Headline>
                        </Show>
                        <Show when={isPresent(props.confirmAction)}>
                            <ConfirmAction
                                as={Button}
                                variant="text"
                                label={props.confirmAction}
                                {...confirmAction}
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
