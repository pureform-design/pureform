// CSS transport for portable sampled curves. Sampling and interpolation stay in core.
import { linearPointsProblem } from "@pureform/core";
import type { LinearEasingPoint } from "@pureform/core/ast";

/** `linear()` points as CSS writes them: `linear(0, 0.5 20%, 1)`. */
export const formatLinearEasing = (
    points: readonly LinearEasingPoint[],
): string =>
    `linear(${points
        .map(([output, input]) =>
            input === undefined ? `${output}` : `${output} ${input}%`,
        )
        .join(", ")})`;

/** The points of a CSS `linear(...)` string, including two-position flat stops. */
export const parseLinearEasing = (
    text: string,
): LinearEasingPoint[] | undefined => {
    const inner = /^linear\((.*)\)$/s.exec(text.trim())?.[1];
    if (inner === undefined) return undefined;
    const points: LinearEasingPoint[] = [];
    for (const stop of inner.split(",")) {
        const [output, ...inputs] = stop.trim().split(/\s+/);
        const value = Number(output);
        if (!Number.isFinite(value)) return undefined;
        if (inputs.length === 0) points.push([value]);
        for (const input of inputs) {
            const percent = /^(-?[\d.]+)%$/.exec(input)?.[1];
            if (percent === undefined) return undefined;
            points.push([value, Number(percent)]);
        }
    }
    return linearPointsProblem(points) ? undefined : points;
};
