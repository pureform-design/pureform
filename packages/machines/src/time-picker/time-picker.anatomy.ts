import { createAnatomy } from "@zag-js/anatomy";

export const anatomy = createAnatomy("time-picker").parts(
    "root",
    "headline",
    "body",
    "hourSelector",
    "separator",
    "minuteSelector",
    "scrollItem",
    "periodSelector",
    "period",
    "dial",
    "dialTrack",
    "dialHandle",
    "dialCenter",
    "dialLabel",
    "actions",
);
export const parts = anatomy.build();

/** The time input's parts: the time picker's headline, separator, period selector and actions,
 *  with two fields in place of the selectors and the dial. */
export const timeInputAnatomy = createAnatomy("time-input").parts(
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
);
export const inputParts = timeInputAnatomy.build();
