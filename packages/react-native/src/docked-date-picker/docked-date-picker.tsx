// The docked date picker: a text field holding the date as the locale writes it, whose trailing
// calendar button opens a calendar under it, over the page through the portal host. Typed text
// becomes the date once the field loses focus or is submitted; choosing a day sets it and, by
// default, closes the calendar, as do a press outside, the back button, and Escape. The month and
// year buttons switch the calendar to a list of months or years.

import { dockedDatePickerAnatomy } from "@pureform/anatomy";
import type { PartName, TestIdOverride } from "@pureform/anatomy";
import {
    addMonths,
    chooseDate,
    dateFormatHint,
    dockedDatePickerSelection,
    formatDateText,
    formatIsoDate,
    isPresent,
    isCurrentCalendarPeriod,
    parseDateText,
    pickerLocale,
    pickerWeekStart,
} from "@pureform/binding-core";
import type {
    CalendarInstances,
    DockedDatePickerContentProps,
    DockedDatePickerRootOwnProps,
} from "@pureform/binding-core";
import { useEffect, useState } from "react";
import type { ReactNode } from "react";
import { Pressable, View } from "react-native";

import { CellList, DayGrid, startMonth, yearsOf } from "../calendar";
import { IconButton } from "../icon-button/icon-button";
import { IconSlot, iconSlot } from "../icon-style";
import { Anchored, useFieldPopup } from "../overlay";
import { useControllable } from "../parts";
import { Portal } from "../portal";
import { useEngine } from "../provider";
import { resolveText } from "../resolve-text";
import { nativeSlots, withUnselectable } from "../slot-props";
import type { NativeSlotProps } from "../slot-props";
import { useComponentSlots } from "../styles";
import { Field, partId } from "../text-input";

type Part = PartName<typeof dockedDatePickerAnatomy>;

const NONE: readonly string[] = [];
const POSITIONING = {} as const;
const POPUP_ORIGIN = { transformOrigin: "top left" } as const;

/** What each part renders as, for its keyed `style` and `slotProps`. */
export interface DockedDatePickerHosts {
    readonly root: "View";
    readonly container: "View";
    readonly leadingIcon: "View";
    readonly prefixText: "Text";
    readonly input: "TextInput";
    readonly suffixText: "Text";
    readonly label: "Text";
    readonly trailingIcon: "View";
    readonly trigger: "Pressable";
    readonly supportingText: "Text";
    readonly content: "View";
    readonly controls: "View";
    readonly actions: "View";
    readonly prev: "Pressable";
    readonly monthButton: "Pressable";
    readonly next: "Pressable";
    readonly yearButton: "Pressable";
    readonly weekdays: "View";
    readonly weekday: "Text";
    readonly grid: "View";
    readonly week: "View";
    readonly monthList: "ScrollView";
    readonly yearList: "ScrollView";
    readonly cell: "View";
}

/** The ready-made picker's props: Root's, its content, and `style` and `slotProps` keyed by part
 *  (and `cell` for each calendar cell; a cell, week or weekday also by copy,
 *  `CalendarInstances`). */
export interface DockedDatePickerProps
    extends
        Omit<
            DockedDatePickerRootOwnProps,
            "unstyled" | "leadingIcon" | "prefixText" | "suffixText" | "testId"
        >,
        DockedDatePickerContentProps<ReactNode>,
        NativeSlotProps<DockedDatePickerHosts, CalendarInstances> {
    /** Native overlays a separate Pressable over trailingIcon; it has its own trigger ID. */
    readonly testId?: TestIdOverride<
        PartName<typeof dockedDatePickerAnatomy> | "trigger"
    >;
}

type CalendarView = "day" | "month" | "year";

function Popup(
    props: DockedDatePickerProps & {
        readonly value: readonly string[];
        readonly onChoose: (day: string) => void;
    },
): ReactNode {
    const locale = pickerLocale(props);
    const [month, setMonth] = useState(() => startMonth(props.value));
    const [view, setView] = useState<CalendarView>("day");
    const {
        styles: s,
        selected,
        views: v,
    } = useComponentSlots<Part>(
        "dockedDatePicker",
        dockedDatePickerSelection({
            ...props,
            leadingIcon: isPresent(props.leadingIcon),
            prefixText: isPresent(props.prefixText),
            suffixText: isPresent(props.suffixText),
        }),
    );
    const id = (part: Part) =>
        partId(dockedDatePickerAnatomy, part, props.testId);
    const slot = nativeSlots(props);
    const year = Number(month.slice(0, 4));
    const monthNumber = Number(month.slice(5, 7));
    const slots = { styles: s, views: v, id, slot };
    const toggle = (
        part: "monthButton" | "yearButton",
        target: CalendarView,
        text: string,
    ) => {
        const Slot = v[part];
        return (
            <Slot.Pressable
                {...slot.props(part)}
                role="button"
                aria-expanded={view === target}
                disabled={props.disabled}
                onPress={slot.on(part, "onPress", () =>
                    setView(view === target ? "day" : target),
                )}
                style={slot.style(part, withUnselectable(s[part]))}
                testID={id(part)}
            >
                <IconSlot {...iconSlot(selected, part)} motion={s[part]}>
                    {`${text} ${view === target ? "▴" : "▾"}`}
                </IconSlot>
            </Slot.Pressable>
        );
    };
    const arrow = (
        part: "prev" | "next",
        label: string,
        months: number,
        withId: boolean,
    ) => {
        const Slot = v[part];
        return (
            <Slot.View
                style={s[part]}
                {...(withId ? { testID: id(part) } : {})}
            >
                <IconButton
                    aria-label={label}
                    icon={part === "prev" ? "‹" : "›"}
                    mirrorIcon
                    disabled={props.disabled || view !== "day"}
                    onPress={() => setMonth(addMonths(month, months))}
                />
            </Slot.View>
        );
    };
    return (
        <v.content.View
            {...slot.props("content")}
            role="dialog"
            style={slot.style("content", s.content)}
            testID={id("content")}
        >
            <v.controls.View
                {...slot.props("controls")}
                style={slot.style("controls", s.controls)}
                testID={id("controls")}
            >
                <View style={{ flexDirection: "row", alignItems: "center" }}>
                    {arrow("prev", "Previous month", -1, true)}
                    {toggle(
                        "monthButton",
                        "month",
                        formatIsoDate(month, locale, { month: "short" }),
                    )}
                    {arrow("next", "Next month", 1, true)}
                </View>
                <View style={{ flexDirection: "row", alignItems: "center" }}>
                    {arrow("prev", "Previous year", -12, false)}
                    {toggle("yearButton", "year", String(year))}
                    {arrow("next", "Next year", 12, false)}
                </View>
            </v.controls.View>
            {view === "day" ? (
                <DayGrid
                    slots={slots}
                    month={month}
                    selected={props.value}
                    mode={props.selectionMode ?? "single"}
                    locale={locale}
                    firstDay={pickerWeekStart(props)}
                    min={props.min}
                    max={props.max}
                    isDateUnavailable={props.isDateUnavailable}
                    disabled={props.disabled || props.readOnly}
                    onChoose={props.onChoose}
                />
            ) : view === "month" ? (
                <CellList
                    slots={slots}
                    part="monthList"
                    view="month"
                    cells={Array.from({ length: 12 }, (_, index) => ({
                        key: index + 1,
                        text: formatIsoDate(
                            `2026-${String(index + 1).padStart(2, "0")}-01`,
                            locale,
                            { month: "long" },
                        ),
                        selected: index + 1 === monthNumber,
                        current: isCurrentCalendarPeriod(
                            "month",
                            year,
                            index + 1,
                        ),
                        disabled: !!props.disabled,
                    }))}
                    onChoose={(chosen) => {
                        setMonth(
                            `${month.slice(0, 5)}${String(chosen).padStart(2, "0")}-01`,
                        );
                        setView("day");
                    }}
                />
            ) : (
                <CellList
                    slots={slots}
                    part="yearList"
                    view="year"
                    cells={yearsOf(year, props).map((each) => ({
                        key: each,
                        text: String(each),
                        selected: each === year,
                        current: isCurrentCalendarPeriod("year", each),
                        disabled: !!props.disabled,
                    }))}
                    onChoose={(chosen) => {
                        setMonth(
                            `${String(chosen).padStart(4, "0")}${month.slice(4)}`,
                        );
                        setView("day");
                    }}
                />
            )}
            {isPresent(props.actions) ? (
                <v.actions.View
                    {...slot.props("actions")}
                    style={slot.style("actions", s.actions)}
                    testID={id("actions")}
                >
                    {resolveText(props.actions, v.actions, s.actions)}
                </v.actions.View>
            ) : null}
        </v.content.View>
    );
}

/** Material's docked date picker:
 *  `<DockedDatePicker label="Date" locale="en-US" onValueChange={({ value }) => …} />`. */
export function DockedDatePicker(props: DockedDatePickerProps): ReactNode {
    const locale = pickerLocale(props);
    const mode = props.selectionMode ?? "single";
    const [value, setValue] = useControllable<"value", readonly string[]>(
        "DockedDatePicker",
        "value",
        props.value,
        props.defaultValue,
        props.onValueChange,
        NONE,
    );
    const [open, setOpen] = useControllable(
        "DockedDatePicker",
        "open",
        props.open,
        props.defaultOpen,
        props.onOpenChange,
        false,
    );
    const shownText = value[0] ? formatDateText(value[0], locale) : "";
    const [text, setText] = useState(shownText);
    // oxlint-disable-next-line react/set-state-in-effect -- the field's text follows the shown value when it changes from outside
    useEffect(() => setText(shownText), [shownText]);
    const engine = useEngine();
    const { presence, container, anchor, show, close, trigger } = useFieldPopup(
        open,
        setOpen,
    );
    const commitText = () => {
        if (text.trim() === "") {
            if (value.length > 0) setValue([]);
            return;
        }
        const iso = parseDateText(text, locale);
        if (iso && iso !== value[0]) setValue([iso]);
    };
    const disabled = props.disabled || props.readOnly;
    const slot = nativeSlots(props);
    return (
        <View>
            <Field
                {...(props.label === undefined ? {} : { label: props.label })}
                {...(props.leadingIcon === undefined
                    ? {}
                    : { leadingIcon: props.leadingIcon })}
                {...(props.prefixText === undefined
                    ? {}
                    : { prefixText: props.prefixText })}
                {...(props.suffixText === undefined
                    ? {}
                    : { suffixText: props.suffixText })}
                supportingText={
                    props.error ??
                    props.supportingText ??
                    dateFormatHint(locale)
                }
                invalid={props.error !== undefined || props.invalid}
                disabled={props.disabled}
                readOnly={props.readOnly}
                name="dockedDatePicker"
                style={props.style}
                slotProps={props.slotProps}
                selection={dockedDatePickerSelection({
                    ...props,
                    leadingIcon: isPresent(props.leadingIcon),
                    prefixText: isPresent(props.prefixText),
                    suffixText: isPresent(props.suffixText),
                })}
                testId={(part) =>
                    partId(dockedDatePickerAnatomy, part, props.testId)
                }
                trailingIcon="📅"
                inputProps={{
                    onBlur: commitText,
                    onSubmitEditing: commitText,
                    placeholder: dateFormatHint(locale),
                    inputMode: "numeric",
                }}
                value={text}
                onValueChange={(details) => setText(details.value)}
                expanded={open}
                container={container}
            />
            {/* The calendar button, over the field's trailing icon (which takes no presses). */}
            <Pressable
                {...slot.props("trigger")}
                role="button"
                aria-label={props.triggerLabel ?? "Open calendar"}
                aria-expanded={open}
                aria-haspopup="dialog"
                disabled={disabled}
                onLayout={trigger.onLayout}
                onPress={slot.on("trigger", "onPress", () =>
                    open ? close() : show(),
                )}
                style={slot.style("trigger", trigger.style)}
                testID={
                    typeof props.testId === "string"
                        ? `${props.testId}-trigger`
                        : (props.testId?.trigger ??
                          "pf-docked-date-picker-trigger")
                }
            />
            {presence.present && anchor ? (
                <Portal layer="menu">
                    <Anchored
                        anchor={anchor}
                        positioning={POSITIONING}
                        placement="bottom-start"
                        gutter={0}
                        onPressOutside={close}
                    >
                        {() => (
                            <engine.View
                                {...presence.props}
                                style={{
                                    pointerEvents: open ? "auto" : "none",
                                    ...POPUP_ORIGIN,
                                    ...presence.style,
                                }}
                            >
                                <Popup
                                    {...props}
                                    value={value}
                                    onChoose={(day) => {
                                        setValue(chooseDate(day, value, mode));
                                        if (
                                            (props.closeOnSelect ?? true) &&
                                            (mode === "single" ||
                                                value.length === 1)
                                        )
                                            close();
                                    }}
                                />
                            </engine.View>
                        )}
                    </Anchored>
                </Portal>
            ) : null}
        </View>
    );
}
