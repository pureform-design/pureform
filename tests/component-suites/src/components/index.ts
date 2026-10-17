// Every component the shared suites run over. Add a component's case here.

import { button } from "./button";
import { checkbox } from "./checkbox";
import { chip } from "./chip";
import { fab } from "./fab";
import { iconButton } from "./icon-button";
import { radioGroup } from "./radio-group";
import { select } from "./select";
import { switchControl } from "./switch";
import { textArea } from "./text-area";
import { textField } from "./text-field";
import type { ComponentCase } from "./types";

export const COMPONENTS: readonly ComponentCase[] = [
    button,
    checkbox,
    chip,
    fab,
    iconButton,
    radioGroup,
    select,
    switchControl,
    textArea,
    textField,
];

export type * from "./types";
export { byTestId } from "./types";
