// What the time picker and the time input share: their surface, headline, separator, period
// selector and actions, and the tokens those read. Each component declares its own tokens from
// `timeTokens` and builds these slots over its own `ref`, so a theme retunes each one alone.

import {
    center,
    column,
    end,
    flex,
    hidden,
    inlineFlex,
    pointer,
    px,
    relative,
    row,
    solid,
    stretch,
    transparent,
    unitless,
} from "@pureform/core/ast";
import type { AliasNode, StyleMap } from "@pureform/core/ast";
import { radius, spacing, textStyle } from "@pureform/theme";

import { INDICATION_TOKENS, stateLayer } from "../state-layer";
import type { IndicationToken } from "../state-layer";
import {
    focusRing,
    INDICATION_ROOT,
    stateTransition,
    surface,
    sys,
} from "./shared";

/** The tokens both components have: the surface, the headline, the time fields' colors and
 *  size, the separator, the period selector, and the indication tokens. */
export const timeTokens = () => ({
    container: sys("surfaceContainerHigh"),
    headlineColor: sys("onSurfaceVariant"),
    // A time field (the picker's hour and minute selectors, the input's fields).
    fieldContainer: sys("surfaceContainerHighest"),
    fieldContent: sys("onSurface"),
    fieldSelectedContainer: sys("primaryContainer"),
    fieldSelectedContent: sys("onPrimaryContainer"),
    fieldWidth: px(96),
    fieldRadius: radius("small"),
    separatorColor: sys("onSurface"),
    separatorWidth: px(24),
    // The period selector: AM over PM, outlined, the selected one filled.
    periodOutlineColor: sys("outline"),
    periodOutlineWidth: px(1),
    periodContent: sys("onSurfaceVariant"),
    periodSelectedContainer: sys("tertiaryContainer"),
    periodSelectedContent: sys("onTertiaryContainer"),
    periodWidth: px(52),
    periodRadius: radius("small"),
    periodGap: spacing("3"),
    radius: radius("extraLarge"),
    padding: spacing("6"),
    gap: spacing("5"),
    actionsGap: spacing("2"),
    ...INDICATION_TOKENS,
});

type TimeToken = keyof ReturnType<typeof timeTokens>;

/** Reads one of the shared tokens through a component's own `ref`. */
export type TimeRef = (name: TimeToken | IndicationToken) => AliasNode;

/** The slots both components draw the same, over the component's tokens. `fieldHeight` is the
 *  height of a time field, which the period selector matches. */
export const timeSlots = (ref: TimeRef, fieldHeight: AliasNode) =>
    ({
        root: {
            ...INDICATION_ROOT,
            ...surface(ref("container"), ref("fieldContent"), "level3"),
            transition: stateTransition,
            // Its own size, as Compose's `TimePicker` and `TimeInput` and MDC's time picker
            // (wrap_content), rather than the whole width it's in.
            display: inlineFlex,
            flexDirection: column,
            alignItems: stretch,
            gap: ref("gap"),
            borderRadius: ref("radius"),
            paddingBlockStart: ref("padding"),
            paddingBlockEnd: ref("padding"),
            paddingInlineStart: ref("padding"),
            paddingInlineEnd: ref("padding"),
        },
        headline: {
            textStyle: textStyle("labelMedium"),
            color: ref("headlineColor"),
        },
        // The hour, the separator, the minute and the period selector, in one row.
        body: {
            display: flex,
            flexDirection: row,
            alignItems: center,
            justifyContent: center,
        },
        separator: {
            display: flex,
            alignItems: center,
            justifyContent: center,
            width: ref("separatorWidth"),
            textStyle: textStyle("displayLarge"),
            color: ref("separatorColor"),
        },
        // AM over PM, in one outline; Material's period selector is vertical beside the fields.
        periodSelector: {
            display: flex,
            flexDirection: column,
            width: ref("periodWidth"),
            height: fieldHeight,
            marginInlineStart: ref("periodGap"),
            borderWidth: ref("periodOutlineWidth"),
            borderStyle: solid,
            borderColor: ref("periodOutlineColor"),
            borderRadius: ref("periodRadius"),
            overflow: hidden,
        },
        period: {
            ...focusRing(ref),
            transition: stateTransition,
            // Positioned, so it stays over anything positioned behind it (a card's touch target).
            position: relative,
            display: flex,
            alignItems: center,
            justifyContent: center,
            flexGrow: unitless(1),
            flexBasis: px(0),
            borderWidth: px(0),
            cursor: pointer,
            textStyle: textStyle("titleMedium"),
            backgroundColor: stateLayer(ref, {
                base: transparent,
                content: ref("periodContent"),
            }),
            color: ref("periodContent"),
            states: {
                selected: {
                    backgroundColor: stateLayer(ref, {
                        base: ref("periodSelectedContainer"),
                        content: ref("periodSelectedContent"),
                    }),
                    color: ref("periodSelectedContent"),
                },
            },
        },
        actions: {
            display: flex,
            flexDirection: row,
            justifyContent: end,
            gap: ref("actionsGap"),
        },
    }) satisfies Record<string, StyleMap>;
