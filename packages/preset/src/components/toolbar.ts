// The pureform toolbar: M3 Expressive's docked and floating toolbars, one component.
//
// A `floating` toolbar is a pill that hugs its elements, at elevation level 3, horizontal or
// stood up (`vertical`). A `docked` toolbar fills the width of the screen's edge it sits on, with
// no corners and no elevation, and spreads its elements out; it replaces the bottom app bar.
// `color: vibrant` takes the primary container colors instead of the surface container ones.
//
//   <div class={root} role="toolbar" aria-label="Formatting">
//     <button class={iconButton}>…</button>
//     …
//   </div>
//
// The elements are the library's buttons and icon buttons. With `overflow`, the bindings measure
// them and move those that don't fit into a menu behind an overflow button (Android's
// `OverflowLinearLayout`); the root then never spills, so it clips rather than grows.
//
// Where the toolbar sits (the bottom of the screen, 16dp off it when floating) is the page's
// layout, not the component's.

import { typed } from "@pureform/core";
import {
    center,
    column,
    flex,
    hidden,
    inlineFlex,
    pct,
    px,
    row,
    spaceBetween,
    unitless,
} from "@pureform/core/ast";
import { radius, spacing } from "@pureform/theme";

import { componentTokens, dense, on, surface, sys } from "./shared";

const { tokens, ref } = componentTokens("toolbar", {
    container: sys("surfaceContainer"),
    content: sys("onSurfaceVariant"),
    // The bar's thickness: its height, or its width when vertical.
    size: px(64),
    radius: radius("full"),
    // Before the first element and after the last, along the bar: a floating toolbar's, which
    // `docked` widens.
    padding: spacing("2"),
    gap: spacing("1"),
});

const pf = typed();

export const toolbar = pf.slotComponent({
    name: "toolbar",
    $meta: {
        description:
            'M3 Expressive toolbar holding buttons and icon buttons. placement floating is a pill at level 3 hugging its elements; docked fills its edge and spreads them out (it replaces the bottom app bar). orientation vertical stands a floating toolbar up. color vibrant takes the primary container colors. overflow clips the bar, for bindings that move what does not fit into a menu. Give the root role="toolbar" and a label.',
    },
    tokens,
    slots: ["root"],
    variants: {
        placement: ["floating", "docked"],
        orientation: ["horizontal", "vertical"],
        color: ["standard", "vibrant"],
        overflow: ["false", "true"],
    },
    recipe: () => ({
        base: {
            root: {
                ...surface(ref("container"), ref("content"), "level3"),
                display: inlineFlex,
                alignItems: center,
                gap: ref("gap"),
            },
        },
        variants: {
            placement: {
                floating: {
                    root: {
                        borderRadius: ref("radius"),
                    },
                },
                docked: {
                    root: {
                        display: flex,
                        justifyContent: spaceBetween,
                        width: pct(100),
                        tokens: { padding: spacing("4") },
                        apply: { shadowElevation: "level0" },
                    },
                },
            },
            orientation: {
                horizontal: {
                    root: {
                        flexDirection: row,
                        height: dense(ref("size")),
                        paddingInlineStart: ref("padding"),
                        paddingInlineEnd: ref("padding"),
                    },
                },
                vertical: {
                    root: {
                        flexDirection: column,
                        width: dense(ref("size")),
                        paddingBlockStart: ref("padding"),
                        paddingBlockEnd: ref("padding"),
                    },
                },
            },
            color: {
                standard: {},
                vibrant: {
                    root: {
                        tokens: {
                            container: sys("primaryContainer"),
                            content: on("primaryContainer"),
                        },
                        // Its icon buttons draw in its content color, as Material's vibrant
                        // toolbar does, unless they pick a color group of their own.
                        providedTokens: {
                            iconButton: { accent: ref("content") },
                        },
                    },
                },
            },
            overflow: {
                false: {},
                true: {
                    root: {
                        overflow: hidden,
                        maxWidth: pct(100),
                        minWidth: px(0),
                        flexShrink: unitless(1),
                    },
                },
            },
        },
        defaultVariants: {
            placement: "floating",
            orientation: "horizontal",
            color: "standard",
            overflow: "false",
        },
    }),
});
