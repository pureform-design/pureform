// The rich tooltip: as the tooltip, with a subhead, supporting text, and actions, which stay under
// the pointer (it's interactive unless told otherwise). Root on Zag's tooltip machine; the
// trigger; Zag's positioner; the surface (`Content`) with `Subhead`, `SupportingText` and
// `Actions`; an optional `Caret`; and the ready-made RichTooltip over them.

import { richTooltipOverlayAnatomy } from "@pureform/anatomy";
import {
    isInteractiveRichTooltip,
    isPresent,
    RICH_TOOLTIP_CONTENT_PROPS,
    RICH_TOOLTIP_ROOT_PROPS,
    richTooltipSelection,
} from "@pureform/binding-core";
import type {
    RichTooltipContentProps,
    RichTooltipRootOwnProps,
} from "@pureform/binding-core";
import {
    overlayPositionerProps,
    presentProps,
    richTooltipMachineProps,
    CARET_STYLE,
} from "@pureform/binding-web";
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
import { createSlotProps, useComponent, asRoot } from "../parts";
import type { ComponentScope, SlotKeyedProps } from "../parts";
import { usePresence } from "../presence";
import type { Presence } from "../presence";
import type { PartProps } from "../props";
import { useDirection } from "../provider";
import { useTooltipLongPress } from "../tooltip/long-press";

type Anatomy = typeof richTooltipOverlayAnatomy;

/** What Root shares with its parts. */
interface RichTooltipContextValue {
    readonly scope: ComponentScope<Anatomy>;
    readonly api: Accessor<tooltip.Api<PropTypes>>;
    readonly presence: Presence;
    readonly interactive: Accessor<boolean>;
}

const context = createPartContext<RichTooltipContextValue>("RichTooltip");

/** Root's props: the variant and tokens, the machine's props (`open`, `openDelay`,
 *  `positioning`, …), `testId` and `unstyled` for every part, `as`, and the element's own props. */
export interface RichTooltipRootProps
    extends
        Omit<PartProps, keyof RichTooltipRootOwnProps>,
        RichTooltipRootOwnProps {
    /** Another element or component to render instead of `<div>`. */
    readonly as?: ValidComponent | undefined;
}

/** A part's props: the element's own, and the part's `unstyled`. */
export interface RichTooltipPartProps extends PartProps {
    readonly unstyled?: boolean | undefined;
}

/** The trigger's props: a part's, and `as` to render a component instead of `<button>` (`as={
 *  IconButton}`), which takes the rest of the props. */
export interface RichTooltipTriggerProps extends RichTooltipPartProps {
    readonly as?: ValidComponent | undefined;
    readonly [prop: string]: unknown;
}

/** The tooltip's root, a `<div>` around the trigger and the tooltip. The registry doesn't style
 *  it. */
function Root(props: RichTooltipRootProps): JSX.Element {
    const id = createUniqueId();
    const dir = useDirection();
    const open = useControllable<"open", boolean>("RichTooltip", "open", props);
    const service = useMachine(tooltip.machine, () => ({
        id,
        dir: dir(),
        ...richTooltipMachineProps(props),
        ...open.machineProps(),
    }));
    const api = createMemo(() => tooltip.connect(service, normalizeProps));
    const presence = usePresence(() => api().open);
    const scope = useComponent(richTooltipOverlayAnatomy, {
        selection: () => richTooltipSelection(props),
        testId: () => props.testId,
        unstyled: () => props.unstyled,
    });
    return (
        <context.Provider
            value={{
                scope,
                api,
                presence,
                interactive: () => isInteractiveRichTooltip(props),
            }}
        >
            {scope.render("root", {
                element: "div",
                as: () => props.as,
                props: omit(props, "as", ...RICH_TOOLTIP_ROOT_PROPS),
            })}
        </context.Provider>
    );
}

/** What the tooltip describes: it opens when the pointer rests on it or keyboard focus reaches
 *  it, and the trigger points `aria-describedby` at it while it's open. */
function Trigger(props: RichTooltipTriggerProps): JSX.Element {
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
function Positioner(props: RichTooltipPartProps): JSX.Element {
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
function Content(props: RichTooltipPartProps): JSX.Element {
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

/** The rich tooltip's title. */
function Subhead(props: RichTooltipPartProps): JSX.Element {
    const { scope } = context.use("Subhead");
    return scope.render("subhead", {
        element: "span",
        unstyled: () => props.unstyled,
        props: omit(props, "unstyled"),
    });
}

/** The rich tooltip's text. */
function SupportingText(props: RichTooltipPartProps): JSX.Element {
    const { scope } = context.use("SupportingText");
    return scope.render("supportingText", {
        element: "span",
        unstyled: () => props.unstyled,
        props: omit(props, "unstyled"),
    });
}

/** The rich tooltip's actions: text buttons. */
function Actions(props: RichTooltipPartProps): JSX.Element {
    const { scope } = context.use("Actions");
    return scope.render("actions", {
        element: "div",
        unstyled: () => props.unstyled,
        props: omit(props, "unstyled"),
    });
}

/** A caret pointing at the trigger, a child of the positioner. Zag places it and draws its tip,
 *  in the surface's color. */
function Caret(props: RichTooltipPartProps): JSX.Element {
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
 *  the trigger's label, the subhead, text, and actions as content, and `caret`. */
export interface RichTooltipProps
    extends
        Omit<RichTooltipRootProps, keyof SlotKeyedProps<Anatomy> | "children">,
        SlotKeyedProps<Anatomy>,
        RichTooltipContentProps<JSX.Element> {}

const READY_MADE_PROPS = [
    "class",
    "style",
    "slotProps",
    ...RICH_TOOLTIP_CONTENT_PROPS,
] as const;

/** The ready-made tooltip: the trigger, drawn as a button, when given a label, and the tooltip
 *  with its subhead, text, and actions, each only when given, and, given `caret`, a caret. */
function ReadyMade(props: RichTooltipProps): JSX.Element {
    const slots = createSlotProps(props);
    const own = omit(props, ...READY_MADE_PROPS) as RichTooltipRootProps;
    const root = slots("root") as object;
    const trigger = slots("trigger");
    const positioner = slots("positioner");
    const content = slots("content");
    const caret = slots("caret");
    const subhead = slots("subhead");
    const supportingText = slots("supportingText");
    const actions = slots("actions");
    return (
        <Root {...own} {...root}>
            <Show when={isPresent(props.trigger)}>
                <Trigger
                    as={Button}
                    label={props.trigger}
                    {...asRoot(trigger)}
                />
            </Show>
            <Positioner {...positioner}>
                <Content {...content}>
                    <Show when={isPresent(props.subhead)}>
                        <Subhead {...subhead}>{props.subhead}</Subhead>
                    </Show>
                    <Show when={isPresent(props.supportingText)}>
                        <SupportingText {...supportingText}>
                            {props.supportingText}
                        </SupportingText>
                    </Show>
                    <Show when={isPresent(props.actions)}>
                        <Actions {...actions}>{props.actions}</Actions>
                    </Show>
                </Content>
                <Show when={props.caret}>
                    <Caret {...caret} />
                </Show>
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
