export type AccentColorGroup = "primary" | "secondary" | "tertiary";

export type SemanticColorGroup = "positive" | "notice" | "negative" | "info";

export type BaseKeyColorGroup = AccentColorGroup | SemanticColorGroup;

export type NeutralColorGroup = "neutral" | "neutralVariant";

export type BaseColorGroup =
    | AccentColorGroup
    | SemanticColorGroup
    | NeutralColorGroup;

export type SystemKeyColor<KeyColor extends string = BaseKeyColorGroup> =
    | `${KeyColor}`
    | `on${Capitalize<KeyColor>}`
    | `on${Capitalize<KeyColor>}Low`
    | `on${Capitalize<KeyColor>}Lowest`
    | `${KeyColor}Container`
    | `on${Capitalize<KeyColor>}Container`
    | `on${Capitalize<KeyColor>}ContainerLow`
    | `on${Capitalize<KeyColor>}ContainerLowest`
    // Additional
    | `${KeyColor}Fixed`
    | `${KeyColor}FixedDim`
    | `on${Capitalize<KeyColor>}Fixed`
    | `on${Capitalize<KeyColor>}FixedVariant`;

export type SystemNeutralColor =
    | "surface"
    | "surfaceDim"
    | "surfaceBright"
    | "surfaceContainerHighest"
    | "surfaceContainerHigh"
    | "surfaceContainer"
    | "surfaceContainerLow"
    | "surfaceContainerLowest"
    | "onSurface"
    | "onSurfaceLow"
    | "onSurfaceLowest"
    | "surfaceVariant"
    | "onSurfaceVariant"
    | "onSurfaceVariantLow"
    | "onSurfaceVariantLowest"
    | "background"
    | "onBackground"
    | "onBackgroundLow"
    | "onBackgroundLowest"
    | "outline"
    | "outlineVariant"
    | "inverseSurface"
    | "inverseOnSurface"
    | "scrim"
    | "shadow"
    | "black"
    | "white";

export type SystemExtraColor =
    | "surfaceTint"
    | "surfaceTintColor"
    | "inversePrimary";

export type SystemColor<TColorGroups extends string = BaseColorGroup> =
    | SystemNeutralColor
    | SystemExtraColor
    | SystemKeyColor<Exclude<TColorGroups, NeutralColorGroup>>;

export type HexColor = `#${string}`;
