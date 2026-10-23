// What each component draws from the registry, for the bundler plugin's usage-based pruning. Keyed
// by the component's subpath (`@pureform/solid/<key>`, `@pureform/react/<key>`), the same in
// every binding. Each entry lists the variant groups the component's props pass to the registry
// as given, by the prop that sets them (`<Button variant="filled">` selects `filled`). A group
// left out is computed inside the component (a FAB's `extended` from its label) or set by it,
// so pruning keeps every value of it. A component that shows indication also draws the `ripple`
// entry, whose root is the layer inside each surface, unless every indication the app passes has
// no layer (`INDICATION`).

/** What one component draws: the registry entries, each with the groups its props set. */
export interface ComponentUsage {
    /** Registry name → variant group → the prop that sets it as given. */
    readonly entries: Readonly<
        Record<string, Readonly<Record<string, string>>>
    >;
}

const same = <const G extends readonly string[]>(
    ...groups: G
): { readonly [K in G[number]]: K } =>
    Object.fromEntries(groups.map((group) => [group, group])) as {
        readonly [K in G[number]]: K;
    };

/** Every component, by subpath. */
export const COMPONENT_USAGE = {
    // `leadingIcon` follows the icon content and `trailingIcon` is always set; the list is a
    // menu in the autocomplete's color and density.
    autocomplete: {
        entries: {
            autocomplete: same("variant", "color", "density"),
            menu: same("color", "density"),
            ripple: {},
        },
    },
    avatar: { entries: { avatar: same("size", "color", "shape") } },
    // The calendar's cells take their variants from the dates; the actions are buttons, the
    // controls icon buttons, and the modal picker's backdrop a scrim.
    "date-picker": {
        entries: {
            datePicker: {},
            calendarCell: {},
            scrim: {},
            button: {},
            iconButton: {},
            ripple: {},
        },
    },
    "docked-date-picker": {
        entries: {
            dockedDatePicker: same("variant", "color", "density"),
            calendarCell: {},
            iconButton: {},
            ripple: {},
        },
    },
    "date-input": {
        entries: {
            dateInput: same("variant", "color", "density"),
            button: {},
            iconButton: {},
            ripple: {},
        },
    },

    badge: { entries: { badge: same("size", "placement") } },
    button: {
        entries: {
            button: same(
                "color",
                "variant",
                "size",
                "density",
                "secondaryIconPosition",
            ),
            ripple: {},
        },
    },
    // `connected` is set only when on; the buttons and icon buttons take the group's variants
    // (an icon button's fill mapped from the button's) and their position from their index.
    "button-group": {
        entries: {
            buttonGroup: same("size"),
            button: {},
            iconButton: {},
            ripple: {},
        },
    },
    // `interactive` follows the element, and `padded` the sections the ready-made shows.
    card: { entries: { card: same("variant", "actionsAlign"), ripple: {} } },
    carousel: { entries: { carousel: same("layout"), ripple: {} } },
    accordion: { entries: { accordion: same("density"), ripple: {} } },
    tree: { entries: { tree: same("density", "color"), ripple: {} } },
    checkbox: { entries: { checkbox: same("color", "density"), ripple: {} } },
    // `toggle` follows `selected`.
    chip: {
        entries: {
            chip: same("variant", "color", "density", "corner"),
            ripple: {},
        },
    },
    // `singleLine` is set only when on; the chips take the set's variants under their own, and
    // `toggle` follows the selection.
    "chip-set": {
        entries: {
            chipSet: same("singleLine"),
            chip: same("variant", "color", "density", "corner"),
            ripple: {},
        },
    },
    // `indeterminate` follows the value.
    "circular-progress": {
        entries: { circularProgress: same("color", "shape") },
    },
    // `icon` follows the icon content; the backdrop is a scrim, and the trigger a button.
    dialog: { entries: { dialog: {}, scrim: {}, button: {}, ripple: {} } },
    // The trigger is a button, the close trigger an icon button, and the confirm action a button.
    "fullscreen-dialog": {
        entries: {
            fullscreenDialog: {},
            button: {},
            iconButton: {},
            ripple: {},
        },
    },
    // `modal` defaults to on, so it isn't passed as given. A modal sheet is drawn over the scrim;
    // the trigger is a button, and the drag handle its own component.
    "bottom-sheet": {
        entries: {
            bottomSheet: {},
            dragHandle: {},
            scrim: {},
            button: {},
            ripple: {},
        },
    },
    "drag-handle": { entries: { dragHandle: same("orientation") } },
    splitter: { entries: { splitter: same("orientation") } },
    // The hex field is an outlined text field and the eye dropper an icon button.
    "color-picker": {
        entries: { colorPicker: {}, textField: {}, iconButton: {}, ripple: {} },
    },
    // `extended` follows the label.
    fab: {
        entries: { fab: same("color", "variant", "size", "shape"), ripple: {} },
    },
    // The FAB's colour and size; the items are its own.
    "fab-menu": { entries: { fabMenu: same("color", "size"), ripple: {} } },
    "grid-list": { entries: { gridList: same("columns", "gutter", "aspect") } },
    icon: { entries: { icon: same("size", "color", "filled") } },
    // `toggle` follows `selected`.
    "icon-button": {
        entries: {
            iconButton: same("color", "variant", "shape", "size", "density"),
            ripple: {},
        },
    },
    // The copy button is an icon button; no color group, shape or toggle of its own.
    "copy-button": {
        entries: {
            iconButton: same("color", "variant", "shape", "size", "density"),
            ripple: {},
        },
    },
    "linear-progress": {
        entries: { linearProgress: same("color", "shape") },
    },
    "loading-indicator": {
        entries: { loadingIndicator: same("variant", "color") },
    },
    // A `ul` around list items; the ready-made renders a list item per entry, in the list's
    // density, color, and leading type. A segmented list sets each item's position.
    list: {
        entries: {
            list: same("variant"),
            listItem: same("density", "color", "leadingType"),
            ripple: {},
        },
    },
    // A list of options: the rows are list items in the list's density, color, and leading type.
    "selection-list": {
        entries: {
            list: same("variant"),
            listItem: same("density", "color", "leadingType"),
            ripple: {},
        },
    },
    // `lines` follows the content, `interactive` the element.
    "list-item": {
        entries: {
            listItem: same("density", "color", "leadingType", "position"),
            ripple: {},
        },
    },
    media: { entries: { media: same("aspect", "shape") } },
    // The trigger is a button; `grouped` follows the groups unless given.
    menu: {
        entries: {
            menu: same("color", "density", "vibrant"),
            button: {},
            ripple: {},
        },
    },
    "navigation-bar": {
        entries: { navigationBar: same("color", "itemLayout"), ripple: {} },
    },
    "navigation-rail": {
        // A modal rail is drawn in a dialog over the scrim.
        entries: {
            navigationRail: same("color", "expanded", "modal"),
            scrim: {},
            ripple: {},
        },
    },
    // The group's color and density reach each radio.
    "radio-group": { entries: { radio: same("color", "density"), ripple: {} } },
    // The trigger is a button.
    popover: {
        entries: { popover: {}, button: {}, ripple: {} },
    },
    // The trigger is a button.
    "rich-tooltip": {
        entries: { richTooltip: {}, button: {}, ripple: {} },
    },
    ripple: { entries: { ripple: {} } },
    scrim: { entries: { scrim: {} } },
    "fade-through": { entries: { fadeThrough: {} } },
    "horizontal-shared-axis": { entries: { horizontalSharedAxis: {} } },
    // The scroll state sets `scrolled` and `collapsed`, and `search` follows the search bar; the
    // search bar is drawn scrolled and centered.
    "app-bar": {
        entries: { appBar: same("size", "centered"), searchBar: {} },
    },
    "search-bar": { entries: { searchBar: {} } },
    // The ready-made trigger is a search bar; the suggestions are menu items in the menu's
    // default colors; the leading and clear buttons are icon buttons.
    "search-view": {
        entries: {
            searchView: same("variant"),
            searchBar: {},
            menu: {},
            iconButton: {},
            ripple: {},
        },
    },
    // `modal` defaults to on and `coplanar` applies to a standard sheet only, so neither is given.
    // A modal sheet is drawn over the scrim; the trigger and actions are buttons, the back and
    // close buttons icon buttons.
    "side-sheet": {
        entries: {
            sideSheet: {},
            scrim: {},
            button: {},
            iconButton: {},
            ripple: {},
        },
    },
    // `leadingIcon` follows the icon content and `trailingIcon` is always set; the list is a
    // menu in the select's color and density.
    select: {
        entries: {
            select: same("variant", "color", "density"),
            menu: same("color", "density"),
            ripple: {},
        },
    },
    separator: { entries: { separator: same("inset") } },
    // The menu it opens is the menu component, in its default colours.
    "split-button": {
        entries: {
            splitButton: same("color", "variant", "size", "density"),
            menu: {},
            ripple: {},
        },
    },
    slider: { entries: { slider: same("color"), ripple: {} } },
    snackbar: { entries: { snackbar: same("layout"), ripple: {} } },
    // Each toast's `type` comes with the toast, not a prop.
    toast: { entries: { toast: {}, ripple: {} } },
    // `overflow` is set only when on; the elements are icon buttons and buttons, and the
    // overflow button opens the menu.
    toolbar: {
        entries: {
            toolbar: same("placement", "orientation", "color"),
            iconButton: {},
            button: {},
            menu: {},
            ripple: {},
        },
    },
    // The actions are the app's buttons.
    // The selection column's checkboxes are checkboxes; `striped` picks the rows' part.
    table: {
        entries: {
            dataTable: same("stickyHeader", "density"),
            checkbox: {},
            ripple: {},
        },
    },
    "time-picker": {
        entries: { timePicker: same("mode", "color"), ripple: {} },
    },
    "time-input": { entries: { timeInput: {}, ripple: {} } },
    // The page-size field is a select (outlined, set here) and the triggers are icon buttons.
    paginator: {
        entries: {
            paginator: {},
            select: {},
            menu: {},
            iconButton: {},
            ripple: {},
        },
    },
    "supporting-text": { entries: { supportingText: same("tone") } },
    // The plain form primitives: one look each, no variants.
    field: {
        entries: {
            field: {},
            label: {},
            input: {},
            plainTextarea: {},
            description: {},
            errorText: {},
        },
    },
    // `transition` moves a row's content in a shared axis or a fade through.
    stepper: {
        entries: {
            stepper: same("orientation", "density"),
            horizontalSharedAxis: {},
            fadeThrough: {},
            ripple: {},
        },
    },
    switch: { entries: { switchControl: same("color"), ripple: {} } },
    // `icon` follows the tabs' icons; `transition` moves the panels in a shared axis or a fade
    // through.
    tabs: {
        entries: {
            tabs: same("variant", "inlineIcon", "scrollable", "color"),
            horizontalSharedAxis: {},
            fadeThrough: {},
            ripple: {},
        },
    },
    // Its trigger is a button, each file a list item with an icon button and a progress bar.
    "file-upload": {
        entries: {
            fileUpload: same("color"),
            button: {},
            iconButton: {},
            listItem: {},
            linearProgress: {},
            ripple: {},
        },
    },
    // The icons follow their content, and the chips' groups come in one `chip` prop.
    "tags-input": {
        entries: {
            tagsInput: same("variant", "color", "density"),
            inputChip: {},
            ripple: {},
        },
    },
    // The icon and affixes follow their content; the buttons show indication.
    "number-field": {
        entries: {
            numberField: same("variant", "color", "density"),
            ripple: {},
        },
    },
    "code-field": {
        entries: { codeField: same("variant", "color", "density") },
    },
    rating: { entries: { rating: same("color", "size") } },
    text: { entries: { text: { style: "textStyle" } } },
    // The icons, prefix and suffix follow their content.
    "text-area": {
        entries: {
            textArea: same("variant", "color", "density", "autoGrow"),
        },
    },
    "text-field": {
        entries: {
            textField: same("variant", "color", "density", "secure"),
        },
    },
    // The trigger is a button.
    tooltip: { entries: { tooltip: {}, button: {}, ripple: {} } },
    "touch-target": { entries: { touchTarget: {} } },
} as const satisfies Readonly<Record<string, ComponentUsage>>;

/** A component's subpath. */
export type ComponentSubpath = keyof typeof COMPONENT_USAGE;

/** The packages whose subpaths are components: `@pureform/solid/button` and so on. */
export const BINDING_PACKAGES = [
    "@pureform/solid",
    "@pureform/react",
    "@pureform/react-native",
] as const;

/** The hooks the bindings export that read the registry by name: `useClasses(name, selection)`,
 *  `useStyles(name, selection)`, and React Native's `useComponentSlots` and `useSelectedStyles`
 *  select, the others hand out a whole factory. */
export const REGISTRY_HOOKS = {
    useClasses: "selection",
    useStyles: "selection",
    // React Native's: a component's styles through the provider's engine, or its plain selection.
    useComponentSlots: "selection",
    useSelectedStyles: "selection",
    useClassFactory: "factory",
    useLazyClassFactory: "factory",
    useStyleFactory: "factory",
} as const;

/** The hook that builds a component's parts from an anatomy, whose `name` is the registry entry:
 *  `useComponent(anatomy, { selection })`. */
export const ANATOMY_HOOK = "useComponent";

/** The provider, whose `defaults` prop sets variant values by registry name:
 *  `<PureformProvider defaults={{ button: { variant: "text" } }}>`. */
export const PROVIDER = {
    name: "PureformProvider",
    defaults: "defaults",
} as const;

/** How the app chooses indication, for pruning: the `ripple` entry every component with an
 *  indication entry draws is dropped only when every provider passes an indication with no
 *  layer, every component's `indication` prop is one, and nothing else draws the ripple. */
export const INDICATION = {
    /** The registry entry an indication's layer is drawn with. */
    entry: "ripple",
    /** The prop a provider and an interactive component take. */
    prop: "indication",
    /** The hook that gives an app's own surface the provider's indication. */
    hook: "useIndication",
    /** The bindings' exports: an indication with no layer, Material's (no layer with
     *  `{ ripple: false }`), and an app's own (no layer unless `layer: true`). */
    none: "noIndication",
    material: "materialIndication",
    define: "defineIndication",
} as const;
