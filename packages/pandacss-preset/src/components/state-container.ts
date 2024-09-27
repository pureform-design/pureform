import { defineSlotRecipe, type SystemStyleObject } from "@pandacss/dev";
import type { BaseColorGroup } from "@repo/ui-utils";
import type { BaseArgs, ColorArgs } from "./types";
import { getCssVar, normalizePrefix, prefix } from "../helpers";

export type DefineStateContainerArgs<
    TColorGroup extends string = BaseColorGroup,
> = BaseArgs & ColorArgs<TColorGroup>;

export function defineStateContainer<
    TColorGroup extends string = BaseColorGroup,
>(args: DefineStateContainerArgs<TColorGroup>) {
    const np = normalizePrefix(args.prefix);

    const stateLayerVar = getCssVar(np, "state-opacity");
    const hoveredVar = getCssVar(np, "state-hovered-opacity");
    const focusedVar = getCssVar(np, "state-focused-opacity");
    const pressedVar = getCssVar(np, "state-pressed-opacity");
    const draggedVar = getCssVar(np, "state-dragged-opacity");
    const className = "state-container";
    const defaultJsx = "StateContainer";
    const jsx = [prefix("pascal", np, defaultJsx, "component"), defaultJsx];

    return defineSlotRecipe({
        className,
        jsx,
        slots: ["root", "stateLayer"],
        base: {
            root: {
                position: "relative",
                ...{
                    [stateLayerVar]: `calc(var(${hoveredVar}, 0) + var(${focusedVar}, 0) + var(${pressedVar}, 0) + var(${draggedVar}, 0))`,
                    [hoveredVar]: 0,
                    [focusedVar]: 0,
                    [pressedVar]: 0,
                    [draggedVar]: 0,
                },
            },
            stateLayer: {
                backgroundColor: "currentcolor",
                position: "absolute",
                transitionProperty: "opacity",
                transitionDuration: "100ms",
                transitionTimingFunction: "ease-in-out",
                top: 0,
                left: 0,
                w: "full",
                h: "full",
                opacity: `var(${stateLayerVar})`,
                pointerEvents: "none",
            },
        },
        variants: {
            hovered: {
                true: {
                    root: {
                        [hoveredVar]: 0.08,
                    } as SystemStyleObject,
                },
            },
            focused: {
                true: {
                    root: {
                        [focusedVar]: 0.1,
                    } as SystemStyleObject,
                },
            },
            pressed: {
                true: {
                    root: {
                        [focusedVar]: 0.1,
                    } as SystemStyleObject,
                },
            },
            dragged: {
                true: {
                    root: {
                        [focusedVar]: 0.16,
                    } as SystemStyleObject,
                },
            },
            disabled: {
                true: {
                    root: {
                        [stateLayerVar]: 0,
                    } as SystemStyleObject,
                },
            },
        },
    });
}
