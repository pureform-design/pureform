import { createProps } from "@zag-js/types";
import { createSplitProps } from "@zag-js/utils";

import type { NavigationProps } from "./navigation.types";

export const props = createProps<NavigationProps>()([
    "defaultValue",
    "dir",
    "disabled",
    "getRootNode",
    "id",
    "ids",
    "onValueChange",
    "value",
]);

export const splitProps = createSplitProps<Partial<NavigationProps>>(props);
