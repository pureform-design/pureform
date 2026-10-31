// Bake the preset's token-driven geometry into native interpolation nodes. One linear clock
// owns spin, arcs and caps; each keyframe interval applies the preset's curve independently.
// Geometry changes rebuild the nodes, not the clock, and nothing subscribes to JS frames.

import { withDefaults } from "@pureform/binding-core";
import { curve, useMotionTimeline } from "@pureform/rn-adapter/animated";
import type { Animation, Selected, Style } from "@pureform/rn-adapter/factory";
import { useReducedMotion } from "@pureform/rn-adapter/react";
import { useMemo } from "react";

import type { MotionEngine, MotionStyles } from "./engine";
import { useDirection, usePureform } from "./provider";
import { useStyleFactory } from "./styles";

const VALUE = "--components.circularProgress.value";
const LINEAR = { type: "easing", kind: "keyword", name: "linear" } as const;
const STEPS = 120;

const number = (value: unknown): number =>
    typeof value === "number" ? value : Number.parseFloat(String(value));

/** A token animation's value and spin at `offset`; easing restarts at every keyframe. */
const frameAt = (animation: Animation, offset: number) => {
    const frames = animation.frames;
    const end = Math.max(
        1,
        frames.findIndex((frame) => frame.offset >= offset),
    );
    const from = frames[end - 1]!;
    const to = frames[end]!;
    const t = curve(animation.easing)(
        (offset - from.offset) / (to.offset - from.offset),
    );
    const mix = (a: unknown, b: unknown) =>
        number(a) + (number(b) - number(a)) * t;
    const rotation = (style: Record<string, unknown>) =>
        (style.transform as { rotate?: unknown }[] | undefined)?.find(
            (step) => step.rotate !== undefined,
        )?.rotate ?? 0;
    return {
        value: mix(from.style[VALUE], to.style[VALUE]),
        rotate: mix(rotation(from.style), rotation(to.style)),
    };
};

export function useCircularProgressMotion(
    engine: MotionEngine,
    selection: Record<string, unknown>,
    selected: Selected,
): { View: MotionEngine["View"]; styles: MotionStyles } {
    const provider = usePureform();
    const factory = useStyleFactory("circularProgress");
    const reduced = useReducedMotion();
    const rtl = useDirection() === "rtl";
    const animation = selected.animations.root;
    const enabled = !!animation && !reduced;
    // A wavy drawing is a path, not a border arc. Until a drawing can consume the shared
    // clock, keep its documented spinning half-circle fallback rather than letting gaps drift.
    const wavy = !!selected.drawings.endHalf?.shape;
    const useTimeline = engine.useTimeline ?? useMotionTimeline;
    const timeline = useTimeline({
        cycle: { duration: animation?.duration ?? 0, easing: LINEAR, enabled },
    });
    // Native graph nodes are kept until geometry or preset timing changes.
    const styles = useMemo(() => {
        if (!enabled || !animation) return {};
        const base = withDefaults(
            provider.defaults.circularProgress,
            selection as never,
        ) as Record<string, unknown>;
        const tokens = base.tokens as Record<string, unknown> | undefined;
        const samples: { offset: number; styles: Record<string, Style> }[] =
            Array.from({ length: STEPS + 1 }, (_, i) => {
                const offset = i / STEPS;
                const frame = frameAt(animation, offset);
                const slots = wavy
                    ? undefined
                    : factory({
                          ...base,
                          indeterminate: false,
                          rtl,
                          reducedMotion: true,
                          tokens: { ...tokens, value: frame.value },
                      } as never);
                const geometry = slots
                    ? Object.fromEntries(
                          Object.entries(slots).map(([part, slot]) => [
                              part,
                              slot.style,
                          ]),
                      )
                    : selected.styles;
                return {
                    offset,
                    styles: {
                        ...geometry,
                        root: {
                            ...geometry.root,
                            transform: [{ rotate: `${frame.rotate}deg` }],
                        },
                    },
                };
            });
        const value = (
            read: (styles: Record<string, Style>) => number,
            unit?: "deg",
        ) =>
            timeline.value({
                ...(unit ? { unit } : {}),
                terms: [
                    {
                        clock: "cycle",
                        stops: samples.map((sample) => ({
                            offset: sample.offset,
                            value: read(sample.styles),
                        })),
                    },
                ],
            });
        const result: MotionStyles = {};
        for (const [part, style] of Object.entries(samples[0]!.styles)) {
            const motion: Record<string, unknown> = {};
            if (typeof style.opacity === "number")
                motion.opacity = value((styles) =>
                    number(styles[part]!.opacity),
                );
            if (Array.isArray(style.transform))
                motion.transform = style.transform.map((step, index) =>
                    Object.fromEntries(
                        Object.entries(step).map(([key]) => [
                            key,
                            value(
                                (styles) =>
                                    number(
                                        (
                                            styles[part]!.transform as Record<
                                                string,
                                                unknown
                                            >[]
                                        )[index]![key],
                                    ),
                                key.startsWith("rotate") ? "deg" : undefined,
                            ),
                        ]),
                    ),
                );
            if (Object.keys(motion).length) result[part] = motion;
        }
        return result;
    }, [
        animation,
        enabled,
        factory,
        provider.defaults.circularProgress,
        selection,
        rtl,
        selected.styles,
        timeline,
        wavy,
    ]);
    return { View: timeline.View, styles };
}
