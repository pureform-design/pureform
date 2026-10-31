# Part names for public customization (F3 audit)

Status: audit and proposal. No code has changed. Decisions are listed at the end.

## 1. The two vocabularies

A component names the same element twice.

- **Anatomy part names** (`@pureform/anatomy`): what an element is. `data-pf-part`, test ids,
  `testId`/`unstyled` overrides, the instance's `className`/`style`/`slotProps`, the compound
  parts (`Dialog.Content`).
- **Preset style slots** (the AST's `slots`, `SlotOf<N>`): what draws it. Registry classes and
  tokens, theme authoring (`components.dialog.root`), and the **provider's** `slotProps`.

Across the 100 anatomies (646 parts) they are identical for 622 parts. They differ in 24 rows,
all in the composite (hand-written) anatomies, found by comparing each part's `slot` with its
`name` (`partSlot`, `anatomy/src/attributes.ts`). Eleven of those 24 are a composite's unstyled
`root` (slot `null`); the other 13 are the renames below.

## 2. Where each side is read

| Layer                                                    | Keyed by | Source                                                                           |
| -------------------------------------------------------- | -------- | -------------------------------------------------------------------------------- |
| Instance `className`, `style`, `slotProps` (web, Native) | part     | `SlotKeyedProps<Anatomy>`; Native `overlayKeys`                                  |
| `testId`, `unstyled`                                     | part     | `partAttributes`, `isUnstyled`                                                   |
| `data-pf-part` attribute                                 | part     | anatomy `attribute`                                                              |
| Provider `slotProps` (web)                               | slot     | `partSources`: `slotProps[anatomy.name][partSlot(part)]`                         |
| Provider `slotProps` (Native)                            | slot     | `NativeProviderSlotProps`, `RemappedHosts`; `nativeSlots` reads `provided[slot]` |
| Registry classes, tokens, theme config                   | slot     | `partClasses`                                                                    |

Native and web agree. Native components address parts by slot internally, so provider keys
(slot) are read directly and `overlayKeys` translates slot to part for the instance side only. I
checked for a latent mismatch there and found none.

## 3. The divergences

### 3.1 Renames (13)

| Component(s)                                                                                      | Instance part | Provider slot |
| ------------------------------------------------------------------------------------------------- | ------------- | ------------- |
| dialog, fullscreenDialog, popover, tooltip, richTooltip, menu, datePicker, bottomSheet, sideSheet | `content`     | `root`        |
| bottomSheet, sideSheet                                                                            | `body`        | `content`     |
| searchView                                                                                        | `surface`     | `root`        |
| tabs                                                                                              | `list`        | `root`        |

The reason is deliberate (`packages/anatomy/README.md`): an overlay's outermost part is Zag's
unstyled wrapper `root`, so the preset's `root` (the surface) can't keep that name on the
instance side.

### 3.2 Collisions: one word, two meanings

- `root`: provider means the surface; instance means the unstyled wrapper (null slot).
- `content` on the two sheets: provider means the body; instance means the surface.

A provider written `{ bottomSheet: { content } }` styles what an instance calls `body`; an
instance `className={{ content }}` styles what the provider calls `root`. This is the case F3
calls ambiguous, and the only one where the same string reaches different elements.

### 3.3 Parts an instance can target and a provider can't

15 composites have unstyled parts with no slot (`root`, `trigger`, `positioner`, `closeTrigger`,
`contextTrigger`, `hiddenSelect`, the tabs' `content`). A provider cannot reach them. Native has
no host for the wrapper `root` or `positioner`, so it couldn't either way; it does have hosts for
`trigger` (and the menu's `contextTrigger`).

### 3.4 Keys that exist only on one side

- **`backdrop`** (five overlays) and **`cell`** (the date pickers) are instance-only keys. They
  are not in the overlay's anatomy: the backdrop is a separate `scrim` component and a cell a
  `calendarCell`. A provider reaches them only as `scrim.root` / `calendarCell.*`, shared by every
  scrim or cell, never per owning component.
- Composite anatomies resolve to a provider key by `name`: the select, autocomplete and search
  view menus all read `menu`, and every backdrop reads `scrim`. That sharing is intended; it
  means a provider's `menu.item` styles every menu.

### 3.5 Footprint

Provider `slotProps` with the renamed keys is used in four specs, which encode today's contract:

- `react/src/provider-slots.spec.tsx` and `solid/src/provider-slots.spec.tsx`: `dialog.root` styles
  the surface "not its structural root or scrim", and `scrim.root` the backdrop.
- `react-native/src/slot-props.spec.tsx`: the same dialog and scrim case.
- `react-native/src/date-pickers.spec.tsx`: `datePicker.root` and `calendarCell.*`.

Prose that states the contract and would change: `docs/design/component-architecture.md` (§ on
composite anatomies, "the provider's `slotProps.menu.root` reaches the surface", and "Keys and
names") and `packages/anatomy/README.md` (the `slot` field and the overlay sections). No app or demo
uses provider `slotProps` with these keys. The packages are `0.0.0-semantically-released`, so no
stable API has shipped; external users are unknown, which is the real migration risk.

### 3.6 This reverses a recorded decision

The current rule was chosen on purpose (component-architecture "Keys and names", from the slot-props
audit): provider `slotProps` key by the part's registry slot, so a part with `slot: null` gets
nothing and the modal date picker's provider `datePicker.root` styles `content`. The reasons were
that one `useComponent` call styles a whole overlay, and that a provider keyed like the registry
and theme lets one vocabulary cover authoring. F3 chooses the other trade: one vocabulary for
everything a consumer writes (instance, provider, `testId`, `unstyled`, `data-pf-part`), keeping slots
only where a preset or theme author writes them. If you'd rather keep the earlier reasoning, option B
below is the consistent alternative.

## 4. Options

**A. Provider keys follow anatomy parts (F3 as written).** `slotProps.dialog.content` styles the
surface, `slotProps.bottomSheet.body` the body, and unstyled parts become reachable. Theme and
registry authoring stays slot-keyed.

**B. Keep both vocabularies, document them.** No break, but the collisions in 3.2 remain.

**C. Accept both during a deprecation window.** Rejected: `root` and the sheets' `content` mean
different elements in each vocabulary, so any union is ambiguous.

## 5. Recommendation: A, as a hard switch with a loud dev error

- **Web:** `partSources` reads `slotProps[anatomy.name][part]` instead of the slot. Parts whose
  slot equals their name are unaffected.
- **Types:** replace `SlotOf<N>` in `ProviderSlotProps` with the component's part names. Add a
  `ComponentParts` map in `@pureform/anatomy` that uses the overlay or composite anatomy where
  one exists and the generated anatomy elsewhere.
- **Native:** `NativeProviderSlotProps` drops the `RemappedHosts` slot remap. Components read
  `provided` through the same part key as the instance, so `overlayKeys` also serves the provider.
  Parts Native lacks stay absent from its type.
- **Old keys:** no silent acceptance. A development-only warning names the new key when a
  provider uses a slot name that was renamed (`dialog.root` to `dialog.content`). It does not
  apply the style.
- **Order of merge:** unchanged (machine, anatomy attributes, state attributes, registry classes,
  provider, instance). Handler and style precedence therefore don't move.

### Risks checked

- **Accessibility:** a provider can now set props on the unstyled wrapper, trigger or positioner.
  It already could on instances, and it merges before the instance, so ARIA from the machine
  can be overridden the same way. No new capability beyond the instance's.
- **Reactivity and SSR/hydration:** keys resolve at render from the provider's object (compared by
  identity); nothing is stored or measured, so server and client render the same.
- **Structural parts:** unaffected; `parent` and `children` still come from the AST.
- **Registry and theme authoring:** unchanged, still slot-keyed (`components.dialog.root`).

### Specs and prose to update

The four specs in 3.5 change their keys (`dialog.root` to `dialog.content`, `scrim.root` to
`dialog.backdrop` once decision 2 is made, and so on), and the two docs in 3.5 are rewritten.

### Tests the change needs

1. Anatomy: for every part, the provider key resolves to the same element the instance key does.
2. Web and Native: a provider prop on `content`, on `body` (sheets), and on an unstyled
   `positioner` reaches the right element; the old `root` key warns and styles nothing.
3. Type tests: old slot keys are rejected, composites' unstyled parts are accepted on web only.
4. Existing provider specs pass unchanged for non-composite components.

## 6. Decisions needed

1. **Hard switch or a deprecation window?** Recommended: hard switch, given the pre-release
   versions and no in-repo users. A window would need the ambiguous-key rule in 3.2 resolved first.
2. **Per-owner `backdrop` and `cell` provider keys.** Today they are only reachable as `scrim` and
   `calendarCell`, shared. Recommended: add `dialog.backdrop`, `datePicker.cell`, and so on, merged
   after the shared key and before the instance's. Without this, F3 leaves them asymmetrical.
3. **Expose unstyled parts to the provider on web?** Recommended yes, for parity with the
   instance; Native keeps only its own hosts.
