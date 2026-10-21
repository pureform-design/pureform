// The time input: Root on pureform's time-picker machine, around the Headline, the Body (the
// HourField and MinuteField, each a text input over its label, the Separator, and the
// PeriodSelector with its two Periods), and the Actions; and the ready-made TimeInput over them.
// A field takes what's typed once it reads as an hour or a minute, and the arrow keys step it.

import { timeInputAnatomy } from "@pureform/anatomy";
import type { PartName } from "@pureform/anatomy";
import {
    isPresent,
    TIME_CONTENT_PROPS,
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
import type * as timePicker from "@pureform/machines/time-picker";
import type { JSX, ValidComponent } from "@solidjs/web";
import { type Accessor, merge, omit, Show } from "solid-js";

import { useMachineButton } from "../interaction";
import type { PropTypes } from "../internal/zag";
import { createPartContext } from "../part-context";
import { createSlotProps, machinePart, useComponent } from "../parts";
import type { ComponentScope, SlotKeyedProps } from "../parts";
import type { PartProps } from "../props";
import { useTimeMachine } from "../time";

type Anatomy = typeof timeInputAnatomy;
type Api = timePicker.Api<PropTypes>;

interface TimeInputContextValue {
    readonly scope: ComponentScope<Anatomy>;
    readonly api: Accessor<Api>;
}

const context = createPartContext<TimeInputContextValue>("TimeInput");

/** Root's props: the tokens, the time and its clock, `testId` and `unstyled` for every part,
 *  `as`, and the element's own props. */
export interface TimeInputRootProps
    extends
        Omit<PartProps, keyof TimeInputRootOwnProps>,
        TimeInputRootOwnProps {
    readonly as?: ValidComponent | undefined;
}

/** A part's props: the element's own, and the part's `unstyled`. */
export interface TimeInputPartProps extends PartProps {
    readonly unstyled?: boolean | undefined;
}

/** The time input: a group named by its headline. */
function Root(props: TimeInputRootProps): JSX.Element {
    const api = useTimeMachine("TimeInput", props);
    const scope = useComponent(timeInputAnatomy, {
        selection: () => timeInputSelection(props),
        testId: () => props.testId,
        unstyled: () => props.unstyled,
        indication: () => props.indication,
    });
    return (
        <context.Provider value={{ scope, api }}>
            {scope.render("root", {
                element: "div",
                as: () => props.as,
                machine: () => api().getRootProps(),
                props: omit(props, "as", ...TIME_INPUT_ROOT_PROPS),
            })}
            <Show when={props.name}>
                <input {...api().getHiddenInputProps()} />
            </Show>
        </context.Provider>
    );
}

const div = machinePart<Anatomy, TimeInputContextValue>(context.use, "div");
const span = machinePart<Anatomy, TimeInputContextValue>(context.use, "span");

/** The headline: "Enter time". */
const Headline = div("headline", "Headline", ({ api }) =>
    api().getHeadlineProps(),
);
/** The row of the fields and the period selector. */
const Body = div("body", "Body", ({ api }) => api().getBodyProps());
/** The colon between the fields. */
const Separator = span("separator", "Separator", ({ api }) =>
    api().getSeparatorProps(),
);
/** Where the app's buttons go. */
const Actions = div("actions", "Actions", ({ api }) => api().getActionsProps());

/** A field's props: a part's, and the label under its input ("Hour", "Minute" by default). */
export interface TimeInputFieldProps extends TimeInputPartProps {
    readonly label?: JSX.Element;
}

const field = (of: TimePickerView, name: string) =>
    function Field(props: TimeInputFieldProps): JSX.Element {
        const { scope, api } = context.use(name);
        return scope.render(of === "hour" ? "hourField" : "minuteField", {
            element: "label",
            machine: () => api().getFieldProps(of),
            unstyled: () => props.unstyled,
            props: merge(omit(props, "unstyled", "label"), {
                get children() {
                    return (
                        <>
                            {scope.render("input", {
                                element: "input",
                                machine: () => api().getInputProps(of),
                            })}
                            {scope.render("fieldLabel", {
                                element: "span",
                                machine: () => api().getFieldLabelProps(of),
                                props: {
                                    get children() {
                                        return isPresent(props.label)
                                            ? props.label
                                            : api().translations[of];
                                    },
                                },
                            })}
                        </>
                    );
                },
            }),
        });
    };

/** The hour field. */
const HourField = field("hour", "HourField");
/** The minute field. */
const MinuteField = field("minute", "MinuteField");

/** The period selector: AM over PM, in a 12-hour cycle. */
const PeriodSelector = div("periodSelector", "PeriodSelector", ({ api }) =>
    api().getPeriodSelectorProps(),
);

/** A period's props: which one, a part's, and its interaction source. */
export interface TimeInputPeriodProps
    extends TimeInputPartProps, InteractionSourceProps {
    readonly period: "am" | "pm";
}

/** One period, a toggle button. */
function Period(props: TimeInputPeriodProps): JSX.Element {
    const { scope, api } = context.use("Period");
    const button = useMachineButton(
        omit(props, "period"),
        () => [
            api().getPeriodProps(props.period) as Readonly<
                Record<string, unknown>
            >,
        ],
        () => api().disabled,
    );
    return scope.render("period", button);
}

/** The ready-made time input's props. */
export interface TimeInputProps
    extends
        Omit<TimeInputRootProps, keyof SlotKeyedProps<Anatomy> | "children">,
        SlotKeyedProps<Anatomy>,
        TimeContentProps<JSX.Element> {}

/** The ready-made time input. */
function ReadyMade(props: TimeInputProps): JSX.Element {
    const slots = createSlotProps(props);
    const own = omit(
        props,
        "class",
        "style",
        "slotProps",
        ...TIME_CONTENT_PROPS,
    ) as TimeInputRootProps;
    return (
        <Root {...own} {...(slots("root") as object)}>
            <ReadyMadeParts {...props} slots={slots} />
        </Root>
    );
}

function ReadyMadeParts(
    props: TimeInputProps & {
        readonly slots: (part: PartName<Anatomy>) => PartProps;
    },
): JSX.Element {
    const { api } = context.use("TimeInput");
    return (
        <>
            <Headline {...props.slots("headline")}>
                {isPresent(props.headline)
                    ? props.headline
                    : TIME_INPUT_HEADLINE}
            </Headline>
            <Body {...props.slots("body")}>
                <HourField {...props.slots("hourField")} />
                <Separator {...props.slots("separator")}>:</Separator>
                <MinuteField {...props.slots("minuteField")} />
                <Show when={api().hourCycle === 12}>
                    <PeriodSelector {...props.slots("periodSelector")}>
                        <Period period="am" {...props.slots("period")}>
                            {api().periodNames.am}
                        </Period>
                        <Period period="pm" {...props.slots("period")}>
                            {api().periodNames.pm}
                        </Period>
                    </PeriodSelector>
                </Show>
            </Body>
            <Show when={isPresent(props.actions)}>
                <Actions {...props.slots("actions")}>{props.actions}</Actions>
            </Show>
        </>
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
