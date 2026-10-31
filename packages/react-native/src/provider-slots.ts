// Provider keys follow the instance's anatomy parts, so one vocabulary reaches a part from a
// provider and from an instance. Reuse the component's host declarations; this file has no
// runtime imports of components.
import type { ComponentName, SlotOf } from "@pureform/styling";

import type {
    NativeHost,
    NativePartProps,
    NativePartStyle,
} from "./slot-props";

interface ComponentHosts {
    button: import("./button/button").ButtonHosts;
    iconButton: import("./icon-button/icon-button").IconButtonHosts;
    fab: import("./fab/fab").FabHosts;
    chip: import("./chip/chip").ChipHosts;
    inputChip: import("./tags-input/tags-input").InputChipHosts;
    checkbox: import("./checkbox/checkbox").CheckboxHosts;
    radio: import("./radio-group/radio-group").RadioHosts;
    radioGroup: import("./radio-group/radio-group").RadioGroupHosts;
    switchControl: import("./switch/switch").SwitchHosts;
    slider: import("./slider/slider").SliderHosts;
    textField: import("./text-input").FieldHosts;
    textArea: import("./text-input").FieldHosts;
    select: import("./text-input").FieldHosts;
    autocomplete: import("./text-input").FieldHosts;
    nativeSelect: import("./native-select/native-select").NativeSelectHosts;
    field: import("./field/field").FieldHosts;
    label: import("./label/label").LabelHosts;
    description: import("./description/description").DescriptionHosts;
    errorText: import("./error-text/error-text").ErrorTextHosts;
    text: import("./single-part").TextHosts;
    avatar: import("./single-part").AvatarHosts;
    badge: import("./single-part").BadgeHosts;
    icon: import("./single-part").IconHosts;
    separator: import("./single-part").SeparatorHosts;
    supportingText: import("./single-part").SupportingTextHosts;
    scrim: import("./single-part").ScrimHosts;
    media: import("./single-part").MediaHosts;
    touchTarget: import("./touch-target/touch-target").TouchTargetHosts;
    dragHandle: import("./drag-handle/drag-handle").DragHandleHosts;
    card: import("./card/card").CardRootHosts;
    gridList: import("./grid-list/grid-list").GridListRootHosts;
    list: import("./list/list").ListHosts;
    listItem: import("./list-item/list-item").ListItemHosts;
    chipSet: import("./chip-set/chip-set").ChipSetHosts;
    buttonGroup: import("./button-group/button-group").ButtonGroupHosts;
    splitButton: import("./split-button/split-button").SplitButtonHosts;
    toolbar: import("./toolbar/toolbar").ToolbarHosts;
    tabs: import("./navigation").TabsHosts;
    navigationBar: import("./navigation").NavigationHosts;
    navigationRail: import("./navigation").NavigationRailHosts;
    appBar: import("./app-bar/app-bar").AppBarHosts;
    menu: import("./menu/menu").MenuHosts;
    dialog: import("./dialog/dialog").DialogHosts;
    fullscreenDialog: import("./fullscreen-dialog/fullscreen-dialog").FullscreenDialogHosts;
    popover: import("./popover/popover").PopoverHosts;
    tooltip: import("./tooltip/tooltip").TooltipHosts;
    richTooltip: import("./rich-tooltip/rich-tooltip").RichTooltipHosts;
    bottomSheet: import("./bottom-sheet/bottom-sheet").BottomSheetHosts;
    sideSheet: import("./side-sheet/side-sheet").SideSheetHosts;
    searchBar: import("./search-bar/search-bar").SearchBarHosts;
    searchView: import("./search-view/search-view").SearchViewHosts;
    snackbar: import("./snackbar/snackbar").SnackbarHosts;
    toast: import("./toast/toast").ToasterHosts;
    fabMenu: import("./fab-menu/fab-menu").FabMenuHosts;
    linearProgress: import("./progress").LinearProgressHosts;
    circularProgress: import("./progress").CircularProgressHosts;
    loadingIndicator: import("./loading-indicator/loading-indicator").LoadingIndicatorHosts;
    dateInput: import("./date-input/date-input").DateInputHosts;
    datePicker: import("./date-picker/date-picker").DatePickerHosts;
    calendarCell: { readonly root: "View"; readonly trigger: "Pressable" };
    dockedDatePicker: import("./docked-date-picker/docked-date-picker").DockedDatePickerHosts;
    timeInput: import("./time-input/time-input").TimeInputHosts;
    timePicker: import("./time-picker/time-picker").TimePickerHosts;
    accordion: import("./accordion/accordion").AccordionHosts;
    carousel: import("./carousel/carousel").CarouselHosts;
    paginator: import("./paginator/paginator").PaginatorHosts;
    stepper: import("./stepper/stepper").StepperHosts;
    dataTable: import("./table/table").TableHosts;
    tree: import("./tree/tree").TreeHosts;
    fadeThrough: import("./fade-through/fade-through").FadeThroughHosts;
    horizontalSharedAxis: import("./horizontal-shared-axis/horizontal-shared-axis").HorizontalSharedAxisHosts;
    splitter: import("./splitter/splitter").SplitterHosts;
    codeField: import("./code-field/code-field").CodeFieldHosts;
    colorPicker: import("./color-picker/color-picker").ColorPickerHosts;
    fileUpload: import("./file-upload/file-upload").FileUploadHosts;
    numberField: import("./number-field/number-field").NumberFieldHosts;
    rating: import("./rating/rating").RatingHosts;
}

/** Native host props (including style), keyed by component and anatomy part, as an instance's
 *  `style` and `slotProps` are and as the web providers' are: the surface of an overlay is
 *  `content`, its backdrop `backdrop`, a date picker's cells `cell`. Native has no wrapper `root`
 *  or `positioner` around an overlay, so those keys aren't offered. */
export type NativeProviderSlotProps = {
    readonly [N in Extract<keyof ComponentHosts, ComponentName>]?: {
        readonly [S in keyof ComponentHosts[N]]?: NativePartProps<
            Extract<ComponentHosts[N][S], NativeHost>
        > & {
            readonly style?: NativePartStyle<
                Extract<ComponentHosts[N][S], NativeHost>
            >;
        };
    };
} & {
    readonly [N in Exclude<ComponentName, keyof ComponentHosts>]?: {
        readonly [S in SlotOf<N>]?: object;
    };
};
