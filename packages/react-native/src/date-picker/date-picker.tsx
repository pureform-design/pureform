// The modal date picker: a calendar in a dialog. Given a trigger (or `open`, `defaultOpen` or
// `onOpenChange`), it opens in a `Modal` over a scrim as the dialog does; without, it's the
// surface alone. The calendar holds a draft: OK commits it and closes, Cancel drops it. The view
// trigger switches between the month's days and the years.

import { datePickerAnatomy, datePickerOverlayAnatomy } from "@pureform/anatomy";
import type { PartName } from "@pureform/anatomy";
import {
    isCurrentCalendarPeriod,
    addMonths,
    chooseDate,
    datePickerSelection,
    isPresent,
    partAsRoot,
    pickerLocale,
    pickerWeekStart,
    selectedDateText,
    calendarYears,
} from "@pureform/binding-core";
import type {
    CalendarInstances,
    DatePickerContentProps,
    DatePickerRootOwnProps,
} from "@pureform/binding-core";
import { useState } from "react";
import type { ReactNode } from "react";
import { StyleSheet } from "react-native";

import { Button } from "../button/button";
import type { ButtonProps } from "../button/button";
import { CellList, DayGrid, monthTitle, startMonth } from "../calendar";
import { IconButton } from "../icon-button/icon-button";
import { IconSlot, iconSlot } from "../icon-style";
import { ModalScrimLayer, ModalWindow, useModalOverlay } from "../modal";
import { useControllable, withEngine } from "../parts";
import {
    useNativeScrimSlots,
    useNativeSlotReader,
    overlayKeys,
    withUnselectable,
} from "../slot-props";
import type { InnerPropsOf, NativeSlotProps } from "../slot-props";
import { useComponentSlots } from "../styles";
import { partId } from "../text-input";
import { triggerButtonProps } from "../trigger-button";

type Part = PartName<typeof datePickerAnatomy>;
const KEYS = overlayKeys(datePickerOverlayAnatomy);

const NONE: readonly string[] = [];

/** What each part renders as, for its keyed `style` and `slotProps`: the web's parts. */
export interface DatePickerHosts {
    readonly trigger: "Pressable";
    readonly content: "View";
    readonly header: "View";
    readonly headline: "Text";
    readonly selectedDate: "Text";
    readonly modeToggle: "View";
    readonly divider: "View";
    readonly controls: "View";
    readonly viewTrigger: "Pressable";
    readonly prev: "View";
    readonly next: "View";
    readonly actions: "View";
    readonly weekdays: "View";
    readonly weekday: "Text";
    readonly grid: "View";
    readonly week: "View";
    readonly yearList: "ScrollView";
    readonly cell: "View";
    readonly backdrop: "View";
}

/** The ready-made picker's props: Root's, its content, and `style` and `slotProps` keyed by part
 *  (and `cell` for each calendar cell; a cell, week or weekday also by copy,
 *  `CalendarInstances`). */
export interface DatePickerProps
    extends
        Omit<DatePickerRootOwnProps, "unstyled" | "restoreFocus">,
        DatePickerContentProps<ReactNode>,
        NativeSlotProps<DatePickerHosts, CalendarInstances> {
    /** The cancel button's `style`, `slotProps`, `tokens` and `testId`. */
    readonly cancelButtonProps?: InnerPropsOf<ButtonProps> | undefined;
    /** The confirm button's `style`, `slotProps`, `tokens` and `testId`. */
    readonly confirmButtonProps?: InnerPropsOf<ButtonProps> | undefined;
}

interface SurfaceProps extends DatePickerProps {
    readonly committed: readonly string[];
    readonly onCommit: (value: readonly string[]) => void;
    readonly onDismiss: () => void;
}

function SurfaceImpl(props: SurfaceProps): ReactNode {
    const nativeSlots = useNativeSlotReader("datePicker");
    const locale = pickerLocale(props);
    const mode = props.selectionMode ?? "single";
    const [draft, setDraft] = useState(props.committed);
    const [month, setMonth] = useState(() => startMonth(props.committed));
    const [view, setView] = useState<"day" | "year">("day");
    const {
        styles: s,
        selected,
        views: v,
    } = useComponentSlots<Part>("datePicker", datePickerSelection(props));
    const id = (part: Part) =>
        partId(datePickerOverlayAnatomy, KEYS(part), props.testId);
    const slot = nativeSlots(props, KEYS);
    const year = Number(month.slice(0, 4));
    const title = monthTitle(month, locale);
    const shownDate = selectedDateText(draft, locale);
    return (
        <v.root.View
            {...slot.props("root")}
            role="dialog"
            aria-label={
                typeof props.headline === "string"
                    ? props.headline
                    : "Select date"
            }
            style={slot.style("root", s.root)}
            testID={id("root")}
        >
            <v.header.View
                {...slot.props("header")}
                style={slot.style("header", s.header)}
                testID={id("header")}
            >
                <v.headline.Text
                    {...slot.props("headline")}
                    style={slot.style("headline", s.headline)}
                    testID={id("headline")}
                >
                    {props.headline ?? "Select date"}
                </v.headline.Text>
                <v.selectedDate.Text
                    {...slot.props("selectedDate")}
                    style={slot.style("selectedDate", s.selectedDate)}
                    testID={id("selectedDate")}
                >
                    {shownDate ?? props.placeholder ?? "Selected date"}
                </v.selectedDate.Text>
                {props.onModeToggle ? (
                    <v.modeToggle.View
                        {...slot.props("modeToggle")}
                        style={slot.style("modeToggle", s.modeToggle)}
                        testID={id("modeToggle")}
                    >
                        <IconButton
                            aria-label={
                                props.modeToggleLabel ?? "Switch to text input"
                            }
                            icon="✎"
                            onPress={props.onModeToggle}
                        />
                    </v.modeToggle.View>
                ) : null}
            </v.header.View>
            <v.divider.View
                {...slot.props("divider")}
                style={slot.style("divider", s.divider)}
                testID={id("divider")}
            />
            <v.controls.View
                {...slot.props("controls")}
                style={slot.style("controls", s.controls)}
                testID={id("controls")}
            >
                <v.viewTrigger.Pressable
                    {...slot.props("viewTrigger")}
                    role="button"
                    aria-label={
                        view === "day"
                            ? `${title}, choose year`
                            : `${title}, choose day`
                    }
                    disabled={props.disabled}
                    onPress={slot.on("viewTrigger", "onPress", () =>
                        setView(view === "day" ? "year" : "day"),
                    )}
                    style={slot.style(
                        "viewTrigger",
                        withUnselectable(s.viewTrigger),
                    )}
                    testID={id("viewTrigger")}
                >
                    <IconSlot
                        {...iconSlot(selected, "viewTrigger")}
                        motion={s.viewTrigger}
                    >
                        {`${title} ${view === "day" ? "▾" : "▴"}`}
                    </IconSlot>
                </v.viewTrigger.Pressable>
                {view === "day" ? (
                    <>
                        <v.prev.View
                            {...slot.props("prev")}
                            style={slot.style("prev", s.prev)}
                            testID={id("prev")}
                        >
                            <IconButton
                                aria-label="Previous month"
                                icon="‹"
                                mirrorIcon
                                disabled={props.disabled}
                                onPress={() => setMonth(addMonths(month, -1))}
                            />
                        </v.prev.View>
                        <v.next.View
                            {...slot.props("next")}
                            style={slot.style("next", s.next)}
                            testID={id("next")}
                        >
                            <IconButton
                                aria-label="Next month"
                                icon="›"
                                mirrorIcon
                                disabled={props.disabled}
                                onPress={() => setMonth(addMonths(month, 1))}
                            />
                        </v.next.View>
                    </>
                ) : null}
            </v.controls.View>
            {view === "day" ? (
                <DayGrid
                    slots={{ styles: s, views: v, id, slot }}
                    month={month}
                    selected={draft}
                    mode={mode}
                    locale={locale}
                    firstDay={pickerWeekStart(props)}
                    min={props.min}
                    max={props.max}
                    isDateUnavailable={props.isDateUnavailable}
                    disabled={props.disabled || props.readOnly}
                    onChoose={(day) => setDraft(chooseDate(day, draft, mode))}
                />
            ) : (
                <CellList
                    slots={{ styles: s, views: v, id, slot }}
                    part="yearList"
                    view="year"
                    cells={calendarYears(year, props).map((each) => ({
                        key: each,
                        text: String(each),
                        selected: each === year,
                        current: isCurrentCalendarPeriod("year", each),
                        disabled: !!props.disabled,
                    }))}
                    onChoose={(each) => {
                        setMonth(
                            `${String(each).padStart(4, "0")}${month.slice(4)}`,
                        );
                        setView("day");
                    }}
                />
            )}
            <v.actions.View
                {...slot.props("actions")}
                style={slot.style("actions", s.actions)}
                testID={id("actions")}
            >
                <Button
                    {...props.cancelButtonProps}
                    variant="text"
                    label={props.cancelLabel ?? "Cancel"}
                    onPress={() => {
                        setDraft(props.committed);
                        props.onDismiss();
                    }}
                />
                <Button
                    {...props.confirmButtonProps}
                    variant="text"
                    label={props.confirmLabel ?? "OK"}
                    disabled={props.disabled || props.readOnly}
                    onPress={() => props.onCommit(draft)}
                />
            </v.actions.View>
        </v.root.View>
    );
}

const Surface = withEngine(SurfaceImpl, "DatePickerSurface");

function useValue(props: DatePickerProps) {
    return useControllable<"value", readonly string[]>(
        "DatePicker",
        "value",
        props.value,
        props.defaultValue,
        props.onValueChange,
        NONE,
    );
}

function StandaloneDatePicker(props: DatePickerProps): ReactNode {
    const [value, setValue] = useValue(props);
    return (
        <Surface
            {...props}
            committed={value}
            onCommit={setValue}
            onDismiss={() => {}}
        />
    );
}

function ModalDatePicker(props: DatePickerProps): ReactNode {
    const nativeSlots = useNativeSlotReader("datePicker");
    const scrimSlots = useNativeScrimSlots("datePicker");
    const [value, setValue] = useValue(props);
    const { open, presence, close, show } = useModalOverlay(
        "DatePicker",
        props,
    );
    return (
        <>
            {isPresent(props.trigger) ? (
                <Button
                    {...triggerButtonProps(nativeSlots(props, KEYS), undefined)}
                    label={props.trigger}
                    disabled={props.disabled}
                    onPress={show}
                    aria-haspopup="dialog"
                    aria-expanded={open}
                    testId={{
                        root: partId(
                            datePickerOverlayAnatomy,
                            "trigger",
                            props.testId,
                        ),
                    }}
                />
            ) : null}
            <ModalWindow
                visible={presence.present}
                label={
                    typeof props.headline === "string"
                        ? props.headline
                        : "Select date"
                }
            >
                <ModalScrimLayer
                    scrimTestId={partAsRoot<string>(props.testId, "backdrop")}
                    scrimSlot={scrimSlots(props)}
                    open={open}
                    presence={presence}
                    onPressOutside={
                        (props.closeOnInteractOutside ?? true)
                            ? close
                            : undefined
                    }
                    positionerStyle={styles.positioner}
                >
                    <Surface
                        {...props}
                        committed={value}
                        onCommit={(next) => {
                            setValue(next);
                            close();
                        }}
                        onDismiss={close}
                    />
                </ModalScrimLayer>
            </ModalWindow>
        </>
    );
}

// Centers the picker, as the dialog's positioner does.
const styles = StyleSheet.create({
    positioner: {
        flex: 1,
        alignItems: "center",
        justifyContent: "center",
        padding: 24,
    },
});

/** Material's modal date picker:
 *  `<DatePicker trigger="Pick a date" locale="en-GB" onValueChange={({ value }) => …} />`.
 *  Without a trigger, `open`, `defaultOpen` or `onOpenChange`, its surface alone. */
export function DatePicker(props: DatePickerProps): ReactNode {
    return props.trigger === undefined &&
        props.open === undefined &&
        props.onOpenChange === undefined &&
        props.defaultOpen === undefined ? (
        <StandaloneDatePicker {...props} />
    ) : (
        <ModalDatePicker {...props} />
    );
}
