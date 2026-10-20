// Every component the shared suites run over. Add a component's case here.

import { button } from "./button";
import { buttonGroup } from "./button-group";
import { card, cardActionArea } from "./card";
import { checkbox } from "./checkbox";
import { chip } from "./chip";
import { dialog } from "./dialog";
import { fab } from "./fab";
import { fabMenu, fabMenuItems } from "./fab-menu";
import { fullscreenDialog } from "./fullscreen-dialog";
import { iconButton } from "./icon-button";
import { list, listItem } from "./list";
import { menu } from "./menu";
import { navigationBar, navigationRail } from "./navigation";
import { circularProgress, linearProgress } from "./progress";
import { radioGroup } from "./radio-group";
import { richTooltip } from "./rich-tooltip";
import { searchBar } from "./search-bar";
import { select } from "./select";
import { slider } from "./slider";
import { snackbar } from "./snackbar";
import { splitButton } from "./split-button";
import {
    avatar,
    badge,
    icon,
    media,
    ripple,
    scrim,
    separator,
    supportingText,
    text,
    touchTarget,
} from "./static";
import { switchControl } from "./switch";
import { tabsCase } from "./tabs";
import { tagsInput } from "./tags-input";
import { textArea } from "./text-area";
import { textField } from "./text-field";
import { tooltip } from "./tooltip";
import type { ComponentCase } from "./types";

export const COMPONENTS: readonly ComponentCase[] = [
    avatar,
    badge,
    button,
    buttonGroup,
    card,
    cardActionArea,
    checkbox,
    chip,
    circularProgress,
    dialog,
    fab,
    fullscreenDialog,
    fabMenu,
    fabMenuItems,
    icon,
    iconButton,
    linearProgress,
    list,
    listItem,
    media,
    menu,
    navigationBar,
    navigationRail,
    radioGroup,
    richTooltip,
    ripple,
    scrim,
    searchBar,
    select,
    separator,
    slider,
    snackbar,
    splitButton,
    supportingText,
    switchControl,
    tabsCase,
    tagsInput,
    text,
    textArea,
    textField,
    tooltip,
    touchTarget,
];

export type * from "./types";
export { byTestId } from "./types";
