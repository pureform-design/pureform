import { createProps } from "@zag-js/types";
import { createSplitProps } from "@zag-js/utils";

import type { TextFieldProps } from "./text-field.types";

export const props = createProps<TextFieldProps>()([
    "defaultValue",
    "dir",
    "disabled",
    "form",
    "getRootNode",
    "id",
    "ids",
    "invalid",
    "name",
    "onValueChange",
    "readOnly",
    "required",
    "value",
]);

export const splitProps = createSplitProps<Partial<TextFieldProps>>(props);
