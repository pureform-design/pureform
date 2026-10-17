import { createProps } from "@zag-js/types";
import { createSplitProps } from "@zag-js/utils";

import type { SnackbarProps } from "./snackbar.types";

export const props = createProps<SnackbarProps>()([
    "defaultOpen",
    "dir",
    "duration",
    "getRootNode",
    "id",
    "ids",
    "onAction",
    "onOpenChange",
    "open",
]);

export const splitProps = createSplitProps<Partial<SnackbarProps>>(props);
