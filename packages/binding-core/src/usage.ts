// What each component draws from the registry, for the bundler plugin's usage-based pruning. Keyed
// by the component's subpath (`@pureform/solid/<key>`, `@pureform/react/<key>`), the same in
// every binding. Each entry lists the variant groups the component's props pass to the registry
// as given, by the prop that sets them (`<Button variant="filled">` selects `filled`). A group
// left out is computed inside the component (a FAB's `extended` from its label) or set by it,
// so pruning keeps every value of it.

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
    avatar: { entries: { avatar: same("size", "color", "shape") } },
    button: {
        entries: { button: same("color", "variant", "size", "density") },
    },
    // `interactive` follows the element.
    card: { entries: { card: same("variant") } },
    checkbox: { entries: { checkbox: same("color", "density") } },
    chip: { entries: { chip: same("variant", "color", "density") } },
    // `indeterminate` follows the value.
    "circular-progress": { entries: { circularProgress: same("color") } },
    // `icon` follows the icon content; the backdrop is a scrim, and the trigger a button.
    dialog: { entries: { dialog: {}, scrim: {}, button: {} } },
    // `extended` follows the label.
    fab: { entries: { fab: same("color", "variant", "size", "shape") } },
    icon: { entries: { icon: same("size", "color", "filled") } },
    // `toggle` follows `selected`.
    "icon-button": {
        entries: {
            iconButton: same("color", "variant", "shape", "size", "density"),
        },
    },
    "linear-progress": { entries: { linearProgress: same("color") } },
    // An unstyled `ul` around list items.
    list: { entries: {} },
    // `lines` follows the content, `interactive` the element.
    "list-item": { entries: { listItem: same("density", "color") } },
    media: { entries: { media: same("aspect", "shape") } },
    // The trigger is a button.
    menu: { entries: { menu: same("color", "density"), button: {} } },
    "navigation-bar": { entries: { navigationBar: same("color") } },
    "navigation-rail": { entries: { navigationRail: same("color") } },
    // The group's color and density reach each radio.
    "radio-group": { entries: { radio: same("color", "density") } },
    ripple: { entries: { ripple: {} } },
    scrim: { entries: { scrim: {} } },
    "search-bar": { entries: { searchBar: {} } },
    // `leadingIcon` follows the icon content and `trailingIcon` is always set; the list is a
    // menu in the select's color and density.
    select: {
        entries: {
            select: same("variant", "color", "density"),
            menu: same("color", "density"),
        },
    },
    separator: { entries: { separator: same("inset") } },
    slider: { entries: { slider: same("color") } },
    snackbar: { entries: { snackbar: {} } },
    "supporting-text": { entries: { supportingText: same("tone") } },
    switch: { entries: { switchControl: same("color") } },
    // `icon` follows the tabs' icons.
    tabs: { entries: { tabs: same("variant", "color") } },
    text: { entries: { text: { style: "textStyle" } } },
    // The icons follow their content.
    "text-area": {
        entries: {
            textArea: same("variant", "color", "density", "autoGrow"),
        },
    },
    "text-field": {
        entries: { textField: same("variant", "color", "density") },
    },
    // The trigger is a button.
    tooltip: { entries: { tooltip: same("variant"), button: {} } },
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

/** The hooks the bindings export that read the registry by name: `useClasses(name, selection)`
 *  and `useStyles(name, selection)` select, the others hand out a whole factory. */
export const REGISTRY_HOOKS = {
    useClasses: "selection",
    useStyles: "selection",
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
