// The popover: an anchored panel for filters and small forms, opened by a press. Root on Zag's
// popover machine; the trigger; Zag's positioner; the surface (`Content`) with `Title`, `Body` and
// `Actions` and a `CloseTrigger`; an optional `Caret`; and the ready-made Popover over them.
// Everything renders in place, inside Root. It closes on a press outside or Escape and returns
// focus to its trigger; with `modal`, focus stays inside and the rest of the page is out of reach.

import { popoverOverlayAnatomy } from "@pureform/anatomy";
import {
    isPresent,
    overlayPositionerProps,
    presentProps,
    popoverSelection,
    CARET_STYLE,
} from "@pureform/binding-core";
import type { PopoverContentProps } from "@pureform/binding-core";
import {
    POPOVER_DOM_ROOT_PROPS,
    popoverDomMachineProps,
} from "@pureform/binding-dom";
import type { PopoverDomRootOwnProps } from "@pureform/binding-dom";
import * as popover from "@pureform/machines/popover";
import { normalizeProps } from "@zag-js/react";
import type { PropTypes } from "@zag-js/react";
import { type ElementType, type ReactNode, useId } from "react";

import { Button } from "../button";
import { useControllable } from "../controllable";
import { useMachine } from "../machine";
import { createPartContext } from "../part-context";
import { useComponent, useSlotProps, asRoot } from "../parts";
import type { ComponentScope, SlotKeyedProps } from "../parts";
import { usePresence } from "../presence";
import type { Presence } from "../presence";
import { omitProps } from "../props";
import type { PartProps } from "../props";
import { useDirection } from "../provider";

type Anatomy = typeof popoverOverlayAnatomy;

/** What Root shares with its parts. */
interface PopoverContextValue {
    readonly scope: ComponentScope<Anatomy>;
    readonly api: popover.Api<PropTypes>;
    readonly presence: Presence;
}

const context = createPartContext<PopoverContextValue>("Popover");

/** Root's props: the tokens, the machine's props (`open`, `modal`, `positioning`, …), `testId`
 *  and `unstyled` for every part, `as`, and the element's own props. */
export interface PopoverRootProps
    extends
        Omit<PartProps, keyof PopoverDomRootOwnProps>,
        PopoverDomRootOwnProps {
    /** Another element or component to render instead of `<div>`. */
    readonly as?: ElementType | undefined;
}

/** A part's props: the element's own, and the part's `unstyled`. */
export interface PopoverPartProps extends PartProps {
    readonly unstyled?: boolean | undefined;
}

/** A trigger's props: a part's, and `as` to render a component instead of `<button>` (`as={
 *  Button}`), which takes the rest of the props. */
export interface PopoverTriggerProps extends PopoverPartProps {
    readonly as?: ElementType | undefined;
    readonly [prop: string]: unknown;
}

/** The popover's root, a `<div>` around the trigger and the popover. The registry doesn't style
 *  it. */
function Root(props: PopoverRootProps): ReactNode {
    const id = useId();
    const dir = useDirection();
    const open = useControllable<"open", boolean>("Popover", "open", props);
    const service = useMachine(popover.machine, {
        id,
        dir,
        ...popoverDomMachineProps(props),
        ...open.machineProps,
    });
    const api = popover.connect(service, normalizeProps);
    const presence = usePresence(api.open);
    const scope = useComponent(popoverOverlayAnatomy, {
        selection: popoverSelection(props),
        testId: props.testId,
        unstyled: props.unstyled,
    });
    const { as, ...rest } = omitProps(props, POPOVER_DOM_ROOT_PROPS);
    return (
        <context.Provider value={{ scope, api, presence }}>
            {scope.render("root", { element: "div", as, props: rest })}
        </context.Provider>
    );
}

/** The button that opens the popover, or closes it while it's open. */
function Trigger({ unstyled, as, ...props }: PopoverTriggerProps): ReactNode {
    const { scope, api } = context.use("Trigger");
    return scope.render("trigger", {
        element: "button",
        as: as as ElementType | undefined,
        machine: api.getTriggerProps(),
        unstyled,
        props,
    });
}

/** Places the popover against the trigger; hidden once it's closed and its exit animation is
 *  over. The registry doesn't style it. */
function Positioner({ unstyled, ...props }: PopoverPartProps): ReactNode {
    const { scope, api, presence } = context.use("Positioner");
    return scope.render("positioner", {
        element: "div",
        machine: overlayPositionerProps(
            api.getPositionerProps(),
            presence.present,
        ),
        unstyled,
        props,
    });
}

/** The popover's surface. It stays while its exit animation runs. */
function Content({ unstyled, ...props }: PopoverPartProps): ReactNode {
    const { scope, api, presence } = context.use("Content");
    return scope.render("content", {
        element: "div",
        ref: presence.ref,
        machine: presentProps(api.getContentProps(), presence.present),
        unstyled,
        props,
    });
}

/** The heading, which names the popover. */
function Title({ unstyled, ...props }: PopoverPartProps): ReactNode {
    const { scope, api } = context.use("Title");
    return scope.render("title", {
        element: "h2",
        machine: api.getTitleProps(),
        unstyled,
        props,
    });
}

/** What the popover holds, which describes it. */
function Body({ unstyled, ...props }: PopoverPartProps): ReactNode {
    const { scope, api } = context.use("Body");
    return scope.render("body", {
        element: "div",
        machine: api.getDescriptionProps(),
        unstyled,
        props,
    });
}

/** The buttons at the end. */
function Actions({ unstyled, ...props }: PopoverPartProps): ReactNode {
    const { scope } = context.use("Actions");
    return scope.render("actions", { element: "div", unstyled, props });
}

/** A button that closes the popover, such as Cancel: `as={Button}` draws it as one. The registry
 *  doesn't style it. */
function CloseTrigger({
    unstyled,
    as,
    ...props
}: PopoverTriggerProps): ReactNode {
    const { scope, api } = context.use("CloseTrigger");
    return scope.render("closeTrigger", {
        element: "button",
        as: as as ElementType | undefined,
        machine: api.getCloseTriggerProps(),
        unstyled,
        props,
    });
}

/** A caret pointing at the trigger, a child of the positioner. Zag places it and draws its tip,
 *  in the surface's color. */
function Caret({ unstyled, ...props }: PopoverPartProps): ReactNode {
    const { scope, api } = context.use("Caret");
    const machine = api.getArrowProps();
    return scope.render("caret", {
        element: "div",
        machine: { ...machine, style: { ...machine.style, ...CARET_STYLE } },
        unstyled,
        props: { ...props, children: <div {...api.getArrowTipProps()} /> },
    });
}

/** The ready-made popover's props: Root's, with `className`, `style`, and `slotProps` keyed by
 *  part, the trigger's label, the heading, body, and actions as content, and `caret`. */
export interface PopoverProps
    extends
        Omit<PopoverRootProps, keyof SlotKeyedProps<Anatomy> | "children">,
        SlotKeyedProps<Anatomy>,
        PopoverContentProps<ReactNode> {}

/** The ready-made popover: the trigger, drawn as a button, when given a label, and the popover
 *  with its heading, body, and actions, each only when given, and, given `caret`, a caret. */
function ReadyMade(props: PopoverProps): ReactNode {
    const {
        className: _className,
        style: _style,
        slotProps: _slotProps,
        trigger,
        heading,
        body,
        actions,
        caret,
        ...rootProps
    } = props;
    const slot = useSlotProps(props);
    return (
        <Root {...rootProps} {...(slot("root") as object)}>
            {isPresent(trigger) ? (
                <Trigger
                    as={Button}
                    label={trigger}
                    {...asRoot(slot("trigger"))}
                />
            ) : null}
            <Positioner {...slot("positioner")}>
                <Content {...slot("content")}>
                    {isPresent(heading) ? (
                        <Title {...slot("title")}>{heading}</Title>
                    ) : null}
                    {isPresent(body) ? (
                        <Body {...slot("body")}>{body}</Body>
                    ) : null}
                    {isPresent(actions) ? (
                        <Actions {...slot("actions")}>{actions}</Actions>
                    ) : null}
                </Content>
                {caret ? <Caret {...slot("caret")} /> : null}
            </Positioner>
        </Root>
    );
}

/** An anchored, non-modal panel for filters and small forms. Use it ready-made, `<Popover
 *  trigger="Filters" heading="Filters" body={…} actions={…} />`, or compose its parts under
 *  `Popover.Root`: `Trigger`, then `Positioner` holding `Content` with `Title`, `Body`,
 *  `Actions` (with a `CloseTrigger`, say), and a `Caret`. */
export const Popover = Object.assign(ReadyMade, {
    Root,
    Trigger,
    Positioner,
    Content,
    Title,
    Body,
    Actions,
    CloseTrigger,
    Caret,
});
