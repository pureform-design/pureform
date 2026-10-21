// The time input: Root on pureform's time-picker machine, around the Headline, the Body (the
// HourField and MinuteField, each a text input over its label, the Separator, and the
// PeriodSelector with its two Periods), and the Actions; and the ready-made TimeInput over them.
// A field takes what's typed once it reads as an hour or a minute, and the arrow keys step it.

import { timeInputAnatomy } from "@pureform/anatomy";
import {
    isPresent,
    TIME_INPUT_HEADLINE,
    TIME_INPUT_ROOT_PROPS,
    timeInputSelection,
} from "@pureform/binding-core";
import type {
    InteractionSourceProps,
    TimeContentProps,
    TimeInputRootOwnProps,
    TimePickerView,
} from "@pureform/binding-core";
import type { ElementType, ReactNode } from "react";

import { useMachineButton } from "../interaction";
import { createPartContext } from "../part-context";
import { machinePart, useComponent, useSlotProps } from "../parts";
import type { ComponentScope, SlotKeyedProps } from "../parts";
import { omitProps } from "../props";
import type { PartProps } from "../props";
import { useTimeMachine } from "../time";
import type { TimeApi } from "../time";

type Anatomy = typeof timeInputAnatomy;

interface TimeInputContextValue {
    readonly scope: ComponentScope<Anatomy>;
    readonly api: TimeApi;
}

const context = createPartContext<TimeInputContextValue>("TimeInput");

/** Root's props: the tokens, the time and its clock, `testId` and `unstyled` for every part,
 *  `as`, and the element's own props. */
export interface TimeInputRootProps
    extends
        Omit<PartProps, keyof TimeInputRootOwnProps>,
        TimeInputRootOwnProps {
    readonly as?: ElementType | undefined;
}

/** A part's props: the element's own, and the part's `unstyled`. */
export interface TimeInputPartProps extends PartProps {
    readonly unstyled?: boolean | undefined;
}

/** The time input: a group named by its headline. */
function Root(props: TimeInputRootProps): ReactNode {
    const api = useTimeMachine("TimeInput", props);
    const scope = useComponent(timeInputAnatomy, {
        selection: timeInputSelection(props),
        testId: props.testId,
        unstyled: props.unstyled,
        indication: props.indication,
    });
    const { as, ...rest } = omitProps(props, TIME_INPUT_ROOT_PROPS);
    return (
        <context.Provider value={{ scope, api }}>
            {scope.render("root", {
                element: "div",
                as,
                machine: api.getRootProps(),
                props: rest,
            })}
            {props.name ? <input {...api.getHiddenInputProps()} /> : null}
        </context.Provider>
    );
}

const div = machinePart<Anatomy, TimeInputContextValue>(context.use, "div");
const span = machinePart<Anatomy, TimeInputContextValue>(context.use, "span");

/** The headline: "Enter time". */
const Headline = div("headline", "Headline", ({ api }) =>
    api.getHeadlineProps(),
);
/** The row of the fields and the period selector. */
const Body = div("body", "Body", ({ api }) => api.getBodyProps());
/** The colon between the fields. */
const Separator = span("separator", "Separator", ({ api }) =>
    api.getSeparatorProps(),
);
/** Where the app's buttons go. */
const Actions = div("actions", "Actions", ({ api }) => api.getActionsProps());

/** A field's props: a part's, and the label under its input ("Hour", "Minute" by default). */
export interface TimeInputFieldProps extends TimeInputPartProps {
    readonly label?: ReactNode;
}

const field = (of: TimePickerView, name: string) =>
    function Field({
        unstyled,
        label,
        ...props
    }: TimeInputFieldProps): ReactNode {
        const { scope, api } = context.use(name);
        return scope.render(of === "hour" ? "hourField" : "minuteField", {
            element: "label",
            machine: api.getFieldProps(of),
            unstyled,
            props: {
                ...props,
                children: (
                    <>
                        {scope.render("input", {
                            element: "input",
                            machine: api.getInputProps(of),
                        })}
                        {scope.render("fieldLabel", {
                            element: "span",
                            machine: api.getFieldLabelProps(of),
                            props: {
                                children: isPresent(label)
                                    ? label
                                    : api.translations[of],
                            },
                        })}
                    </>
                ),
            },
        });
    };

/** The hour field. */
const HourField = field("hour", "HourField");
/** The minute field. */
const MinuteField = field("minute", "MinuteField");

/** The period selector: AM over PM, in a 12-hour cycle. */
const PeriodSelector = div("periodSelector", "PeriodSelector", ({ api }) =>
    api.getPeriodSelectorProps(),
);

/** A period's props: which one, a part's, and its interaction source. */
export interface TimeInputPeriodProps
    extends TimeInputPartProps, InteractionSourceProps {
    readonly period: "am" | "pm";
}

/** One period, a toggle button. */
function Period({ period, ...props }: TimeInputPeriodProps): ReactNode {
    const { scope, api } = context.use("Period");
    return scope.render(
        "period",
        useMachineButton(
            props,
            [api.getPeriodProps(period) as Readonly<Record<string, unknown>>],
            api.disabled,
        ),
    );
}

/** The ready-made time input's props. */
export interface TimeInputProps
    extends
        Omit<TimeInputRootProps, keyof SlotKeyedProps<Anatomy> | "children">,
        SlotKeyedProps<Anatomy>,
        TimeContentProps<ReactNode> {}

/** The ready-made time input. */
function ReadyMade(props: TimeInputProps): ReactNode {
    const {
        className: _className,
        style: _style,
        slotProps: _slotProps,
        headline,
        actions,
        ...rootProps
    } = props;
    const slot = useSlotProps(props);
    return (
        <Root {...rootProps} {...(slot("root") as object)}>
            <Headline {...slot("headline")}>
                {isPresent(headline) ? headline : TIME_INPUT_HEADLINE}
            </Headline>
            <Body {...slot("body")}>
                <HourField {...slot("hourField")} />
                <Separator {...slot("separator")}>:</Separator>
                <MinuteField {...slot("minuteField")} />
                <ReadyMadePeriods slot={slot} />
            </Body>
            {isPresent(actions) ? (
                <Actions {...slot("actions")}>{actions}</Actions>
            ) : null}
        </Root>
    );
}

function ReadyMadePeriods({
    slot,
}: {
    readonly slot: (part: keyof Anatomy["parts"]) => PartProps;
}): ReactNode {
    const { api } = context.use("PeriodSelector");
    if (api.hourCycle !== 12) return null;
    return (
        <PeriodSelector {...slot("periodSelector")}>
            <Period period="am" {...slot("period")}>
                {api.periodNames.am}
            </Period>
            <Period period="pm" {...slot("period")}>
                {api.periodNames.pm}
            </Period>
        </PeriodSelector>
    );
}

/** Material's time input. Use it ready-made, `<TimeInput defaultValue="09:30" actions={…} />`, or
 *  compose its parts under `TimeInput.Root`: `Headline`, `Body` (with `HourField`, `Separator`,
 *  `MinuteField` and `PeriodSelector` with a `Period` each), and `Actions`. */
export const TimeInput = Object.assign(ReadyMade, {
    Root,
    Headline,
    Body,
    HourField,
    Separator,
    MinuteField,
    PeriodSelector,
    Period,
    Actions,
});
