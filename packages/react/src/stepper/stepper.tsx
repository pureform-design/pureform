// The stepper: Root on Zag's steps machine, an unstyled element around the step list (and, in a
// row, the content); the list, an item per step, its header (a button around the indicator, label
// and caption), connector and content, as the preset draws them; the next and previous triggers;
// and the ready-made Stepper over them.

import { stepperAnatomy } from "@pureform/anatomy";
import {
    isPresent,
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
import { normalizeProps } from "@zag-js/react";
import type { PropTypes } from "@zag-js/react";
import {
    createElement,
    type ElementType,
    type MouseEvent,
    type ReactNode,
    useId,
} from "react";

import { useControllable } from "../controllable";
import { ToastIcon } from "../glyphs";
import { useItemInteractionSources } from "../interaction";
import type { ItemInteractionSources } from "../interaction";
import { useMachine } from "../machine";
import { createPartContext } from "../part-context";
import { plainParts, useComponent, useSlotProps } from "../parts";
import type { ComponentScope, SlotKeyedProps } from "../parts";
import { omitProps } from "../props";
import type { PartProps } from "../props";
import { useDirection } from "../provider";

type Anatomy = typeof stepperAnatomy;

/** What Root shares with its parts. */
interface StepperContextValue {
    readonly scope: ComponentScope<Anatomy>;
    readonly api: stepper.Api<PropTypes>;
    readonly sources: ItemInteractionSources;
}

/** What an item shares with its parts. */
interface ItemContextValue {
    readonly index: number;
}

const context = createPartContext<StepperContextValue>("Stepper");
const itemContext = createPartContext<ItemContextValue>("Stepper", "Item");

/** Root's props: the variants and tokens, the machine's props (`step`, `count`, `linear`, …),
 *  `testId` and `unstyled` for every part, `as`, and the element's own props. */
export interface StepperRootProps
    extends Omit<PartProps, keyof StepperRootOwnProps>, StepperRootOwnProps {
    /** Another element or component to render instead of `<div>`. */
    readonly as?: ElementType | undefined;
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
    readonly as?: ElementType | undefined;
    readonly onClick?: ((event: MouseEvent<HTMLElement>) => void) | undefined;
    readonly [prop: string]: unknown;
}

/** The stepper's root, a `<div>` around the list and, in a row, the content. */
function Root(props: StepperRootProps): ReactNode {
    const id = useId();
    const dir = useDirection();
    const step = useControllable<"step", number>("Stepper", "step", props);
    const sources = useItemInteractionSources();
    const service = useMachine(stepper.machine, {
        id,
        ...sources.machineProps,
        dir,
        ...stepperMachineProps(props),
        ...step.machineProps,
    });
    const api = stepper.connect(service, normalizeProps);
    const scope = useComponent(stepperAnatomy, {
        selection: stepperSelection(props),
        testId: props.testId,
        unstyled: props.unstyled,
        indication: props.indication,
    });
    const { as, ...rest } = omitProps(props, STEPPER_ROOT_PROPS);
    return (
        <context.Provider value={{ scope, api, sources }}>
            {scope.render("root", {
                element: "div",
                as,
                machine: api.getRootProps(),
                props: rest,
            })}
        </context.Provider>
    );
}

/** The list of steps, a `tablist`: the arrow keys of the orientation move between the headers.
 *  Name it with `aria-label`. */
function List({ unstyled, ...props }: StepperPartProps): ReactNode {
    const { scope, api } = context.use("List");
    return scope.render("list", {
        element: "div",
        machine: api.getListProps(),
        unstyled,
        props,
    });
}

/** A step: its header, its connector to the next, and (in a column) its content. */
function Item({ unstyled, index, ...props }: StepperItemProps): ReactNode {
    const { scope, api } = context.use("Item");
    return (
        <itemContext.Provider value={{ index }}>
            {scope.render("item", {
                element: "div",
                machine: api.getItemProps({ index }),
                unstyled,
                props,
            })}
        </itemContext.Provider>
    );
}

/** A step's header: a button, a tab stop only while its step is current. Its children are the
 *  indicator, label and caption. */
function Trigger({
    unstyled,
    error,
    editable,
    disabled,
    controls = true,
    interactionSource,
    ...props
}: StepperTriggerProps): ReactNode {
    const { scope, api, sources } = context.use("Trigger");
    const { index } = itemContext.use("Trigger");
    const source = sources.item(String(index), interactionSource);
    const unavailable = stepperTriggerDisabled(
        { disabled, editable },
        api.getItemState({ index }).completed,
    );
    return scope.render("trigger", {
        element: "button",
        interactionSource: source,
        machine: stepperTriggerProps(
            api.getTriggerProps({
                index,
                invalid: error,
                disabled: unavailable,
            }),
            { controls },
        ),
        unstyled,
        props,
    });
}

/** The circle in a header: the step's number, an icon, or a check once done. Hidden from assistive
 *  technology. */
function Indicator({ unstyled, ...props }: StepperPartProps): ReactNode {
    const { scope, api } = context.use("Indicator");
    const { index } = itemContext.use("Indicator");
    return scope.render("indicator", {
        element: "span",
        machine: api.getIndicatorProps({ index }),
        unstyled,
        props,
    });
}

const plain = plainParts(context.use, "span");

/** A header's label. */
const Label = plain<StepperPartProps>("label", "Label");

/** A header's optional second line, such as "Optional". */
const Caption = plain<StepperPartProps>("caption", "Caption");

/** The connector after a step. Leave it off the last. */
function Separator({ unstyled, ...props }: StepperPartProps): ReactNode {
    const { scope, api } = context.use("Separator");
    const { index } = itemContext.use("Separator");
    return scope.render("separator", {
        element: "div",
        machine: api.getSeparatorProps({ index }),
        unstyled,
        props,
    });
}

/** A step's content, hidden until its step is current. In a column it goes in the step's item; in
 *  a row, after the list, with the step's `index`. */
function Content({
    unstyled,
    index,
    ...props
}: StepperContentPartProps): ReactNode {
    const { scope, api } = context.use("Content");
    const at = index ?? itemContext.use("Content").index;
    return scope.render("content", {
        element: "div",
        machine: api.getContentProps({ index: at }),
        unstyled,
        props,
    });
}

// A button that goes to the next or the previous step unless the app's `onClick` prevents it,
// disabled where there is none.
const stepAction =
    (display: string, direction: "next" | "previous") =>
    ({ as, onClick, ...props }: StepperStepActionProps): ReactNode => {
        const { api } = context.use(display);
        const available =
            direction === "next" ? api.hasNextStep : api.hasPrevStep;
        return createElement(as ?? "button", {
            type: "button",
            disabled: !available,
            ...props,
            onClick: (event: MouseEvent<HTMLElement>) => {
                onClick?.(event);
                if (event.defaultPrevented) return;
                if (direction === "next") api.goToNextStep();
                else api.goToPrevStep();
            },
        });
    };

/** A button that goes to the next step, which finishes the stepper from the last. Disabled once
 *  every step is done. Render a component with `as`. */
const NextTrigger = stepAction("NextTrigger", "next");

/** A button that goes to the previous step. Disabled on the first. Render a component with `as`. */
const PrevTrigger = stepAction("PrevTrigger", "previous");

/** The ready-made stepper's props: Root's (without the step count, which the items give), with
 *  `className`, `style`, and `slotProps` keyed by part, the steps as data, and the step list's name
 *  (`aria-label`, `aria-labelledby`). */
export interface StepperProps
    extends
        Omit<
            StepperRootProps,
            keyof SlotKeyedProps<Anatomy> | "children" | "count"
        >,
        SlotKeyedProps<Anatomy>,
        StepperContentProps<ReactNode> {}

// The indicator's content: an error's warning, a done step's check, the step's icon, or its number.
function StepIndicator({
    index,
    item,
    slot,
}: {
    readonly index: number;
    readonly item: StepperItem<ReactNode>;
    readonly slot: object;
}): ReactNode {
    const { api } = context.use("Indicator");
    const kind = stepperIndicator(item, {
        completed: api.getItemState({ index }).completed,
        hasIcon: isPresent(item.icon),
    });
    return (
        <Indicator {...slot}>
            {kind === "error" ? (
                <ToastIcon type="warning" />
            ) : kind === "check" ? (
                <ToastIcon type="success" />
            ) : kind === "icon" ? (
                item.icon
            ) : (
                index + 1
            )}
        </Indicator>
    );
}

/** The ready-made stepper: the step list with an item per entry of `items`, each a header (an
 *  indicator, a label and an optional caption) and a connector to the next, and each step's
 *  content, in its item for a column and after the list for a row. Without a step, the first
 *  starts. */
function ReadyMade(props: StepperProps): ReactNode {
    const {
        className: _className,
        style: _style,
        slotProps: _slotProps,
        items = [],
        "aria-label": label,
        "aria-labelledby": labelledBy,
        ...rootProps
    } = props;
    const slot = useSlotProps(props);
    const vertical = props.orientation === "vertical";
    const content = (item: StepperItem<ReactNode>, index: number) =>
        isPresent(item.content) ? (
            <Content
                key={`content-${index}`}
                index={index}
                {...slot("content")}
            >
                {item.content}
            </Content>
        ) : null;
    return (
        <Root {...rootProps} count={items.length} {...(slot("root") as object)}>
            <List
                aria-label={label}
                aria-labelledby={labelledBy}
                {...slot("list")}
            >
                {items.map((item, index) => (
                    <Item key={index} index={index} {...slot("item")}>
                        <Trigger
                            error={item.error}
                            editable={item.editable}
                            disabled={item.disabled}
                            controls={isPresent(item.content)}
                            interactionSource={item.interactionSource}
                            aria-label={item["aria-label"]}
                            {...slot("trigger")}
                        >
                            <StepIndicator
                                index={index}
                                item={item}
                                slot={slot("indicator") as object}
                            />
                            {isPresent(item.label) ? (
                                <Label {...slot("label")}>{item.label}</Label>
                            ) : null}
                            {isPresent(item.caption) ? (
                                <Caption {...slot("caption")}>
                                    {item.caption}
                                </Caption>
                            ) : null}
                        </Trigger>
                        {index < items.length - 1 ? (
                            <Separator {...slot("separator")} />
                        ) : null}
                        {vertical ? content(item, index) : null}
                    </Item>
                ))}
            </List>
            {vertical ? null : items.map(content)}
        </Root>
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
