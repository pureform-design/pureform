// The time picker: Root on pureform's time-picker machine, around the Headline, the Body (the
// hour and minute selectors, the Separator, and the PeriodSelector with its two Periods), the
// Dial (its track, handle, centre and labels, placed from the time), and the Actions; and the
// ready-made TimePicker over them. In `scroll` mode the selectors are spin buttons showing the
// values around the current one, and there's no dial. Put it in a Dialog for Material's modal
// time picker.

import { timePickerAnatomy } from "@pureform/anatomy";
import {
    isPresent,
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
import type { ElementType, ReactNode } from "react";

import { useMachineButton } from "../interaction";
import { createPartContext } from "../part-context";
import { machinePart, useComponent, useSlotProps } from "../parts";
import type { ComponentScope, SlotKeyedProps, SlotPropsOf } from "../parts";
import { omitProps } from "../props";
import type { PartProps } from "../props";
import { useTimeMachine } from "../time";
import type { TimeApi } from "../time";

type Anatomy = typeof timePickerAnatomy;

/** What Root shares with its parts. */
interface TimePickerContextValue {
    readonly scope: ComponentScope<Anatomy>;
    readonly api: TimeApi;
    readonly mode: "dial" | "scroll";
}

const context = createPartContext<TimePickerContextValue>("TimePicker");

/** Root's props: the variants and tokens, the time and its clock, `testId` and `unstyled` for
 *  every part, `as`, and the element's own props. */
export interface TimePickerRootProps
    extends
        Omit<PartProps, keyof TimePickerRootOwnProps>,
        TimePickerRootOwnProps {
    /** Another element or component to render instead of `<div>`. */
    readonly as?: ElementType | undefined;
}

/** A part's props: the element's own, and the part's `unstyled`. */
export interface TimePickerPartProps extends PartProps {
    readonly unstyled?: boolean | undefined;
}

/** The time picker: a group named by its headline. */
function Root(props: TimePickerRootProps): ReactNode {
    const api = useTimeMachine("TimePicker", props);
    const scope = useComponent(timePickerAnatomy, {
        selection: timePickerSelection(props),
        testId: props.testId,
        unstyled: props.unstyled,
        indication: props.indication,
    });
    const { as, ...rest } = omitProps(props, TIME_PICKER_ROOT_PROPS);
    return (
        <context.Provider
            value={{
                scope,
                api,
                mode: props.mode === "scroll" ? "scroll" : "dial",
            }}
        >
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

const div = machinePart<Anatomy, TimePickerContextValue>(context.use, "div");
const span = machinePart<Anatomy, TimePickerContextValue>(context.use, "span");

/** The headline: "Select time". */
const Headline = div("headline", "Headline", ({ api }) =>
    api.getHeadlineProps(),
);
/** The row of the hour and minute selectors and the period selector. */
const Body = div("body", "Body", ({ api }) => api.getBodyProps());
/** The colon between the hour and the minute. */
const Separator = span("separator", "Separator", ({ api }) =>
    api.getSeparatorProps(),
);
/** Where the app's buttons go, such as Cancel and OK. */
const Actions = div("actions", "Actions", ({ api }) => api.getActionsProps());

/** A ready-made time picker's slot props for the parts inside the selectors and the dial, the
 *  repeated ones by copy. */
export type TimePickerSlots = SlotPropsOf<
    "scrollItem" | "dialTrack" | "dialHandle" | "dialCenter" | "dialLabel",
    TimePickerInstances
>;

/** A selector's props: a part's, the interaction source its presses are emitted to, and the
 *  ready-made's slot props for its scroll items. */
export interface TimePickerSelectorProps
    extends TimePickerPartProps, InteractionSourceProps {
    readonly slots?: TimePickerSlots | undefined;
}

/** The dial's props: a part's, and the ready-made's slot props for its track, handle, centre
 *  and labels. */
export interface TimePickerDialProps extends TimePickerPartProps {
    readonly slots?: TimePickerSlots | undefined;
}

// The hour or minute selector: a toggle button choosing what the dial sets, or in scroll mode a
// spin button with the values around the current one.
const selector = (of: TimePickerView, name: string) =>
    function Selector({
        children,
        slots,
        ...props
    }: TimePickerSelectorProps): ReactNode {
        const { scope, api, mode } = context.use(name);
        const scroll = mode === "scroll";
        const button = useMachineButton(
            props,
            [
                (scroll
                    ? api.getScrollFieldProps(of)
                    : api.getSelectorProps(of)) as Readonly<
                    Record<string, unknown>
                >,
            ],
            api.disabled,
        );
        const items = api.scrollItems(of);
        const each = slots?.each("scrollItem") ?? false;
        return scope.render(of === "hour" ? "hourSelector" : "minuteSelector", {
            ...button,
            element: scroll ? "div" : "button",
            props: {
                ...button.props,
                children:
                    children ??
                    (scroll
                        ? items.map((item) => (
                              <ScrollItem
                                  key={item.offset}
                                  of={of}
                                  item={item}
                                  {...slots?.(
                                      "scrollItem",
                                      each
                                          ? {
                                                view: of,
                                                value: item.value,
                                                selected: item.offset === 0,
                                            }
                                          : undefined,
                                  )}
                              />
                          ))
                        : items[1]!.text),
            },
        });
    };

function ScrollItem({
    of,
    item,
    unstyled,
    ...props
}: TimePickerPartProps & {
    readonly of: TimePickerView;
    readonly item: ReturnType<TimeApi["scrollItems"]>[number];
}): ReactNode {
    const { scope, api } = context.use("ScrollItem");
    return scope.render("scrollItem", {
        element: "span",
        machine: api.getScrollItemProps(of, item),
        unstyled,
        props: { ...props, children: item.text },
    });
}

/** The hour selector. Its text is the hour; in scroll mode, the hours around it. */
const HourSelector = selector("hour", "HourSelector");
/** The minute selector. */
const MinuteSelector = selector("minute", "MinuteSelector");

/** The period selector: AM over PM, in a 12-hour cycle. */
const PeriodSelector = div("periodSelector", "PeriodSelector", ({ api }) =>
    api.getPeriodSelectorProps(),
);

/** A period's props: which one, a part's, and its interaction source. */
export interface TimePickerPeriodProps
    extends TimePickerPartProps, InteractionSourceProps {
    readonly period: "am" | "pm";
}

/** One period, a toggle button. */
function Period({ period, ...props }: TimePickerPeriodProps): ReactNode {
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

/** The dial: a slider over the hour or the minute, with its track, handle, centre and labels,
 *  placed from the time. A clock doesn't mirror, so it draws the same under `rtl`. */
function Dial({ unstyled, slots, ...props }: TimePickerDialProps): ReactNode {
    const { scope, api } = context.use("Dial");
    const each = slots?.each("dialLabel") ?? false;
    const inner = (part: "dialTrack" | "dialHandle" | "dialCenter") => {
        const { unstyled: own, ...rest }: TimePickerPartProps =
            slots?.(part) ?? {};
        return { unstyled: own, props: rest };
    };
    return scope.render("dial", {
        element: "div",
        machine: api.getDialProps(),
        unstyled,
        props: {
            ...props,
            children: (
                <>
                    {scope.render("dialTrack", {
                        element: "span",
                        machine: api.getDialTrackProps(),
                        ...inner("dialTrack"),
                    })}
                    {scope.render("dialHandle", {
                        element: "span",
                        machine: api.getDialHandleProps(),
                        ...inner("dialHandle"),
                    })}
                    {scope.render("dialCenter", {
                        element: "span",
                        machine: api.getDialCenterProps(),
                        ...inner("dialCenter"),
                    })}
                    {api.dialLabels.map((label) => (
                        <DialLabel
                            key={label.text}
                            label={label}
                            {...slots?.(
                                "dialLabel",
                                each
                                    ? {
                                          value: label.value,
                                          selected: label.selected,
                                      }
                                    : undefined,
                            )}
                        />
                    ))}
                </>
            ),
        },
    });
}

function DialLabel({
    label,
    unstyled,
    ...props
}: TimePickerPartProps & {
    readonly label: TimeApi["dialLabels"][number];
}): ReactNode {
    const { scope, api } = context.use("DialLabel");
    return scope.render("dialLabel", {
        element: "span",
        machine: api.getDialLabelProps(label),
        unstyled,
        props: { ...props, children: label.text },
    });
}

/** The time the picker holds, for a part placed in it: the machine's API. */
export function useTimePicker(): TimeApi {
    return context.use("useTimePicker").api;
}

/** The ready-made time picker's props: Root's, with `className`, `style`, `slotProps` and
 *  `unstyled` keyed by part (a dial label or scroll item also by copy, `TimePickerInstances`),
 *  and its content. */
export interface TimePickerProps
    extends
        Omit<TimePickerRootProps, keyof SlotKeyedProps<Anatomy> | "children">,
        SlotKeyedProps<Anatomy, never, TimePickerInstances>,
        TimeContentProps<ReactNode> {}

/** The ready-made time picker: the headline, the selectors and the period selector (in a 12-hour
 *  cycle), the dial in dial mode, and the actions when given. */
function ReadyMade(props: TimePickerProps): ReactNode {
    const {
        className: _className,
        style: _style,
        slotProps: _slotProps,
        headline,
        actions,
        ...rootProps
    } = props;
    const slot = useSlotProps<Anatomy, never, TimePickerInstances>(props);
    const slots: TimePickerSlots = slot;
    return (
        <Root {...rootProps} {...(slot("root") as object)}>
            <Headline {...slot("headline")}>
                {isPresent(headline) ? headline : TIME_PICKER_HEADLINE}
            </Headline>
            <Body {...slot("body")}>
                <HourSelector {...slot("hourSelector")} slots={slots} />
                <Separator {...slot("separator")}>:</Separator>
                <MinuteSelector {...slot("minuteSelector")} slots={slots} />
                <ReadyMadePeriods slot={slot} />
            </Body>
            {(props.mode ?? "dial") === "dial" ? (
                <Dial {...slot("dial")} slots={slots} />
            ) : null}
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
