// The snackbar: Root on pureform's snackbar machine, the snackbar itself (a `role="status"` region
// hidden once closed and its exit animation over, which closes itself after `duration` unless the pointer or focus is in
// it); its supporting text, action, and close button; and the ready-made Snackbar over them.
// Placing it, fixed to the bottom of the screen, is the app's.

import { snackbarAnatomy } from "@pureform/anatomy";
import {
    isPresent,
    SNACKBAR_ROOT_PROPS,
    snackbarSelection,
} from "@pureform/binding-core";
import type {
    InteractionSourceProps,
    SnackbarContentProps,
    SnackbarOpenChangeDetails,
    SnackbarRootOwnProps,
} from "@pureform/binding-core";
import { presentProps, snackbarMachineProps } from "@pureform/binding-web";
import * as snackbar from "@pureform/machines/snackbar";
import { normalizeProps } from "@zag-js/react";
import type { PropTypes } from "@zag-js/react";
import {
    type ElementType,
    type ReactNode,
    useEffect,
    useId,
    useRef,
} from "react";

import { useControllable } from "../controllable";
import { CloseIcon } from "../glyphs";
import { useMachineButton } from "../interaction";
import { useMachine } from "../machine";
import { createPartContext } from "../part-context";
import { useComponent, useSlotProps } from "../parts";
import type { ComponentScope, SlotKeyedProps } from "../parts";
import { usePresence } from "../presence";
import { omitProps } from "../props";
import type { PartProps } from "../props";
import { useDirection } from "../provider";

type Anatomy = typeof snackbarAnatomy;

/** What Root shares with its parts. */
interface SnackbarContextValue {
    readonly scope: ComponentScope<Anatomy>;
    readonly api: snackbar.Api<PropTypes>;
}

const context = createPartContext<SnackbarContextValue>("Snackbar");

/** Root's props: the tokens, the machine's props (`open`, `duration`, `onAction`, …), `testId`
 *  and `unstyled` for every part, `as`, and the element's own props. */
export interface SnackbarRootProps
    extends Omit<PartProps, keyof SnackbarRootOwnProps>, SnackbarRootOwnProps {
    /** Another element or component to render instead of `<div>`. */
    readonly as?: ElementType | undefined;
}

/** A part's props: the element's own, and the part's `unstyled`. */
export interface SnackbarPartProps extends PartProps {
    readonly unstyled?: boolean | undefined;
}

/** The snackbar: a `role="status"` region, hidden once closed and its exit animation over. */
function Root(props: SnackbarRootProps): ReactNode {
    const id = useId();
    const dir = useDirection();
    const open = useControllable<"open", boolean, SnackbarOpenChangeDetails>(
        "Snackbar",
        "open",
        props,
    );
    const service = useMachine(snackbar.machine, {
        id,
        dir,
        ...snackbarMachineProps(props),
        ...open.machineProps,
    });
    const api = snackbar.connect(service, normalizeProps);
    const presence = usePresence(api.open);
    // Once it has shown and gone again, its exit is over.
    const shown = useRef(false);
    const onExitComplete = useRef(props.onExitComplete);
    onExitComplete.current = props.onExitComplete;
    useEffect(() => {
        if (presence.present) shown.current = true;
        else if (shown.current) {
            shown.current = false;
            onExitComplete.current?.();
        }
    }, [presence.present]);
    const scope = useComponent(snackbarAnatomy, {
        selection: snackbarSelection(props),
        testId: props.testId,
        unstyled: props.unstyled,
        indication: props.indication,
    });
    const { as, ...rest } = omitProps(props, SNACKBAR_ROOT_PROPS);
    return (
        <context.Provider value={{ scope, api }}>
            {scope.render("root", {
                element: "div",
                as,
                ref: presence.ref,
                machine: presentProps(api.getRootProps(), presence.present),
                props: rest,
            })}
        </context.Provider>
    );
}

/** The message. */
function SupportingText({ unstyled, ...props }: SnackbarPartProps): ReactNode {
    const { scope, api } = context.use("SupportingText");
    return scope.render("supportingText", {
        element: "span",
        machine: api.getSupportingTextProps(),
        unstyled,
        props,
    });
}

/** The wrapper of the action and the close button, which `layout="longAction"` moves below the
 *  text. */
function Actions({ unstyled, ...props }: SnackbarPartProps): ReactNode {
    const { scope, api } = context.use("Actions");
    return scope.render("actions", {
        element: "span",
        machine: api.getActionsProps(),
        unstyled,
        props,
    });
}

/** A button's props: a part's, and the interaction source its presses are emitted to. */
export interface SnackbarButtonProps
    extends SnackbarPartProps, InteractionSourceProps {}

// The action and the close button, each a surface with its own source.
const snackbarButton = (part: "action" | "close", name: string) =>
    function SnackbarButton(props: SnackbarButtonProps): ReactNode {
        const { scope, api } = context.use(name);
        return scope.render(
            part,
            useMachineButton(props, [
                (part === "action"
                    ? api.getActionProps()
                    : api.getCloseProps()) as Readonly<Record<string, unknown>>,
            ]),
        );
    };

/** The action, a text button: it calls `onAction`, then the snackbar asks to close. */
const Action = snackbarButton("action", "Action");

/** The close button, an icon button: name it with `aria-label`. */
const Close = snackbarButton("close", "Close");

/** The ready-made snackbar's props: Root's, with `className`, `style`, and `slotProps` keyed by
 *  part, and the message, action, and close button as content. */
export interface SnackbarProps
    extends
        Omit<SnackbarRootProps, keyof SlotKeyedProps<Anatomy> | "children">,
        SlotKeyedProps<Anatomy>,
        SnackbarContentProps<ReactNode> {}

/** The ready-made snackbar: the message, the action when given a label, and the close button when
 *  given a name. */
function ReadyMade(props: SnackbarProps): ReactNode {
    const {
        className: _className,
        style: _style,
        slotProps: _slotProps,
        supportingText,
        action,
        closeLabel,
        closeIcon,
        ...rootProps
    } = props;
    const slot = useSlotProps(props);
    return (
        <Root {...rootProps} {...(slot("root") as object)}>
            <SupportingText {...slot("supportingText")}>
                {supportingText}
            </SupportingText>
            {isPresent(action) || closeLabel ? (
                <Actions {...slot("actions")}>
                    {isPresent(action) ? (
                        <Action {...slot("action")}>{action}</Action>
                    ) : null}
                    {closeLabel ? (
                        <Close aria-label={closeLabel} {...slot("close")}>
                            {isPresent(closeIcon) ? closeIcon : <CloseIcon />}
                        </Close>
                    ) : null}
                </Actions>
            ) : null}
        </Root>
    );
}

/** Material's snackbar. Use it ready-made, `<Snackbar open={saved} onOpenChange={…}
 *  supportingText="Message archived" action="Undo" closeLabel="Dismiss" />`, or compose its parts
 *  under `Snackbar.Root`: `SupportingText`, `Actions`, `Action`, and `Close`. */
export const Snackbar = Object.assign(ReadyMade, {
    Root,
    SupportingText,
    Actions,
    Action,
    Close,
});
