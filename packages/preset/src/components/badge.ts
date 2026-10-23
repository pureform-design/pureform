// The pureform badge: Material's small (a dot) and large (a short label or count) badge, in the
// error color. It is styling only. A badge flows inline by default; `placement: anchored` places it
// at the top end corner of its nearest positioned parent, such as a navigation bar or rail
// `icon`, or a tab's `tabContent`.
//
//   <span class={icon}>✉<span class={badge({ placement: "anchored" })} role="status">3</span></span>
//   <span class={badge({ size: "small", placement: "anchored" })} aria-hidden="true"></span>

import { typed } from "@pureform/core";
import { absolute, center, inlineFlex, px, start, unitless } from "@pureform/core/ast";
import type { StyleMap } from "@pureform/core/ast";
import { radius, spacing, textStyle } from "@pureform/theme";

import { componentTokens, on, sys } from "./shared";

const { tokens, ref } = componentTokens("badge", {
    radius: radius("full"),
    container: sys("error"),
    content: on("error"),
    smallSize: px(6),
    largeSize: px(16),
    largePadding: spacing("1"),
    // The anchored corner's offsets, outward from the parent's top end corner.
    smallOffsetBlock: px(0),
    smallOffsetInline: px(0),
    largeOffsetBlock: px(-4),
    largeOffsetInline: px(-8),
});

const pf = typed();

export const badge = pf.component({
    name: "badge",
    $meta: {
        description:
            "Material badge: small is a dot, large shows a short label or count. placement anchored puts it on the top end corner of its positioned parent (a nav icon, a tab's content). Give a count a role or label for assistive technology.",
    },
    tokens,
    variants: {
        size: ["small", "large"],
        placement: ["flow", "anchored"],
    },
    recipe: () => ({
        base: {
            display: inlineFlex,
            alignItems: center,
            justifyContent: center,
            flexShrink: unitless(0),
            borderRadius: ref("radius"),
            backgroundColor: ref("container"),
            color: ref("content"),
        } satisfies StyleMap,
        variants: {
            size: {
                small: {
                    width: ref("smallSize"),
                    height: ref("smallSize"),
                } satisfies StyleMap,
                large: {
                    minWidth: ref("largeSize"),
                    height: ref("largeSize"),
                    paddingInlineStart: ref("largePadding"),
                    paddingInlineEnd: ref("largePadding"),
                    textStyle: textStyle("labelSmall"),
                } satisfies StyleMap,
            },
            placement: {
                // A badge keeps its own size: in a flex column (every React Native view, or a web
                // flex parent) it would otherwise stretch across it.
                flow: { alignSelf: start } satisfies StyleMap,
                anchored: { position: absolute } satisfies StyleMap,
            },
        },
        compoundVariants: [
            {
                match: { size: "small", placement: "anchored" },
                style: {
                    insetBlockStart: ref("smallOffsetBlock"),
                    insetInlineEnd: ref("smallOffsetInline"),
                } satisfies StyleMap,
            },
            {
                match: { size: "large", placement: "anchored" },
                style: {
                    insetBlockStart: ref("largeOffsetBlock"),
                    insetInlineEnd: ref("largeOffsetInline"),
                } satisfies StyleMap,
            },
        ],
        defaultVariants: { size: "large", placement: "flow" },
    }),
});
