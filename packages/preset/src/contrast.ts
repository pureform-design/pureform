// WCAG contrast between the colors pureform's components draw, under any color theme.
//
// Each pair is a color a component draws and the color it draws it on, named by the
// component's own tokens or by theme roles. A token resolves through its default, so the check
// follows the code and any palette. Text needs WCAG AA's 4.5:1, and the parts that identify a
// control (borders, the switch handle, the checkbox outline) need 3:1. Decorative lines
// (separators, the chip outline, which its label already identifies) are exempt.

import { contrastRatio, resolveColor } from "@pureform/theme";
import type { ColorContract, Scheme } from "@pureform/theme";

/** WCAG AA for text. */
export const TEXT_CONTRAST = 4.5;
/** WCAG AA for the parts that identify a control. */
export const UI_CONTRAST = 3;

/** One side of a pair: a token of the component, or a theme role. */
export type ContrastSide = { token: string } | { role: string };

export interface ContrastPair {
    draw: ContrastSide;
    on: ContrastSide;
    minimum: number;
}

const pair = (
    draw: ContrastSide,
    on: ContrastSide,
    minimum: number,
): ContrastPair => ({ draw, on, minimum });

const token = (name: string): ContrastSide => ({ token: name });
const role = (name: string): ContrastSide => ({ role: name });
const SURFACE = role("surface");

const FIELD_PAIRS = [
    pair(token("inputColor"), token("container"), TEXT_CONTRAST),
    pair(token("labelColor"), token("container"), TEXT_CONTRAST),
    pair(token("focusColor"), token("container"), TEXT_CONTRAST),
    pair(token("errorColor"), token("container"), TEXT_CONTRAST),
    pair(token("inputColor"), SURFACE, TEXT_CONTRAST),
    pair(token("labelColor"), SURFACE, TEXT_CONTRAST),
    pair(token("supportingColor"), SURFACE, TEXT_CONTRAST),
    pair(token("errorColor"), SURFACE, TEXT_CONTRAST),
    pair(token("indicatorColor"), token("container"), UI_CONTRAST),
    pair(token("outlineColor"), SURFACE, UI_CONTRAST),
];

// A list or menu row: text on its container, selected or not.
const ROW_PAIRS = [
    pair(token("content"), token("container"), TEXT_CONTRAST),
    pair(token("supportingColor"), token("container"), TEXT_CONTRAST),
    pair(token("trailingColor"), token("container"), TEXT_CONTRAST),
    pair(token("iconColor"), token("container"), UI_CONTRAST),
    pair(token("selectedContent"), token("selectedContainer"), TEXT_CONTRAST),
];

// A navigation destination: its label on the container, and its icon on the pill or the
// container.
const NAV_PAIRS = [
    pair(token("labelColor"), token("container"), TEXT_CONTRAST),
    pair(token("activeLabelColor"), token("container"), TEXT_CONTRAST),
    pair(token("iconColor"), token("container"), UI_CONTRAST),
    pair(token("activeIconColor"), token("indicatorColor"), UI_CONTRAST),
];

/** The pairs each component draws, by component name. */
export const COMPONENT_CONTRAST: Record<string, ContrastPair[]> = {
    chip: [
        pair(token("content"), SURFACE, TEXT_CONTRAST),
        pair(token("content"), token("elevatedContainer"), TEXT_CONTRAST),
        pair(
            token("selectedContent"),
            token("selectedContainer"),
            TEXT_CONTRAST,
        ),
        pair(token("iconColor"), SURFACE, UI_CONTRAST),
    ],
    avatar: [pair(token("content"), token("container"), TEXT_CONTRAST)],
    // The card's text on each fill's container.
    card: (
        ["elevatedContainer", "filledContainer", "outlinedContainer"] as const
    ).flatMap((container) =>
        (
            [
                "content",
                "headlineColor",
                "subheadColor",
                "supportingTextColor",
            ] as const
        ).map((text) => pair(token(text), token(container), TEXT_CONTRAST)),
    ),
    listItem: ROW_PAIRS,
    menu: ROW_PAIRS,
    tabs: [
        pair(token("content"), token("container"), TEXT_CONTRAST),
        pair(token("activeColor"), token("container"), TEXT_CONTRAST),
        pair(token("secondaryActiveColor"), token("container"), TEXT_CONTRAST),
        pair(token("indicatorColor"), token("container"), UI_CONTRAST),
    ],
    dialog: [
        pair(token("headlineColor"), token("container"), TEXT_CONTRAST),
        pair(token("bodyColor"), token("container"), TEXT_CONTRAST),
        pair(token("iconColor"), token("container"), UI_CONTRAST),
    ],
    searchBar: [
        pair(token("inputColor"), token("container"), TEXT_CONTRAST),
        pair(token("placeholderColor"), token("container"), TEXT_CONTRAST),
        pair(token("leadingColor"), token("container"), UI_CONTRAST),
        pair(token("trailingColor"), token("container"), UI_CONTRAST),
    ],
    navigationBar: NAV_PAIRS,
    navigationRail: NAV_PAIRS,
    snackbar: [
        pair(token("content"), token("container"), TEXT_CONTRAST),
        pair(token("actionColor"), token("container"), TEXT_CONTRAST),
    ],
    tooltip: [
        pair(token("content"), token("container"), TEXT_CONTRAST),
        pair(token("richContent"), token("richContainer"), TEXT_CONTRAST),
        pair(token("subheadColor"), token("richContainer"), TEXT_CONTRAST),
    ],
    slider: [
        pair(token("activeColor"), SURFACE, UI_CONTRAST),
        pair(token("activeColor"), token("trackColor"), UI_CONTRAST),
    ],
    linearProgress: [
        pair(token("activeColor"), token("trackColor"), UI_CONTRAST),
    ],
    circularProgress: [pair(token("activeColor"), SURFACE, UI_CONTRAST)],
    textField: FIELD_PAIRS,
    textArea: FIELD_PAIRS,
    select: FIELD_PAIRS,
    supportingText: [
        pair(token("color"), SURFACE, TEXT_CONTRAST),
        pair(token("errorColor"), SURFACE, TEXT_CONTRAST),
    ],
    checkbox: [
        pair(token("borderColor"), SURFACE, UI_CONTRAST),
        pair(token("checkedColor"), SURFACE, UI_CONTRAST),
        pair(token("iconColor"), token("checkedColor"), UI_CONTRAST),
        pair(token("errorIconColor"), token("errorColor"), UI_CONTRAST),
    ],
    radio: [
        pair(token("borderColor"), SURFACE, UI_CONTRAST),
        pair(token("checkedColor"), SURFACE, UI_CONTRAST),
    ],
    switchControl: [
        pair(token("outlineColor"), SURFACE, UI_CONTRAST),
        pair(token("handleColor"), token("trackColor"), UI_CONTRAST),
        pair(
            token("checkedHandleColor"),
            token("checkedTrackColor"),
            UI_CONTRAST,
        ),
        pair(token("checkedTrackColor"), SURFACE, UI_CONTRAST),
        pair(token("iconColor"), token("checkedHandleColor"), UI_CONTRAST),
    ],
};

const capitalize = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

/** The pairs every color group is drawn in by the color variants: the group as text on the
 *  surface (supporting text tones), its container pair as text (selected chips), and its `on`
 *  color on it as a control part (checkbox marks, switch handles). */
export const groupContrast = (group: string): ContrastPair[] => {
    const on = `on${capitalize(group)}`;
    return [
        pair(role(group), SURFACE, TEXT_CONTRAST),
        pair(role(`${on}Container`), role(`${group}Container`), TEXT_CONTRAST),
        pair(role(on), role(group), UI_CONTRAST),
    ];
};

export interface ComponentContrastFailure {
    /** The component, or `group <name>` for a color group's pairs. */
    source: string;
    draw: string;
    on: string;
    scheme: Scheme;
    ratio: number;
    minimum: number;
}

type TokenSpec = { tokens?: Record<string, unknown> };

const label = (side: ContrastSide) =>
    "token" in side ? side.token : side.role;

/** Every component and color group pair below its minimum in either scheme. A component whose
 *  tokens lack a pair's token (a replacement under the same name) skips that pair, and so does
 *  a pair whose colors cannot be evaluated, such as a mix. */
export const componentContrastFailures = (
    color: ColorContract<string>,
    components: Record<string, TokenSpec | undefined>,
): ComponentContrastFailure[] => {
    const resolve = (
        spec: TokenSpec | undefined,
        side: ContrastSide,
        scheme: Scheme,
    ) => {
        if ("role" in side) {
            return resolveColor(color, color.roles[side.role], scheme);
        }
        const node = spec?.tokens?.[side.token] as
            | { default?: unknown }
            | undefined;
        return node && resolveColor(color, node.default, scheme);
    };

    const sources: [string, TokenSpec | undefined, ContrastPair[]][] = [
        ...Object.entries(COMPONENT_CONTRAST)
            .filter(([name]) => components[name])
            .map(
                ([name, pairs]): [
                    string,
                    TokenSpec | undefined,
                    ContrastPair[],
                ] => [name, components[name], pairs],
            ),
        ...color.groups.map((group): [string, undefined, ContrastPair[]] => [
            `group ${group}`,
            undefined,
            groupContrast(group),
        ]),
    ];

    const failures: ComponentContrastFailure[] = [];
    for (const [source, spec, pairs] of sources) {
        for (const { draw, on, minimum } of pairs) {
            for (const scheme of ["light", "dark"] as const) {
                const fg = resolve(spec, draw, scheme);
                const bg = resolve(spec, on, scheme);
                const ratio = fg && bg ? contrastRatio(fg, bg) : undefined;
                if (ratio !== undefined && ratio < minimum) {
                    failures.push({
                        source,
                        draw: label(draw),
                        on: label(on),
                        scheme,
                        ratio,
                        minimum,
                    });
                }
            }
        }
    }
    return failures;
};
