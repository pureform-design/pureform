// The config's own components, which pureform's preset doesn't have: a panel laid out by its
// container's width, a gradient swatch drawn with SVG, and a square whose typed tokens tween.
// They select through the registry like the package's components, with its hooks and the
// provider's engine. Also the shapes and the picture the page shows.

import {
    ownText,
    useComponentSlots,
    useEngine,
    useSelectedStyles,
    withEngine,
} from "@pureform/react-native";
import type { ReactNode } from "react";
import { Text, View } from "react-native";
import type { TextStyle, ViewStyle } from "react-native";

/** A few of Material's shapes, for the shaped components, and the config's two morphs, which
 *  change shape while pressed. */
export const SHAPES = [
    "none",
    "square",
    "cookie4Sided",
    "clover8Leaf",
    "sunny",
    "heart",
    "pentagon",
    "circleToSquare",
    "cookieToClover",
] as const;
export type Shape = (typeof SHAPES)[number];

// A picture to show in media: a gradient drawn as an svg, so the demo needs no network. React
// Native Web escapes inline svg markup itself, so it goes in as is. It covers whatever box it's
// drawn in itself, since a browser fits an svg picture by its own aspect ratio rule, not that
// of the svg image showing it.
export const PICTURE = {
    uri: `data:image/svg+xml;utf8,${'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 4 3" preserveAspectRatio="xMidYMid slice"><defs><linearGradient id="g" x2="1" y2="1"><stop offset="0" stop-color="#6750A4"/><stop offset="1" stop-color="#7D5260"/></linearGradient></defs><rect width="4" height="3" fill="url(#g)"/><circle cx="3" cy="0.9" r="0.45" fill="#FFD8E4"/></svg>'}`,
};

/** The config's panel: roomy in a wide container, compact in a narrow one. */
export function Panel(props: { children: ReactNode }) {
    const style = useSelectedStyles("panel", {}).styles[""];
    return (
        <View style={style as ViewStyle}>
            <Text style={ownText(style) as TextStyle}>{props.children}</Text>
        </View>
    );
}

/** The config's gradient swatch, drawn with SVG. */
export function Swatch(props: { kind: "linear" | "radial" | "conic" }) {
    const { styles, drawings } = useSelectedStyles("swatch", {
        kind: props.kind,
    });
    const Drawing = useEngine().Drawing;
    return (
        <View
            role="img"
            aria-label={`${props.kind} gradient`}
            style={styles[""] as ViewStyle}
        >
            {Drawing ? <Drawing drawing={drawings[""]} /> : null}
        </View>
    );
}

// The square's two sets of token values, one of each type.
const TWEEN_VALUES = {
    rest: {
        size: 64,
        tint: "rgba(0, 106, 96, 1)",
        turn: "0deg",
        level: 1,
        fill: "20%",
    },
    moved: {
        size: 112,
        tint: "rgba(176, 0, 32, 1)",
        turn: "135deg",
        level: 0.5,
        fill: "90%",
    },
};

function TweensImpl(props: { moved: boolean }) {
    const engine = useEngine();
    const { styles: s } = useComponentSlots("tweens", {
        tokens: TWEEN_VALUES[props.moved ? "moved" : "rest"],
    });
    return (
        <engine.View role="img" aria-label="tweened square" style={s.root}>
            <engine.View style={s.bar} />
        </engine.View>
    );
}

/** The config's square whose typed tokens tween: its size, color, turn, opacity, and bar's
 *  fill move each time `moved` changes. It starts over when the engine changes, whose hooks
 *  differ. */
export const Tweens = withEngine(TweensImpl, "Tweens");
