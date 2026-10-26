// The time picker: Root on pureform's time-picker machine, around the Headline, the Body (the
// hour and minute selectors, the Separator, and the PeriodSelector with its two Periods), the
// Dial (its track, handle, centre and labels, placed from the time), and the Actions; and the
// ready-made TimePicker over them. In `scroll` mode the selectors are spin buttons showing the
// values around the current one, and there's no dial. Put it in a Dialog for Material's modal
// time picker.

import { timePickerAnatomy } from "@pureform/anatomy";
import type { PartName } from "@pureform/anatomy";
import {
    isPresent,
    TIME_CONTENT_PROPS,
    TIME_PICKER_HEADLINE,
    TIME_PICKER_ROOT_PROPS,
    timePickerSelection,
} from "@pureform/binding-core";
import type {
    InteractionSourceProps,
    TimeContentProps,
    TimePickerInstances,
    TimePickerRootOwnProps,
    TimePickerView,
} from "@pureform/binding-core";
import type * as timePicker from "@pureform/machines/time-picker";
import type { JSX, ValidComponent } from "@solidjs/web";
import { type Accessor, For, merge, omit, Show } from "solid-js";

import { useMachineButton } from "../interaction";
import type { PropTypes } from "../internal/zag";
import { createPartContext } from "../part-context";
import { createSlotProps, machinePart, useComponent } from "../parts";
import type { ComponentScope, SlotKeyedProps, SlotPropsOf } from "../parts";
import type { PartProps } from "../props";
import { useTimeMachine } from "../time";

type Anatomy = typeof timePickerAnatomy;
type Api = timePicker.Api<PropTypes>;

/** What Root shares with its parts. */
interface TimePickerContextValue {
    readonly scope: ComponentScope<Anatomy>;
    readonly api: Accessor<Api>;
    readonly mode: Accessor<"dial" | "scroll">;
}

const context = createPartContext<TimePickerContextValue>("TimePicker");

/** Root's props: the variants and tokens, the time and its clock, `testId` and `unstyled` for
 *  every part, `as`, and the element's own props. */
export interface TimePickerRootProps
    extends
        Omit<PartProps, keyof TimePickerRootOwnProps>,
        TimePickerRootOwnProps {
    /** Another element or component to render instead of `<div>`. */
    readonly as?: ValidComponent | undefined;
}

/** A part's props: the element's own, and the part's `unstyled`. */
export interface TimePickerPartProps extends PartProps {
    readonly unstyled?: boolean | undefined;
}

/** The time picker: a group named by its headline. */
function Root(props: TimePickerRootProps): JSX.Element {
    const api = useTimeMachine("TimePicker", props);
    const scope = useComponent(timePickerAnatomy, {
        selection: () => timePickerSelection(props),
        testId: () => props.testId,
        unstyled: () => props.unstyled,
        indication: () => props.indication,
    });
    const mode = () =>
        props.mode === "scroll" ? ("scroll" as const) : ("dial" as const);
    return (
        <context.Provider value={{ scope, api, mode }}>
            {scope.render("root", {
                element: "div",
                as: () => props.as,
                machine: () => api().getRootProps(),
                props: omit(props, "as", ...TIME_PICKER_ROOT_PROPS),
            })}
            <Show when={props.name}>
                <input {...api().getHiddenInputProps()} />
            </Show>
        </context.Provider>
    );
}

const div = machinePart<Anatomy, TimePickerContextValue>(context.use, "div");
const span = machinePart<Anatomy, TimePickerContextValue>(context.use, "span");

/** The headline: "Select time". */
const Headline = div("headline", "Headline", ({ api }) =>
    api().getHeadlineProps(),
);
/** The row of the hour and minute selectors and the period selector. */
const Body = div("body", "Body", ({ api }) => api().getBodyProps());
/** The colon between the hour and the minute. */
const Separator = span("separator", "Separator", ({ api }) =>
    api().getSeparatorProps(),
);
/** Where the app's buttons go, such as Cancel and OK. */
const Actions = div("actions", "Actions", ({ api }) => api().getActionsProps());

/** A selector's props: a part's, and the interaction source its presses are emitted to. */
export interface TimePickerSelectorProps
    extends TimePickerPartProps, InteractionSourceProps {
    /** The ready-made's slot props for its scroll items. */
    readonly slots?: TimePickerSlots | undefined;
}

/** A ready-made time picker's slot props for the parts inside the selectors and the dial, the
 *  repeated ones by copy. */
export type TimePickerSlots = SlotPropsOf<
    "scrollItem" | "dialTrack" | "dialHandle" | "dialCenter" | "dialLabel",
    TimePickerInstances
>;

/** The dial's props: a part's, and the ready-made's slot props for its track, handle, centre
 *  and labels. */
export interface TimePickerDialProps extends TimePickerPartProps {
    readonly slots?: TimePickerSlots | undefined;
}

// A slot's props as a part's render options.
const slotted = (slot: PartProps | undefined, children?: () => JSX.Element) => {
    const own = slot as TimePickerPartProps | undefined;
    const rest = own ? omit(own, "unstyled") : {};
    return {
        unstyled: () => own?.unstyled,
        props: children
            ? merge(rest, {
                  get children() {
                      return children();
                  },
              })
            : rest,
    };
};

// The hour or minute selector: a toggle button choosing what the dial sets, or in scroll mode a
// spin button with the values around the current one.
const selector = (of: TimePickerView, name: string) =>
    function Selector(props: TimePickerSelectorProps): JSX.Element {
        const { scope, api, mode } = context.use(name);
        const part = of === "hour" ? "hourSelector" : "minuteSelector";
        const button = useMachineButton(
            props,
            () => [
                (mode() === "scroll"
                    ? api().getScrollFieldProps(of)
                    : api().getSelectorProps(of)) as Readonly<
                    Record<string, unknown>
                >,
            ],
            () => api().disabled,
        );
        return (
            <Show
                when={mode() === "scroll"}
                fallback={scope.render(part, button)}
            >
                {scope.render(part, { ...button, element: "div" })}
            </Show>
        );
    };

/** The hour selector. Its text is the hour; in scroll mode, the hours around it. */
function HourSelector(props: TimePickerSelectorProps): JSX.Element {
    return <SelectorContent {...props} of="hour" />;
}

/** The minute selector. */
function MinuteSelector(props: TimePickerSelectorProps): JSX.Element {
    return <SelectorContent {...props} of="minute" />;
}

const HourSelectorPart = selector("hour", "HourSelector");
const MinuteSelectorPart = selector("minute", "MinuteSelector");

function SelectorContent(
    props: TimePickerSelectorProps & { readonly of: TimePickerView },
): JSX.Element {
    const { scope, api, mode } = context.use("Selector");
    const Part = props.of === "hour" ? HourSelectorPart : MinuteSelectorPart;
    return (
        <Part {...omit(props, "of", "slots")}>
            <Show
                when={mode() === "scroll"}
                fallback={api().scrollItems(props.of)[1]!.text}
            >
                <For each={api().scrollItems(props.of)}>
                    {(item) =>
                        scope.render("scrollItem", {
                            element: "span",
                            machine: () =>
                                api().getScrollItemProps(props.of, item),
                            ...slotted(
                                props.slots?.("scrollItem", () => ({
                                    view: props.of,
                                    value: item.value,
                                    selected: item.offset === 0,
                                })),
                                () => item.text,
                            ),
                        })
                    }
                </For>
            </Show>
        </Part>
    );
}

/** The period selector: AM over PM, in a 12-hour cycle. Holds a `Period` for each, unless
 *  given children. */
function PeriodSelector(props: TimePickerPartProps): JSX.Element {
    const { scope, api } = context.use("PeriodSelector");
    return scope.render("periodSelector", {
        element: "div",
        machine: () => api().getPeriodSelectorProps(),
        unstyled: () => props.unstyled,
        props: omit(props, "unstyled"),
    });
}

/** A period's props: which one, a part's, and its interaction source. Its text is the locale's
 *  name for the period unless given children. */
export interface TimePickerPeriodProps
    extends TimePickerPartProps, InteractionSourceProps {
    readonly period: "am" | "pm";
}

/** One period, a toggle button. */
function Period(props: TimePickerPeriodProps): JSX.Element {
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

/** The dial: a slider over the hour or the minute, with its track, handle, centre and labels,
 *  placed from the time. A clock doesn't mirror, so it draws the same under `rtl`. */
function Dial(props: TimePickerDialProps): JSX.Element {
    const { scope, api } = context.use("Dial");
    const slots = props.slots;
    return scope.render("dial", {
        element: "div",
        machine: () => api().getDialProps(),
        unstyled: () => props.unstyled,
        props: merge(omit(props, "unstyled", "slots"), {
            get children() {
                return (
                    <>
                        {scope.render("dialTrack", {
                            element: "span",
                            machine: () => api().getDialTrackProps(),
                            ...slotted(slots?.("dialTrack")),
                        })}
                        {scope.render("dialHandle", {
                            element: "span",
                            machine: () => api().getDialHandleProps(),
                            ...slotted(slots?.("dialHandle")),
                        })}
                        {scope.render("dialCenter", {
                            element: "span",
                            machine: () => api().getDialCenterProps(),
                            ...slotted(slots?.("dialCenter")),
                        })}
                        <For each={api().dialLabels}>
                            {(label) =>
                                scope.render("dialLabel", {
                                    element: "span",
                                    machine: () =>
                                        api().getDialLabelProps(label),
                                    ...slotted(
                                        slots?.("dialLabel", () => ({
                                            value: label.value,
                                            selected: label.selected,
                                        })),
                                        () => label.text,
                                    ),
                                })
                            }
                        </For>
                    </>
                );
            },
        }),
    });
}

/** The time the picker holds, for a part placed in it: the machine's API. */
export function useTimePicker(): Accessor<Api> {
    return context.use("useTimePicker").api;
}

/** The ready-made time picker's props: Root's, with `class`, `style`, `slotProps` and
 *  `unstyled` keyed by part (a dial label or scroll item also by copy, `TimePickerInstances`),
 *  and its content. */
export interface TimePickerProps
    extends
        Omit<TimePickerRootProps, keyof SlotKeyedProps<Anatomy> | "children">,
        SlotKeyedProps<Anatomy, never, TimePickerInstances>,
        TimeContentProps<JSX.Element> {}

/** The ready-made time picker: the headline, the selectors and the period selector (in a 12-hour
 *  cycle), the dial in dial mode, and the actions when given. */
function ReadyMade(props: TimePickerProps): JSX.Element {
    const slots = createSlotProps<Anatomy, never, TimePickerInstances>(props);
    const own = omit(
        props,
        "class",
        "style",
        "slotProps",
        ...TIME_CONTENT_PROPS,
    ) as TimePickerRootProps;
    return (
        <Root {...own} {...(slots("root") as object)}>
            <ReadyMadeParts {...props} slots={slots} />
        </Root>
    );
}

function ReadyMadeParts(
    props: TimePickerProps & {
        readonly slots: SlotPropsOf<PartName<Anatomy>, TimePickerInstances>;
    },
): JSX.Element {
    const { api, mode } = context.use("TimePicker");
    return (
        <>
            <Headline {...props.slots("headline")}>
                {isPresent(props.headline)
                    ? props.headline
                    : TIME_PICKER_HEADLINE}
            </Headline>
            <Body {...props.slots("body")}>
                <HourSelector
                    {...props.slots("hourSelector")}
                    slots={props.slots}
                />
                <Separator {...props.slots("separator")}>:</Separator>
                <MinuteSelector
                    {...props.slots("minuteSelector")}
                    slots={props.slots}
                />
                <Show when={api().hourCycle === 12}>
                    <ReadyMadePeriods slots={props.slots} />
                </Show>
            </Body>
            <Show when={mode() === "dial"}>
                <Dial {...props.slots("dial")} slots={props.slots} />
            </Show>
            <Show when={isPresent(props.actions)}>
                <Actions {...props.slots("actions")}>{props.actions}</Actions>
            </Show>
        </>
    );
}

/** The period selector with both periods, named in the locale. */
export function ReadyMadePeriods(props: {
    readonly slots: (part: PartName<Anatomy>) => PartProps;
}): JSX.Element {
    const { api } = context.use("PeriodSelector");
    return (
        <PeriodSelector {...props.slots("periodSelector")}>
            <Period period="am" {...props.slots("period")}>
                {api().periodNames.am}
            </Period>
            <Period period="pm" {...props.slots("period")}>
                {api().periodNames.pm}
            </Period>
        </PeriodSelector>
    );
}

/** Material's time picker. Use it ready-made, `<TimePicker defaultValue="09:30" actions={…} />`,
 *  or compose its parts under `TimePicker.Root`: `Headline`, `Body` (with `HourSelector`,
 *  `Separator`, `MinuteSelector` and `PeriodSelector` with a `Period` each), `Dial`, and
 *  `Actions`. */
export const TimePicker = Object.assign(ReadyMade, {
    Root,
    Headline,
    Body,
    HourSelector,
    Separator,
    MinuteSelector,
    PeriodSelector,
    Period,
    Dial,
    Actions,
});
