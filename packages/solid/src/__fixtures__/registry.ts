// A fake registry for the specs: button and checkbox classes that name the selection, so a test can
// read what the factory was given, plus a lazy chip whose loader the test controls.

import { createRegistry, withTokenStyle } from "@pureform/styling";
import type {
    ClassFactory,
    ComponentShape,
    Selection,
} from "@pureform/styling";

export type ButtonShape = {
    variants: { variant: "filled" | "text"; size: "small" | "large" };
    slots: "root" | "label" | "icon" | "touchTarget";
    tokens: "radius";
};

export type ChipShape = {
    variants: { variant: "assist" | "filter" };
    slots: "root" | "label";
    lazy: true;
} & ComponentShape;

const vars = { radius: "--pf-button-radius" } as const;

export const button: ClassFactory<ButtonShape> = (s) =>
    withTokenStyle(
        {
            root: {
                class: `button button--${String(s.variant ?? "filled")} button--${String(s.size ?? "small")}`,
            },
            label: { class: "button__label" },
            icon: { class: "button__icon" },
            touchTarget: { class: "button__touch-target" },
        },
        s.tokens,
        vars,
    );

export type CheckboxShape = {
    variants: { color: "primary" | "error" };
    slots:
        | "root"
        | "touchTarget"
        | "input"
        | "box"
        | "checkIcon"
        | "indeterminateIcon";
    tokens: "boxSize";
};

export const checkbox: ClassFactory<CheckboxShape> = (s) =>
    withTokenStyle(
        {
            root: {
                class: `checkbox checkbox--${String(s.color ?? "primary")}`,
            },
            touchTarget: { class: "checkbox__touch-target" },
            input: { class: "checkbox__input" },
            box: { class: "checkbox__box" },
            checkIcon: { class: "checkbox__check-icon" },
            indeterminateIcon: { class: "checkbox__indeterminate-icon" },
        },
        s.tokens,
        { boxSize: "--pf-checkbox-box-size" },
    );

export const chip: ClassFactory<ChipShape> = (s) => ({
    root: { class: `chip chip--${String(s.variant ?? "assist")}` },
    label: { class: "chip__label" },
});

/** A loader the test resolves by hand, counting its calls. */
export const deferredLoader = () => {
    let resolve!: (module: { chip: typeof chip }) => void;
    const promise = new Promise<{ chip: typeof chip }>((r) => {
        resolve = r;
    });
    const loader = { calls: 0, resolve: () => resolve({ chip }) };
    return {
        loader,
        lazy: () => {
            loader.calls++;
            return promise;
        },
    };
};

export const fakeRegistry = (lazy: () => Promise<unknown>) =>
    createRegistry({ button, checkbox, chip: { lazy } });

/** A static factory whose root class names the component and its selection
 *  (`icon-button icon-button--variant-filled icon-button--toggle-true`), and each other slot
 *  `<component>__<slot>`. */
const named =
    (
        component: string,
        slots: readonly string[],
    ): ClassFactory<ComponentShape> =>
    (s) => {
        const selected = Object.entries(s)
            .filter(([key, value]) => key !== "tokens" && value !== undefined)
            .map(([key, value]) => `${component}--${key}-${String(value)}`);
        return Object.fromEntries(
            slots.map((slot) => [
                slot,
                {
                    class:
                        slot === "root"
                            ? [component, ...selected].join(" ")
                            : `${component}__${slot}`,
                },
            ]),
        ) as never;
    };

/** The toggles' fake factories, all static: the switch, radio, chip, icon button, and FAB. */
export const togglesRegistry = () =>
    createRegistry({
        switchControl: named("switch", [
            "root",
            "touchTarget",
            "input",
            "track",
            "stateLayer",
            "handle",
            "icon",
        ]),
        radio: named("radio", ["root", "touchTarget", "input", "ring", "dot"]),
        chip: named("chip", ["root", "icon", "label", "touchTarget"]),
        iconButton: named("icon-button", [
            "root",
            "touchTarget",
            "container",
            "icon",
            "outline",
        ]),
        fab: named("fab", [
            "root",
            "touchTarget",
            "container",
            "icon",
            "label",
        ]),
    });

const FIELD_SLOTS = [
    "root",
    "container",
    "leadingIcon",
    "prefixText",
    "input",
    "suffixText",
    "label",
    "trailingIcon",
    "supportingText",
    "counter",
] as const;

/** The text inputs' fake factories, all static: the text field, text area, select, tags input
 *  with its input chips, and the menu the select draws its list with. */
export const textInputsRegistry = () =>
    createRegistry({
        textField: named("text-field", FIELD_SLOTS),
        textArea: named("text-area", FIELD_SLOTS),
        select: named("select", FIELD_SLOTS),
        autocomplete: named("autocomplete", FIELD_SLOTS),
        tagsInput: named("tags-input", FIELD_SLOTS),
        numberField: named("number-field", [
            "root",
            "container",
            "leadingIcon",
            "prefixText",
            "input",
            "suffixText",
            "label",
            "control",
            "decrementTrigger",
            "incrementTrigger",
            "supportingText",
        ]),
        codeField: named("code-field", [
            "root",
            "label",
            "control",
            "input",
            "supportingText",
        ]),
        inputChip: named("input-chip", [
            "root",
            "avatar",
            "icon",
            "label",
            "remove",
            "touchTarget",
        ]),
        menu: named("menu", [
            "root",
            "itemGroup",
            "itemGroupLabel",
            "item",
            "itemLabel",
        ]),
    });

/** The overlays' fake factories, all static: the menu, tooltip, dialog, full-screen dialog,
 *  scrim, and snackbar, and the buttons their ready-made triggers and close triggers draw. */
export const overlaysRegistry = () =>
    createRegistry({
        menu: named("menu", [
            "root",
            "itemGroup",
            "itemGroupLabel",
            "item",
            "itemLeading",
            "itemContent",
            "itemLabel",
            "itemSupportingText",
            "itemTrailing",
            "itemTrailingText",
        ]),
        splitButton: named("split-button", [
            "root",
            "leadingButton",
            "trailingButton",
            "trailingIcon",
        ]),
        // The list's item count is a token, which the root's style shows.
        fabMenu: ((s) =>
            withTokenStyle(
                named("fab-menu", [
                    "root",
                    "list",
                    "item",
                    "itemIcon",
                    "itemLabel",
                    "closeTrigger",
                ])(s) as never,
                s.tokens as never,
                { itemCount: "--pf-fab-menu-item-count" },
            )) as ClassFactory<ComponentShape>,
        tooltip: named("tooltip", ["root", "caret", "supportingText"]),
        richTooltip: named("richTooltip", [
            "root",
            "caret",
            "subhead",
            "supportingText",
            "actions",
        ]),
        popover: named("popover", [
            "root",
            "caret",
            "title",
            "body",
            "actions",
        ]),
        dialog: named("dialog", [
            "root",
            "icon",
            "headline",
            "body",
            "actions",
        ]),
        fullscreenDialog: named("fullscreen-dialog", [
            "root",
            "header",
            "closeTrigger",
            "headline",
            "confirmAction",
            "body",
        ]),
        bottomSheet: named("bottom-sheet", ["root", "dragHandle", "content"]),
        sideSheet: named("side-sheet", [
            "root",
            "header",
            "backButton",
            "headline",
            "closeTrigger",
            "content",
            "actions",
        ]),
        dragHandle: named("drag-handle", ["root", "handle"]),
        iconButton: named("icon-button", [
            "root",
            "touchTarget",
            "container",
            "icon",
            "outline",
        ]),
        scrim: named("scrim", ["root"]),
        searchView: named("search-view", [
            "root",
            "header",
            "leading",
            "input",
            "trailing",
            "divider",
            "content",
        ]),
        searchBar: named("search-bar", [
            "root",
            "leading",
            "input",
            "trailing",
        ]),
        snackbar: named("snackbar", [
            "root",
            "supportingText",
            "actions",
            "action",
            "close",
        ]),
        toast: named("toast", [
            "group",
            "root",
            "icon",
            "title",
            "description",
            "actionTrigger",
            "closeTrigger",
        ]),
        button: named("button", ["root", "touchTarget", "icon", "label"]),
    });

const NAV_SLOTS = [
    "root",
    "item",
    "indicator",
    "activeIndicator",
    "icon",
    "label",
] as const;

/** Navigation and lists' fake factories, all static: the tabs, navigation bar and rail, list,
 *  and list item. */
export const navigationRegistry = () =>
    createRegistry({
        tabs: named("tabs", [
            "root",
            "tab",
            "tabContent",
            "icon",
            "label",
            "indicator",
        ]),
        navigationBar: named("navigation-bar", NAV_SLOTS),
        navigationRail: named("navigation-rail", [
            ...NAV_SLOTS,
            "header",
            "sectionLabel",
        ]),
        list: named("list", ["root", "item"]),
        scrim: named("scrim", ["root"]),
        fadeThrough: named("fade-through", ["root", "page"]),
        horizontalSharedAxis: named("horizontal-shared-axis", [
            "root",
            "page",
            "scrim",
        ]),
        listItem: named("list-item", [
            "root",
            "leading",
            "content",
            "overline",
            "headline",
            "supportingText",
            "trailing",
            "trailingText",
            "indicator",
            "region",
            "frame",
            "action",
        ]),
    });

/** A fake factory like `named`'s that also writes the `value` token to Root as `--value`. */
const valued =
    (
        component: string,
        slots: readonly string[],
    ): ClassFactory<ComponentShape> =>
    (s) =>
        withTokenStyle(named(component, slots)(s) as never, s.tokens as never, {
            value: "--value",
        }) as never;

/** The file upload's fake factories, all static: the file upload, and the button, list item, icon
 *  button and linear progress it draws its trigger and files with. */
export const fileUploadRegistry = () =>
    createRegistry({
        fileUpload: named("file-upload", [
            "root",
            "label",
            "dropzone",
            "icon",
            "headline",
            "supportingText",
            "itemGroup",
            "item",
            "error",
        ]),
        button: named("button", [
            "root",
            "touchTarget",
            "icon",
            "label",
            "secondaryIcon",
        ]),
        iconButton: named("icon-button", [
            "root",
            "touchTarget",
            "container",
            "icon",
            "outline",
        ]),
        listItem: named("list-item", [
            "root",
            "leading",
            "content",
            "overline",
            "headline",
            "supportingText",
            "trailing",
            "trailingText",
            "indicator",
            "region",
            "frame",
            "action",
        ]),
        linearProgress: valued("linear-progress", [
            "root",
            "track",
            "indicator",
            "stopIndicator",
        ]),
    });

/** The display components' fake factories, all static: the progress indicators and slider (with
 *  their `value` token), card, search bar, ripple, and the single-part components. */
export const displayRegistry = () =>
    createRegistry({
        checkbox,
        linearProgress: valued("linear-progress", [
            "root",
            "track",
            "indicator",
            "stopIndicator",
        ]),
        circularProgress: valued("circular-progress", [
            "root",
            "track",
            "trackEndHalf",
            "trackEndArc",
            "trackStartHalf",
            "trackStartArc",
            "endHalf",
            "endArc",
            "startHalf",
            "startArc",
        ]),
        loadingIndicator: named("loading-indicator", [
            "root",
            "container",
            "indicator",
        ]),
        slider: ((s: Selection<ComponentShape>) =>
            withTokenStyle(
                named("slider", [
                    "root",
                    "startTrack",
                    "track",
                    "activeTrack",
                    "markerGroup",
                    "marker",
                    "stateLayer",
                    "insetIcon",
                    "handle",
                    "valueIndicator",
                    "input",
                ])(s) as never,
                s.tokens as never,
                {
                    value: "--value",
                    activeStart: "--activeStart",
                    activeEnd: "--activeEnd",
                    stopActive: "--stopActive",
                },
            )) as never,
        accordion: named("accordion", [
            "root",
            "item",
            "trigger",
            "leading",
            "text",
            "title",
            "description",
            "indicator",
            "content",
        ]),
        tree: named("tree", [
            "root",
            "label",
            "tree",
            "branch",
            "node",
            "leading",
            "text",
            "indicator",
            "group",
        ]),
        horizontalSharedAxis: named("horizontal-shared-axis", [
            "root",
            "page",
            "scrim",
        ]),
        stepper: named("stepper", [
            "root",
            "list",
            "item",
            "trigger",
            "indicator",
            "label",
            "caption",
            "separator",
            "content",
        ]),
        carousel: named("carousel", [
            "root",
            "itemGroup",
            "item",
            "mask",
            "content",
        ]),
        gridList: named("grid-list", [
            "root",
            "tile",
            "content",
            "media",
            "header",
            "footer",
            "headline",
            "subhead",
        ]),
        card: named("card", [
            "root",
            "touchTarget",
            "actionArea",
            "media",
            "header",
            "avatar",
            "badge",
            "headerText",
            "headline",
            "subhead",
            "headerAction",
            "content",
            "supportingText",
            "actions",
            "footer",
        ]),
        dataTable: named("data-table", [
            "root",
            "header",
            "body",
            "footer",
            "headerRow",
            "row",
            "alternateRow",
            "footerRow",
            "headerCell",
            "cell",
            "footerCell",
            "selectionCell",
            "sortHeader",
            "sortLabel",
            "sortIndicator",
        ]),
        timePicker: named("time-picker", [
            "root",
            "headline",
            "body",
            "hourSelector",
            "separator",
            "minuteSelector",
            "scrollItem",
            "periodSelector",
            "period",
            "dial",
            "dialTrack",
            "dialHandle",
            "dialCenter",
            "dialLabel",
            "actions",
        ]),
        timeInput: named("time-input", [
            "root",
            "headline",
            "body",
            "hourField",
            "minuteField",
            "input",
            "fieldLabel",
            "separator",
            "periodSelector",
            "period",
            "actions",
        ]),
        appBar: named("app-bar", [
            "root",
            "leading",
            "content",
            "headline",
            "subtitle",
            "trailing",
        ]),
        searchBar: named("search-bar", [
            "root",
            "leading",
            "input",
            "trailing",
        ]),
        ripple: named("ripple", ["root", "ripple"]),
        avatar: named("avatar", ["root", "image", "fallback"]),
        splitter: named("splitter", [
            "root",
            "panel",
            "resizeTrigger",
            "resizeTriggerIndicator",
        ]),
        badge: named("badge", ["root"]),
        media: named("media", ["root"]),
        separator: named("separator", ["root"]),
        scrim: named("scrim", ["root"]),
        supportingText: named("supporting-text", ["root"]),
        text: named("text", ["root"]),
        icon: named("icon", ["root"]),
        touchTarget: named("touch-target", ["root"]),
    });

/** The button group's fake factories: the group, and the buttons and icon buttons in it. */
export const buttonGroupRegistry = () =>
    createRegistry({
        buttonGroup: named("button-group", ["root"]),
        button: named("button", [
            "root",
            "label",
            "icon",
            "secondaryIcon",
            "touchTarget",
        ]),
        iconButton: named("icon-button", [
            "root",
            "touchTarget",
            "container",
            "icon",
            "outline",
        ]),
    });

/** The toolbar's fake factories: the bar, its icon buttons and buttons, and the overflow menu. */
export const toolbarRegistry = () =>
    createRegistry({
        toolbar: named("toolbar", ["root"]),
        button: named("button", [
            "root",
            "label",
            "icon",
            "secondaryIcon",
            "touchTarget",
        ]),
        // Writes the accent token to Root as `--accent`, for the unstyled vibrant toolbar's spec.
        iconButton: ((s) =>
            withTokenStyle(
                named("icon-button", [
                    "root",
                    "touchTarget",
                    "container",
                    "icon",
                    "outline",
                ])(s) as never,
                s.tokens as never,
                { accent: "--accent" },
            )) as ClassFactory<ComponentShape>,
        menu: named("menu", [
            "root",
            "itemGroup",
            "itemGroupLabel",
            "item",
            "itemLeading",
            "itemContent",
            "itemLabel",
            "itemSupportingText",
            "itemTrailing",
            "itemTrailingText",
        ]),
    });

/** An icon button whose factory writes its `accent` token to Root as `--accent`, for the
 *  `ProvidedTokens` specs. */
export const providedTokensRegistry = () =>
    createRegistry({
        iconButton: ((s) =>
            withTokenStyle(
                named("icon-button", [
                    "root",
                    "touchTarget",
                    "container",
                    "icon",
                    "outline",
                ])(s) as never,
                s.tokens as never,
                { accent: "--accent" },
            )) as ClassFactory<ComponentShape>,
    });

/** The date pickers' fake factories, all static: the modal and docked date pickers, the date
 *  input, the calendar cell, and the scrim and buttons the ready-made pickers draw. */
export const datePickersRegistry = () =>
    createRegistry({
        datePicker: named("date-picker", [
            "root",
            "header",
            "headline",
            "selectedDate",
            "modeToggle",
            "divider",
            "controls",
            "viewTrigger",
            "prev",
            "next",
            "weekdays",
            "weekday",
            "grid",
            "week",
            "yearList",
            "actions",
        ]),
        dockedDatePicker: named("docked-date-picker", [
            ...FIELD_SLOTS.filter((slot) => slot !== "counter"),
            "content",
            "controls",
            "prev",
            "monthButton",
            "next",
            "yearButton",
            "weekdays",
            "weekday",
            "grid",
            "week",
            "monthList",
            "yearList",
            "actions",
        ]),
        dateInput: named("date-input", [
            "root",
            "header",
            "headline",
            "selectedDate",
            "modeToggle",
            "divider",
            "field",
            ...FIELD_SLOTS.filter(
                (slot) => slot !== "root" && slot !== "counter",
            ),
            "segment",
            "actions",
        ]),
        calendarCell: named("calendar-cell", ["root", "trigger"]),
        scrim: named("scrim", ["root"]),
        iconButton: named("icon-button", [
            "root",
            "touchTarget",
            "container",
            "icon",
            "outline",
        ]),
        button: named("button", ["root", "touchTarget", "icon", "label"]),
    });

/** The paginator's fake factories: the row, its icon-button triggers, and the select with its
 *  menu. */
export const paginatorRegistry = () =>
    createRegistry({
        paginator: named("paginator", [
            "root",
            "pageSize",
            "pageSizeLabel",
            "pageSizeSelect",
            "rangeLabel",
            "actions",
            "firstTrigger",
            "prevTrigger",
            "nextTrigger",
            "lastTrigger",
        ]),
        iconButton: named("icon-button", [
            "root",
            "touchTarget",
            "container",
            "icon",
            "outline",
        ]),
        select: named("select", FIELD_SLOTS),
        menu: named("menu", [
            "root",
            "itemGroup",
            "itemGroupLabel",
            "item",
            "itemLabel",
        ]),
    });

/** The chip set's fake factories: the set, and the chips in it. */
export const chipSetRegistry = () =>
    createRegistry({
        chipSet: named("chip-set", ["root"]),
        chip: named("chip", [
            "root",
            "icon",
            "label",
            "trailingIcon",
            "touchTarget",
        ]),
    });

/** The color picker's fake factories: the picker, the text field its hex field is, and the icon
 *  button its eye dropper is. */
export const colorPickerRegistry = () =>
    createRegistry({
        colorPicker: named("colorPicker", [
            "root",
            "label",
            "content",
            "area",
            "areaBackground",
            "areaThumb",
            "channelSlider",
            "transparencyGrid",
            "channelSliderTrack",
            "channelSliderThumb",
            "control",
            "valueSwatch",
            "swatchGroup",
            "swatchTrigger",
            "swatch",
        ]),
        textField: named("text-field", FIELD_SLOTS),
        iconButton: named("icon-button", [
            "root",
            "touchTarget",
            "container",
            "icon",
            "outline",
        ]),
        ripple: named("ripple", ["root", "ripple"]),
    });

/** The rating's fake factory: its parts, with the root's selected variants in its class. */
export const ratingRegistry = () =>
    createRegistry({
        rating: named("rating", [
            "root",
            "label",
            "control",
            "item",
            "icon",
            "fill",
            "halfFill",
        ]),
    });

/** The native select's fake factory: its parts. */
export const nativeSelectRegistry = () =>
    createRegistry({
        nativeSelect: named("nativeSelect", [
            "root",
            "select",
            "icon",
            "group",
            "option",
        ]),
    });
