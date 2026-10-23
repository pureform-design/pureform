// The plain tooltip: Root on Zag's tooltip machine, an unstyled element around the trigger and the
// tooltip; the trigger, a `<button>` or any component (`as={IconButton}`), which opens it on hover
// and keyboard focus; Zag's positioner, which places it; the tooltip's surface (`Content`) with its
// supporting text and optional caret; and the ready-made Tooltip over them. The rich tooltip is
// `RichTooltip`.
// Everything renders in place, inside Root.

import { tooltipOverlayAnatomy } from "@pureform/anatomy";
import {
    isInteractiveTooltip,
    isPresent,
    overlayPositionerProps,
    presentProps,
    TOOLTIP_CONTENT_PROPS,
    TOOLTIP_ROOT_PROPS,
    tooltipMachineProps,
    tooltipSelection,
    CARET_STYLE,
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
    merge,
    omit,
    Show,
} from "solid-js";

import { Button } from "../button";
import { useControllable } from "../controllable";
import { normalizeProps, useMachine } from "../internal/zag";
import type { PropTypes } from "../internal/zag";
import { createPartContext } from "../part-context";
import { createSlotProps, useComponent } from "../parts";
import type { ComponentScope, SlotKeyedProps } from "../parts";
import { usePresence } from "../presence";
import type { Presence } from "../presence";
import type { PartProps } from "../props";
import { useDirection } from "../provider";
import { useTooltipLongPress } from "./long-press";

type Anatomy = typeof tooltipOverlayAnatomy;

/** What Root shares with its parts. */
interface TooltipContextValue {
    readonly scope: ComponentScope<Anatomy>;
    readonly api: Accessor<tooltip.Api<PropTypes>>;
    readonly presence: Presence;
    readonly interactive: Accessor<boolean>;
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
        <context.Provider
            value={{
                scope,
                api,
                presence,
                interactive: () => isInteractiveTooltip(props),
            }}
        >
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
    const { scope, api, interactive } = context.use("Trigger");
    const longPress = useTooltipLongPress(
        (open) => api().setOpen(open),
        interactive,
    );
    return scope.render("trigger", {
        element: "button",
        ref: longPress,
        as: () => props.as,
        machine: () => api().getTriggerProps(),
        unstyled: () => props.unstyled,
        props: omit(props, "unstyled", "as"),
    });
}

/** Places the tooltip against the trigger; hidden once it's closed and its exit animation is over.
 *  Unless the tooltip is interactive, it lets the pointer through, as the surface does: Zag lays it
 *  out at the corner of its containing block as it opens, before placing it, where it would take
 *  the pointer from a trigger there and close the tooltip. The registry doesn't style it. */
function Positioner(props: TooltipPartProps): JSX.Element {
    const { scope, api, presence, interactive } = context.use("Positioner");
    return scope.render("positioner", {
        element: "div",
        machine: () => {
            const machine = overlayPositionerProps(
                api().getPositionerProps(),
                presence.present(),
            );
            return interactive()
                ? machine
                : {
                      ...machine,
                      style: {
                          ...(machine.style as JSX.CSSProperties),
                          "pointer-events": "none",
                      },
                  };
        },
        unstyled: () => props.unstyled,
        props: omit(props, "unstyled"),
    });
}

/** The tooltip's surface, holding its text. It stays while its exit animation runs. */
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

/** The tooltip's text. */
function SupportingText(props: TooltipPartProps): JSX.Element {
    const { scope } = context.use("SupportingText");
    return scope.render("supportingText", {
        element: "span",
        unstyled: () => props.unstyled,
        props: omit(props, "unstyled"),
    });
}

/** A caret pointing at the trigger, a child of the positioner. Zag places it and draws its tip,
 *  in the surface's color. */
function Caret(props: TooltipPartProps): JSX.Element {
    const { scope, api } = context.use("Caret");
    return scope.render("caret", {
        element: "div",
        machine: () => {
            const machine = api().getArrowProps();
            return {
                ...machine,
                style: {
                    ...(machine.style as JSX.CSSProperties),
                    ...CARET_STYLE,
                },
            };
        },
        unstyled: () => props.unstyled,
        props: merge(omit(props, "unstyled"), {
            get children() {
                return <div {...api().getArrowTipProps()} />;
            },
        }),
    });
}

/** The ready-made tooltip's props: Root's, with `class`, `style`, and `slotProps` keyed by part,
 *  the trigger's label, the text, and `caret`. */
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

/** The ready-made tooltip: the trigger, drawn as a button, when given a label, and the tooltip
 *  with its text and, given `caret`, a caret. */
function ReadyMade(props: TooltipProps): JSX.Element {
    const slots = createSlotProps(props);
    const own = omit(props, ...READY_MADE_PROPS) as TooltipRootProps;
    const root = slots("root") as object;
    const trigger = slots("trigger") as object;
    const positioner = slots("positioner");
    const content = slots("content");
    const caret = slots("caret");
    const supportingText = slots("supportingText");
    return (
        <Root {...own} {...root}>
            <Show when={isPresent(props.trigger)}>
                <Trigger as={Button} label={props.trigger} {...trigger} />
            </Show>
            <Positioner {...positioner}>
                <Content {...content}>
                    <SupportingText {...supportingText}>
                        {props.supportingText}
                    </SupportingText>
                </Content>
                <Show when={props.caret}>
                    <Caret {...caret} />
                </Show>
            </Positioner>
        </Root>
    );
}

/** Material's plain tooltip. Use it ready-made, `<Tooltip trigger="Save" supportingText="Save to
 *  drafts" />`, or compose its parts under `Tooltip.Root`: `Trigger` (`as={IconButton}` draws it
 *  as an icon button), then `Positioner` holding `Content` with `SupportingText`, and a `Caret`.
 *  For a subhead and actions, use `RichTooltip`. */
export const Tooltip = Object.assign(ReadyMade, {
    Root,
    Trigger,
    Positioner,
    Content,
    SupportingText,
    Caret,
});
