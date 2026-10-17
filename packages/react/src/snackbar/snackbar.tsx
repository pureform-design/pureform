// The snackbar: Root on pureform's snackbar machine, the snackbar itself (a `role="status"` region
// hidden while closed, which closes itself after `duration` unless the pointer or focus is in
// it); its supporting text, action, and close button; and the ready-made Snackbar over them.
// Placing it, fixed to the bottom of the screen, is the app's.

import { snackbarAnatomy } from "@pureform/anatomy";
import {
    isPresent,
    SNACKBAR_ROOT_PROPS,
    snackbarMachineProps,
    snackbarSelection,
} from "@pureform/binding-core";
import type {
    SnackbarContentProps,
    SnackbarOpenChangeDetails,
    SnackbarRootOwnProps,
} from "@pureform/binding-core";
import * as snackbar from "@pureform/machines/snackbar";
import { normalizeProps } from "@zag-js/react";
import type { PropTypes } from "@zag-js/react";
import { type ElementType, type ReactNode, useId } from "react";

import { useControllable } from "../controllable";
import { useMachine } from "../machine";
import { createPartContext } from "../part-context";
import { slotPartProps, useComponent } from "../parts";
import type { ComponentScope, SlotKeyedProps } from "../parts";
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

/** The snackbar: a `role="status"` region, hidden while closed. */
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
    const scope = useComponent(snackbarAnatomy, {
        selection: snackbarSelection(props),
        testId: props.testId,
        unstyled: props.unstyled,
    });
    const { as, ...rest } = omitProps(props, SNACKBAR_ROOT_PROPS);
    return (
        <context.Provider value={{ scope, api }}>
            {scope.render("root", {
                element: "div",
                as,
                machine: api.getRootProps(),
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

/** The action, a text button: it calls `onAction`, then the snackbar asks to close. */
function Action({ unstyled, ...props }: SnackbarPartProps): ReactNode {
    const { scope, api } = context.use("Action");
    return scope.render("action", {
        element: "button",
        machine: api.getActionProps(),
        unstyled,
        props,
    });
}

/** The close button, an icon button: name it with `aria-label`. */
function Close({ unstyled, ...props }: SnackbarPartProps): ReactNode {
    const { scope, api } = context.use("Close");
    return scope.render("close", {
        element: "button",
        machine: api.getCloseProps(),
        unstyled,
        props,
    });
}

/** The cross the ready-made close button shows unless given another icon. */
const CloseIcon = (): ReactNode => (
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
    const slot = (part: Parameters<typeof slotPartProps<Anatomy>>[1]) =>
        slotPartProps(props, part);
    return (
        <Root {...rootProps} {...(slot("root") as object)}>
            <SupportingText {...slot("supportingText")}>
                {supportingText}
            </SupportingText>
            {isPresent(action) ? (
                <Action {...slot("action")}>{action}</Action>
            ) : null}
            {closeLabel ? (
                <Close aria-label={closeLabel} {...slot("close")}>
                    {isPresent(closeIcon) ? closeIcon : <CloseIcon />}
                </Close>
            ) : null}
        </Root>
    );
}

/** Material's snackbar. Use it ready-made, `<Snackbar open={saved} onOpenChange={…}
 *  supportingText="Message archived" action="Undo" closeLabel="Dismiss" />`, or compose its parts
 *  under `Snackbar.Root`: `SupportingText`, `Action`, and `Close`. */
export const Snackbar = Object.assign(ReadyMade, {
    Root,
    SupportingText,
    Action,
    Close,
});
