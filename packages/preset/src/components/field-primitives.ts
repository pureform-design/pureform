// The plain form primitives: a field, its label, an input or a text area, a description, and an
// error. They're for apps that want the theme without Material's field design (no floating
// label, no filled underline, no notched outline): each has one look and no variants, drawn
// from the theme's color, shape, type, state layer, and focus ring. The design is pureform's
// own; Material's `textField`, `textArea` and `select` don't change.
//
//   <div class={field}>
//     <label class={label} for="name">Name<span class={label.requiredIndicator}>*</span></label>
//     <input class={input} id="name" aria-describedby="name-description name-error" />
//     <span class={description} id="name-description">As on your passport</span>
//     <span class={errorText} id="name-error">Required</span>
//   </div>
//
// The field is spacing only: a column whose pieces stretch to its width. The bindings' `Field`
// connects the rest (the label's `for`, the input's `aria-describedby`, and the disabled,
// invalid, and required states).

import { typed } from "@pureform/core";
import {
    add,
    baseline,
    column,
    flex,
    inlineFlex,
    literal,
    mul,
    px,
    slot,
    unitless,
    vertical,
    when,
} from "@pureform/core/ast";
import type { AliasNode, StyleMap } from "@pureform/core/ast";
import { size as sizeToken, spacing, textStyle } from "@pureform/theme";

import { stateLayer } from "../state-layer";
import { PLAIN_BOX_TOKENS, plainBoxStyle } from "./plain-box";
import type { PlainBoxToken } from "./plain-box";
import {
    componentTokens,
    disabledColor,
    indicationRoot,
    sys,
    THEME_DENSITY,
} from "./shared";

const pf = typed();

// The field: a column, its pieces apart by the gap.
const fieldTokens = componentTokens("field", { gap: spacing("1") });

export const field = pf.slotComponent({
    name: "field",
    $meta: {
        description:
            "Plain form field: a column holding a label, an input or a textarea, a description, and an error. Spacing only; the binding connects the pieces.",
    },
    tokens: fieldTokens.tokens,
    slots: ["root"],
    structure: { root: [] },
    variants: {},
    recipe: () => ({
        base: {
            root: {
                display: flex,
                flexDirection: column,
                gap: fieldTokens.ref("gap"),
            },
        },
        variants: {},
        defaultVariants: {},
    }),
});

const ROOT_DISABLED = slot("root", "disabled");
const ROOT_INVALID = slot("root", "invalid");

// The label: the theme's label type, dimmed while its field is disabled, with a required mark.
const labelTokens = componentTokens("label", {
    color: sys("onSurface"),
    requiredColor: sys("error"),
});

export const label = pf.slotComponent({
    name: "label",
    $meta: {
        description:
            "Plain form label: the theme's label type, dimmed while disabled, and a required mark after the text.",
    },
    tokens: labelTokens.tokens,
    slots: ["root", "requiredIndicator"],
    structure: { root: ["requiredIndicator"] },
    variants: {},
    recipe: () => ({
        base: {
            // A row, so the required mark follows the text in either direction.
            root: {
                display: inlineFlex,
                alignItems: baseline,
                textStyle: textStyle("labelLarge"),
                color: when()
                    .on(ROOT_DISABLED, disabledColor("disabledContent"))
                    .else(labelTokens.ref("color")),
            },
            requiredIndicator: {
                marginInlineStart: spacing("1"),
                color: when()
                    .on(ROOT_DISABLED, disabledColor("disabledContent"))
                    .else(labelTokens.ref("requiredColor")),
            },
        },
        variants: {},
        defaultVariants: {},
    }),
});

// Material's calendar and clock icons (24px), as the date and time inputs' indicators. Each
// hole is cut with the even-odd rule.
const CALENDAR_PATH =
    "M19 4h-1V2h-2v2H8V2H6v2H5C3.89 4 3 4.9 3 6v14a2 2 0 0 0 2 2h14c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zM5 10h14v10H5z";
const CLOCK_PATH =
    "M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 2c4.42 0 8 3.58 8 8s-3.58 8-8 8-8-3.58-8-8 3.58-8 8-8zm.5 3H11v6l5.25 3.15.75-1.23-4.5-2.67z";

const indicator = (path: string): StyleMap => ({
    clipPath: literal(`path(evenodd, "${path}")`),
});

// The outline's width comes out of the block padding, so the box is the text plus the padding;
// the theme's density takes half its offset off each side.
const blockPadding = (ref: (token: BoxToken) => AliasNode) =>
    add(
        ref("paddingBlock"),
        mul(ref("outlineWidth"), unitless(-1)),
        mul(THEME_DENSITY, unitless(0.5)),
    );

type BoxToken = PlainBoxToken | "paddingBlock";

/** Input's and Textarea's box: the plain box, with the state layer of the text color on hover
 *  and press. */
const boxStyle = (ref: (token: BoxToken) => AliasNode): StyleMap => ({
    ...indicationRoot(ref),
    ...plainBoxStyle(ref, {
        hover: slot("root", "hover"),
        invalid: ROOT_INVALID,
        disabled: ROOT_DISABLED,
    }),
    minWidth: px(0),
    marginBlockStart: px(0),
    marginBlockEnd: px(0),
    marginInlineStart: px(0),
    marginInlineEnd: px(0),
    paddingBlockStart: blockPadding(ref),
    paddingBlockEnd: blockPadding(ref),
    paddingInlineEnd: ref("paddingInline"),
    backgroundColor: stateLayer(ref, {
        base: ref("container"),
        content: ref("inputColor"),
    }),
});

const inputTokens = componentTokens("input", {
    ...PLAIN_BOX_TOKENS,
    placeholderColor: sys("onSurfaceVariant"),
    // The date and time pickers' indicator.
    indicatorColor: sys("onSurfaceVariant"),
    indicatorSize: sizeToken("iconMedium"),
    paddingBlock: spacing("2"),
});

export const input = pf.slotComponent({
    name: "input",
    $meta: {
        description:
            "Plain input: a box in the theme's shape with an outline, a state layer and the focus ring; no floating label or underline. The date and time types keep the browser's pickers, with the indicator in the theme's color.",
    },
    tokens: inputTokens.tokens,
    slots: ["root"],
    structure: { root: [] },
    variants: {},
    recipe: () => {
        const ref = inputTokens.ref;
        const picker = (path: string): StyleMap => ({
            ...indicator(path),
            width: ref("indicatorSize"),
            height: ref("indicatorSize"),
            paddingBlockStart: px(0),
            paddingBlockEnd: px(0),
            paddingInlineStart: px(0),
            paddingInlineEnd: px(0),
            backgroundImage: literal("none"),
            backgroundColor: when()
                .on(ROOT_DISABLED, disabledColor("disabledContent"))
                .else(ref("indicatorColor")),
        });
        return {
            base: {
                root: {
                    ...boxStyle(ref),
                    rawRules: {
                        css: {
                            "&::placeholder": {
                                color: ref("placeholderColor"),
                            },
                            "&::-webkit-calendar-picker-indicator":
                                picker(CALENDAR_PATH),
                            "&[type=time]::-webkit-calendar-picker-indicator":
                                indicator(CLOCK_PATH),
                        },
                    },
                },
            },
            variants: {},
            defaultVariants: {},
        };
    },
});

const plainTextareaTokens = componentTokens("plainTextarea", {
    ...PLAIN_BOX_TOKENS,
    placeholderColor: sys("onSurfaceVariant"),
    paddingBlock: spacing("2"),
    // Three lines of the body text, and the padding.
    minHeight: px(88),
});

export const plainTextarea = pf.slotComponent({
    name: "plainTextarea",
    $meta: {
        description:
            "Plain textarea: Input's box over several lines, resizing vertically.",
    },
    tokens: plainTextareaTokens.tokens,
    slots: ["root"],
    structure: { root: [] },
    variants: {},
    recipe: () => {
        const ref = plainTextareaTokens.ref;
        return {
            base: {
                root: {
                    ...boxStyle(ref),
                    minHeight: ref("minHeight"),
                    resize: vertical,
                    rawRules: {
                        css: {
                            "&::placeholder": {
                                color: ref("placeholderColor"),
                            },
                        },
                    },
                },
            },
            variants: {},
            defaultVariants: {},
        };
    },
});

// The supporting lines under the box: the theme's small body type, the description in the
// surface's variant color and the error in the error color.
const supporting = (color: AliasNode): StyleMap => ({
    display: flex,
    flexDirection: column,
    textStyle: textStyle("bodySmall"),
    color,
});

const descriptionTokens = componentTokens("description", {
    color: sys("onSurfaceVariant"),
});

export const description = pf.slotComponent({
    name: "description",
    $meta: {
        description:
            "Plain description: the supporting text under a field's input. Field points the input's aria-describedby at it.",
    },
    tokens: descriptionTokens.tokens,
    slots: ["root"],
    structure: { root: [] },
    variants: {},
    recipe: () => ({
        base: {
            root: {
                ...supporting(descriptionTokens.ref("color")),
            },
        },
        variants: {},
        defaultVariants: {},
    }),
});

const errorTextTokens = componentTokens("errorText", {
    color: sys("error"),
});

export const errorText = pf.slotComponent({
    name: "errorText",
    $meta: {
        description:
            "Plain error text: the message under a field's input while it's invalid. Field points the input's aria-describedby at it.",
    },
    tokens: errorTextTokens.tokens,
    slots: ["root"],
    structure: { root: [] },
    variants: {},
    recipe: () => ({
        base: { root: supporting(errorTextTokens.ref("color")) },
        variants: {},
        defaultVariants: {},
    }),
});
