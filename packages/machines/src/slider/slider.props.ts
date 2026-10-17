import { createProps } from "@zag-js/types";
import { createSplitProps } from "@zag-js/utils";

import type { SliderProps } from "./slider.types";

export const props = createProps<SliderProps>()([
    "defaultValue",
    "dir",
    "disabled",
    "form",
    "getRootNode",
    "id",
    "ids",
    "interactionSource",
    "invalid",
    "max",
    "min",
    "name",
    "onValueChange",
    "readOnly",
    "step",
    "value",
]);

export const splitProps = createSplitProps<Partial<SliderProps>>(props);
