// A grouped bar chart, which pureform has no component for: one group per label, one bar per
// series, scaled to the largest value. Bars grow with the theme's motion tokens (and don't under
// reduced motion), and take their colors, corners, gaps, and type from the theme.

import { css, cx } from "$css";
import { Separator } from "@pureform/solid/separator";
import { Text } from "@pureform/solid/text";
import type { JSX } from "@solidjs/web";
import { For } from "solid-js";

/** The color groups a series can take. */
type Tone = "primary" | "tertiary";

export interface BarSeries {
    readonly name: string;
    readonly tone: Tone;
}

export interface BarGroup {
    readonly label: string;
    /** One value per series, in the series' order. */
    readonly values: readonly number[];
}

const figure = css({ display: "grid", gap: "3", margin: "0" });

const plot = css({
    display: "grid",
    gridAutoFlow: "column",
    gridAutoColumns: "1fr",
    gap: "3",
    alignItems: "end",
    height: "calc(token(spacing.16) * 3)",
});

const group = css({
    display: "flex",
    alignItems: "flex-end",
    justifyContent: "center",
    gap: "1",
    height: "100%",
});

const bar = css({
    flex: "1",
    maxWidth: "token(spacing.6)",
    minHeight: "token(spacing.1)",
    borderStartStartRadius: "extraSmall",
    borderStartEndRadius: "extraSmall",
    transitionProperty: "height",
    transitionDuration: "medium4",
    transitionTimingFunction: "emphasizedDecelerate",
    _motionReduce: { transition: "none" },
});

const tones: Record<Tone, string> = {
    primary: css({ backgroundColor: "primary" }),
    tertiary: css({ backgroundColor: "tertiary" }),
};

const labels = css({
    display: "grid",
    gridAutoFlow: "column",
    gridAutoColumns: "1fr",
    gap: "3",
    textAlign: "center",
    color: "onSurfaceVariant",
});

const legend = css({
    display: "flex",
    flexWrap: "wrap",
    gap: "4",
    color: "onSurfaceVariant",
});

const key = css({ display: "inline-flex", alignItems: "center", gap: "2" });

const swatch = css({
    width: "token(spacing.3)",
    height: "token(spacing.3)",
    borderRadius: "extraSmall",
});

export function BarChart(props: {
    /** Names the chart for assistive technology, with `description` saying what it shows. */
    label: string;
    description: string;
    series: readonly BarSeries[];
    groups: readonly BarGroup[];
}): JSX.Element {
    const max = () =>
        Math.max(1, ...props.groups.flatMap((g) => g.values.map(Math.abs)));
    return (
        <figure
            class={figure}
            // oxlint-disable-next-line jsx-a11y/prefer-tag-over-role -- the figure is one image for assistive technology, though it holds the chart's own elements, so it cannot be an img
            role="img"
            aria-label={`${props.label}. ${props.description}`}
        >
            <div>
                <div class={plot} aria-hidden="true">
                    <For each={props.groups}>
                        {(g) => (
                            <div class={group}>
                                <For each={props.series}>
                                    {(series, index) => (
                                        <div
                                            class={cx(bar, tones[series.tone])}
                                            style={{
                                                height: `${
                                                    (Math.abs(
                                                        g.values[index()] ?? 0,
                                                    ) /
                                                        max()) *
                                                    100
                                                }%`,
                                            }}
                                        />
                                    )}
                                </For>
                            </div>
                        )}
                    </For>
                </div>
                <Separator />
            </div>
            <div class={labels}>
                <For each={props.groups}>
                    {(g) => <Text textStyle="labelSmall">{g.label}</Text>}
                </For>
            </div>
            <figcaption class={legend}>
                <For each={props.series}>
                    {(series) => (
                        <span class={key}>
                            <span class={cx(swatch, tones[series.tone])} />
                            <Text textStyle="labelMedium">{series.name}</Text>
                        </span>
                    )}
                </For>
            </figcaption>
        </figure>
    );
}
