// Providers: anything that fills a contract.
//
// A provider names its domain and generates that domain's contract. Domains resolve in a fixed
// order (color, typography, shape, layout, state, motion, elevation), and each provider sees the
// contracts resolved before it, so an elevation provider can tint with the color groups.

import type { CoreConfig } from "@pureform/core/types";

import type { ColorContract } from "./contracts/color";
import type {
    ElevationContract,
    LayoutContract,
    MotionContract,
    ShapeContract,
    StateContract,
} from "./contracts/foundations";
import type { TypographyContract } from "./contracts/typography";

export const DOMAINS = [
    "color",
    "typography",
    "shape",
    "layout",
    "state",
    "motion",
    "elevation",
] as const;

export type Domain = (typeof DOMAINS)[number];

/** Config a provider adds beyond its contract, such as the primitives behind its roles or the
 *  tokens its elevation styles read. Merged in after the contract. */
export type ThemeFragment = Partial<Omit<CoreConfig, "components">>;

/** A contract plus optional extra config. */
export type Provided<T> = T & { extra?: ThemeFragment };

export interface ResolvedTheme<
    G extends string = string,
    TFont extends string = string,
    TStyle extends string = string,
> {
    color: ColorContract<G>;
    typography: TypographyContract<TFont, TStyle>;
    shape: ShapeContract;
    layout: LayoutContract;
    state: StateContract;
    motion: MotionContract;
    elevation: ElevationContract;
}

/** What a provider of each domain sees: every domain resolved before it. */
export interface DomainContext {
    color: Record<string, never>;
    typography: Pick<ResolvedTheme, "color">;
    shape: Pick<ResolvedTheme, "color" | "typography">;
    layout: Pick<ResolvedTheme, "color" | "typography" | "shape">;
    state: Pick<ResolvedTheme, "color" | "typography" | "shape" | "layout">;
    motion: Omit<ResolvedTheme, "motion" | "elevation">;
    elevation: Omit<ResolvedTheme, "elevation">;
}

export interface Provider<D extends Domain, T> {
    domain: D;
    /** Shown in contract errors, for example `color provider "material"`. */
    name: string;
    generate: (ctx: DomainContext[D]) => Provided<T>;
}

export type ColorProvider<G extends string = string> = Provider<
    "color",
    ColorContract<G>
>;
export type TypographyProvider<
    TFont extends string = never,
    TStyle extends string = never,
> = Provider<"typography", TypographyContract<TFont, TStyle>>;
export type ShapeProvider = Provider<"shape", ShapeContract>;
export type LayoutProvider = Provider<"layout", LayoutContract>;
export type StateProvider = Provider<"state", StateContract>;
export type MotionProvider = Provider<"motion", MotionContract>;
export type ElevationProvider = Provider<"elevation", ElevationContract>;

export type AnyProvider =
    | ColorProvider<string>
    | TypographyProvider<string, string>
    | ShapeProvider
    | LayoutProvider
    | StateProvider
    | MotionProvider
    | ElevationProvider;

/** Declare a provider. It returns the provider unchanged and exists for type inference. */
export const defineProvider = <D extends Domain, T>(
    provider: Provider<D, T>,
): Provider<D, T> => provider;

/** Wrap a provider and change what it generates. The result keeps the provider's contract
 *  type, so a change that drops a required name does not compile. */
export const extend = <D extends Domain, T>(
    provider: Provider<D, T>,
    change: (generated: Provided<T>, ctx: DomainContext[D]) => Provided<T>,
    name = `${provider.name}+`,
): Provider<D, T> => ({
    domain: provider.domain,
    name,
    generate: (ctx) => change(provider.generate(ctx), ctx),
});

const fixed =
    <D extends Domain>(domain: D) =>
    <T>(contract: Provided<T>, name = "tokens"): Provider<D, T> => ({
        domain,
        name,
        generate: () => contract,
    });

/** A color provider that always generates the given roles, for a hand-authored palette.
 *  `groups` sets which groups the roles must cover. */
export const colorFromTokens = <const G extends string>(
    contract: Provided<ColorContract<G>>,
    name?: string,
): ColorProvider<G> => fixed("color")(contract, name);

/** A typography provider with fixed fonts and styles. Font roles come from `fonts`, so a style
 *  can only use a declared one. */
export const typographyFromTokens = <
    const TFont extends string = never,
    const TStyle extends string = never,
>(
    contract: Provided<TypographyContract<TFont, TStyle>>,
    name?: string,
): TypographyProvider<TFont, TStyle> => fixed("typography")(contract, name);

export const shapeFromTokens = (
    contract: Provided<ShapeContract>,
    name?: string,
): ShapeProvider => fixed("shape")(contract, name);

export const layoutFromTokens = (
    contract: Provided<LayoutContract>,
    name?: string,
): LayoutProvider => fixed("layout")(contract, name);

export const stateFromTokens = (
    contract: Provided<StateContract>,
    name?: string,
): StateProvider => fixed("state")(contract, name);

export const motionFromTokens = (
    contract: Provided<MotionContract>,
    name?: string,
): MotionProvider => fixed("motion")(contract, name);

export const elevationFromTokens = (
    contract: Provided<ElevationContract>,
    name?: string,
): ElevationProvider => fixed("elevation")(contract, name);
