# Phase 3 export ledger

No compatibility web re-exports remain in binding-core. React/Solid framework APIs retain their
web presentation; Native imports no binding-web or web-contracts entry.

## Provider and icon contracts

- **Core:** `ProviderOptions`, `ProviderState`, `ROOT_PROVIDER`, `resolveProvider`,
  `requireRegistry`, registry/default/slot/direction types and focus-token inheritance remain
  neutral. No theme, override or hydration fields remain in that state.
- **Web:** `ProviderTheme`, `ThemeName`, `ThemeOverrides`, `ThemeHydration` move from core to
  binding-web. New `WebProviderOptions`, `WebProviderState`, `ROOT_WEB_PROVIDER` and
  `resolveWebProvider` extend neutral inheritance. Existing provider/theme attribute projection
  remains here and projects own settings only.
- **Both platforms:** core `IconStyle`/`DEFAULT_ICON_STYLE` now leave color unspecified, size in
  binding-defined units. Web exports its own narrower `IconStyle` and `DEFAULT_ICON_STYLE`
  (`currentColor`), used by React/Solid's public types and hooks. `sameIconStyle` stays in core.

## Defaults traversal

- **Core:** `overDefaults` now requires `DefaultsMergePolicy`; new `mergeKeyedDefaults` and
  `mergeShallowDefaults` expose the former part-by-part (lazy per-instance) and shallow merges.
  Undefined own keys are skipped and tokens merge shallowly, exactly as before. `createSlotReader`, `forSlot`, `forInstance`, and keyed types remain unchanged.
- **Web:** two-argument `overDefaults` supplies class/style/slot-props policy.
- **Native:** internal `src/defaults.ts` merges plain style records as before and flattens
  StyleProp arrays/registered styles (previously replaced) via `StyleSheet.flatten`.
  `nativeSlots` handler composition, own `onLayout`, pair caches and no-customization fast path
  are unchanged.

## Core → binding-web component exports

All these names are now exported by binding-web's root and implemented in `src/components/`
(with existing web-only extensions in `src/components.ts`):

- Machine assembly: `accordionMachineProps`, `autocompleteMachineProps`, `avatarMachineProps`,
  `buttonGroupMachineProps`, `buttonMachineProps`, `carouselMachineProps`,
  `checkboxMachineProps`, `chipSetMachineProps`, `codeFieldMachineProps`,
  `copyButtonMachineProps`, `dateMachineProps`, `dialogMachineProps`, `fabMachineProps`,
  `fabMenuMachineProps`, `fileUploadMachineProps`, `listItemExpandMachineProps`,
  `menuButtonMachineProps`, `menuItemMachineProps`, `menuMachineProps`,
  `navigationItemMachineProps`, `navigationMachineProps`, `navigationModalMachineProps`,
  `numberFieldMachineProps`, `paginatorMachineProps`, `popoverMachineProps`,
  `radioGroupMachineProps`, `ratingMachineProps`, `richTooltipMachineProps`,
  `rippleMachineProps`, `searchBarMachineProps`, `selectMachineProps`,
  `selectionListMachineProps`, `sheetMachineProps`, `sliderMachineProps`,
  `snackbarMachineProps`, `splitButtonMachineProps`, `splitterMachineProps`,
  `stepperMachineProps`, `switchMachineProps`, `tableMachineProps`, `tabsMachineProps`,
  `tagsInputMachineProps`, `textFieldMachineProps`, `timeMachineProps`, `tooltipMachineProps`,
  `treeMachineProps`, `searchViewDialogProps`, `searchViewComboboxProps`.
- HTML/Zag prop adaptation: `autocompleteTriggerProps`, `buttonGroupItemProps`,
  `buttonGroupRootProps`, `cardElement`, `cardRootProps`, `checkboxInputProps`,
  `checkboxMarkProps`, `closeTriggerProps`, `fabMenuItemFocusProps`, `fieldControlProps`,
  `fieldLabelProps`, `fileUploadValueProps`, `fromZagValue`, `LIST_ITEM_EXPAND_VALUE`,
  `listItemElement`, `listItemRootProps`, `nativeSelectProps`, `navigationItemElement`,
  `navigationItemElementProps`, `overlayPositionerProps`, `pageRootProps`,
  `paginatorTriggerProps`, `presentProps`, `radioGroupRootProps`, `radioInputProps`,
  `radioItemProps`, `radioRingProps`, `selectHiddenSelectProps`, `selectInputProps`,
  `selectPositionerProps`, `selectValueProps`, `separatorRootProps`, `sharedAxisPageProps`,
  `sharedAxisScrimProps`, `fadeThroughPageProps`, `sliderControllableProps`,
  `splitterSizeProps`, `splitterTriggerProps`, `switchInputProps`, `tabsTriggerProps`,
  `toZagValue`, `toggleGroupItemProps`.
- Browser layout/CSS: `bottomSheetPositionerLayout`, `dialogBackdropLayout`,
  `dialogPositionerLayout`, `fullscreenDialogPositionerLayout`,
  `navigationModalContentLayout`, `navigationModalPositionerLayout`,
  `searchViewPositionerLayout`, `sheetContentLayout`, `sheetDragHandleLayout`,
  `sideSheetBodyLayout`, `sideSheetContentLayout`, `sideSheetPositionerLayout`,
  `carouselInitialStyle`, `toastGroupStyle`, `unstyledToolbarProvidedTokens`, `CARET_STYLE`,
  `COPY_ANNOUNCEMENT_STYLE`, `LEAVING_PAGE_PROPS`, `SEARCH_VIEW_ROOT_STYLE`,
  `SEARCH_VIEW_TRIGGER_STYLE`, `TOAST_STACK_STYLE`.
- Form reset projection: `checkboxNativeDefault`, `checkboxResetState`, `radioGroupResetValue`,
  `sliderNativeDefault`, `switchNativeDefault`, `textFieldNativeDefault`.

CSS indication serialization also moves from core `/indication` to web `/indication`:
`indicationTokenValue`, `indicationTokenValues`, `providerIndicationOverrides`,
`componentIndicationTokens`. Token names/paths and focus-indicator diagnostics remain in core.

## Redesigned shared APIs (not re-exports)

- `fieldControlState(field, own)` returns `id`, boolean `disabled`/`invalid`/`required`, and
  `describedBy`. Native field inputs and native select use it directly. RN-Web's select projects
  its HTML locally, not through binding-web. Web's `fieldControlProps` preserves HTML output.
- Core `cardSelection`, `cardLayout`, `isInteractiveCard`, `listItemSelection`, and
  `isInteractiveListItem` take boolean interaction defaults. Web exports same-named adapters
  accepting elements, using `isInteractiveElement` for `a`/`button` inference.
- Core adds `selectionListDefaults`, `menuButtonPositioning`, `fabMenuPositioning`, and
  `splitButtonPositioning`. Native no longer constructs web machine props to read these defaults.
- Core `ToasterOptions`, `TOASTER_DEFAULTS`, `toasterOptions` use numeric offsets. The web
  extension keeps CSS offsets and exact `"16px"` default. Native converts only at the existing
  shared store transport boundary, whose layout projection Native does not consume.

## Deliberately retained contracts and handoff

Shared ARIA role/naming/progress/ID-reference helpers are meaningful on Native too; they do not
select HTML tags, data attributes, browser lifecycle or CSS. Collection readers and item-data
projection remain plain portable data, not Zag API calls. Form names/IDs, validation and reset
reasons remain declarative contracts; DOM form-reset projection does not.

Overlay placement/coordinate-strategy options are consumed by Native placement as well as web.
Splitter size parsing is shared arithmetic over normalized lengths/percentages, not CSS
serialization. Slider numeric style measurement remains a plain-record Native adapter; it has
no browser dependency or CSS fallback.

**Deferred web coupling (resolved in phase 4):** registry/factory/selection types still came from
styling, whose mixed surface included web factories/runtime CSS themes. Phase 4 split that surface
into `@pureform/styling-web`; styling now depends on core only (see the
[migration guide](platform-boundaries-migration.md#styling-boundary-phase-4)). Native's toast store and generic `Indication<E>` still host
platform-specific transport/extension points (without DOM types in core); redesigning those
independent subsystems is not required for this phase. Broader cross-target SSR/hydration and
the complete enforcement gate remain phase 6 work.
