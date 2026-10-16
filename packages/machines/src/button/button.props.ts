import { createProps } from "@zag-js/types";
import { createSplitProps } from "@zag-js/utils";

import type { ButtonProps } from "./button.types";

export const props = createProps<ButtonProps>()([
    "defaultSelected",
    "dir",
    "disabled",
    "form",
    "getRootNode",
    "id",
    "ids",
    "name",
    "onSelectedChange",
    "selected",
    "toggle",
    "type",
    "value",
]);

export const splitProps = createSplitProps<Partial<ButtonProps>>(props);
