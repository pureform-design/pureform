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
import { center, flex, pct, px, relative, row, slot } from "@pureform/core/ast";
import { radius, size as sizeToken, spacing } from "@pureform/theme";

import { stateLayer } from "../state-layer";
import {
    componentTokens,
    focusRing,
    iconBox,
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
});

const pf = typed();

export const searchBar = pf.slotComponent({
    name: "searchBar",
    $meta: {
        description:
            "Material search bar: a pill holding a leading icon, the search input, and trailing icons.",
    },
    tokens,
    slots: ["root", "leading", "input", "trailing"],
    structure: { root: ["leading", "input", "trailing"] },
    recipe: () => ({
        base: {
            root: {
                ...surface(ref("container"), ref("inputColor"), "level3"),
                ...focusRing(slot("root", "focusVisibleWithin")),
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
                backgroundColor: stateLayer({
                    base: ref("container"),
                    content: ref("inputColor"),
                }),
            },
            leading: {
                ...iconBox(ref("iconSize")),
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
                ...iconBox(ref("iconSize")),
                color: ref("trailingColor"),
            },
        },
    }),
});
