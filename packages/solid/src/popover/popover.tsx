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
    POPOVER_CONTENT_PROPS,
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

type Anatomy = typeof popoverOverlayAnatomy;

/** What Root shares with its parts. */
interface PopoverContextValue {
    readonly scope: ComponentScope<Anatomy>;
    readonly api: Accessor<popover.Api<PropTypes>>;
    readonly presence: Presence;
}

const context = createPartContext<PopoverContextValue>("Popover");

/** Root's props: the tokens, the machine's props (`open`, `modal`,
 *  `positioning`, …), `testId` and `unstyled` for every part, `as`, and the element's own props. */
export interface PopoverRootProps
    extends
        Omit<PartProps, keyof PopoverDomRootOwnProps>,
        PopoverDomRootOwnProps {
    /** Another element or component to render instead of `<div>`. */
    readonly as?: ValidComponent | undefined;
}

/** A part's props: the element's own, and the part's `unstyled`. */
export interface PopoverPartProps extends PartProps {
    readonly unstyled?: boolean | undefined;
}

/** The trigger's props: a part's, and `as` to render a component instead of `<button>` (`as={
 *  IconButton}`), which takes the rest of the props. */
export interface PopoverTriggerProps extends PopoverPartProps {
    readonly as?: ValidComponent | undefined;
    readonly [prop: string]: unknown;
}

/** The popover's root, a `<div>` around the trigger and the popover. The registry doesn't style
 *  it. */
function Root(props: PopoverRootProps): JSX.Element {
    const id = createUniqueId();
    const dir = useDirection();
    const open = useControllable<"open", boolean>("Popover", "open", props);
    const service = useMachine(popover.machine, () => ({
        id,
        dir: dir(),
        ...popoverDomMachineProps(props),
        ...open.machineProps(),
    }));
    const api = createMemo(() => popover.connect(service, normalizeProps));
    const presence = usePresence(() => api().open);
    const scope = useComponent(popoverOverlayAnatomy, {
        selection: () => popoverSelection(props),
        testId: () => props.testId,
        unstyled: () => props.unstyled,
    });
    return (
        <context.Provider value={{ scope, api, presence }}>
            {scope.render("root", {
                element: "div",
                as: () => props.as,
                props: omit(props, "as", ...POPOVER_DOM_ROOT_PROPS),
            })}
        </context.Provider>
    );
}

/** The button that opens the popover, or closes it while it's open. */
function Trigger(props: PopoverTriggerProps): JSX.Element {
    const { scope, api } = context.use("Trigger");
    return scope.render("trigger", {
        element: "button",
        as: () => props.as,
        machine: () => api().getTriggerProps(),
        unstyled: () => props.unstyled,
        props: omit(props, "unstyled", "as"),
    });
}

/** Places the popover against the trigger; hidden once it's closed and its exit animation is
 *  over. The registry doesn't style it. */
function Positioner(props: PopoverPartProps): JSX.Element {
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

/** The popover's surface. It stays while its exit animation runs. */
function Content(props: PopoverPartProps): JSX.Element {
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

/** The heading, which names the popover. */
function Title(props: PopoverPartProps): JSX.Element {
    const { scope, api } = context.use("Title");
    return scope.render("title", {
        element: "h2",
        machine: () => api().getTitleProps(),
        unstyled: () => props.unstyled,
        props: omit(props, "unstyled"),
    });
}

/** What the popover holds, which describes it. */
function Body(props: PopoverPartProps): JSX.Element {
    const { scope, api } = context.use("Body");
    return scope.render("body", {
        element: "div",
        machine: () => api().getDescriptionProps(),
        unstyled: () => props.unstyled,
        props: omit(props, "unstyled"),
    });
}

/** The buttons at the end. */
function Actions(props: PopoverPartProps): JSX.Element {
    const { scope } = context.use("Actions");
    return scope.render("actions", {
        element: "div",
        unstyled: () => props.unstyled,
        props: omit(props, "unstyled"),
    });
}

/** A button that closes the popover, such as Cancel: `as={Button}` draws it as one. The registry
 *  doesn't style it. */
function CloseTrigger(props: PopoverTriggerProps): JSX.Element {
    const { scope, api } = context.use("CloseTrigger");
    return scope.render("closeTrigger", {
        element: "button",
        as: () => props.as,
        machine: () => api().getCloseTriggerProps(),
        unstyled: () => props.unstyled,
        props: omit(props, "unstyled", "as"),
    });
}

/** A caret pointing at the trigger, a child of the positioner. Zag places it and draws its tip,
 *  in the surface's color. */
function Caret(props: PopoverPartProps): JSX.Element {
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

/** The ready-made popover's props: Root's, with `class`, `style`, and `slotProps` keyed by part,
 *  the trigger's label, the heading, body, and actions as content, and `caret`. */
export interface PopoverProps
    extends
        Omit<PopoverRootProps, keyof SlotKeyedProps<Anatomy> | "children">,
        SlotKeyedProps<Anatomy>,
        PopoverContentProps<JSX.Element> {}

const READY_MADE_PROPS = [
    "class",
    "style",
    "slotProps",
    ...POPOVER_CONTENT_PROPS,
] as const;

/** The ready-made popover: the trigger, drawn as a button, when given a label, and the popover
 *  with its heading, body, and actions, each only when given, and, given `caret`, a caret. */
function ReadyMade(props: PopoverProps): JSX.Element {
    const slots = createSlotProps(props);
    const own = omit(props, ...READY_MADE_PROPS) as PopoverRootProps;
    const root = slots("root") as object;
    const trigger = slots("trigger") as object;
    const positioner = slots("positioner");
    const content = slots("content");
    const caret = slots("caret");
    const title = slots("title");
    const body = slots("body");
    const actions = slots("actions");
    return (
        <Root {...own} {...root}>
            <Show when={isPresent(props.trigger)}>
                <Trigger as={Button} label={props.trigger} {...trigger} />
            </Show>
            <Positioner {...positioner}>
                <Content {...content}>
                    <Show when={isPresent(props.heading)}>
                        <Title {...title}>{props.heading}</Title>
                    </Show>
                    <Show when={isPresent(props.body)}>
                        <Body {...body}>{props.body}</Body>
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
