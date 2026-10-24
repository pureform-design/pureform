// What the time picker and the time input share on React Native: the controllable time, and a
// toggle button part (a selector, a period) drawn on the component's own slot with its own
// selected and interaction states, so each button shows its own.

import type {
    ComponentAnatomy,
    IndicationAnatomy,
    PartName,
    TestIdOverride,
} from "@pureform/anatomy";
import type { TimeBehaviorProps } from "@pureform/binding-core";
import type { Indication } from "@pureform/binding-core/indication";
import {
    localeHourCycle,
    localePeriods,
    MIDNIGHT,
    formatTime,
    parseTime,
} from "@pureform/machines/time-picker";
import type { HourCycle, Time } from "@pureform/machines/time-picker";
import { type ReactNode, useState } from "react";

import { useSurfaceIndication } from "./indication";
import { testIdOf, unselectable, withEngine } from "./parts";
import { useComponentSlots } from "./styles";

/** The time from `value` when given, else the component's own from `defaultValue`. */
export function useTime(
    props: TimeBehaviorProps,
): readonly [Time, (time: Time) => void] {
    const [own, setOwn] = useState(
        () => parseTime(props.defaultValue) ?? MIDNIGHT,
    );
    const time =
        props.value === undefined ? own : (parseTime(props.value) ?? MIDNIGHT);
    const interactive = !props.disabled && !props.readOnly;
    const set = (next: Time) => {
        if (!interactive) return;
        if (next.hour === time.hour && next.minute === time.minute) return;
        if (props.value === undefined) setOwn(next);
        props.onValueChange?.({ value: formatTime(next) });
    };
    return [time, set];
}

/** The clock and the period names, from the props or the locale. */
export const timeLocale = (
    props: TimeBehaviorProps,
): {
    readonly cycle: HourCycle;
    readonly periods: Record<"am" | "pm", string>;
} => ({
    cycle: props.hourCycle ?? localeHourCycle(props.locale),
    periods: localePeriods(props.locale),
});

/** What `TimeButton` takes. */
export interface TimeButtonProps<A extends ComponentAnatomy> {
    readonly anatomy: A;
    readonly component: string;
    readonly part: PartName<A>;
    readonly selection: Record<string, unknown>;
    readonly indication: Indication | undefined;
    readonly testId: TestIdOverride<PartName<A>> | undefined;
    readonly label?: string | undefined;
    readonly selected: boolean;
    readonly disabled?: boolean | undefined;
    readonly onPress: () => void;
    /** A key pressed on it, on the web: `true` when it took the key. */
    readonly onKey?: ((key: string) => boolean) | undefined;
    /** Its text's slot, drawn inside it. */
    readonly children: ReactNode;
}

function TimeButtonImpl<A extends ComponentAnatomy>(
    props: TimeButtonProps<A>,
): ReactNode {
    const indication = useSurfaceIndication(
        props.anatomy.indication!.find(
            (entry: IndicationAnatomy) => entry.trigger === props.part,
        )!,
        { indication: props.indication, disabled: props.disabled },
    );
    const {
        styles: s,
        selected,
        views: v,
    } = useComponentSlots<PartName<A>>(
        props.component,
        indication.select(props.selection),
        indication.states({
            selected: props.selected,
            disabled: props.disabled ?? false,
        }),
    );
    const Surface = v[props.part];
    const style = s[props.part] as Record<string, unknown>;
    return (
        <Surface.Pressable
            {...indication.handlers}
            role="button"
            aria-pressed={props.selected}
            aria-disabled={props.disabled}
            {...(props.label === undefined
                ? {}
                : { "aria-label": props.label })}
            onPress={props.disabled ? undefined : props.onPress}
            {...(props.onKey
                ? ({
                      onKeyDown: (event: {
                          nativeEvent: { key: string };
                          preventDefault?(): void;
                      }) => {
                          if (props.onKey!(event.nativeEvent.key))
                              event.preventDefault?.();
                      },
                  } as object)
                : {})}
            style={{ ...style, ...unselectable }}
            testID={testIdOf(props.anatomy, props.part, props.testId)}
        >
            <Surface.Text
                selectable={false}
                style={{
                    color: style["color"],
                    fontFamily: style["fontFamily"],
                    fontSize: style["fontSize"],
                    fontWeight: style["fontWeight"],
                    lineHeight: style["lineHeight"],
                    letterSpacing: style["letterSpacing"],
                }}
            >
                {props.children}
            </Surface.Text>
            {indication.layer(selected)}
        </Surface.Pressable>
    );
}

/** A toggle button part with its indication: pressed while `selected`. */
export const TimeButton = withEngine(TimeButtonImpl, "TimeButton") as <
    A extends ComponentAnatomy,
>(
    props: TimeButtonProps<A>,
) => ReactNode;
