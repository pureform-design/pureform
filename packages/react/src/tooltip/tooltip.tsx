// The tooltip: Root on Zag's tooltip machine, an unstyled element around the trigger and the
// tooltip; the trigger, a `<button>` or any component (`as={IconButton}`), which opens it on hover
// and keyboard focus; Zag's positioner, which places it; the tooltip's surface (`Content`) with a
// rich tooltip's subhead, supporting text, and actions; and the ready-made Tooltip over them.
// Everything renders in place, inside Root.

import { tooltipOverlayAnatomy } from "@pureform/anatomy";
import {
    isInteractiveTooltip,
    isPresent,
    isRichTooltip,
    overlayPositionerProps,
    presentProps,
    TOOLTIP_ROOT_PROPS,
    tooltipMachineProps,
    tooltipSelection,
} from "@pureform/binding-core";
import type {
    TooltipContentProps,
    TooltipRootOwnProps,
} from "@pureform/binding-core";
import * as tooltip from "@pureform/machines/tooltip";
import { normalizeProps } from "@zag-js/react";
import type { PropTypes } from "@zag-js/react";
import { type ElementType, type ReactNode, useId } from "react";

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

type Anatomy = typeof tooltipOverlayAnatomy;

/** What Root shares with its parts. */
interface TooltipContextValue {
    readonly scope: ComponentScope<Anatomy>;
    readonly api: tooltip.Api<PropTypes>;
    readonly presence: Presence;
    readonly interactive: boolean;
}

const context = createPartContext<TooltipContextValue>("Tooltip");

/** Root's props: the variant and tokens, the machine's props (`open`, `openDelay`,
 *  `positioning`, …), `testId` and `unstyled` for every part, `as`, and the element's own props. */
export interface TooltipRootProps
    extends Omit<PartProps, keyof TooltipRootOwnProps>, TooltipRootOwnProps {
    /** Another element or component to render instead of `<div>`. */
    readonly as?: ElementType | undefined;
}

/** A part's props: the element's own, and the part's `unstyled`. */
export interface TooltipPartProps extends PartProps {
    readonly unstyled?: boolean | undefined;
}

/** The trigger's props: a part's, and `as` to render a component instead of `<button>` (`as={
 *  IconButton}`), which takes the rest of the props. */
export interface TooltipTriggerProps extends TooltipPartProps {
    readonly as?: ElementType | undefined;
    readonly [prop: string]: unknown;
}

/** The tooltip's root, a `<div>` around the trigger and the tooltip. The registry doesn't style
 *  it. */
function Root(props: TooltipRootProps): ReactNode {
    const id = useId();
    const dir = useDirection();
    const open = useControllable<"open", boolean>("Tooltip", "open", props);
    const service = useMachine(tooltip.machine, {
        id,
        dir,
        ...tooltipMachineProps(props),
        ...open.machineProps,
    });
    const api = tooltip.connect(service, normalizeProps);
    const presence = usePresence(api.open);
    const scope = useComponent(tooltipOverlayAnatomy, {
        selection: tooltipSelection(props),
        testId: props.testId,
        unstyled: props.unstyled,
    });
    const { as, ...rest } = omitProps(props, TOOLTIP_ROOT_PROPS);
    return (
        <context.Provider
            value={{
                scope,
                api,
                presence,
                interactive: isInteractiveTooltip(props),
            }}
        >
            {scope.render("root", { element: "div", as, props: rest })}
        </context.Provider>
    );
}

/** What the tooltip describes: it opens when the pointer rests on it or keyboard focus reaches
 *  it, and the trigger points `aria-describedby` at it while it's open. */
function Trigger({ unstyled, as, ...props }: TooltipTriggerProps): ReactNode {
    const { scope, api } = context.use("Trigger");
    return scope.render("trigger", {
        element: "button",
        as: as as ElementType | undefined,
        machine: api.getTriggerProps(),
        unstyled,
        props,
    });
}

/** Places the tooltip against the trigger; hidden once it's closed and its exit animation is over.
 *  Unless the tooltip is interactive, it lets the pointer through, as the surface does: Zag lays it
 *  out at the corner of its containing block as it opens, before placing it, where it would take
 *  the pointer from a trigger there and close the tooltip. The registry doesn't style it. */
function Positioner({ unstyled, ...props }: TooltipPartProps): ReactNode {
    const { scope, api, presence, interactive } = context.use("Positioner");
    const machine = overlayPositionerProps(
        api.getPositionerProps(),
        presence.present,
    );
    return scope.render("positioner", {
        element: "div",
        machine: interactive
            ? machine
            : {
                  ...machine,
                  style: { ...machine.style, pointerEvents: "none" },
              },
        unstyled,
        props,
    });
}

/** The tooltip's surface: a plain tooltip's text, or a rich tooltip's parts. It stays while its
 *  exit animation runs. */
function Content({ unstyled, ...props }: TooltipPartProps): ReactNode {
    const { scope, api, presence } = context.use("Content");
    return scope.render("content", {
        element: "div",
        ref: presence.ref,
        machine: presentProps(api.getContentProps(), presence.present),
        unstyled,
        props,
    });
}

/** A rich tooltip's title. */
function Subhead({ unstyled, ...props }: TooltipPartProps): ReactNode {
    const { scope } = context.use("Subhead");
    return scope.render("subhead", { element: "span", unstyled, props });
}

/** A rich tooltip's text. */
function SupportingText({ unstyled, ...props }: TooltipPartProps): ReactNode {
    const { scope } = context.use("SupportingText");
    return scope.render("supportingText", {
        element: "span",
        unstyled,
        props,
    });
}

/** A rich tooltip's actions: text buttons. */
function Actions({ unstyled, ...props }: TooltipPartProps): ReactNode {
    const { scope } = context.use("Actions");
    return scope.render("actions", { element: "div", unstyled, props });
}

/** The ready-made tooltip's props: Root's, with `className`, `style`, and `slotProps` keyed by
 *  part, the trigger's label, and the text, subhead, and actions as content. */
export interface TooltipProps
    extends
        Omit<TooltipRootProps, keyof SlotKeyedProps<Anatomy> | "children">,
        SlotKeyedProps<Anatomy>,
        TooltipContentProps<ReactNode> {}

/** The ready-made tooltip: the trigger, drawn as a button, when given a label, and the tooltip.
 *  A plain tooltip holds its text; a rich one, the subhead, supporting text, and actions, each
 *  only when given. */
function ReadyMade(props: TooltipProps): ReactNode {
    const {
        className: _className,
        style: _style,
        slotProps: _slotProps,
        trigger,
        supportingText,
        subhead,
        actions,
        ...rootProps
    } = props;
    const slot = useSlotProps(props);
    return (
        <Root {...rootProps} {...(slot("root") as object)}>
            {isPresent(trigger) ? (
                <Trigger as={Button} label={trigger} {...slot("trigger")} />
            ) : null}
            <Positioner {...slot("positioner")}>
                <Content {...slot("content")}>
                    {isRichTooltip(props) ? (
                        <>
                            {isPresent(subhead) ? (
                                <Subhead {...slot("subhead")}>
                                    {subhead}
                                </Subhead>
                            ) : null}
                            {isPresent(supportingText) ? (
                                <SupportingText {...slot("supportingText")}>
                                    {supportingText}
                                </SupportingText>
                            ) : null}
                            {isPresent(actions) ? (
                                <Actions {...slot("actions")}>
                                    {actions}
                                </Actions>
                            ) : null}
                        </>
                    ) : (
                        supportingText
                    )}
                </Content>
            </Positioner>
        </Root>
    );
}

/** Material's plain and rich tooltips. Use it ready-made, `<Tooltip trigger="Save"
 *  supportingText="Save to drafts" />`, or compose its parts under `Tooltip.Root`: `Trigger`
 *  (`as={IconButton}` draws it as an icon button), then `Positioner` holding `Content`, which
 *  holds a plain tooltip's text, or a rich one's `Subhead`, `SupportingText`, and `Actions`. */
export const Tooltip = Object.assign(ReadyMade, {
    Root,
    Trigger,
    Positioner,
    Content,
    Subhead,
    SupportingText,
    Actions,
});
