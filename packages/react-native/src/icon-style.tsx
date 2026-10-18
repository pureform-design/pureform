// `useIconStyle()`: an icon slot's size, color, and fill, for icon components that take them as
// props (`<MyIcon size={size} color={color} />`), since nothing inherits on React Native. Icon
// parts provide them from their selection; React Native has no font axes, so the fill is the
// slot's `FILL` axis that selection returns beside the style. `Glyph` draws a text glyph as an
// icon, moving with the slot's color: an animated text where the slot's style moves, plain text
// elsewhere.

import { DEFAULT_ICON_STYLE } from "@pureform/binding-core";
import type { IconStyle } from "@pureform/binding-core";
import type { Selected, Style } from "@pureform/rn-adapter/factory";
import { createContext, useContext, useMemo } from "react";
import type { ComponentType, ReactNode } from "react";
import { Animated, Text } from "react-native";

interface IconPart {
    readonly icon: IconStyle;
    /** The slot's text properties, animated where they move. */
    readonly text: Record<string, unknown>;
    /** Whether any of them is animated. */
    readonly moves: boolean;
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
 *  `iconFill` from its selection, and its style from the engine as `motion`. A string is drawn
 *  as a `Glyph`. */
export function IconSlot(props: {
    readonly style: Style | undefined;
    readonly iconFill: number | undefined;
    readonly motion: Record<string, unknown> | undefined;
    readonly children?: ReactNode;
}): ReactNode {
    const { style, iconFill, motion } = props;
    const icon = useMemo(() => iconStyleOf(style, iconFill), [style, iconFill]);
    const value = useMemo(() => {
        const text = ownText(motion);
        return {
            icon,
            text,
            // An animated value is an object; a still one a number or a string.
            moves: Object.values(text).some(
                (value) => typeof value === "object" && value !== null,
            ),
        };
    }, [icon, motion]);
    return (
        <IconContext value={value}>
            {typeof props.children === "string" ? (
                <Glyph glyph={props.children} />
            ) : (
                props.children
            )}
        </IconContext>
    );
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

/** A text glyph standing in for an icon, in its icon slot's type and color, moving with them. A
 *  glyph holds no state, so it can change between animated and plain text as its slot does. */
export function Glyph(props: { readonly glyph: string }): ReactNode {
    const part = useContext(IconContext);
    const text = part?.text;
    const GlyphText = (part?.moves ? Animated.Text : Text) as ComponentType<
        Record<string, unknown>
    >;
    return (
        <GlyphText selectable={false} style={text}>
            {props.glyph}
        </GlyphText>
    );
}
