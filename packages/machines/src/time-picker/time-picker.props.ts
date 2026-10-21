import { createProps } from "@zag-js/types";
import { createSplitProps } from "@zag-js/utils";

import type { TimePickerProps } from "./time-picker.types";

export const props = createProps<TimePickerProps>()([
    "defaultValue",
    "defaultView",
    "dir",
    "disabled",
    "form",
    "getRootNode",
    "hourCycle",
    "id",
    "ids",
    "locale",
    "name",
    "onValueChange",
    "onViewChange",
    "readOnly",
    "translations",
    "value",
    "view",
]);

export const splitProps = createSplitProps<Partial<TimePickerProps>>(props);
