// The stepper: Root on Zag's steps machine, an unstyled element around the step list (and, in a
// row, the content); the list, an item per step, its header (a button around the indicator, label
// and caption), connector and content, as the preset draws them; the next and previous triggers;
// and the ready-made Stepper over them.

import { stepperAnatomy } from "@pureform/anatomy";
import {
    isPresent,
    STEPPER_CONTENT_PROPS,
    STEPPER_LIST_LABEL_PROPS,
    STEPPER_ROOT_PROPS,
    stepperIndicator,
    stepperMachineProps,
    stepperSelection,
    stepperTriggerDisabled,
    stepperTriggerProps,
} from "@pureform/binding-core";
import type {
    InteractionSourceProps,
    StepperContentProps,
    StepperItem,
    StepperRootOwnProps,
} from "@pureform/binding-core";
import * as stepper from "@pureform/machines/stepper";
import type { JSX, ValidComponent } from "@solidjs/web";
import {
    type Accessor,
    createMemo,
    createUniqueId,
    For,
    omit,
    Show,
    untrack,
} from "solid-js";

import { useControllable } from "../controllable";
import { ToastIcon } from "../glyphs";
import {
    HorizontalSharedAxis,
    useSharedAxisPage,
} from "../horizontal-shared-axis/horizontal-shared-axis";
import { itemInteractionSources } from "../interaction";
import type { ItemInteractionSources } from "../interaction";
import { normalizeProps, useMachine } from "../internal/zag";
import type { PropTypes } from "../internal/zag";
import { createPartContext } from "../part-context";
import { createSlotProps, plainParts, useComponent } from "../parts";
import type { ComponentScope, SlotKeyedProps } from "../parts";
import { pickerAction } from "../picker-actions";
import type { PartProps } from "../props";
import { useDirection } from "../provider";

type Anatomy = typeof stepperAnatomy;

/** What Root shares with its parts. */
interface StepperContextValue {
    readonly scope: ComponentScope<Anatomy>;
    readonly api: Accessor<stepper.Api<PropTypes>>;
    readonly sources: ItemInteractionSources;
}

/** What an item shares with its parts. */
interface ItemContextValue {
    readonly index: Accessor<number>;
}

const context = createPartContext<StepperContextValue>("Stepper");
const itemContext = createPartContext<ItemContextValue>("Stepper", "Item");

/** Root's props: the variants and tokens, the machine's props (`step`, `count`, `linear`, …),
 *  `testId` and `unstyled` for every part, `as`, and the element's own props. */
export interface StepperRootProps
    extends Omit<PartProps, keyof StepperRootOwnProps>, StepperRootOwnProps {
    /** Another element or component to render instead of `<div>`. */
    readonly as?: ValidComponent | undefined;
}

/** A part's props: the element's own, and the part's `unstyled`. */
export interface StepperPartProps extends PartProps {
    readonly unstyled?: boolean | undefined;
}

/** An item's props: the step's index, which its parts read. */
export interface StepperItemProps extends StepperPartProps {
    readonly index: number;
}

/** A header's props: whether the step is in the error state, whether a done step can be gone back
 *  to, `disabled`, and the source its interactions go to. */
export interface StepperTriggerProps
    extends StepperPartProps, InteractionSourceProps {
    /** Show the step in the error state. */
    readonly error?: boolean | undefined;
    /** Whether the header of a step that is done goes back to it. @default true */
    readonly editable?: boolean | undefined;
    readonly disabled?: boolean | undefined;
    /** Whether the header names its content (`Stepper.Content` for the step) in `aria-controls`.
     *  Turn it off for steps that show something else. @default true */
    readonly controls?: boolean | undefined;
}

/** A content's props: the step it belongs to, which it takes from its item when it is in one (a
 *  row's content is outside the items, so it names its step), and a part's. */
export interface StepperContentPartProps extends StepperPartProps {
    readonly index?: number | undefined;
}

/** The next and previous triggers' props: `as` to render a component (a button component, say) rather than
 *  `<button>`, and the element's own. */
export interface StepperStepActionProps {
    readonly as?: ValidComponent | undefined;
    readonly [prop: string]: unknown;
}

/** The stepper's root, a `<div>` around the list and, in a row, the content. */
function Root(props: StepperRootProps): JSX.Element {
    const id = createUniqueId();
    const dir = useDirection();
    const step = useControllable<"step", number>("Stepper", "step", props);
    const sources = itemInteractionSources();
    const service = useMachine(stepper.machine, () => ({
        id,
        ...sources.machineProps,
        dir: dir(),
        ...stepperMachineProps(props),
        ...step.machineProps(),
    }));
    const api = createMemo(() => stepper.connect(service, normalizeProps));
    const scope = useComponent(stepperAnatomy, {
        selection: () => stepperSelection(props),
        testId: () => props.testId,
        unstyled: () => props.unstyled,
        indication: () => props.indication,
    });
    return (
        <context.Provider value={{ scope, api, sources }}>
            {scope.render("root", {
                element: "div",
                as: () => props.as,
                machine: () => api().getRootProps(),
                props: omit(props, "as", ...STEPPER_ROOT_PROPS),
            })}
        </context.Provider>
    );
}

/** The list of steps, a `tablist`: the arrow keys of the orientation move between the headers.
 *  Name it with `aria-label`. */
function List(props: StepperPartProps): JSX.Element {
    const { scope, api } = context.use("List");
    return scope.render("list", {
        element: "div",
        machine: () => api().getListProps(),
        unstyled: () => props.unstyled,
        props: omit(props, "unstyled"),
    });
}

/** A step: its header, its connector to the next, and (in a column) its content. */
function Item(props: StepperItemProps): JSX.Element {
    const { scope, api } = context.use("Item");
    return (
        <itemContext.Provider value={{ index: () => props.index }}>
            {scope.render("item", {
                element: "div",
                machine: () => api().getItemProps({ index: props.index }),
                unstyled: () => props.unstyled,
                props: omit(props, "unstyled", "index"),
            })}
        </itemContext.Provider>
    );
}

/** A step's header: a button, a tab stop only while its step is current. Its children are the
 *  indicator, label and caption. */
function Trigger(props: StepperTriggerProps): JSX.Element {
    const { scope, api, sources } = context.use("Trigger");
    const { index } = itemContext.use("Trigger");
    const source = sources.item(
        () => String(index()),
        () => props.interactionSource,
    );
    const disabled = () =>
        stepperTriggerDisabled(
            props,
            api().getItemState({ index: index() }).completed,
        );
    return scope.render("trigger", {
        element: "button",
        interactionSource: source,
        machine: () =>
            stepperTriggerProps(
                api().getTriggerProps({
                    index: index(),
                    invalid: props.error,
                    disabled: disabled(),
                }),
                { controls: props.controls ?? true },
            ),
        unstyled: () => props.unstyled,
        props: omit(
            props,
            "unstyled",
            "error",
            "editable",
            "disabled",
            "controls",
            "interactionSource",
        ),
    });
}

/** The circle in a header: the step's number, an icon, or a check once done. Hidden from assistive
 *  technology. */
function Indicator(props: StepperPartProps): JSX.Element {
    const { scope, api } = context.use("Indicator");
    const { index } = itemContext.use("Indicator");
    return scope.render("indicator", {
        element: "span",
        machine: () => api().getIndicatorProps({ index: index() }),
        unstyled: () => props.unstyled,
        props: omit(props, "unstyled"),
    });
}

const plain = plainParts(context.use, "span");

/** A header's label. */
const Label = plain<StepperPartProps>("label", "Label");

/** A header's optional second line, such as "Optional". */
const Caption = plain<StepperPartProps>("caption", "Caption");

/** The connector after a step. Leave it off the last. */
function Separator(props: StepperPartProps): JSX.Element {
    const { scope, api } = context.use("Separator");
    const { index } = itemContext.use("Separator");
    return scope.render("separator", {
        element: "div",
        machine: () => api().getSeparatorProps({ index: index() }),
        unstyled: () => props.unstyled,
        props: omit(props, "unstyled"),
    });
}

/** A step's content, hidden until its step is current. In a column it goes in the step's item; in
 *  a row, after the list, with the step's `index`. */
function Content(props: StepperContentPartProps): JSX.Element {
    const { scope, api } = context.use("Content");
    // Whether it names its step is fixed: a row's content is outside the items.
    const named = untrack(() => props.index !== undefined);
    const index = named ? () => props.index! : itemContext.use("Content").index;
    // A step's content leaving in a shared axis stays drawn while it goes.
    const page = useSharedAxisPage();
    return scope.render("content", {
        element: "div",
        machine: () =>
            page() === "leaving"
                ? {
                      ...api().getContentProps({ index: index() }),
                      hidden: false,
                  }
                : api().getContentProps({ index: index() }),
        unstyled: () => props.unstyled,
        props: omit(props, "unstyled", "index"),
    });
}

// A button that goes to the next or the previous step unless the app's `onClick` prevents it,
// disabled where there is none.
const stepAction = (
    display: string,
    direction: "next" | "previous",
): ((props: StepperStepActionProps) => JSX.Element) =>
    pickerAction(
        display,
        (name) => {
            const { api } = context.use(name);
            return () =>
                direction === "next"
                    ? api().goToNextStep()
                    : api().goToPrevStep();
        },
        (name) => {
            const { api } = context.use(name);
            return () =>
                !(direction === "next" ? api().hasNextStep : api().hasPrevStep);
        },
    );

/** A button that goes to the next step, which finishes the stepper from the last. Disabled once
 *  every step is done. Render a component with `as`. */
const NextTrigger = stepAction("NextTrigger", "next");

/** A button that goes to the previous step. Disabled on the first. Render a component with `as`. */
const PrevTrigger = stepAction("PrevTrigger", "previous");

/** The ready-made stepper's props: Root's (without the step count, which the items give), with
 *  `class`, `style`, and `slotProps` keyed by part, the steps as data, and the step list's name
 *  (`aria-label`, `aria-labelledby`). */
export interface StepperProps
    extends
        Omit<
            StepperRootProps,
            keyof SlotKeyedProps<Anatomy> | "children" | "count"
        >,
        SlotKeyedProps<Anatomy>,
        StepperContentProps<JSX.Element> {}

const READY_MADE_PROPS = [
    "class",
    "style",
    "slotProps",
    ...STEPPER_CONTENT_PROPS,
    ...STEPPER_LIST_LABEL_PROPS,
] as const;

interface StepSlots {
    readonly item: object;
    readonly trigger: object;
    readonly indicator: object;
    readonly label: object;
    readonly caption: object;
    readonly separator: object;
    readonly content: object;
}

// The indicator's content: an error's warning, a done step's check, the step's icon, or its number.
function StepIndicator(props: {
    readonly index: number;
    readonly item: StepperItem<JSX.Element>;
    readonly slot: object;
}): JSX.Element {
    const { api } = context.use("Indicator");
    const kind = () =>
        stepperIndicator(props.item, {
            completed: api().getItemState({ index: props.index }).completed,
            hasIcon: isPresent(props.item.icon),
        });
    return (
        <Indicator {...props.slot}>
            {kind() === "error" ? (
                <ToastIcon type="warning" />
            ) : kind() === "check" ? (
                <ToastIcon type="success" />
            ) : kind() === "icon" ? (
                props.item.icon
            ) : (
                props.index + 1
            )}
        </Indicator>
    );
}

// A step's content, when it has any.
function StepContent(props: {
    readonly entry: Accessor<StepperItem<JSX.Element>>;
    readonly index: number;
    readonly slot: object;
}): JSX.Element {
    return (
        <Show when={isPresent(props.entry().content)}>
            <Content index={props.index} {...props.slot}>
                {props.entry().content}
            </Content>
        </Show>
    );
}

/** The ready-made stepper: the step list with an item per entry of `items`, each a header (an
 *  indicator, a label and an optional caption) and a connector to the next, and each step's
 *  content, in its item for a column and after the list for a row. Without a step, the first
 *  starts. */
function ReadyMade(props: StepperProps): JSX.Element {
    const items = createMemo(() => props.items ?? []);
    const slots = createSlotProps(props);
    const own = omit(props, ...READY_MADE_PROPS) as Omit<
        StepperRootProps,
        "count"
    >;
    const root = slots("root") as object;
    const list = slots("list");
    const part: StepSlots = {
        item: slots("item") as object,
        trigger: slots("trigger") as object,
        indicator: slots("indicator") as object,
        label: slots("label") as object,
        caption: slots("caption") as object,
        separator: slots("separator") as object,
        content: slots("content") as object,
    };
    const vertical = () => props.orientation === "vertical";
    return (
        <Root {...own} count={items().length} {...root}>
            <List
                aria-label={props["aria-label"]}
                aria-labelledby={props["aria-labelledby"]}
                {...list}
            >
                <For each={items()} keyed={false}>
                    {(entry: Accessor<StepperItem<JSX.Element>>, index) => (
                        <Item index={index} {...part.item}>
                            <Trigger
                                error={entry().error}
                                editable={entry().editable}
                                disabled={entry().disabled}
                                controls={isPresent(entry().content)}
                                interactionSource={entry().interactionSource}
                                aria-label={entry()["aria-label"]}
                                {...part.trigger}
                            >
                                <StepIndicator
                                    index={index}
                                    item={entry()}
                                    slot={part.indicator}
                                />
                                <Show when={isPresent(entry().label)}>
                                    <Label {...part.label}>
                                        {entry().label}
                                    </Label>
                                </Show>
                                <Show when={isPresent(entry().caption)}>
                                    <Caption {...part.caption}>
                                        {entry().caption}
                                    </Caption>
                                </Show>
                            </Trigger>
                            <Show when={index < items().length - 1}>
                                <Separator {...part.separator} />
                            </Show>
                            <Show when={vertical()}>
                                <StepContent
                                    entry={entry}
                                    index={index}
                                    slot={part.content}
                                />
                            </Show>
                        </Item>
                    )}
                </For>
            </List>
            <Show when={!vertical() && props.transition !== "sharedAxis"}>
                <For each={items()} keyed={false}>
                    {(entry: Accessor<StepperItem<JSX.Element>>, index) => (
                        <StepContent
                            entry={entry}
                            index={index}
                            slot={part.content}
                        />
                    )}
                </For>
            </Show>
            <Show when={!vertical() && props.transition === "sharedAxis"}>
                <SharedAxisSteps
                    items={items}
                    scrim={() => props.transitionScrim}
                    slot={part.content}
                />
            </Show>
        </Root>
    );
}

// A row's current step's content in a horizontal shared axis, which slides between the steps in
// their order.
function SharedAxisSteps(props: {
    readonly items: Accessor<readonly StepperItem<JSX.Element>[]>;
    readonly scrim: Accessor<boolean | undefined>;
    readonly slot: object;
}): JSX.Element {
    const { api } = context.use("Content");
    return (
        <HorizontalSharedAxis index={api().value} scrim={props.scrim()}>
            {(at: number) => {
                const entry = untrack(() => props.items()[at]);
                return entry ? (
                    <StepContent
                        entry={() => entry}
                        index={at}
                        slot={props.slot}
                    />
                ) : null;
            }}
        </HorizontalSharedAxis>
    );
}

/** A stepper. Use it ready-made, `<Stepper aria-label="Checkout" items={[{ label: "Address",
 *  content: … }, …]} />`, or compose its parts under `Stepper.Root` (with `count`): `List`
 *  holding an `Item` per step (with its `index`), each with a `Trigger` around an `Indicator`,
 *  `Label` and `Caption`, a `Separator`, and (in a column) its `Content`; in a row the `Content`s
 *  follow the list. `NextTrigger` and `PrevTrigger` move between the steps. */
export const Stepper = Object.assign(ReadyMade, {
    Root,
    List,
    Item,
    Trigger,
    Indicator,
    Label,
    Caption,
    Separator,
    Content,
    NextTrigger,
    PrevTrigger,
});
