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
import type { CornerShapeKeyword } from "@pureform/core/ast";
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
    MaterialDensity,
    ColorProvider,
    ElevationProvider,
    LayoutProvider,
    ColorContract,
    MotionProvider,
    ResolvedTheme,
    ShapeProvider,
    StateProvider,
    ResolveOptions,
    Theme,
    ThemeProviders,
    ThemeVocabulary,
    TypographyProvider,
} from "@pureform/theme";

import { createAccordion } from "./components/accordion";
import { APP_BAR_KEYFRAMES, appBar } from "./components/app-bar";
import { createAutocomplete } from "./components/autocomplete";
import { createAvatar } from "./components/avatar";
import { badge } from "./components/badge";
import { bottomSheet } from "./components/bottom-sheet";
import { createButton } from "./components/button";
import { buttonGroup } from "./components/button-group";
import { calendarCell } from "./components/calendar";
import { card } from "./components/card";
import { carousel } from "./components/carousel";
import { createCheckbox } from "./components/checkbox";
import { chipSet, createChip } from "./components/chip";
import { createCodeField } from "./components/code-field";
import { colorPicker } from "./components/color-picker";
import { createDateInput } from "./components/date-input";
import { datePicker } from "./components/date-picker";
import { dialog } from "./components/dialog";
import { createDockedDatePicker } from "./components/docked-date-picker";
import { dragHandle } from "./components/drag-handle";
import { createFab } from "./components/fab";
import { createFabMenu, FAB_MENU_KEYFRAMES } from "./components/fab-menu";
import { FADE_THROUGH_KEYFRAMES, fadeThrough } from "./components/fade-through";
import {
    description,
    errorText,
    field,
    input,
    label,
    plainTextarea,
} from "./components/field-primitives";
import { createFileUpload } from "./components/file-upload";
import { fullscreenDialog } from "./components/fullscreen-dialog";
import { gridList } from "./components/grid-list";
import {
    createHorizontalSharedAxis,
    sharedAxisScrimOpacityOf,
    SHARED_AXIS_KEYFRAMES,
} from "./components/horizontal-shared-axis";
import { createIcon } from "./components/icon";
import { createIconButton } from "./components/icon-button";
import { createInputChip } from "./components/input-chip";
import { list } from "./components/list";
import { createListItem } from "./components/list-item";
import {
    LOADING_INDICATOR_KEYFRAMES,
    createLoadingIndicator,
} from "./components/loading-indicator";
import { createMedia } from "./components/media";
import { createMenu } from "./components/menu";
import { nativeSelect } from "./components/native-select";
import { createNavigationBar } from "./components/navigation-bar";
import { createNavigationRail } from "./components/navigation-rail";
import { createNumberField } from "./components/number-field";
import { OVERLAY_KEYFRAMES } from "./components/overlay";
import { createPaginator } from "./components/paginator";
import { popover } from "./components/popover";
import {
    PROGRESS_KEYFRAMES,
    createCircularProgress,
    createLinearProgress,
} from "./components/progress";
import { createRadio } from "./components/radio";
import { radioGroup } from "./components/radio-group";
import { createRating } from "./components/rating";
import { richTooltip } from "./components/rich-tooltip";
import { ripple } from "./components/ripple";
import { scrim } from "./components/scrim";
import { searchBar } from "./components/search-bar";
import { SEARCH_VIEW_KEYFRAMES, searchView } from "./components/search-view";
import { createSelect } from "./components/select";
import { separator } from "./components/separator";
import { DEFAULT_SHAPES } from "./components/shaped";
import type { Shapes } from "./components/shaped";
import type { Densities } from "./components/shared";
import { SHEET_KEYFRAMES } from "./components/sheet";
import { sideSheet } from "./components/side-sheet";
import { createSlider } from "./components/slider";
import { snackbar } from "./components/snackbar";
import { createSplitButton } from "./components/split-button";
import { splitter } from "./components/splitter";
import { createStepper } from "./components/stepper";
import { createSupportingText } from "./components/supporting-text";
import { createSwitch } from "./components/switch";
import { createTable } from "./components/table";
import { createTabs } from "./components/tabs";
import { createTagsInput } from "./components/tags-input";
import { createText } from "./components/text";
import { createTextArea } from "./components/text-area";
import { createTextField } from "./components/text-field";
import { timeInput } from "./components/time-input";
import { timePicker } from "./components/time-picker";
import { toast } from "./components/toast";
import { toolbar } from "./components/toolbar";
import { tooltip } from "./components/tooltip";
import { touchTarget } from "./components/touch-target";
import { createTree } from "./components/tree";
import { componentContrastFailures } from "./contrast";
import {
    CORNER_TOKEN,
    cornerKeyword,
    withCorner,
    withCornerToken,
} from "./corners";

type ThemeConfig = Theme<string, string, string>["config"];

/** What a `components` function receives: the resolved theme, and pureform's components built
 *  for its color groups. */
export interface ComponentsContext<G extends string> {
    theme: ResolvedTheme<G>;
    defaults: DefaultComponents<G>;
}

export interface PureformOptions<
    G extends string = BaseColorGroup,
    TFont extends string = never,
    TStyle extends string = never,
    TComponents extends ComponentMap = DefaultComponents<G>,
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
    /** Require every color the components draw to reach WCAG AA against what they draw it on
     *  (4.5:1 for text, 3:1 for control parts), and every color group as the color variants
     *  use it, in light and dark, for the base theme and every named theme. */
    requireComponentContrast?: boolean;
    /** The shapes the icon button, FAB, avatar, and media offer as their `shape` variant, by name. Default
     *  `MATERIAL_SHAPES`. Draw your own with core's shape builder (`defineShape`,
     *  `roundedPolygon`, `star`), and choose how each fits its box with `fitted`. */
    shapes?: Shapes;
    /** Named themes, each replacing some of the providers above. Every token that differs
     *  from the base is emitted for the theme, and Panda applies it inside
     *  `[data-panda-theme=<name>]` (list the names in Panda's `staticCss.themes`). A theme
     *  cannot add color groups, since the components only have variants for the base ones. */
    themes?: Record<string, Partial<ThemeProviders<string, string, string>>>;
    /** Choose the components. Return `defaults` to keep them all, leave some out, or add your
     *  own. Default: every pureform component. */
    components?: (ctx: ComponentsContext<G>) => TComponents;
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
            springs: base.springs ?? {},
        },
        {
            fonts: variant.fonts ?? {},
            durations: variant.durations ?? {},
            easings: variant.easings ?? {},
            springs: variant.springs ?? {},
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
    TComponents extends ComponentMap = DefaultComponents<G>,
> = CoreConfig &
    ThemeVocabulary<G, TFont, TStyle> & {
        /** The components, typed by name and token, so `typed(config)` offers
         *  `alias("components", name, token)`. */
        components: Chosen<TComponents>;
        readonly theme: Theme<G, TFont, TStyle>;
    };

/** Components by name; `undefined` leaves one out. */
type ComponentMap = Record<string, AnyComponentSpec | undefined>;

/** pureform's components, built for a theme's color groups, density steps, typescale, and
 *  corner, and the given shapes. */
const defaultComponents = <G extends string>(
    theme: ResolvedTheme<G, string, string>,
    shapes: Shapes,
    cornerToken: boolean,
) => {
    // Material's steps, typed so their names autocomplete; a layout provider may add its own.
    // The step type goes explicitly, since inferring it from the record widens it to `string`.
    type Step = MaterialDensity | (string & {});
    const densities = theme.layout.densities as Densities<Step>;
    const components = {
        button: createButton<G, Step>(theme.color.groups, densities),
        iconButton: createIconButton<G, Step>(
            theme.color.groups,
            densities,
            shapes,
        ),
        buttonGroup,
        fab: createFab(theme.color.groups, shapes),
        fabMenu: createFabMenu(theme.color.groups),
        splitButton: createSplitButton<G, Step>(theme.color.groups, densities),
        avatar: createAvatar(theme.color.groups, shapes),
        badge,
        media: createMedia(shapes),
        chip: createChip<G, Step>(theme.color.groups, densities),
        chipSet,
        inputChip: createInputChip<G, Step>(theme.color.groups, densities),
        textField: createTextField<G, Step>(theme.color.groups, densities),
        textArea: createTextArea<G, Step>(theme.color.groups, densities),
        tagsInput: createTagsInput<G, Step>(theme.color.groups, densities),
        numberField: createNumberField<G, Step>(theme.color.groups, densities),
        codeField: createCodeField<G, Step>(theme.color.groups, densities),
        fileUpload: createFileUpload<G>(theme.color.groups),
        rating: createRating<G>(theme.color.groups),
        searchBar,
        searchView,
        select: createSelect<G, Step>(theme.color.groups, densities),
        nativeSelect,
        autocomplete: createAutocomplete<G, Step>(
            theme.color.groups,
            densities,
        ),
        calendarCell,
        datePicker,
        dockedDatePicker: createDockedDatePicker<G, Step>(
            theme.color.groups,
            densities,
        ),
        dateInput: createDateInput<G, Step>(theme.color.groups, densities),
        supportingText: createSupportingText(theme.color.groups),
        checkbox: createCheckbox<G, Step>(theme.color.groups, densities),
        radio: createRadio<G, Step>(theme.color.groups, densities),
        radioGroup,
        switchControl: createSwitch(theme.color.groups),
        slider: createSlider(theme.color.groups),
        linearProgress: createLinearProgress(theme.color.groups),
        circularProgress: createCircularProgress(theme.color.groups),
        loadingIndicator: createLoadingIndicator(theme.color.groups),
        separator,
        field,
        label,
        input,
        plainTextarea,
        description,
        errorText,
        list,
        listItem: createListItem<G, Step>(theme.color.groups, densities),
        menu: createMenu<G, Step>(theme.color.groups, densities),
        tabs: createTabs(theme.color.groups),
        navigationBar: createNavigationBar(theme.color.groups),
        navigationRail: createNavigationRail(theme.color.groups),
        appBar,
        timePicker,
        timeInput,
        dialog,
        fullscreenDialog,
        bottomSheet,
        sideSheet,
        dragHandle,
        splitter,
        colorPicker,
        snackbar,
        toast,
        toolbar,
        tooltip,
        richTooltip,
        popover,
        paginator: createPaginator<Step>(densities),
        card,
        carousel,
        accordion: createAccordion<Step>(densities),
        tree: createTree<G, Step>(theme.color.groups, densities),
        stepper: createStepper<Step>(densities),
        dataTable: createTable<Step>(densities),
        gridList,
        scrim,
        fadeThrough,
        horizontalSharedAxis: createHorizontalSharedAxis(theme.color),
        ripple,
        icon: createIcon(theme.color.groups),
        touchTarget,
        text: createText(Object.keys(theme.typography.styles)),
    };
    for (const [name, spec] of Object.entries(components)) {
        // Its geometry is the shape, so the theme's corner leaves it round.
        if (name === "loadingIndicator") continue;
        (components as Record<string, AnyComponentSpec>)[name] = (
            cornerToken ? withCornerToken : withCorner
        )(spec, theme.shape.corner);
    }
    return components;
};

/** pureform's default components, by name. */
export type DefaultComponents<G extends string = BaseColorGroup> = ReturnType<
    typeof defaultComponents<G>
>;

/** The components a config holds: the ones a `components` function returns, less any it
 *  set to `undefined`. */
type Chosen<TC> = {
    [K in keyof TC as undefined extends TC[K] ? never : K]: Exclude<
        TC[K],
        undefined
    >;
};

/** Build the full pureform config. Every contract is checked and every alias resolves, or
 *  this throws naming the provider or the bad path. */
export const pureform = <
    G extends string = BaseColorGroup,
    TFont extends string = never,
    TStyle extends string = never,
    TComponents extends ComponentMap = DefaultComponents<G>,
>(
    options: PureformOptions<G, TFont, TStyle, TComponents> = {},
): PureformConfig<G, TFont, TStyle, TComponents> => {
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
    // Named themes whose corner differs from the base's, by name.
    const baseCorner = theme.shape.corner ?? "round";
    const corners: Record<string, CornerShapeKeyword> = {};
    const colors: [string, ColorContract<string>][] = [
        ["base theme", theme.color],
    ];
    const scrimOpacities: Record<
        string,
        ReturnType<typeof sharedAxisScrimOpacityOf>
    > = {};
    const baseScrimOpacity = sharedAxisScrimOpacityOf(theme.color);
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
        if (!same(variant.layout.densities, theme.layout.densities)) {
            throw new ContractError(
                `theme "${name}" declares density steps ${Object.keys(variant.layout.densities).join(", ")}; components only have variants for the base steps (${Object.keys(theme.layout.densities).join(", ")}), so declare them on the base layout provider`,
            );
        }
        if ((variant.shape.corner ?? "round") !== baseCorner) {
            corners[name] = variant.shape.corner ?? "round";
        }
        themes[name] = themeOverride(theme.config, variant.config);
        scrimOpacities[name] = sharedAxisScrimOpacityOf(variant.color);
        colors.push([`theme "${name}"`, variant.color]);
    }

    const shapes = options.shapes ?? DEFAULT_SHAPES;
    // Corners that vary by theme go through each component's corner token.
    const defaults = defaultComponents(
        theme,
        shapes,
        Object.keys(corners).length > 0,
    );
    const chosen: ComponentMap =
        options.components?.({ theme, defaults }) ?? defaults;
    const components = Object.fromEntries(
        Object.entries(chosen).filter(
            (entry): entry is [string, AnyComponentSpec] =>
                entry[1] !== undefined,
        ),
    );

    // This derived token belongs to each effective theme, not the base color contract. Keeping
    // it in theme overrides makes CSS/Panda/Tailwind and Native consume the same luminance rule.
    // Custom components retain explicit opacity defaults, but unrelated recipe changes must not
    // disable theme derivation when the component still uses the preset's opacity token.
    if (
        components["horizontalSharedAxis"]?.tokens?.["scrimOpacity"] ===
        defaults.horizontalSharedAxis.tokens?.["scrimOpacity"]
    ) {
        for (const [name, scrimOpacity] of Object.entries(scrimOpacities)) {
            if (same(scrimOpacity, baseScrimOpacity)) continue;
            themes[name] = {
                ...themes[name],
                components: {
                    ...themes[name]?.components,
                    horizontalSharedAxis: { tokens: { scrimOpacity } },
                },
            };
        }
    }

    for (const [name, corner] of Object.entries(corners)) {
        const overrides = Object.fromEntries(
            Object.entries(components)
                .filter(([, spec]) => spec.tokens?.[CORNER_TOKEN] !== undefined)
                .map(([component]) => [
                    component,
                    { tokens: { [CORNER_TOKEN]: cornerKeyword(corner) } },
                ]),
        );
        themes[name] = {
            ...themes[name],
            components: { ...themes[name]?.components, ...overrides },
        };
    }

    if (options.requireComponentContrast) {
        for (const [where, color] of colors) {
            const failures = componentContrastFailures(color, components);
            if (failures.length > 0) {
                const list = failures
                    .map(
                        (f) =>
                            `${f.source} ${f.draw} on ${f.on} (${f.scheme}) is ${f.ratio.toFixed(2)}:1, needs ${f.minimum}:1`,
                    )
                    .join("; ");
                throw new ContractError(
                    `${where} falls below component contrast: ${list}`,
                );
            }
        }
    }

    const config = defineConfig(
        mergeConfigs(
            { tokens: {}, semanticTokens: {}, components: {} },
            theme.config,
            {
                componentBaseStyles: { fontFamily: fontRole("plain") },
                keyframes: {
                    ...PROGRESS_KEYFRAMES,
                    ...LOADING_INDICATOR_KEYFRAMES,
                    ...OVERLAY_KEYFRAMES,
                    ...FAB_MENU_KEYFRAMES,
                    ...SHEET_KEYFRAMES,
                    ...SEARCH_VIEW_KEYFRAMES,
                    ...APP_BAR_KEYFRAMES,
                    ...FADE_THROUGH_KEYFRAMES,
                    ...SHARED_AXIS_KEYFRAMES,
                },
                components,
                ...(Object.keys(themes).length > 0 ? { themes } : {}),
            },
        ),
    );
    // Not enumerable, so adapters, merges, and validation see a plain config.
    Object.defineProperty(config, "theme", { value: theme, enumerable: false });
    return config as unknown as PureformConfig<G, TFont, TStyle, TComponents>;
};
