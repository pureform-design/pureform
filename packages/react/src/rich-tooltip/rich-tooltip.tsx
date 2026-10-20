// The rich tooltip: as the tooltip, with a subhead, supporting text, and actions, which stay under
// the pointer (it's interactive unless told otherwise). Root on Zag's tooltip machine; the
// trigger; Zag's positioner; the surface (`Content`) with `Subhead`, `SupportingText` and
// `Actions`; an optional `Caret`; and the ready-made RichTooltip over them.

import { richTooltipOverlayAnatomy } from "@pureform/anatomy";
import {
    isInteractiveRichTooltip,
    isPresent,
    overlayPositionerProps,
    presentProps,
    RICH_TOOLTIP_ROOT_PROPS,
    richTooltipMachineProps,
    richTooltipSelection,
    CARET_STYLE,
} from "@pureform/binding-core";
import type {
    RichTooltipContentProps,
    RichTooltipRootOwnProps,
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

type Anatomy = typeof richTooltipOverlayAnatomy;

/** What Root shares with its parts. */
interface RichTooltipContextValue {
    readonly scope: ComponentScope<Anatomy>;
    readonly api: tooltip.Api<PropTypes>;
    readonly presence: Presence;
    readonly interactive: boolean;
}

const context = createPartContext<RichTooltipContextValue>("RichTooltip");

/** Root's props: the variant and tokens, the machine's props (`open`, `openDelay`,
 *  `positioning`, …), `testId` and `unstyled` for every part, `as`, and the element's own props. */
export interface RichTooltipRootProps
    extends
        Omit<PartProps, keyof RichTooltipRootOwnProps>,
        RichTooltipRootOwnProps {
    /** Another element or component to render instead of `<div>`. */
    readonly as?: ElementType | undefined;
}

/** A part's props: the element's own, and the part's `unstyled`. */
export interface RichTooltipPartProps extends PartProps {
    readonly unstyled?: boolean | undefined;
}

/** The trigger's props: a part's, and `as` to render a component instead of `<button>` (`as={
 *  IconButton}`), which takes the rest of the props. */
export interface RichTooltipTriggerProps extends RichTooltipPartProps {
    readonly as?: ElementType | undefined;
    readonly [prop: string]: unknown;
}

/** The tooltip's root, a `<div>` around the trigger and the tooltip. The registry doesn't style
 *  it. */
function Root(props: RichTooltipRootProps): ReactNode {
    const id = useId();
    const dir = useDirection();
    const open = useControllable<"open", boolean>("RichTooltip", "open", props);
    const service = useMachine(tooltip.machine, {
        id,
        dir,
        ...richTooltipMachineProps(props),
        ...open.machineProps,
    });
    const api = tooltip.connect(service, normalizeProps);
    const presence = usePresence(api.open);
    const scope = useComponent(richTooltipOverlayAnatomy, {
        selection: richTooltipSelection(props),
        testId: props.testId,
        unstyled: props.unstyled,
    });
    const { as, ...rest } = omitProps(props, RICH_TOOLTIP_ROOT_PROPS);
    return (
        <context.Provider
            value={{
                scope,
                api,
                presence,
                interactive: isInteractiveRichTooltip(props),
            }}
        >
            {scope.render("root", { element: "div", as, props: rest })}
        </context.Provider>
    );
}

/** What the tooltip describes: it opens when the pointer rests on it or keyboard focus reaches
 *  it, and the trigger points `aria-describedby` at it while it's open. */
function Trigger({
    unstyled,
    as,
    ...props
}: RichTooltipTriggerProps): ReactNode {
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
function Positioner({ unstyled, ...props }: RichTooltipPartProps): ReactNode {
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

/** The tooltip's surface, holding its text. It stays while its exit animation runs. */
function Content({ unstyled, ...props }: RichTooltipPartProps): ReactNode {
    const { scope, api, presence } = context.use("Content");
    return scope.render("content", {
        element: "div",
        ref: presence.ref,
        machine: presentProps(api.getContentProps(), presence.present),
        unstyled,
        props,
    });
}

/** The rich tooltip's title. */
function Subhead({ unstyled, ...props }: RichTooltipPartProps): ReactNode {
    const { scope } = context.use("Subhead");
    return scope.render("subhead", { element: "span", unstyled, props });
}

/** The rich tooltip's text. */
function SupportingText({
    unstyled,
    ...props
}: RichTooltipPartProps): ReactNode {
    const { scope } = context.use("SupportingText");
    return scope.render("supportingText", {
        element: "span",
        unstyled,
        props,
    });
}

/** The rich tooltip's actions: text buttons. */
function Actions({ unstyled, ...props }: RichTooltipPartProps): ReactNode {
    const { scope } = context.use("Actions");
    return scope.render("actions", { element: "div", unstyled, props });
}

/** A caret pointing at the trigger, a child of the positioner. Zag places it and draws its tip,
 *  in the surface's color. */
function Caret({ unstyled, ...props }: RichTooltipPartProps): ReactNode {
    const { scope, api } = context.use("Caret");
    const machine = api.getArrowProps();
    return scope.render("caret", {
        element: "div",
        machine: { ...machine, style: { ...machine.style, ...CARET_STYLE } },
        unstyled,
        props: { ...props, children: <div {...api.getArrowTipProps()} /> },
    });
}

/** The ready-made tooltip's props: Root's, with `className`, `style`, and `slotProps` keyed by
 *  part, the trigger's label, the subhead, text, and actions as content, and `caret`. */
export interface RichTooltipProps
    extends
        Omit<RichTooltipRootProps, keyof SlotKeyedProps<Anatomy> | "children">,
        SlotKeyedProps<Anatomy>,
        RichTooltipContentProps<ReactNode> {}

/** The ready-made tooltip: the trigger, drawn as a button, when given a label, and the tooltip
 *  with its subhead, text, and actions, each only when given, and, given `caret`, a caret. */
function ReadyMade(props: RichTooltipProps): ReactNode {
    const {
        className: _className,
        style: _style,
        slotProps: _slotProps,
        trigger,
        subhead,
        supportingText,
        actions,
        caret,
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
                    {isPresent(subhead) ? (
                        <Subhead {...slot("subhead")}>{subhead}</Subhead>
                    ) : null}
                    {isPresent(supportingText) ? (
                        <SupportingText {...slot("supportingText")}>
                            {supportingText}
                        </SupportingText>
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

/** Material's rich tooltip. Use it ready-made, `<RichTooltip trigger="Drafts" subhead="Drafts"
 *  supportingText="…" actions={…} />`, or compose its parts under `RichTooltip.Root`: `Trigger`,
 *  then `Positioner` holding `Content` with `Subhead`, `SupportingText` and `Actions`, and a
 *  `Caret`. */
export const RichTooltip = Object.assign(ReadyMade, {
    Root,
    Trigger,
    Positioner,
    Content,
    Subhead,
    SupportingText,
    Actions,
    Caret,
});
