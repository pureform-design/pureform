// The dialog: Root on Zag's dialog machine, an unstyled element around the trigger and the dialog;
// the trigger, a `<button>` or any component (`as={Button}`); the backdrop, drawn by the scrim;
// Zag's positioner, fixed over the viewport and centering the dialog; the dialog's surface
// (`Content`) with its icon, headline, body, and actions; a close trigger; and the ready-made
// Dialog over them. Everything renders in place, inside Root: while a modal dialog is open, Zag
// keeps focus inside it, hides the rest of the page from assistive technology, and stops the
// page scrolling.

import { dialogBackdropAnatomy, dialogOverlayAnatomy } from "@pureform/anatomy";
import type { PartName, TestIdOverride } from "@pureform/anatomy";
import {
    DIALOG_ROOT_PROPS,
    dialogBackdropLayout,
    dialogMachineProps,
    dialogPositionerLayout,
    dialogSelection,
    isPresent,
    presentProps,
} from "@pureform/binding-core";
import type {
    DialogContentProps,
    DialogPart,
    DialogRootOwnProps,
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
import { useMachine } from "../machine";
import { createPartContext } from "../part-context";
import { useComponent, useSlotProps } from "../parts";
import type { ComponentScope, SlotKeyedProps } from "../parts";
import { usePresence } from "../presence";
import type { Presence } from "../presence";
import { omitProps } from "../props";
import type { PartProps } from "../props";
import { useDirection } from "../provider";

type Anatomy = typeof dialogOverlayAnatomy;
type BackdropAnatomy = typeof dialogBackdropAnatomy;

/** What Root shares with its parts. */
interface DialogContextValue {
    readonly scope: ComponentScope<Anatomy>;
    readonly backdrop: ComponentScope<BackdropAnatomy>;
    readonly api: dialog.Api<PropTypes>;
    readonly presence: Presence;
    readonly positioner: RefObject<HTMLElement | null>;
}

const context = createPartContext<DialogContextValue>("Dialog");

/** Root's props: the `icon` variant and tokens, the machine's props (`open`, `modal`, `role`,
 *  …), `testId` and `unstyled` for every part, `as`, and the element's own props. */
export interface DialogRootProps
    extends Omit<PartProps, keyof DialogRootOwnProps>, DialogRootOwnProps {
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
function Root(props: DialogRootProps): ReactNode {
    const id = useId();
    const dir = useDirection();
    const open = useControllable<"open", boolean>("Dialog", "open", props);
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
    const scope = useComponent(dialogOverlayAnatomy, {
        selection: dialogSelection(props),
        testId: props.testId as TestIdOverride<PartName<Anatomy>> | undefined,
        unstyled: props.unstyled as Unstyled<PartName<Anatomy>> | undefined,
    });
    const backdrop = useComponent(dialogBackdropAnatomy, {
        selection: {},
        testId: backdropTestId(props.testId),
        unstyled: backdropUnstyled(props.unstyled),
    });
    const { as, ...rest } = omitProps(props, DIALOG_ROOT_PROPS);
    return (
        <context.Provider
            value={{ scope, backdrop, api, presence, positioner }}
        >
            {scope.render("root", { element: "div", as, props: rest })}
        </context.Provider>
    );
}

/** The button that opens the dialog. */
function Trigger({ unstyled, as, ...props }: DialogTriggerProps): ReactNode {
    const { scope, api } = context.use("Trigger");
    return scope.render("trigger", {
        element: "button",
        as: as as ElementType | undefined,
        machine: api.getTriggerProps(),
        unstyled,
        props,
    });
}

/** Dims the page behind the dialog, drawn by the scrim; hidden once it's closed and its exit
 *  animation is over. */
function Backdrop({ unstyled, ...props }: DialogPartProps): ReactNode {
    const { backdrop, api, presence } = context.use("Backdrop");
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

/** Covers the viewport and centers the dialog, stacked at its surface's layer; hidden once it's
 *  closed and its exit animation is over. The registry doesn't style it. */
function Positioner({ unstyled, ...props }: DialogPartProps): ReactNode {
    const { scope, api, presence, positioner } = context.use("Positioner");
    return scope.render("positioner", {
        element: "div",
        ref: positioner,
        machine: mergeProps(
            api.getPositionerProps(),
            normalizeProps.element(dialogPositionerLayout(presence.present)),
        ),
        unstyled,
        props,
    });
}

/** The dialog's surface. It stays while its exit animation runs. */
function Content({ unstyled, ...props }: DialogPartProps): ReactNode {
    const { scope, api, presence } = context.use("Content");
    return scope.render("content", {
        element: "div",
        ref: presence.ref,
        machine: presentProps(api.getContentProps(), presence.present),
        unstyled,
        props,
    });
}

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

/** The title, an `<h2>`, which names the dialog. */
function Headline({ unstyled, ...props }: DialogPartProps): ReactNode {
    const { scope, api } = context.use("Headline");
    return scope.render("headline", {
        element: "h2",
        machine: api.getTitleProps(),
        unstyled,
        props,
    });
}

/** The message, which describes the dialog. */
function Body({ unstyled, ...props }: DialogPartProps): ReactNode {
    const { scope, api } = context.use("Body");
    return scope.render("body", {
        element: "div",
        machine: api.getDescriptionProps(),
        unstyled,
        props,
    });
}

/** The buttons at the end. */
function Actions({ unstyled, ...props }: DialogPartProps): ReactNode {
    const { scope } = context.use("Actions");
    return scope.render("actions", { element: "div", unstyled, props });
}

/** A button that closes the dialog, such as Cancel: `as={Button}` draws it as one. The registry
 *  doesn't style it. */
function CloseTrigger({
    unstyled,
    as,
    ...props
}: DialogTriggerProps): ReactNode {
    const { scope, api } = context.use("CloseTrigger");
    return scope.render("closeTrigger", {
        element: "button",
        as: as as ElementType | undefined,
        machine: api.getCloseTriggerProps(),
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
            keyof SlotKeyedProps<Anatomy> | "children" | "icon"
        >,
        SlotKeyedProps<Anatomy>,
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
                <Trigger as={Button} label={trigger} {...slot("trigger")} />
            ) : null}
            <Backdrop />
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
