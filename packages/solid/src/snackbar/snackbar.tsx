// The snackbar: Root on pureform's snackbar machine, the snackbar itself (a `role="status"` region
// hidden once closed and its exit animation over, which closes itself after `duration` unless the pointer or focus is in
// it); its supporting text, action, and close button; and the ready-made Snackbar over them.
// Placing it, fixed to the bottom of the screen, is the app's.

import { snackbarAnatomy } from "@pureform/anatomy";
import {
    isPresent,
    presentProps,
    SNACKBAR_CONTENT_PROPS,
    SNACKBAR_ROOT_PROPS,
    snackbarMachineProps,
    snackbarSelection,
} from "@pureform/binding-core";
import type {
    InteractionSourceProps,
    SnackbarContentProps,
    SnackbarOpenChangeDetails,
    SnackbarRootOwnProps,
} from "@pureform/binding-core";
import * as snackbar from "@pureform/machines/snackbar";
import type { JSX, ValidComponent } from "@solidjs/web";
import {
    type Accessor,
    createMemo,
    createUniqueId,
    omit,
    Show,
} from "solid-js";

import { useControllable } from "../controllable";
import {
    useInteractionHandlers,
    useOwnInteractionSource,
} from "../interaction";
import { normalizeProps, useMachine } from "../internal/zag";
import type { PropTypes } from "../internal/zag";
import { createPartContext } from "../part-context";
import { createSlotProps, useComponent } from "../parts";
import type { ComponentScope, SlotKeyedProps } from "../parts";
import { usePresence } from "../presence";
import { combinePartProps } from "../props";
import type { PartProps } from "../props";
import { useDirection } from "../provider";

type Anatomy = typeof snackbarAnatomy;

/** What Root shares with its parts. */
interface SnackbarContextValue {
    readonly scope: ComponentScope<Anatomy>;
    readonly api: Accessor<snackbar.Api<PropTypes>>;
}

const context = createPartContext<SnackbarContextValue>("Snackbar");

/** Root's props: the tokens, the machine's props (`open`, `duration`, `onAction`, …), `testId`
 *  and `unstyled` for every part, `as`, and the element's own props. */
export interface SnackbarRootProps
    extends Omit<PartProps, keyof SnackbarRootOwnProps>, SnackbarRootOwnProps {
    /** Another element or component to render instead of `<div>`. */
    readonly as?: ValidComponent | undefined;
}

/** A part's props: the element's own, and the part's `unstyled`. */
export interface SnackbarPartProps extends PartProps {
    readonly unstyled?: boolean | undefined;
}

/** The snackbar: a `role="status"` region, hidden once closed and its exit animation over. */
function Root(props: SnackbarRootProps): JSX.Element {
    const id = createUniqueId();
    const dir = useDirection();
    const open = useControllable<"open", boolean, SnackbarOpenChangeDetails>(
        "Snackbar",
        "open",
        props,
    );
    const service = useMachine(snackbar.machine, () => ({
        id,
        dir: dir(),
        ...snackbarMachineProps(props),
        ...open.machineProps(),
    }));
    const api = createMemo(() => snackbar.connect(service, normalizeProps));
    const presence = usePresence(() => api().open);
    const scope = useComponent(snackbarAnatomy, {
        selection: () => snackbarSelection(props),
        testId: () => props.testId,
        unstyled: () => props.unstyled,
        indication: () => props.indication,
    });
    return (
        <context.Provider value={{ scope, api }}>
            {scope.render("root", {
                element: "div",
                as: () => props.as,
                ref: presence.ref,
                machine: () =>
                    presentProps(api().getRootProps(), presence.present()),
                props: omit(props, "as", ...SNACKBAR_ROOT_PROPS),
            })}
        </context.Provider>
    );
}

/** The message. */
function SupportingText(props: SnackbarPartProps): JSX.Element {
    const { scope, api } = context.use("SupportingText");
    return scope.render("supportingText", {
        element: "span",
        machine: () => api().getSupportingTextProps(),
        unstyled: () => props.unstyled,
        props: omit(props, "unstyled"),
    });
}

/** The wrapper of the action and the close button, which `layout="longAction"` moves below the
 *  text. */
function Actions(props: SnackbarPartProps): JSX.Element {
    const { scope, api } = context.use("Actions");
    return scope.render("actions", {
        element: "span",
        machine: () => api().getActionsProps(),
        unstyled: () => props.unstyled,
        props: omit(props, "unstyled"),
    });
}

/** A button's props: a part's, and the interaction source its presses are emitted to. */
export interface SnackbarButtonProps
    extends SnackbarPartProps, InteractionSourceProps {}

// The action and the close button, each a surface with its own source.
const snackbarButton = (part: "action" | "close", name: string) =>
    function SnackbarButton(props: SnackbarButtonProps): JSX.Element {
        const { scope, api } = context.use(name);
        const source = useOwnInteractionSource(() => props.interactionSource);
        const handlers = useInteractionHandlers(source, () => false);
        return scope.render(part, {
            element: "button",
            interactionSource: source,
            machine: () =>
                combinePartProps([
                    (part === "action"
                        ? api().getActionProps()
                        : api().getCloseProps()) as Readonly<
                        Record<string, unknown>
                    >,
                    handlers(),
                ]),
            unstyled: () => props.unstyled,
            props: omit(props, "unstyled", "interactionSource"),
        });
    };

/** The action, a text button: it calls `onAction`, then the snackbar asks to close. */
const Action = snackbarButton("action", "Action");

/** The close button, an icon button: name it with `aria-label`. */
const Close = snackbarButton("close", "Close");

/** The cross the ready-made close button shows unless given another icon. */
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

/** The ready-made snackbar's props: Root's, with `class`, `style`, and `slotProps` keyed by part,
 *  and the message, action, and close button as content. */
export interface SnackbarProps
    extends
        Omit<SnackbarRootProps, keyof SlotKeyedProps<Anatomy> | "children">,
        SlotKeyedProps<Anatomy>,
        SnackbarContentProps<JSX.Element> {}

const READY_MADE_PROPS = [
    "class",
    "style",
    "slotProps",
    ...SNACKBAR_CONTENT_PROPS,
] as const;

/** The ready-made snackbar: the message, the action when given a label, and the close button when
 *  given a name. */
function ReadyMade(props: SnackbarProps): JSX.Element {
    const slots = createSlotProps(props);
    const own = omit(props, ...READY_MADE_PROPS) as SnackbarRootProps;
    const root = slots("root") as object;
    const supportingText = slots("supportingText");
    const actions = slots("actions");
    const action = slots("action");
    const close = slots("close");
    return (
        <Root {...own} {...root}>
            <SupportingText {...supportingText}>
                {props.supportingText}
            </SupportingText>
            <Show when={isPresent(props.action) || props.closeLabel}>
                <Actions {...actions}>
                    <Show when={isPresent(props.action)}>
                        <Action {...action}>{props.action}</Action>
                    </Show>
                    <Show when={props.closeLabel}>
                        <Close aria-label={props.closeLabel} {...close}>
                            {isPresent(props.closeIcon) ? (
                                props.closeIcon
                            ) : (
                                <CloseIcon />
                            )}
                        </Close>
                    </Show>
                </Actions>
            </Show>
        </Root>
    );
}

/** Material's snackbar. Use it ready-made, `<Snackbar open={saved()} onOpenChange={…}
 *  supportingText="Message archived" action="Undo" closeLabel="Dismiss" />`, or compose its parts
 *  under `Snackbar.Root`: `SupportingText`, `Actions`, `Action`, and `Close`. */
export const Snackbar = Object.assign(ReadyMade, {
    Root,
    SupportingText,
    Actions,
    Action,
    Close,
});
