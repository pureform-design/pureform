// Commands the browser tests run in Node: the preset's React Native styles, which the lowering
// computes in Node, and each component's instance token keys, as the generated registry holds
// them. The themed config adds named themes that each change one domain, as an app nests them.
// And the preset's overlay motions, which the web runs as raw CSS.

import { materialColor, materialLayout } from "@pureform/material";
import {
    DIALOG_MOTION,
    OVERLAY_KEYFRAMES,
    POPUP_MOTION,
    pureform,
    SCRIM_MOTION,
} from "@pureform/preset";
import { precompute } from "@pureform/rn-adapter";
import type { PrecomputedStyles } from "@pureform/rn-adapter";
import { instanceTokenKeys } from "@pureform/rn-adapter/codegen";
import { roundedShape } from "@pureform/theme";
import type { BrowserCommand } from "vitest/node";

const DENSITIES = { default: 0, compact: -1 };

const CONFIGS = {
    default: pureform(),
    themed: pureform({
        layout: materialLayout({ densities: DENSITIES }),
        themes: {
            teal: { color: materialColor({ seed: "#006A60" }) },
            sharp: { shape: roundedShape({ base: 0 }) },
            compact: {
                layout: materialLayout({
                    densities: DENSITIES,
                    density: "compact",
                }),
            },
        },
    }),
};

/** The configs the tests' registries are generated from. */
export type TestConfig = keyof typeof CONFIGS;

const nativeStyles: BrowserCommand<
    [components: string[], config?: TestConfig]
> = (_context, components, config = "default") =>
    precompute(CONFIGS[config], { components, fontStack: "all" });

const tokenKeys: BrowserCommand<[components: string[], config?: TestConfig]> = (
    _context,
    components,
    config = "default",
) =>
    Object.fromEntries(
        components.map((name) => [
            name,
            instanceTokenKeys(
                name,
                (
                    CONFIGS[config].components as unknown as Record<
                        string,
                        never
                    >
                )[name]!,
            ),
        ]),
    );

// Emulated on the whole page.
const emulateReducedMotion: BrowserCommand<
    [value: "reduce" | "no-preference"]
> = (context, value) => context.page.emulateMedia({ reducedMotion: value });

// A keyframe's value: a number, or a token's length times a factor.
type FrameValue = number | { token: string; times: number };
const frameValue = (node: Record<string, unknown>): FrameValue => {
    if (node.type === "numeric") return node.value as number;
    if (node.type === "alias") {
        return { token: (node.path as string[]).slice(1).join("."), times: 1 };
    }
    if (node.type === "calc" && node.op === "*") {
        const [a, b] = (node.operands as Record<string, unknown>[]).map(
            frameValue,
        );
        if (typeof a === "object" && typeof b === "number")
            return { token: a.token, times: a.times * b };
    }
    throw new Error(`no frame value for ${JSON.stringify(node)}`);
};

// The preset's overlay motions and their keyframes' frames, as opacity, scale, and translateY.
const overlayMotions: BrowserCommand<[]> = () => ({
    motions: {
        popup: POPUP_MOTION,
        dialog: DIALOG_MOTION,
        scrim: SCRIM_MOTION,
    },
    keyframes: Object.fromEntries(
        Object.entries(OVERLAY_KEYFRAMES).map(([name, frames]) => [
            name,
            Object.fromEntries(
                Object.entries(frames).map(([at, style]) => {
                    const frame: Record<string, FrameValue> = {};
                    for (const [property, node] of Object.entries(style)) {
                        const value = node as unknown as Record<
                            string,
                            unknown
                        >;
                        if (property !== "transform") {
                            frame[property] = frameValue(value);
                            continue;
                        }
                        for (const op of value.ops as {
                            fn: string;
                            args: Record<string, unknown>[];
                        }[]) {
                            frame[op.fn] = frameValue(op.args[0]!);
                        }
                    }
                    return [at, frame];
                }),
            ),
        ]),
    ),
});

export const commands = {
    nativeStyles,
    tokenKeys,
    emulateReducedMotion,
    overlayMotions,
};

declare module "vitest/browser" {
    interface BrowserCommands {
        /** The preset's precomputed React Native styles for these components. */
        nativeStyles: (
            components: string[],
            config?: TestConfig,
        ) => Promise<PrecomputedStyles>;
        /** Each component's instance tokens by theme key. */
        tokenKeys: (
            components: string[],
            config?: TestConfig,
        ) => Promise<Record<string, Record<string, string>>>;
        /** Emulates `prefers-reduced-motion` on the page. */
        emulateReducedMotion: (
            value: "reduce" | "no-preference",
        ) => Promise<void>;
        /** The preset's overlay motions, and their keyframes' frames. */
        overlayMotions: () => Promise<{
            motions: Record<string, unknown>;
            keyframes: Record<string, unknown>;
        }>;
    }
}
