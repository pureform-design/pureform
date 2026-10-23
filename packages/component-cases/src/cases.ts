// Every component the cases cover. Add a component's case here.

import { appBar } from "./cases/app-bar";
import { autocomplete } from "./cases/autocomplete";
import { bottomSheet } from "./cases/bottom-sheet";
import { button } from "./cases/button";
import { buttonGroup } from "./cases/button-group";
import { card, cardActionArea } from "./cases/card";
import { carouselCase } from "./cases/carousel";
import { checkbox } from "./cases/checkbox";
import { chip } from "./cases/chip";
import { chipSet } from "./cases/chip-set";
import { dateInput, datePicker, dockedDatePicker } from "./cases/date-pickers";
import { dialog } from "./cases/dialog";
import { dragHandle } from "./cases/drag-handle";
import { accordionCase, treeCase } from "./cases/expandable";
import { fab } from "./cases/fab";
import { fabMenu, fabMenuItems } from "./cases/fab-menu";
import { fadeThrough } from "./cases/fade-through";
import { fullscreenDialog } from "./cases/fullscreen-dialog";
import { gridList } from "./cases/grid-list";
import { iconButton } from "./cases/icon-button";
import { expandableListItem, list, listItem } from "./cases/list";
import { loadingIndicator } from "./cases/loading-indicator";
import { menu } from "./cases/menu";
import { navigationBar, navigationRail } from "./cases/navigation";
import { paginator } from "./cases/paginator";
import { popover } from "./cases/popover";
import { circularProgress, linearProgress } from "./cases/progress";
import { radioGroup } from "./cases/radio-group";
import { richTooltip } from "./cases/rich-tooltip";
import { searchBar } from "./cases/search-bar";
import { searchView } from "./cases/search-view";
import { select } from "./cases/select";
import { selectionList } from "./cases/selection-list";
import { sideSheet } from "./cases/side-sheet";
import { slider } from "./cases/slider";
import { snackbar } from "./cases/snackbar";
import { splitButton } from "./cases/split-button";
import { splitter } from "./cases/splitter";
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
} from "./cases/static";
import { stepper } from "./cases/stepper";
import { switchControl } from "./cases/switch";
import { table } from "./cases/table";
import { tabsCase } from "./cases/tabs";
import { tagsInput } from "./cases/tags-input";
import { textArea } from "./cases/text-area";
import { textField } from "./cases/text-field";
import { timeInput, timePicker } from "./cases/time-picker";
import { toastCase } from "./cases/toast";
import { toolbar } from "./cases/toolbar";
import { tooltip } from "./cases/tooltip";
import type { ComponentCase } from "./types";

/** Every component the cases cover. Call `createCases(userEvent)` before running their actions. */
export const COMPONENTS: readonly ComponentCase[] = [
    avatar,
    badge,
    bottomSheet,
    button,
    buttonGroup,
    card,
    cardActionArea,
    carouselCase,
    accordionCase,
    treeCase,
    checkbox,
    chip,
    chipSet,
    circularProgress,
    loadingIndicator,
    dialog,
    dragHandle,
    splitter,
    fab,
    fadeThrough,
    fullscreenDialog,
    fabMenu,
    fabMenuItems,
    gridList,
    icon,
    iconButton,
    linearProgress,
    list,
    listItem,
    expandableListItem,
    media,
    menu,
    navigationBar,
    navigationRail,
    radioGroup,
    popover,
    richTooltip,
    ripple,
    scrim,
    appBar,
    paginator,
    timePicker,
    timeInput,
    searchBar,
    searchView,
    select,
    selectionList,
    autocomplete,
    datePicker,
    dockedDatePicker,
    dateInput,
    separator,
    sideSheet,
    slider,
    snackbar,
    stepper,
    splitButton,
    supportingText,
    switchControl,
    tabsCase,
    table,
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
