// The plain form look's box, which the plain Input, Textarea and NativeSelect share: the theme's
// shape, an outline in the outline color (the hover, error and disabled colors over it), the
// body text, the inline padding and the focus ring. Each component keeps its own tokens (tokens
// are per component), declared from `PLAIN_BOX_TOKENS`, and places its own state layer.

import { px, solid, transparent, when } from "@pureform/core/ast";
import type { AliasNode, Condition, StyleMap } from "@pureform/core/ast";
import { radius, spacing, textStyle } from "@pureform/theme";

import { INDICATION_TOKENS } from "../state-layer";
import type { IndicationToken } from "../state-layer";
import { disabledColor, focusRing, stateTransition, sys } from "./shared";

/** The box's tokens, for a plain control's `componentTokens`. */
export const PLAIN_BOX_TOKENS = {
    container: transparent,
    inputColor: sys("onSurface"),
    outlineColor: sys("outline"),
    hoverOutlineColor: sys("onSurface"),
    errorColor: sys("error"),
    outlineWidth: px(1),
    radius: radius("extraSmall"),
    paddingInline: spacing("3"),
    ...INDICATION_TOKENS,
};

/** The tokens the box reads. */
export type PlainBoxToken = keyof typeof PLAIN_BOX_TOKENS | IndicationToken;

/** The box: border, radius, text, inline padding, colors and the focus ring. The block size is
 *  the component's own (a padding around the text, or a height). */
export const plainBoxStyle = (
    ref: (token: PlainBoxToken) => AliasNode,
    states: {
        readonly hover: Condition;
        readonly invalid: Condition;
        readonly disabled: Condition;
    },
): StyleMap => ({
    ...focusRing(ref, "focusVisible"),
    transition: stateTransition,
    textStyle: textStyle("bodyLarge"),
    borderStyle: solid,
    borderWidth: ref("outlineWidth"),
    borderRadius: ref("radius"),
    borderColor: when()
        .on(states.hover, ref("hoverOutlineColor"))
        .on(states.invalid, ref("errorColor"))
        .on(states.disabled, disabledColor("disabledContainer"))
        .else(ref("outlineColor")),
    paddingInlineStart: ref("paddingInline"),
    color: when()
        .on(states.disabled, disabledColor("disabledContent"))
        .else(ref("inputColor")),
});
