import { createProps } from "@zag-js/types";
import { createSplitProps } from "@zag-js/utils";

import type { TextFieldProps } from "./text-field.types";

export const props = createProps<TextFieldProps>()([
    "counterMax",
    "defaultValue",
    "dir",
    "disabled",
    "error",
    "form",
    "getRootNode",
    "id",
    "ids",
    "invalid",
    "name",
    "onValueChange",
    "placeholder",
    "readOnly",
    "required",
    "revealLabel",
    "secure",
    "validate",
    "value",
]);

export const splitProps = createSplitProps<Partial<TextFieldProps>>(props);
