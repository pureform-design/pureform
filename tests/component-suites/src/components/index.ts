// Every component the shared suites run over. Add a component's case here.

import { button } from "./button";
import { checkbox } from "./checkbox";
import { chip } from "./chip";
import { dialog } from "./dialog";
import { fab } from "./fab";
import { iconButton } from "./icon-button";
import { menu } from "./menu";
import { radioGroup } from "./radio-group";
import { select } from "./select";
import { snackbar } from "./snackbar";
import { switchControl } from "./switch";
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
    menu,
    radioGroup,
    select,
    snackbar,
    switchControl,
    textArea,
    textField,
    tooltip,
];

export type * from "./types";
export { byTestId } from "./types";
