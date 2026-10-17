// The components with no state and nothing focus reaches: the ripple layer, and the single-part
// avatar, media, separator, scrim, supporting text, text, icon, and touch target. The suites check
// their markup (axe, server rendering), direction, and themes. Those the scheme doesn't color are
// `themed: false`.

import { testIds } from "@pureform/anatomy";

import type { ComponentCase } from "./types";

/** A 4 by 3 picture, so the image has a size before and without loading anything. */
const PICTURE = `data:image/svg+xml,${encodeURIComponent(
    "<svg xmlns='http://www.w3.org/2000/svg' width='40' height='30'><rect width='40' height='30' fill='teal'/></svg>",
)}`;

export const avatar: ComponentCase = {
    component: "Avatar",
    props: { label: "Ada Lovelace", children: "AL" },
    root: testIds.avatar.root,
    examples: {
        initials: {},
        small: { size: "small" },
        large: { size: "large" },
        "secondary color": { color: "secondary" },
        shaped: { shape: "cookie9Sided" },
        picture: { src: PICTURE, children: undefined },
        decorative: { label: undefined },
    },
};

export const media: ComponentCase = {
    component: "Media",
    props: { src: PICTURE, alt: "A teal square" },
    root: testIds.media.root,
    examples: {
        auto: {},
        square: { aspect: "square" },
        landscape: { aspect: "landscape" },
        portrait: { aspect: "portrait" },
        shaped: { aspect: "square", shape: "cookie9Sided" },
        decorative: { alt: "" },
    },
};

export const separator: ComponentCase = {
    component: "Separator",
    props: {},
    root: testIds.separator.root,
    examples: {
        full: {},
        "inset at the start": { inset: "start" },
        "inset on both sides": { inset: "middle" },
        "as a div": { as: "div" },
    },
};

export const scrim: ComponentCase = {
    component: "Scrim",
    props: {},
    root: testIds.scrim.root,
    examples: { scrim: {} },
    // The scrim color is black in every theme.
    themed: false,
};

export const supportingText: ComponentCase = {
    component: "SupportingText",
    props: { children: "We'll never share your email" },
    root: testIds.supportingText.root,
    examples: {
        neutral: {},
        error: { tone: "error", children: "Enter a valid email" },
        primary: { tone: "primary" },
    },
};

export const text: ComponentCase = {
    component: "Text",
    props: { children: "Inbox" },
    root: testIds.text.root,
    examples: {
        "body medium": {},
        "title large": { textStyle: "titleLarge" },
        "a heading": { textStyle: "headlineSmall", as: "h2" },
        "a theme's own style": { textStyle: "code" },
    },
    // Text takes the color around it.
    themed: false,
};

export const icon: ComponentCase = {
    component: "Icon",
    props: { children: "★", color: "primary" },
    root: testIds.icon.root,
    examples: {
        medium: {},
        small: { size: "small" },
        large: { size: "large" },
        "the current color": { color: "current" },
        labeled: { label: "Favorite" },
        filled: { filled: "true" },
        "an icon that points": { children: "→", mirror: true },
    },
};

export const touchTarget: ComponentCase = {
    component: "TouchTarget",
    props: {},
    root: testIds.touchTarget.root,
    examples: { "touch target": {} },
    // Invisible.
    themed: false,
};

export const ripple: ComponentCase = {
    component: "Ripple",
    props: {},
    root: testIds.ripple.root,
    examples: { layer: {}, centered: { centered: true } },
    // The ripple takes its surface's text color.
    themed: false,
};
