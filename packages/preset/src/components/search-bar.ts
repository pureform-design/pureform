// The pureform search bar: Material's pill-shaped search field.
//
// Markup: a container holding an optional leading icon, the input, and optional trailing icons
// (an icon button or an avatar can sit there too). The whole bar is the hit area, so focus and
// hover show on the container.
//
//   <label class={root}>
//     <span class={leading}>⌕</span>
//     <input class={input} type="search" placeholder="Search" />
//     <span class={trailing}>🎤</span>
//   </label>

import { typed } from "@pureform/core";
import {
    center,
    flex,
    pct,
    px,
    relative,
    row,
    slot,
    unitless,
} from "@pureform/core/ast";
import { radius, size as sizeToken, spacing } from "@pureform/theme";

import { INDICATION_TOKENS, stateLayer } from "../state-layer";
import {
    componentTokens,
    focusRing,
    iconBox,
    INDICATION_ROOT,
    iconFill,
    inputText,
    stateTransition,
    surface,
    sys,
} from "./shared";

const { tokens, ref } = componentTokens("searchBar", {
    container: sys("surfaceContainerHigh"),
    inputColor: sys("onSurface"),
    placeholderColor: sys("onSurfaceVariant"),
    leadingColor: sys("onSurface"),
    trailingColor: sys("onSurfaceVariant"),
    height: px(56),
    radius: radius("full"),
    paddingInline: spacing("4"),
    gap: spacing("4"),
    iconSize: sizeToken("iconMedium"),
    iconFill: unitless(0),
    ...INDICATION_TOKENS,
});

const pf = typed();

export const searchBar = pf.slotComponent({
    name: "searchBar",
    $meta: {
        description:
            "Material search bar: a pill holding a leading icon, the search input, and trailing icons. centered centers the text, as M3 Expressive's app bar search does.",
    },
    tokens,
    slots: ["root", "leading", "input", "trailing"],
    structure: { root: ["leading", "input", "trailing"] },
    variants: { centered: ["false", "true"] },
    recipe: () => ({
        base: {
            root: {
                ...INDICATION_ROOT,
                ...surface(ref("container"), ref("inputColor"), "level3"),
                ...focusRing(ref, slot("root", "focusVisibleWithin")),
                transition: stateTransition,
                position: relative,
                display: flex,
                flexDirection: row,
                alignItems: center,
                gap: ref("gap"),
                height: ref("height"),
                paddingInlineStart: ref("paddingInline"),
                paddingInlineEnd: ref("paddingInline"),
                borderRadius: ref("radius"),
                backgroundColor: stateLayer(ref, {
                    base: ref("container"),
                    content: ref("inputColor"),
                }),
            },
            leading: {
                ...iconBox(ref("iconSize"), {
                    fill: iconFill(ref("iconFill")),
                }),
                color: ref("leadingColor"),
            },
            input: {
                ...inputText(ref("inputColor")),
                height: pct(100),
                rawRules: {
                    css: {
                        "&::placeholder": { color: ref("placeholderColor") },
                    },
                },
            },
            trailing: {
                ...iconBox(ref("iconSize"), {
                    fill: iconFill(ref("iconFill")),
                }),
                color: ref("trailingColor"),
            },
        },
        variants: {
            // M3 Expressive centers the query and placeholder in an app bar's search bar.
            centered: {
                false: {},
                true: { input: { textAlign: center } },
            },
        },
        defaultVariants: { centered: "false" },
    }),
});
