// `useIconStyle()`: an icon slot's size, color, and fill, for icon components that take them as
// props (`<MyIcon size={size} color={color} />`), since nothing inherits on React Native. Icon
// parts provide them from their selection; React Native has no font axes, so the fill is the
// slot's `FILL` axis that selection returns beside the style. `Glyph` draws a text glyph as an
// icon, moving with the slot's color.

import { DEFAULT_ICON_STYLE } from "@pureform/binding-core";
import type { IconStyle } from "@pureform/binding-core";
import type { Selected, Style } from "@pureform/rn-adapter/factory";
import { createContext, useContext, useMemo } from "react";
import type { ReactNode } from "react";
import { Animated } from "react-native";
import type { TextStyle } from "react-native";

interface IconPart {
    readonly icon: IconStyle;
    /** The slot's text properties, animated where they move. */
    readonly text: Record<string, unknown>;
}

const IconContext = createContext<IconPart | undefined>(undefined);

// Text properties an icon slot sets on itself for its glyph, since a view passes none down.
const TEXT = [
    "color",
    "fontFamily",
    "fontSize",
    "fontWeight",
    "lineHeight",
    "letterSpacing",
];

/** The text properties of a style: what a view would pass to its text, if it did. */
export const ownText = (
    style: Record<string, unknown> | undefined,
): Record<string, unknown> =>
    Object.fromEntries(
        Object.entries(style ?? {}).filter(([key]) => TEXT.includes(key)),
    );

/** An icon slot's size, color, and fill from its selection. */
export const iconStyleOf = (
    style: Style | undefined,
    iconFill: number | undefined,
): IconStyle => {
    const size = style?.fontSize ?? style?.width;
    const color = style?.color;
    return {
        size: typeof size === "number" ? size : undefined,
        color: typeof color === "string" ? color : DEFAULT_ICON_STYLE.color,
        filled: iconFill === 1,
    };
};

/** Provides an icon slot's style to the icon inside it: the slot's plain `style` and
 *  `iconFill` from its selection, and its style from the engine as `motion`. */
export function IconSlot(props: {
    readonly style: Style | undefined;
    readonly iconFill: number | undefined;
    readonly motion: Record<string, unknown> | undefined;
    readonly children?: ReactNode;
}): ReactNode {
    const { style, iconFill, motion } = props;
    const icon = useMemo(() => iconStyleOf(style, iconFill), [style, iconFill]);
    const value = useMemo(
        () => ({ icon, text: ownText(motion) }),
        [icon, motion],
    );
    return <IconContext value={value}>{props.children}</IconContext>;
}

/** An icon slot of a selection, for `IconSlot`. */
export const iconSlot = (selected: Selected, slot: string) => ({
    style: selected.styles[slot],
    iconFill: selected.iconFills[slot],
});

/** The nearest icon slot's size in pixels, color, and whether it asks for a filled icon;
 *  `DEFAULT_ICON_STYLE` outside one. */
export function useIconStyle(): IconStyle {
    return useContext(IconContext)?.icon ?? DEFAULT_ICON_STYLE;
}

/** A text glyph standing in for an icon, in its icon slot's type and color, moving with them. */
export function Glyph(props: { readonly glyph: string }): ReactNode {
    const text = useContext(IconContext)?.text;
    return (
        <Animated.Text
            selectable={false}
            style={text as Animated.WithAnimatedValue<TextStyle>}
        >
            {props.glyph}
        </Animated.Text>
    );
}
