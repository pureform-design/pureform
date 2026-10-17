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
    dialogBackdropLayout,
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
import { mergeProps, normalizeProps, useMachine } from "../internal/zag";
import type { PropTypes } from "../internal/zag";
import { createPartContext } from "../part-context";
import { slotPartProps, useComponent } from "../parts";
import type { ComponentScope, SlotKeyedProps } from "../parts";
import type { PartProps } from "../props";
import { useDirection } from "../provider";

type Anatomy = typeof dialogOverlayAnatomy;
type BackdropAnatomy = typeof dialogBackdropAnatomy;

/** What Root shares with its parts. */
interface DialogContextValue {
    readonly scope: ComponentScope<Anatomy>;
    readonly backdrop: ComponentScope<BackdropAnatomy>;
    readonly api: Accessor<dialog.Api<PropTypes>>;
}

const context = createPartContext<DialogContextValue>("Dialog");

/** Root's props: the `icon` variant and tokens, the machine's props (`open`, `modal`, `role`,
 *  …), `testId` and `unstyled` for every part, `as`, and the element's own props. */
export interface DialogRootProps
    extends Omit<PartProps, keyof DialogRootOwnProps>, DialogRootOwnProps {
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

// The backdrop's test id and `unstyled`, from Root's, which name it `backdrop`.
const backdropTestId = (
    testId: TestIdOverride<DialogPart> | undefined,
): TestIdOverride<"root"> | undefined =>
    typeof testId !== "object"
        ? testId
        : testId.backdrop === undefined
          ? undefined
          : { root: testId.backdrop };

const backdropUnstyled = (
    unstyled: Unstyled<DialogPart> | undefined,
): Unstyled<"root"> | undefined =>
    typeof unstyled !== "object"
        ? unstyled
        : unstyled.backdrop === undefined
          ? undefined
          : { root: unstyled.backdrop };

/** The dialog's root, a `<div>` around the trigger and the dialog. The registry doesn't style
 *  it. */
function Root(props: DialogRootProps): JSX.Element {
    const id = createUniqueId();
    const dir = useDirection();
    const open = useControllable<"open", boolean>("Dialog", "open", props);
    const service = useMachine(dialog.machine, () => ({
        id,
        dir: dir(),
        ...dialogMachineProps(props),
        ...open.machineProps(),
    }));
    const api = createMemo(() => dialog.connect(service, normalizeProps));
    const scope = useComponent(dialogOverlayAnatomy, {
        selection: () => dialogSelection(props),
        testId: () => props.testId as TestIdOverride<keyof Anatomy["parts"]>,
        unstyled: () => props.unstyled as Unstyled<keyof Anatomy["parts"]>,
    });
    const backdrop = useComponent(dialogBackdropAnatomy, {
        selection: () => ({}),
        testId: () => backdropTestId(props.testId),
        unstyled: () => backdropUnstyled(props.unstyled),
    });
    return (
        <context.Provider value={{ scope, backdrop, api }}>
            {scope.render("root", {
                element: "div",
                as: () => props.as,
                props: omit(props, "as", ...DIALOG_ROOT_PROPS),
            })}
        </context.Provider>
    );
}

/** The button that opens the dialog. */
function Trigger(props: DialogTriggerProps): JSX.Element {
    const { scope, api } = context.use("Trigger");
    return scope.render("trigger", {
        element: "button",
        as: () => props.as,
        machine: () => api().getTriggerProps(),
        unstyled: () => props.unstyled,
        props: omit(props, "unstyled", "as"),
    });
}

/** Dims the page behind the dialog, drawn by the scrim; hidden while it's closed. */
function Backdrop(props: DialogPartProps): JSX.Element {
    const { backdrop, api } = context.use("Backdrop");
    return backdrop.render("root", {
        element: "div",
        machine: () =>
            mergeProps(
                api().getBackdropProps(),
                normalizeProps.element(dialogBackdropLayout()),
            ),
        unstyled: () => props.unstyled,
        props: omit(props, "unstyled"),
    });
}

/** Covers the viewport and centers the dialog; hidden while it's closed. The registry doesn't
 *  style it. */
function Positioner(props: DialogPartProps): JSX.Element {
    const { scope, api } = context.use("Positioner");
    return scope.render("positioner", {
        element: "div",
        machine: () =>
            mergeProps(
                api().getPositionerProps(),
                normalizeProps.element(dialogPositionerLayout(api().open)),
            ),
        unstyled: () => props.unstyled,
        props: omit(props, "unstyled"),
    });
}

/** The dialog's surface. */
function Content(props: DialogPartProps): JSX.Element {
    const { scope, api } = context.use("Content");
    return scope.render("content", {
        element: "div",
        machine: () => api().getContentProps(),
        unstyled: () => props.unstyled,
        props: omit(props, "unstyled"),
    });
}

/** An icon above the headline, hidden from assistive technology. Turn on Root's `icon` with it. */
function Icon(props: DialogIconProps): JSX.Element {
    const { scope } = context.use("Icon");
    return scope.render("icon", {
        element: "span",
        machine: () => ({ "aria-hidden": "true" }),
        states: () => ({ mirrored: props.mirror }),
        unstyled: () => props.unstyled,
        props: omit(props, "unstyled", "mirror"),
    });
}

/** The title, an `<h2>`, which names the dialog. */
function Headline(props: DialogPartProps): JSX.Element {
    const { scope, api } = context.use("Headline");
    return scope.render("headline", {
        element: "h2",
        machine: () => api().getTitleProps(),
        unstyled: () => props.unstyled,
        props: omit(props, "unstyled"),
    });
}

/** The message, which describes the dialog. */
function Body(props: DialogPartProps): JSX.Element {
    const { scope, api } = context.use("Body");
    return scope.render("body", {
        element: "div",
        machine: () => api().getDescriptionProps(),
        unstyled: () => props.unstyled,
        props: omit(props, "unstyled"),
    });
}

/** The buttons at the end. */
function Actions(props: DialogPartProps): JSX.Element {
    const { scope } = context.use("Actions");
    return scope.render("actions", {
        element: "div",
        unstyled: () => props.unstyled,
        props: omit(props, "unstyled"),
    });
}

/** A button that closes the dialog, such as Cancel: `as={Button}` draws it as one. The registry
 *  doesn't style it. */
function CloseTrigger(props: DialogTriggerProps): JSX.Element {
    const { scope, api } = context.use("CloseTrigger");
    return scope.render("closeTrigger", {
        element: "button",
        as: () => props.as,
        machine: () => api().getCloseTriggerProps(),
        unstyled: () => props.unstyled,
        props: omit(props, "unstyled", "as"),
    });
}

/** The ready-made dialog's props: Root's, with `class`, `style`, and `slotProps` keyed by part,
 *  the trigger's label, and the icon, headline, body, and actions as content. */
export interface DialogProps
    extends
        Omit<
            DialogRootProps,
            keyof SlotKeyedProps<Anatomy> | "children" | "icon"
        >,
        SlotKeyedProps<Anatomy>,
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
    const slot = (part: Parameters<typeof slotPartProps<Anatomy>>[1]) =>
        slotPartProps(props, part) as object;
    return (
        <Root
            {...(omit(props, ...READY_MADE_PROPS) as DialogRootProps)}
            icon={isPresent(props.icon) || undefined}
            {...slot("root")}
        >
            <Show when={isPresent(props.trigger)}>
                <Trigger
                    as={Button}
                    label={props.trigger}
                    {...slot("trigger")}
                />
            </Show>
            <Backdrop />
            <Positioner {...slot("positioner")}>
                <Content {...slot("content")}>
                    <Show when={isPresent(props.icon)}>
                        <Icon mirror={props.mirrorIcon} {...slot("icon")}>
                            {props.icon}
                        </Icon>
                    </Show>
                    <Show when={isPresent(props.headline)}>
                        <Headline {...slot("headline")}>
                            {props.headline}
                        </Headline>
                    </Show>
                    <Show when={isPresent(props.body)}>
                        <Body {...slot("body")}>{props.body}</Body>
                    </Show>
                    <Show when={isPresent(props.actions)}>
                        <Actions {...slot("actions")}>{props.actions}</Actions>
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
