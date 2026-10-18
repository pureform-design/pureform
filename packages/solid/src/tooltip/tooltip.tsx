// The tooltip: Root on Zag's tooltip machine, an unstyled element around the trigger and the
// tooltip; the trigger, a `<button>` or any component (`as={IconButton}`), which opens it on hover
// and keyboard focus; Zag's positioner, which places it; the tooltip's surface (`Content`) with a
// rich tooltip's subhead, supporting text, and actions; and the ready-made Tooltip over them.
// Everything renders in place, inside Root.

import { tooltipOverlayAnatomy } from "@pureform/anatomy";
import {
    isPresent,
    isRichTooltip,
    overlayPositionerProps,
    presentProps,
    TOOLTIP_CONTENT_PROPS,
    TOOLTIP_ROOT_PROPS,
    tooltipMachineProps,
    tooltipSelection,
} from "@pureform/binding-core";
import type {
    TooltipContentProps,
    TooltipRootOwnProps,
} from "@pureform/binding-core";
import * as tooltip from "@pureform/machines/tooltip";
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
import { normalizeProps, useMachine } from "../internal/zag";
import type { PropTypes } from "../internal/zag";
import { createPartContext } from "../part-context";
import { slotPartProps, useComponent } from "../parts";
import type { ComponentScope, SlotKeyedProps } from "../parts";
import { usePresence } from "../presence";
import type { Presence } from "../presence";
import type { PartProps } from "../props";
import { useDirection } from "../provider";

type Anatomy = typeof tooltipOverlayAnatomy;

/** What Root shares with its parts. */
interface TooltipContextValue {
    readonly scope: ComponentScope<Anatomy>;
    readonly api: Accessor<tooltip.Api<PropTypes>>;
    readonly presence: Presence;
}

const context = createPartContext<TooltipContextValue>("Tooltip");

/** Root's props: the variant and tokens, the machine's props (`open`, `openDelay`,
 *  `positioning`, …), `testId` and `unstyled` for every part, `as`, and the element's own props. */
export interface TooltipRootProps
    extends Omit<PartProps, keyof TooltipRootOwnProps>, TooltipRootOwnProps {
    /** Another element or component to render instead of `<div>`. */
    readonly as?: ValidComponent | undefined;
}

/** A part's props: the element's own, and the part's `unstyled`. */
export interface TooltipPartProps extends PartProps {
    readonly unstyled?: boolean | undefined;
}

/** The trigger's props: a part's, and `as` to render a component instead of `<button>` (`as={
 *  IconButton}`), which takes the rest of the props. */
export interface TooltipTriggerProps extends TooltipPartProps {
    readonly as?: ValidComponent | undefined;
    readonly [prop: string]: unknown;
}

/** The tooltip's root, a `<div>` around the trigger and the tooltip. The registry doesn't style
 *  it. */
function Root(props: TooltipRootProps): JSX.Element {
    const id = createUniqueId();
    const dir = useDirection();
    const open = useControllable<"open", boolean>("Tooltip", "open", props);
    const service = useMachine(tooltip.machine, () => ({
        id,
        dir: dir(),
        ...tooltipMachineProps(props),
        ...open.machineProps(),
    }));
    const api = createMemo(() => tooltip.connect(service, normalizeProps));
    const presence = usePresence(() => api().open);
    const scope = useComponent(tooltipOverlayAnatomy, {
        selection: () => tooltipSelection(props),
        testId: () => props.testId,
        unstyled: () => props.unstyled,
    });
    return (
        <context.Provider value={{ scope, api, presence }}>
            {scope.render("root", {
                element: "div",
                as: () => props.as,
                props: omit(props, "as", ...TOOLTIP_ROOT_PROPS),
            })}
        </context.Provider>
    );
}

/** What the tooltip describes: it opens when the pointer rests on it or keyboard focus reaches
 *  it, and the trigger points `aria-describedby` at it while it's open. */
function Trigger(props: TooltipTriggerProps): JSX.Element {
    const { scope, api } = context.use("Trigger");
    return scope.render("trigger", {
        element: "button",
        as: () => props.as,
        machine: () => api().getTriggerProps(),
        unstyled: () => props.unstyled,
        props: omit(props, "unstyled", "as"),
    });
}

/** Places the tooltip against the trigger; hidden once it's closed and its exit animation is over.
 *  The registry doesn't style it. */
function Positioner(props: TooltipPartProps): JSX.Element {
    const { scope, api, presence } = context.use("Positioner");
    return scope.render("positioner", {
        element: "div",
        machine: () =>
            overlayPositionerProps(
                api().getPositionerProps(),
                presence.present(),
            ),
        unstyled: () => props.unstyled,
        props: omit(props, "unstyled"),
    });
}

/** The tooltip's surface: a plain tooltip's text, or a rich tooltip's parts. It stays while its
 *  exit animation runs. */
function Content(props: TooltipPartProps): JSX.Element {
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

/** A rich tooltip's title. */
function Subhead(props: TooltipPartProps): JSX.Element {
    const { scope } = context.use("Subhead");
    return scope.render("subhead", {
        element: "span",
        unstyled: () => props.unstyled,
        props: omit(props, "unstyled"),
    });
}

/** A rich tooltip's text. */
function SupportingText(props: TooltipPartProps): JSX.Element {
    const { scope } = context.use("SupportingText");
    return scope.render("supportingText", {
        element: "span",
        unstyled: () => props.unstyled,
        props: omit(props, "unstyled"),
    });
}

/** A rich tooltip's actions: text buttons. */
function Actions(props: TooltipPartProps): JSX.Element {
    const { scope } = context.use("Actions");
    return scope.render("actions", {
        element: "div",
        unstyled: () => props.unstyled,
        props: omit(props, "unstyled"),
    });
}

/** The ready-made tooltip's props: Root's, with `class`, `style`, and `slotProps` keyed by part,
 *  the trigger's label, and the text, subhead, and actions as content. */
export interface TooltipProps
    extends
        Omit<TooltipRootProps, keyof SlotKeyedProps<Anatomy> | "children">,
        SlotKeyedProps<Anatomy>,
        TooltipContentProps<JSX.Element> {}

const READY_MADE_PROPS = [
    "class",
    "style",
    "slotProps",
    ...TOOLTIP_CONTENT_PROPS,
] as const;

/** The ready-made tooltip: the trigger, drawn as a button, when given a label, and the tooltip.
 *  A plain tooltip holds its text; a rich one, the subhead, supporting text, and actions, each
 *  only when given. */
function ReadyMade(props: TooltipProps): JSX.Element {
    const slot = (part: Parameters<typeof slotPartProps<Anatomy>>[1]) =>
        slotPartProps(props, part) as object;
    return (
        <Root
            {...(omit(props, ...READY_MADE_PROPS) as TooltipRootProps)}
            {...slot("root")}
        >
            <Show when={isPresent(props.trigger)}>
                <Trigger
                    as={Button}
                    label={props.trigger}
                    {...slot("trigger")}
                />
            </Show>
            <Positioner {...slot("positioner")}>
                <Content {...slot("content")}>
                    <Show
                        when={isRichTooltip(props)}
                        fallback={props.supportingText}
                    >
                        <Show when={isPresent(props.subhead)}>
                            <Subhead {...slot("subhead")}>
                                {props.subhead}
                            </Subhead>
                        </Show>
                        <Show when={isPresent(props.supportingText)}>
                            <SupportingText {...slot("supportingText")}>
                                {props.supportingText}
                            </SupportingText>
                        </Show>
                        <Show when={isPresent(props.actions)}>
                            <Actions {...slot("actions")}>
                                {props.actions}
                            </Actions>
                        </Show>
                    </Show>
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
