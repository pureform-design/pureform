// pureform as one composed config: a theme from one provider per contract and every component,
// validated together.
//
// Each contract (color, typography, shape, layout, state, motion, elevation) defaults to Material's
// provider, so `pureform()` alone is the Material design system. Pass a provider to replace a
// domain, `extend()` one to change part of it, or `*FromTokens()` for a hand-authored one.
//
// The result is a plain `CoreConfig`, so it compiles to any target. For Panda, pass it to
// `compilePreset` from `@pureform/panda-adapter`. Layer brand or app overrides on top with
// `mergeConfigs`.

import { defineConfig, mergeConfigs } from "@pureform/core";
import type { AnyComponentSpec, CoreConfig } from "@pureform/core/types";
import {
    materialColor,
    materialElevation,
    materialLayout,
    materialMotion,
    materialShape,
    materialState,
    materialTypescale,
} from "@pureform/material";
import { fontRole, resolveTheme } from "@pureform/theme";
import type {
    BaseColorGroup,
    ColorProvider,
    ElevationProvider,
    LayoutProvider,
    MotionProvider,
    ResolvedTheme,
    ShapeProvider,
    StateProvider,
    TypographyProvider,
} from "@pureform/theme";

import { createButton } from "./components/button";
import { card } from "./components/card";
import { createIconButton } from "./components/icon-button";
import { ripple } from "./components/ripple";
import { scrim } from "./components/scrim";

/** What a `components` function receives: the resolved theme, and pureform's components built
 *  for its color groups. */
export interface ComponentsContext<G extends string> {
    theme: ResolvedTheme<G>;
    defaults: Record<string, AnyComponentSpec>;
}

export interface PureformOptions<
    G extends string = BaseColorGroup,
    TFont extends string = never,
    TStyle extends string = never,
> {
    /** Default `materialColor()`. Its groups become each component's `color` variant. */
    color?: ColorProvider<G>;
    /** Default `materialTypescale()`. */
    typography?: TypographyProvider<TFont, TStyle>;
    /** Default `materialShape()`. */
    shape?: ShapeProvider;
    /** Spacing and component sizes. Default `materialLayout()`. */
    layout?: LayoutProvider;
    /** Default `materialState()`. */
    state?: StateProvider;
    /** Default `materialMotion()`. */
    motion?: MotionProvider;
    /** Default `materialElevation()`. */
    elevation?: ElevationProvider;
    /** Choose the components. Return `defaults` to keep them all, leave some out, or add your
     *  own. Default: every pureform component. */
    components?: (
        ctx: ComponentsContext<G>,
    ) => Record<string, AnyComponentSpec | undefined>;
}

/** Build the full pureform config. Every contract is checked and every alias resolves, or
 *  this throws naming the provider or the bad path. */
export const pureform = <
    G extends string = BaseColorGroup,
    TFont extends string = never,
    TStyle extends string = never,
>(
    options: PureformOptions<G, TFont, TStyle> = {},
): CoreConfig => {
    const theme = resolveTheme<G, TFont, TStyle>({
        color: options.color ?? (materialColor() as ColorProvider<G>),
        typography:
            options.typography ??
            (materialTypescale() as TypographyProvider<TFont, TStyle>),
        shape: options.shape ?? materialShape(),
        layout: options.layout ?? materialLayout(),
        state: options.state ?? materialState(),
        motion: options.motion ?? materialMotion(),
        elevation: options.elevation ?? materialElevation(),
    });

    const defaults: Record<string, AnyComponentSpec> = {
        button: createButton(theme.color.groups),
        iconButton: createIconButton(theme.color.groups),
        card,
        scrim,
        ripple,
    };
    const chosen = options.components?.({ theme, defaults }) ?? defaults;
    const components = Object.fromEntries(
        Object.entries(chosen).filter(
            (entry): entry is [string, AnyComponentSpec] =>
                entry[1] !== undefined,
        ),
    );

    return defineConfig(
        mergeConfigs(
            { tokens: {}, semanticTokens: {}, components: {} },
            theme.config,
            {
                componentBaseStyles: { fontFamily: fontRole("plain") },
                components,
            },
        ),
    );
};
