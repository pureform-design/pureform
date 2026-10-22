// How CSS-named style properties and keywords become React Native's.
//
// The tables are typed against React Native's own style keys, so renaming a property to one
// React Native lacks fails to compile.

import type { ImageStyle, TextStyle, ViewStyle } from "react-native";

export type RnStyleKey = keyof ViewStyle | keyof TextStyle | keyof ImageStyle;

/** Properties React Native spells the same way. */
const SAME: readonly RnStyleKey[] = [
    "alignContent",
    "alignItems",
    "alignSelf",
    "aspectRatio",
    "backgroundColor",
    "borderBottomColor",
    "borderBottomLeftRadius",
    "borderBottomRightRadius",
    "borderBottomWidth",
    "borderColor",
    "borderLeftColor",
    "borderLeftWidth",
    "borderRadius",
    "borderRightColor",
    "borderRightWidth",
    "borderStyle",
    "borderTopColor",
    "borderTopLeftRadius",
    "borderTopRightRadius",
    "borderTopWidth",
    "borderWidth",
    "bottom",
    "boxShadow",
    "color",
    "columnGap",
    "cursor",
    "display",
    "flex",
    "flexBasis",
    "flexDirection",
    "flexGrow",
    "flexShrink",
    "flexWrap",
    "fontFamily",
    "fontSize",
    "fontStyle",
    "fontWeight",
    "gap",
    "height",
    "justifyContent",
    "left",
    "letterSpacing",
    "lineHeight",
    "margin",
    "marginBottom",
    "marginLeft",
    "marginRight",
    "marginTop",
    "maxHeight",
    "maxWidth",
    "minHeight",
    "minWidth",
    "objectFit",
    "opacity",
    "outlineColor",
    "outlineOffset",
    "outlineStyle",
    "outlineWidth",
    "overflow",
    "padding",
    "paddingBottom",
    "paddingLeft",
    "paddingRight",
    "paddingTop",
    "pointerEvents",
    "position",
    "right",
    "rowGap",
    "textAlign",
    "textDecorationLine",
    "textTransform",
    "top",
    "transform",
    "userSelect",
    "width",
    "zIndex",
    // A stacking context of its own: React Native has it too.
    "isolation",
];

/** Logical and other CSS properties React Native names differently. */
const RENAMED: Record<string, RnStyleKey> = {
    paddingInline: "paddingHorizontal",
    paddingInlineStart: "paddingStart",
    paddingInlineEnd: "paddingEnd",
    paddingBlock: "paddingVertical",
    paddingBlockStart: "paddingTop",
    paddingBlockEnd: "paddingBottom",
    marginInline: "marginHorizontal",
    marginInlineStart: "marginStart",
    marginInlineEnd: "marginEnd",
    marginBlock: "marginVertical",
    marginBlockStart: "marginTop",
    marginBlockEnd: "marginBottom",
    borderInlineStartWidth: "borderStartWidth",
    borderInlineEndWidth: "borderEndWidth",
    borderBlockStartWidth: "borderTopWidth",
    borderBlockEndWidth: "borderBottomWidth",
    borderInlineStartColor: "borderStartColor",
    borderInlineEndColor: "borderEndColor",
    borderBlockStartColor: "borderTopColor",
    borderBlockEndColor: "borderBottomColor",
    borderStartStartRadius: "borderTopStartRadius",
    borderStartEndRadius: "borderTopEndRadius",
    borderEndStartRadius: "borderBottomStartRadius",
    borderEndEndRadius: "borderBottomEndRadius",
    insetInlineStart: "start",
    insetInlineEnd: "end",
    insetBlockStart: "top",
    insetBlockEnd: "bottom",
    inlineSize: "width",
    blockSize: "height",
    minInlineSize: "minWidth",
    maxInlineSize: "maxWidth",
    minBlockSize: "minHeight",
    maxBlockSize: "maxHeight",
};

/** Properties with no React Native style: motion belongs to the components, and the rest are
 *  web-only. They're dropped without a diagnostic. */
const DROPPED = new Set([
    "transition",
    "animation",
    "cornerShape",
    "resize",
    "fieldSizing",
    "willChange",
    "appearance",
    "accentColor",
    "caretColor",
    "touchAction",
    "contain",
    // A PureformContainer establishes a container, with its name.
    "containerType",
    "containerName",
    // React Native has no variable font axes; an icon reads its fill another way.
    "fontVariationSettings",
]);

const SAME_SET = new Set<string>(SAME);

/** The React Native property for a CSS-named one, `null` to drop it, or `undefined` when
 *  there's no mapping. */
export const rnProperty = (property: string): RnStyleKey | null | undefined => {
    if (SAME_SET.has(property)) return property as RnStyleKey;
    if (property in RENAMED) return RENAMED[property];
    if (DROPPED.has(property)) return null;
    return undefined;
};

const FLEX: Record<string, string> = {
    start: "flex-start",
    end: "flex-end",
    spaceBetween: "space-between",
    spaceAround: "space-around",
    spaceEvenly: "space-evenly",
};

/** A keyword's React Native spelling for a property, or `null` when React Native has no
 *  equivalent and the declaration drops. */
export const rnKeyword = (property: string, keyword: string): string | null => {
    switch (property) {
        case "alignItems":
        case "alignSelf":
        case "alignContent":
        case "justifyContent":
            return FLEX[keyword] ?? keyword;
        case "display":
            return keyword === "inlineFlex" ? "flex" : keyword;
        case "flexDirection":
        case "flexWrap":
            return keyword.replace("Reverse", "-reverse");
        case "textAlign":
            return keyword === "start"
                ? "left"
                : keyword === "end"
                  ? "right"
                  : keyword;
        case "overflow":
            return keyword === "clip"
                ? "hidden"
                : keyword === "auto"
                  ? null
                  : keyword;
        // React Native's cursors are only these two; the rest are hints a pointer can go
        // without.
        case "cursor":
            return keyword === "pointer" || keyword === "auto" ? keyword : null;
        case "objectFit":
            return keyword === "none" ? null : keyword;
        default:
            return keyword;
    }
};

/** The React Native properties that take a percentage of the parent's size: sizes, insets,
 *  margins, padding, gaps, flex basis, and corner radii. Transforms take them too, inside
 *  their steps. */
export const PERCENT_OK = new Set<string>([
    "width",
    "height",
    "minWidth",
    "maxWidth",
    "minHeight",
    "maxHeight",
    "flexBasis",
    "top",
    "right",
    "bottom",
    "left",
    "start",
    "end",
    "inset",
    "gap",
    "rowGap",
    "columnGap",
    ...["margin", "padding"].flatMap((box) =>
        [
            "",
            "Top",
            "Right",
            "Bottom",
            "Left",
            "Start",
            "End",
            "Horizontal",
            "Vertical",
        ].map((side) => `${box}${side}`),
    ),
    ...[
        "",
        "TopLeft",
        "TopRight",
        "BottomLeft",
        "BottomRight",
        "TopStart",
        "TopEnd",
        "BottomStart",
        "BottomEnd",
    ].map((corner) => `border${corner}Radius`),
    "transform",
]);
