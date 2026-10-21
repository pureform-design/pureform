import { createProps } from "@zag-js/types";
import { createSplitProps } from "@zag-js/utils";

import type { TableProps } from "./table.types";

export const props = createProps<TableProps>()([
    "defaultSelection",
    "defaultSort",
    "dir",
    "getRootNode",
    "id",
    "ids",
    "onSelectionChange",
    "onSortChange",
    "rows",
    "selection",
    "selectionMode",
    "sort",
    "sortClearable",
    "sortStart",
    "translations",
]);

export const splitProps = createSplitProps<Partial<TableProps>>(props);
