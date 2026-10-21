// The pureform time input: Material's time picker in its input mode, where the hour and minute
// are typed into two fields.
//
// Markup: the surface holding the headline, the time (the hour and minute fields around a
// separator, each a text input over its label, and the period selector in a 12-hour cycle), and
// the actions.
//
//   <div class={root} role="group" aria-labelledby="headline">
//     <div class={headline} id="headline">Enter time</div>
//     <div class={body}>
//       <label class={hourField}>
//         <input class={input} inputmode="numeric" aria-label="Hour" value="09" />
//         <span class={fieldLabel}>Hour</span>
//       </label>
//       <span class={separator}>:</span>
//       <label class={minuteField}>…</label>
//       <div class={periodSelector} role="group">
//         <button class={period} aria-pressed="true">AM</button>
//         <button class={period} aria-pressed="false">PM</button>
//       </div>
//     </div>
//     <div class={actions}>…</div>
//   </div>

import { typed } from "@pureform/core";
import {
    center,
    column,
    flex,
    none,
    px,
    solid,
    start,
    unitless,
    when,
} from "@pureform/core/ast";
import { spacing, textStyle } from "@pureform/theme";

import { componentTokens, stateTransition, sys } from "./shared";
import { timeSlots, timeTokens } from "./time";

const { tokens, ref } = componentTokens("timeInput", {
    ...timeTokens(),
    // Material's 96 × 72 input fields.
    fieldHeight: px(72),
    fieldFocusOutlineColor: sys("primary"),
    fieldFocusOutlineWidth: px(2),
    fieldLabelColor: sys("onSurfaceVariant"),
    fieldLabelGap: spacing("2"),
});

const pf = typed();

// The hour or minute field: the input over its label.
const field = {
    display: flex,
    flexDirection: column,
    gap: ref("fieldLabelGap"),
};

export const timeInput = pf.slotComponent({
    name: "timeInput",
    $meta: {
        description:
            "Material time input: the headline, the hour and minute typed into two fields, the period selector, and actions.",
    },
    tokens,
    slots: [
        "root",
        "headline",
        "body",
        "hourField",
        "minuteField",
        "input",
        "fieldLabel",
        "separator",
        "periodSelector",
        "period",
        "actions",
    ],
    structure: {
        root: ["headline", "body", "actions"],
        body: ["hourField", "separator", "minuteField", "periodSelector"],
        hourField: ["input", "fieldLabel"],
        periodSelector: ["period"],
    },
    indication: [
        {
            trigger: "period",
            surface: "period",
            centered: false,
            focus: "period",
        },
    ],
    variants: {},
    recipe: () => {
        const shared = timeSlots(ref, ref("fieldHeight"));
        return {
            base: {
                ...shared,
                // The fields sit on the inputs' line, their labels below.
                body: { ...shared.body, alignItems: start },
                separator: { ...shared.separator, height: ref("fieldHeight") },
                hourField: field,
                minuteField: field,
                input: {
                    transition: stateTransition,
                    width: ref("fieldWidth"),
                    height: ref("fieldHeight"),
                    borderRadius: ref("fieldRadius"),
                    borderWidth: px(0),
                    textStyle: textStyle("displayMedium"),
                    textAlign: center,
                    backgroundColor: ref("fieldContainer"),
                    color: ref("fieldContent"),
                    outlineStyle: when("focus", solid, none),
                    outlineWidth: ref("fieldFocusOutlineWidth"),
                    outlineColor: ref("fieldFocusOutlineColor"),
                    outlineOffset: px(0),
                    states: {
                        focus: {
                            backgroundColor: ref("fieldSelectedContainer"),
                            color: ref("fieldSelectedContent"),
                        },
                    },
                },
                fieldLabel: {
                    textStyle: textStyle("bodySmall"),
                    color: ref("fieldLabelColor"),
                    flexShrink: unitless(0),
                },
            },
            variants: {},
            defaultVariants: {},
        };
    },
});
