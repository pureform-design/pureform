// Every component the shared suites run over. Add a component's case here.

import { button } from "./button";
import { checkbox } from "./checkbox";
import { chip } from "./chip";
import { dialog } from "./dialog";
import { fab } from "./fab";
import { iconButton } from "./icon-button";
import { list, listItem } from "./list";
import { menu } from "./menu";
import { navigationBar, navigationRail } from "./navigation";
import { radioGroup } from "./radio-group";
import { select } from "./select";
import { snackbar } from "./snackbar";
import { switchControl } from "./switch";
import { tabsCase } from "./tabs";
import { textArea } from "./text-area";
import { textField } from "./text-field";
import { tooltip } from "./tooltip";
import type { ComponentCase } from "./types";

export const COMPONENTS: readonly ComponentCase[] = [
    button,
    checkbox,
    chip,
    dialog,
    fab,
    iconButton,
    list,
    listItem,
    menu,
    navigationBar,
    navigationRail,
    radioGroup,
    select,
    snackbar,
    switchControl,
    tabsCase,
    textArea,
    textField,
    tooltip,
];

export type * from "./types";
export { byTestId } from "./types";
