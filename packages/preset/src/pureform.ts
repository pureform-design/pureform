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
import type {
    AnyComponentSpec,
    CoreConfig,
    ThemeOverride,
} from "@pureform/core/types";
import {
    materialColor,
    materialElevation,
    materialLayout,
    materialMotion,
    materialShape,
    materialState,
    materialTypescale,
} from "@pureform/material";
import { ContractError, fontRole, resolveTheme } from "@pureform/theme";
import type {
    BaseColorGroup,
    ColorProvider,
    ElevationProvider,
    LayoutProvider,
    MotionProvider,
    ResolvedTheme,
    ShapeProvider,
    StateProvider,
    ResolveOptions,
    Theme,
    ThemeProviders,
    TypographyProvider,
} from "@pureform/theme";

import { createButton } from "./components/button";
import { card } from "./components/card";
import { createCheckbox } from "./components/checkbox";
import { createChip } from "./components/chip";
import { divider } from "./components/divider";
import { createFab } from "./components/fab";
import { createIconButton } from "./components/icon-button";
import { createRadio } from "./components/radio";
import { ripple } from "./components/ripple";
import { scrim } from "./components/scrim";
import { createSupportingText } from "./components/supporting-text";
import { createSwitch } from "./components/switch";
import { createText } from "./components/text";
import { createTextArea } from "./components/text-area";
import { createTextField } from "./components/text-field";

type ThemeConfig = Theme<string, string, string>["config"];

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
    /** Require every color role to have a dark value, for a page that offers both schemes.
     *  Default `false`. */
    requireDark?: boolean;
    /** Require every content role to reach this WCAG contrast ratio against the role it sits
     *  on, in light and dark, for the base theme and every named theme. `4.5` is WCAG AA. */
    requireContrast?: number;
    /** Named themes, each replacing some of the providers above. Every token that differs
     *  from the base is emitted for the theme, and Panda applies it inside
     *  `[data-panda-theme=<name>]` (list the names in Panda's `staticCss.themes`). A theme
     *  cannot add color groups, since the components only have variants for the base ones. */
    themes?: Record<string, Partial<ThemeProviders<string, string, string>>>;
    /** Choose the components. Return `defaults` to keep them all, leave some out, or add your
     *  own. Default: every pureform component. */
    components?: (
        ctx: ComponentsContext<G>,
    ) => Record<string, AnyComponentSpec | undefined>;
}

type TokenTiers = Record<string, Record<string, unknown>>;

const same = (a: unknown, b: unknown) =>
    JSON.stringify(a) === JSON.stringify(b);

// The entries of `next` that are missing from or differ in `base`, by group.
const changed = (base: TokenTiers = {}, next: TokenTiers = {}) => {
    const out: TokenTiers = {};
    for (const [group, entries] of Object.entries(next)) {
        for (const [name, value] of Object.entries(entries)) {
            if (!same(base[group]?.[name], value)) {
                (out[group] ??= {})[name] = value;
            }
        }
    }
    return out;
};

// A theme override holding only what a variant theme changes from the base.
// Every alias path a value refers to, as "tokens.colors.primaryLight".
const references = (value: unknown, out = new Set<string>()): Set<string> => {
    if (Array.isArray(value)) {
        for (const item of value) references(item, out);
    } else if (value && typeof value === "object") {
        const node = value as { type?: string; path?: string[] };
        if (node.type === "alias" && node.path) out.add(node.path.join("."));
        for (const child of Object.values(value)) references(child, out);
    }
    return out;
};

const themeOverride = (
    base: ThemeConfig,
    variant: ThemeConfig,
): ThemeOverride => {
    const tiers = changed(
        {
            fonts: base.fonts ?? {},
            durations: base.durations ?? {},
            easings: base.easings ?? {},
        },
        {
            fonts: variant.fonts ?? {},
            durations: variant.durations ?? {},
            easings: variant.easings ?? {},
        },
    );
    const tokens = changed(base.tokens, variant.tokens);
    const semanticTokens = changed(base.semanticTokens, variant.semanticTokens);

    // A semantic token is declared once on the root, so it resolves its references there.
    // When anything it refers to changes, the theme re-declares it too, or it would keep the
    // base value.
    const paths = (ns: string[], groups: TokenTiers) =>
        Object.entries(groups).flatMap(([group, entries]) =>
            Object.keys(entries).map((name) => [...ns, group, name].join(".")),
        );
    const dirty = new Set([
        ...paths(["tokens"], tokens),
        ...paths(["semanticTokens"], semanticTokens),
        ...paths([], tiers),
    ]);
    for (let grew = true; grew;) {
        grew = false;
        for (const [group, entries] of Object.entries(variant.semanticTokens)) {
            for (const [name, value] of Object.entries(entries)) {
                const path = `semanticTokens.${group}.${name}`;
                if (dirty.has(path)) continue;
                if ([...references(value)].some((ref) => dirty.has(ref))) {
                    (semanticTokens[group] ??= {})[name] = value;
                    dirty.add(path);
                    grew = true;
                }
            }
        }
    }

    const override = { tokens, semanticTokens, ...tiers };
    return Object.fromEntries(
        Object.entries(override).filter(([, v]) => Object.keys(v).length > 0),
    ) as ThemeOverride;
};

/** A pureform config, with the resolved base theme on `theme`, so code outside Panda can
 *  read the typed color groups, font roles, and text style names:
 *  `config.theme.color.groups`, `keyof typeof config.theme.typography.styles`. The property is
 *  not enumerable, so spreading or merging the config drops it. */
export type PureformConfig<
    G extends string = BaseColorGroup,
    TFont extends string = never,
    TStyle extends string = never,
> = CoreConfig & {
    readonly theme: Theme<G, TFont, TStyle>;
};

/** Build the full pureform config. Every contract is checked and every alias resolves, or
 *  this throws naming the provider or the bad path. */
export const pureform = <
    G extends string = BaseColorGroup,
    TFont extends string = never,
    TStyle extends string = never,
>(
    options: PureformOptions<G, TFont, TStyle> = {},
): PureformConfig<G, TFont, TStyle> => {
    const providers: ThemeProviders<G, TFont, TStyle> = {
        color: options.color ?? (materialColor() as ColorProvider<G>),
        typography:
            options.typography ??
            (materialTypescale() as TypographyProvider<TFont, TStyle>),
        shape: options.shape ?? materialShape(),
        layout: options.layout ?? materialLayout(),
        state: options.state ?? materialState(),
        motion: options.motion ?? materialMotion(),
        elevation: options.elevation ?? materialElevation(),
    };
    const resolveOptions: ResolveOptions = {
        requireDark: options.requireDark ?? false,
        ...(options.requireContrast === undefined
            ? {}
            : { requireContrast: options.requireContrast }),
    };
    const theme = resolveTheme(providers, resolveOptions);

    const themes: Record<string, ThemeOverride> = {};
    for (const [name, overrides] of Object.entries(options.themes ?? {})) {
        const variant = resolveTheme(
            { ...providers, ...overrides } as ThemeProviders<
                string,
                string,
                string
            >,
            resolveOptions,
        );
        const extra = variant.color.groups.filter(
            (group) =>
                !(theme.color.groups as readonly string[]).includes(group),
        );
        if (extra.length > 0) {
            throw new ContractError(
                `theme "${name}" adds color groups ${extra.join(", ")}; components only have variants for the base groups, so add them to the base color provider`,
            );
        }
        themes[name] = themeOverride(theme.config, variant.config);
    }

    const defaults: Record<string, AnyComponentSpec> = {
        button: createButton(theme.color.groups),
        iconButton: createIconButton(theme.color.groups),
        fab: createFab(theme.color.groups),
        chip: createChip(theme.color.groups),
        textField: createTextField(theme.color.groups),
        textArea: createTextArea(theme.color.groups),
        supportingText: createSupportingText(theme.color.groups),
        checkbox: createCheckbox(theme.color.groups),
        radio: createRadio(theme.color.groups),
        switchControl: createSwitch(theme.color.groups),
        divider,
        card,
        scrim,
        ripple,
        text: createText(Object.keys(theme.typography.styles)),
    };
    const chosen = options.components?.({ theme, defaults }) ?? defaults;
    const components = Object.fromEntries(
        Object.entries(chosen).filter(
            (entry): entry is [string, AnyComponentSpec] =>
                entry[1] !== undefined,
        ),
    );

    const config = defineConfig(
        mergeConfigs(
            { tokens: {}, semanticTokens: {}, components: {} },
            theme.config,
            {
                componentBaseStyles: { fontFamily: fontRole("plain") },
                components,
                ...(Object.keys(themes).length > 0 ? { themes } : {}),
            },
        ),
    );
    // Not enumerable, so adapters, merges, and validation see a plain config.
    Object.defineProperty(config, "theme", { value: theme, enumerable: false });
    return config as PureformConfig<G, TFont, TStyle>;
};
