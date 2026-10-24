# Slot props standard: code sketch

Draft for review. Names are provisional. See `docs/roadmap-components/context/audit-slot-props.md`.

Two rules:

1. **Own parts:** every ready-made takes the flat `SlotKeyedProps` it has today, keyed by its own
   parts only.
2. **Drawn components:** each component a ready-made draws inside it (a menu, a field, a child
   item, a button) gets one prop, `<key>Props`, taking that component's own customization props.

The anatomy doesn't change: no `contains` metadata. The preset describes styling; what a
ready-made draws is a fact of the binding, declared next to the code that draws it.

## 1. Types (binding-core, platform-neutral)

```ts
// packages/binding-core/src/parts.ts
/** What a ready-made accepts to customize a component it draws: the inner component's own
 *  per-part props, tokens and testId. Variants are not included; the outer one passes its own. */
export type InnerProps<C extends ComponentName, Platform = DefaultPlatform> =
    Partial<CustomizeProps<C, Platform>>;
```

`CustomizeProps<C>` is the set each renderer already defines for its own parts:

```ts
// React and Solid (binding-dom)
interface CustomizeProps<C> {
    readonly className?: string | SlotKeyed<C, string>;   // Solid: `class`
    readonly style?: SlotKeyed<C, Style>;
    readonly slotProps?: SlotKeyed<C, PartProps>;
    readonly unstyled?: Unstyled<C>;
    readonly testId?: TestIdOverride<C>;
    readonly tokens?: InstanceTokens<C>;
}

// React Native
interface CustomizeProps<C> {
    readonly style?: SlotKeyed<C, NativeStyle>;           // ViewStyle or TextStyle per part
    readonly slotProps?: SlotKeyed<C, NativePartProps>;   // ViewProps, TextProps, PressableProps… per part
    readonly testId?: TestIdOverride<C>;
    readonly tokens?: InstanceTokens<C>;
    // className / unstyled: web only
}
```

React Native `slotProps` follows the web's override rule: the component wins for state and
accessibility props (`accessibilityRole`, `accessibilityState`, `aria-*`) and for what it depends
on (`ref`, measuring `onLayout`, overlay `pointerEvents`); handlers (`onPress`, `onFocus`, …) are
composed, the component's first. The compose is built only when a handler is passed, and the
merged props are memoized like `style`. Each component declares a part -> host props map by hand
(the anatomy doesn't record it), which also picks `ViewStyle` or `TextStyle` for keyed `style`.

No recursive type is needed. Nesting deeper works because an inner component's `<key>Props` can
hold its own `<key>Props`, whenever that component is a ready-made one.

## 2. Declaring them

```ts
interface SelectProps extends CustomizeProps<"select"> {
    readonly menuProps?: InnerProps<"menu">;
    readonly fieldProps?: InnerProps<"textField">;
}

interface ListProps extends CustomizeProps<"list"> {
    readonly listItemProps?: InnerProps<"listItem">;   // defaults for every item
}

interface DatePickerProps extends CustomizeProps<"datePicker"> {
    readonly cancelButtonProps?: InnerProps<"button">;
    readonly confirmButtonProps?: InnerProps<"button">;
    readonly prevButtonProps?: InnerProps<"iconButton">;
    readonly nextButtonProps?: InnerProps<"iconButton">;
}
```

Naming: `<key>Props`, where the key is the drawn component's name (`menuProps`, `listItemProps`,
`chipProps`, `buttonProps`, `radioProps`). Only when a component is drawn more than once in
different roles does the key name the role instead (`confirmButtonProps`, `prevButtonProps`).
Never `itemProps`: it would read like `items` (the data) or the `item` part.

## 3. Runtime

Drawn once (Select's menu): pass the object straight through. No merging, no allocation.

Containers (List, ChipSet, ButtonGroup, Toolbar, RadioGroup, SelectionList): each child gets the
container's `listItemProps` under its own props, and its own win.

```ts
// packages/binding-core/src/parts.ts
/** A child's own props over the container's defaults: own wins; classes join; style, slotProps
 *  and tokens merge shallowly per part. Returns `own` or `defaults` as-is when the other is empty. */
export const overDefaults = <C extends ComponentName>(
    defaults: InnerProps<C> | undefined,
    own: InnerProps<C>,
): InnerProps<C> => /* … */;
```

Items that set nothing of their own get `listItemProps` itself, so a list of 200 plain items builds no
new objects. React Native takes the same path.

```tsx
function ReadyMade(props: ListProps) {
    const { items = [], listItemProps, density, color, ...rest } = props;
    const slot = useSlotProps<"list">(rest);                    // own parts: root, item
    return (
        <Root {...slot("root")} tokens={rest.tokens}>
            {items.map(({ value, ...item }, i) => (
                <Item key={value ?? i} {...slot("item")}>
                    <ListItem density={density} color={color} {...overDefaults(listItemProps, item)} />
                </Item>
            ))}
        </Root>
    );
}
```

Variants (`density`, `color`, `size`) stay flat props; a container passes them to its children as
defaults, and a child's own wins.

## 4. Usage

```tsx
// React: List
<List
    className={{ root: "inbox", item: "row" }}                 // own parts: <ul>, <li>
    tokens={{ gap: "8px" }}                                    // the list's own recipe
    density="compact"
    listItemProps={{ className: { headline: "bold" }, tokens: { height: "56px" } }}
    items={[{ headline: "Inbox", tokens: { height: "64px" } }]}  // this item's own wins
/>

// React: Select
<Select
    className={{ trigger: "wide" }}
    menuProps={{ className: { item: "menu-row" }, tokens: { container: "var(--surface)" }, unstyled: { item: true } }}
/>

// Solid: DatePicker's Confirm button
<DatePicker confirmButtonProps={{ class: { root: "primary" }, tokens: { accent: "…" } }} />

// React Native
<List
    style={{ root: { paddingBlock: 8 } }}
    listItemProps={{ style: { headline: { fontWeight: "600" } }, tokens: { height: 56 } }}
    testId="inbox"
/>
```

## 5. Later step: per-instance values for repeated parts

```ts
// a function where the part repeats
slotProps={{ cell: (cell: { date: DateValue; selected: boolean }) => ({ "aria-description": … }) }}
```

## 6. What goes away

- `listTokens` -> List's own `tokens`; List's `tokens` meant for items -> `listItemProps.tokens`.
- `groupTokens`, `setTokens` -> own `tokens`; child tokens -> `buttonProps.tokens` / `chipProps.tokens`.
- TagsInput's `chip.tokens` -> `chipProps.tokens`.
- List, SelectionList and RadioGroup's `slotProps` / `unstyled` keyed by the child's parts ->
  `listItemProps` / `radioProps`.
- AppBar's `searchBar` -> `searchBarProps`. React Native's `inputProps` already fits and stays.
- React Native's root-only `style` -> keyed `style` (`style={{ root: … }}`).

## 7. Cost

- More prop names: one per drawn component (DatePicker gets about five).
- Two places for one row: `className.item` styles the list's `<li>`, `listItemProps.className.root`
  styles the ListItem inside it.
