// RN-Web's WAAPI boundary only. Native engines never parse or serialize CSS curves.
import { easingPoints } from "../motion";
import type { Easing } from "../values";

export const browserEasing = (easing: Easing): string => {
    if (easing.kind === "linear")
        return `linear(${easing.points
            .map(([output, input]) =>
                input === undefined ? `${output}` : `${output} ${input}%`,
            )
            .join(", ")})`;
    const points = easingPoints(easing);
    return points === "linear"
        ? "linear"
        : `cubic-bezier(${points.join(", ")})`;
};
