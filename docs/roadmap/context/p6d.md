# p6d: Navigation and lists (output context)

Commits: 31d67db..54792ad, plus the `docs(roadmap)` commit that adds this file.

| Commit    | What                                                                                                                          |
| --------- | ----------------------------------------------------------------------------------------------------------------------------- |
| `31d67db` | `feat(machines)`: `tabs` (Zag's, unchanged) and the own `navigation` machine; catalog and lockfile entries for `@zag-js/tabs` |
| `23f66d5` | `feat(anatomy)`: `tabsCompositeAnatomy`, `listAnatomy`, `compositeTestIds.tabs`, `.list`                                      |
| `66c362f` | `feat(binding-core)`: `components/{tabs,navigation,list,list-item}.ts`                                                        |
| `47083fe` | `fix(binding-core)`: `ListItemData` extends every list item variant                                                           |
| `8f5f1ea` | `feat(solid)`: `tabs`, `navigation-bar`, `navigation-rail`, `list`, `list-item` subpaths; `navigationRegistry()`; specs       |
| `60eab86` | `fix(binding-core)`: `listItemVariants` reads named props only (see Notes)                                                    |
| `74cf097` | `feat(react)`: the same                                                                                                       |
| `cd38948` | `test(component-suites)`: `tabs.ts`, `navigation.ts` (bar and rail), `list.ts` (list and list item)                           |
| `4b71039` | `docs(machines)`: `setValue` comment corrected                                                                                |
| `8cd3780` | `docs`: READMEs (machines, anatomy, binding-core, solid, react, component-suites)                                             |
| `54792ad` | `docs(design)`: "Built (p6d)" in §8, §9.1, §9.4, §9.7                                                                         |

## Built

### Components (both bindings, same subpaths, parts, elements, and DOM order)

| Subpath (`@pureform/solid/…`, `@pureform/react/…`) | Export           | Parts (element)                                                                                                                                                         | Machine                         |
| -------------------------------------------------- | ---------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------- |
| `tabs`                                             | `Tabs`           | `Root` (`div`, unstyled), `List` (`div`, the tabs' `root` slot), per tab `Tab` (`button`), `Icon`, `Label`, `Indicator` (`span`), per panel `Content` (`div`, unstyled) | `@pureform/machines/tabs`       |
| `navigation-bar`                                   | `NavigationBar`  | `Root` (`nav`), per destination `Item` (`a` with `href`, else `button`), `Indicator`, `ActiveIndicator`, `Icon`, `Label` (`span`)                                       | `@pureform/machines/navigation` |
| `navigation-rail`                                  | `NavigationRail` | the same                                                                                                                                                                | `@pureform/machines/navigation` |
| `list-item`                                        | `ListItem`       | `Root` (`div`, `a` with `href`, or `as`), `Leading` (`span`), `Content` (`div`), `Overline`, `Headline`, `SupportingText`, `Trailing`, `TrailingText` (`span`)          | none                            |
| `list`                                             | `List`           | `Root` (`ul`, unstyled), per item `Item` (`li`, unstyled)                                                                                                               | none                            |

Machine part props: tabs Root `getRootProps`, List `getListProps`, Tab
`tabsTriggerProps(getTriggerProps(tabsItemProps({ value, disabled }, rootDisabled)), { controls })`,
Content `getContentProps({ value })`, Icon `aria-hidden` + `mirrored`. Navigation Root
`getRootProps`, Item `combine(getItemProps(navigationItemMachineProps(item)),
navigationItemElementProps(item, getItemState(item).disabled))`, Icon `getIconProps` (`aria-hidden`)

- `mirrored`, Label `getLabelProps`. List item Root `listItemRootProps(props, element)`, Leading and
  Trailing `aria-hidden` + `mirrored`.

Ready-made props (`class`/`className`, `style`, `slotProps` keyed by part; `testId`, `unstyled` to Root):

- `Tabs`: Root's + `items: TabsItem<Node>[]` (`value`, `label`, `icon?`, `mirrorIcon?`, `disabled?`,
  `content?`); `aria-label`/`aria-labelledby` go on `List`; `icon` variant defaults to any item
  having an icon; `defaultValue` defaults to the first enabled tab (read once) unless `value` or
  `defaultValue` is given; a `Content` per item with `content`; `controls={false}` on every tab
  when no item has `content`.
- `NavigationBar`/`NavigationRail`: Root's + `items: NavigationItem<Node>[]` (`value`, `label`,
  `icon?`, `mirrorIcon?`, `href?`, `disabled?`).
- `ListItem`: Root's + `headline`, `overline`, `supportingText`, `leading`, `trailing`,
  `trailingText`, `mirrorLeading`, `mirrorTrailing`; `lines` defaults to `listItemLines(content)`.
- `List`: Root's (`class`/`style` are the `<ul>`'s) + `items: ListItemData<Node>[]` (a list
  item's content, variants, `value` as key, `href`, `selected`, `disabled`, `testId`), and
  `slotProps`/`unstyled` keyed by the list item's parts, applied to every item (as `RadioGroup`).

Part props types: `TabsTabProps` (`value`, `disabled?`, `controls?` default `true`),
`TabsContentPartProps` (`value`), `NavigationItemProps` (`value`, `href?`, `disabled?`; exported
as `NavigationBarItemProps`/`NavigationRailItemProps`), `ListItemRootProps` (`href?`, `as?`).

Internal: `packages/{solid,react}/src/navigation.tsx` exports `createNavigation({ component,
anatomy })` → `{ ReadyMade, parts }` (as `createTextInput`). The list item module exports
`ListDefaults`, the context the list provides (`ListVariantProps`, `null` outside a list).
Fixtures: `navigationRegistry()` in both bindings' `src/__fixtures__/registry.ts`.

### Contracts (`@pureform/binding-core/src/components/`)

```ts
// tabs.ts
TabsPart; TabsVariantProps { variant, icon?: boolean, color, tokens }
TabsElementIds { root, list, trigger?(value), content?(value) }
TabsBehaviorProps extends Controllable<"value", string | null> { activationMode, loopFocus, disabled, id, ids }
TabsRootOwnProps; TABS_ROOT_PROPS; TABS_LIST_LABEL_PROPS; TabsItem<Node>; TabsContentProps<Node>; TABS_CONTENT_PROPS
tabsSelection(props); tabsMachineProps(props)    // id → ids.root
tabsTriggerProps(p, { controls })                // − data-ssr; − aria-controls unless controls
tabsItemProps(item, tabsDisabled)                // { value, disabled }
tabsDefaultValue(props, items); tabsHaveIcons(items); tabsHavePanels(items)

// navigation.ts
NavigationComponent = "navigationBar" | "navigationRail"; NavigationPart
NavigationVariantProps<C> { color, tokens }; NavigationElementIds { root, item?(value) }
NavigationBehaviorProps extends Controllable<"value", string | null> { disabled, id, ids }
NavigationRootOwnProps<C>; NAVIGATION_ROOT_PROPS; NavigationItemOwnProps { value, href?, disabled? }
NAVIGATION_ITEM_PROPS (value, disabled); NavigationItem<Node>; NavigationContentProps<Node>; NAVIGATION_CONTENT_PROPS
navigationSelection(props); navigationMachineProps(props)
navigationItemElement(item)                      // "a" | "button"
navigationItemMachineProps(item)                 // current: "page" (link) | "true" (button)
navigationItemElementProps(item, disabled)       // button: { type: "button", disabled }; link: {}

// list-item.ts
ListItemPart; ListItemVariantProps { lines, interactive?: boolean, density, color, tokens }
ListItemStateProps { selected, disabled }; ListItemRootOwnProps; LIST_ITEM_ROOT_PROPS
ListItemContentProps<Node>; LIST_ITEM_CONTENT_PROPS
listItemElement({ href, as })                    // "a" | as | "div"
listItemSelection(props, element)                // interactive ??= element is "a" or "button"
listItemRootProps(props, element)                // type="button" on a button; aria-current ("page" on a link,
                                                 // "true" else) while selected; disabled or aria-disabled
listItemLines(content)                           // "one" | "two" | "three"

// list.ts
ListPart; ListVariantProps (density, color, tokens); ListRootOwnProps (+ testId); LIST_ROOT_PROPS
ListItemData<Node>; ListContentProps<Node>; LIST_CONTENT_PROPS
listItemVariants(list, item)                     // the item's own over the list's; tokens merge
```

### Machines (`@pureform/machines`)

- `tabs`: `export * from "@zag-js/tabs"`. Subpath `./tabs`, root namespace `tabs`.
- `navigation` (own; `src/navigation/`): props `value`, `defaultValue` (`null`), `onValueChange({
value })`, `disabled`, `ids { root, item(value) }`, `dir`, `id`, `getRootNode`. One state
  `idle`; events `ITEM.CLICK { value }` (guarded by `!disabled`), `VALUE.SET { value }`. Api:
  `value`, `setValue` (reports through `onValueChange`, as bindables do), `getItemState({ value,
disabled })` → `{ current, disabled }`, `getRootProps` (`data-disabled`), `getItemProps({ value,
disabled, current })` (`aria-current` = `current ?? "page"` while current, `aria-disabled`,
  `data-disabled`, `data-value`, `id`; a click on a disabled one is `preventDefault`ed),
  `getIconProps` (`aria-hidden`), `getLabelProps`. Spec: `navigation.spec.ts` (5).
- New dep `@zag-js/tabs` (catalog entry). The lockfile gained only its three hunks (no new
  transitive packages); `bun install --frozen-lockfile` installed 1 package.

### Anatomy (`src/composites.ts`)

- `tabsCompositeAnatomy` (`name: "tabs"`, `scope: "tabs"`): `root` (unstyled, `slot: null`,
  `pf-tabs-root`), `list` (`slot: "root"`, `data-pf-part="list"`, `pf-tabs-list`), `tab`, `icon`
  (mirror), `label`, `indicator`, `content` (unstyled, `pf-tabs-content`).
- `listAnatomy` (`name: "list"`, `scope: "list"`): `root` (`pf-list-root`), `item`
  (`pf-list-item`), both unstyled. Not a preset component.
- `compositeTestIds.tabs`, `compositeTestIds.list`. The navigation bar, rail, and list item use
  their generated anatomies (`testIds.navigationBar`, …).

### Suites (`tests/component-suites`)

Cases `src/components/tabs.ts` (`tabsCase`), `navigation.ts` (`navigationCase(component, ids)`,
`navigationBar`, `navigationRail`), `list.ts` (`listItem`, `list`); all in `COMPONENTS`,
`COMPONENT_NAMES`, and both scenes. No suite changes were needed.

- Tabs: `value` `"hotels"` → `"cars"` by a click; focusable is the selected tab; Enter/Space
  click; Home → first, End → last; Left/Right by direction (ltr Left → flights, Right → cars;
  rtl swapped); Up/Down nothing. `read` cross-checks each panel's `hidden` with its tab.
- Navigation: `value` `"search"` → `"home"` (Tab reaches the first destination, which Enter and
  Space choose); arrows do nothing; examples include links, a mirrored icon, no icons, disabled.
- List item: rendered `as: "button"` (focusable, natively disabled); Enter/Space click; no state.
- List: links; Enter clicks (bubbles to the `<ul>`), Space nothing; `keyboard.disables: false`.

## Deviations from the design

- **The navigation bar and rail run pureform's own machine**, not Zag's tabs or toggle group
  (§8 allowed either): destinations are links or buttons each reached with Tab, the current one
  marked `aria-current`, which neither Zag machine models (tabs are a roving `tablist`, a toggle
  group sets `aria-pressed`).
- **The tabs have a Root the preset doesn't** (as p6c's overlays): the preset's tabs `root` slot
  is the tab list, drawn as the `List` part (`slot: "root"`); `testIds.tabs.root` (generated) now
  names the unstyled wrapper.
- **Each tab draws its own indicator** (the preset's per-tab `indicator` slot shown while
  selected); Zag's measured, moving indicator isn't rendered.
- **The list is a composite**: the preset has only the list item. `List` is an unstyled `<ul>`
  with an unstyled `<li>` around each list item, so an item can be a link or a button inside a
  valid list. A list item's Root defaults to a `<div>`, not an `<li>`.
- **No list selection behavior**: no listbox, no `value`. A list item's `selected` is a plain
  prop (`aria-current`), as the preset matches; a selectable list (Zag's listbox) is left for
  later.
- **Ready-made tabs default to the first enabled tab** (Zag's default is none, which leaves no tab
  reachable by Tab). Compound `Tabs.Root` keeps Zag's default; give it a `defaultValue`.
- **`aria-current` differs by element**: `"page"` on a link, `"true"` on a button (navigation and
  list item alike).

## Stubs and gaps

- **No vertical tabs, scrollable tabs, or tabs with badges**; the preset's tabs are horizontal.
  `orientation` isn't passed to Zag.
- **No selectable list** (listbox, checkbox or radio rows); list items in the ready-made `List`
  can't take `as` (only `href`); compose `List.Item` + `ListItem as="button"` for button rows.
- **Navigation rail extras** (a FAB or menu button at the top, badges) aren't parts; the preset
  has no slots for them.
- **The navigation item's element is chosen once** (Solid) from `href` at creation; switching an
  item between link and button needs a new item.
- **Demos not updated** (as after p6a to p6c).
- Pre-existing, unchanged: `rn-parity` "every variant value at rest" in `browser-e2e-tests`
  (fails as before; preset untouched).

## How to verify

- `task_run` `build` + `test:unit` on `@pureform/machines`, `anatomy`, `binding-core`, `solid`,
  `react`: pass. Workspace `build` + `test:unit`: pass except the pre-existing rn-parity case.
- `task_run` `test:e2e` on `@pureform/component-suites`: 42 files, 9306 passed, 234 skipped (six
  projects).
- New components only: `cd tests/component-suites && set -a; source ../../.env.local; set +a;
bun x vitest --config vitest.config.e2e.ts run -t 'Tabs|Navigation|List'`.
- Unit: `cd packages/solid && bun x vitest --config vitest.config.unit.ts run src/tabs
src/navigation-bar src/list-item` (12 per binding); machines `src/navigation`.
- Suites type-check: `bun x tsc --noEmit -p tests/component-suites/tsconfig.json` (after building
  `@pureform/react`, so its new subpaths resolve to `dist` types).

## Notes for the next phases (p6e)

- **Never spread a Solid props object in a contract helper** (`{ ...props }`): it reads every
  getter, `children` included, rendering the children where the helper runs, outside their Root's
  context. In the browser it slipped by; on the server it threw "must be inside Root". Read named
  props only (`listItemVariants` was fixed for this).
- **Solid 2 contexts**: `createContext(undefined)` throws on `useContext` without a provider;
  give an optional context a `null` default. The context object is itself the provider
  (`<Ctx value>`), as React 19's is.
- **omni caches `test:unit` by the package's own inputs**: after changing `binding-core`, a
  binding's cached unit result can replay with stale types. Rebuild `binding-core` and pass
  `force: true`.
- **React specs**: RTL's `screen.getByTestId` fails on repeated test ids (items, tabs); query
  with `document.querySelector` as the Solid specs do. Use `cleanup()` (not `innerHTML = ""`) to
  mount a second scene in one React test.
- **A case can render a component through a plain-data `as`** (`as: "button"`), which works in
  both bindings and on the server; it gives a stateless component focus and a disabled state for
  the keyboard suite.
- **Zag's tabs strip**: `data-ssr` on triggers (changes after hydration), and `aria-controls` for
  tabs with no panel (axe flags a missing id).
- **`.vitest/` folders** under `packages/*/` are ignored now (p6c); `git add packages/<name>` is safe.
- `apps/solid-demo/solid-env.d.ts` changes on workspace builds; restore it before committing.
