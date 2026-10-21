// Every component the shared suites run over. Add a component's case here.

import { appBar } from "./app-bar";
import { autocomplete } from "./autocomplete";
import { bottomSheet } from "./bottom-sheet";
import { button } from "./button";
import { buttonGroup } from "./button-group";
import { card, cardActionArea } from "./card";
import { carouselCase } from "./carousel";
import { checkbox } from "./checkbox";
import { chip } from "./chip";
import { dialog } from "./dialog";
import { dragHandle } from "./drag-handle";
import { fab } from "./fab";
import { fabMenu, fabMenuItems } from "./fab-menu";
import { fullscreenDialog } from "./fullscreen-dialog";
import { iconButton } from "./icon-button";
import { list, listItem } from "./list";
import { loadingIndicator } from "./loading-indicator";
import { menu } from "./menu";
import { navigationBar, navigationRail } from "./navigation";
import { circularProgress, linearProgress } from "./progress";
import { radioGroup } from "./radio-group";
import { richTooltip } from "./rich-tooltip";
import { searchBar } from "./search-bar";
import { searchView } from "./search-view";
import { select } from "./select";
import { sideSheet } from "./side-sheet";
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
import { toastCase } from "./toast";
import { toolbar } from "./toolbar";
import { tooltip } from "./tooltip";
import type { ComponentCase } from "./types";

export const COMPONENTS: readonly ComponentCase[] = [
    avatar,
    badge,
    bottomSheet,
    button,
    buttonGroup,
    card,
    cardActionArea,
    carouselCase,
    checkbox,
    chip,
    circularProgress,
    loadingIndicator,
    dialog,
    dragHandle,
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
    appBar,
    searchBar,
    searchView,
    select,
    autocomplete,
    separator,
    sideSheet,
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
    toastCase,
    toolbar,
    tooltip,
    touchTarget,
];

export type * from "./types";
export { byTestId } from "./types";
