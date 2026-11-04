# Design: NativeSelect option customization (F1)

Status: proposal, no code yet. From `docs/todo-later.md` (Deferred designs). Facts about the current
code are cited by file; anything about OS menus that needs a device is marked **(V3)**.

## Where it stands

`NativeSelectItem` (`packages/binding-core/src/components/native-select.ts`) is
`{ value, label: string, disabled?, group? }`. Three renderers read it:

| Renderer | Where | What an option can be today |
| --- | --- | --- |
| Web `<select>` | react / solid / react-native on web | `<option>`/`<optgroup>`: plain text only, per-part styling through `slotProps` (`option`, `group`, with `NativeSelectInstances`) |
| OS menu | RN iOS/Android via optional `@react-native-menu/menu` | an action: `id`, `title`, `state`, `attributes.disabled`/`keepsMenuPresented`, `displayInline` group |
| Material fallback | RN device without the peer | a `Menu` item, which already supports `supportingText`, icons, `trailingText`, `type: "checkbox"` |

The three have different ceilings, so a single "rich option" type would promise things two of them
can't draw. The ready-made `NativeSelect` is a `<select>` first: browsers render only text in an
`<option>`, and that is the right floor.

## Principle

Don't widen `NativeSelectItem` to the union of what the richest renderer can do. Split it by
capability, and let each renderer ignore what it can't draw, without an error.

## Proposed shape

```ts
interface NativeSelectItem {
    value: string;
    label: string;            // always plain text: every renderer, and the closed trigger
    disabled?: boolean;
    group?: string;
    /** Text the closed control shows instead of `label` (a short form). Every renderer. */
    triggerLabel?: string;
    /** Hint for renderers that can draw a second line. Web: `title` tooltip only. */
    description?: string;
    /** Per-renderer extras, each typed to what that renderer draws. */
    web?: { title?: string; lang?: string; dir?: "ltr" | "rtl" };
    menu?: { // OS menu (UIMenu / Android popup)
        subtitle?: string;           // iOS 15+ (V3)
        image?: string;              // system symbol (iOS) or drawable name (Android) (V3)
        destructive?: boolean;       // iOS red styling (V3)
    };
    fallback?: Partial<Pick<MenuItem<ReactNode>, "leadingIcon" | "trailingIcon" |
        "supportingText" | "trailingText" | "mirrorLeadingIcon">>;
}
```

Rules:

1. `label` stays a string. A `ReactNode` label can't be put in an `<option>` or a UIMenu, and
   typeahead, the trigger text and the form value all read it.
2. **Web:** only `disabled`, `title`, `lang`, `dir`, `triggerLabel` (applied to the closed text
   when the `<select>` is replaced, see below) and per-copy `slotProps`. No icons or rich content: a
   browser `<option>` can't draw them. Anyone who needs rich options on web should use `Select`
   (the Zag listbox-based component), and the docs say so.
3. **OS menu:** map `menu.*` to the action fields the peer exposes; `description` falls back to
   `menu.subtitle`. Unsupported fields are dropped on that OS. Don't promise per-item styling,
   custom views, search, or anything the peer's `MenuView` doesn't expose. **Open (V3):** confirm
   each field on Android's popup menu, and that `keepsMenuPresented` + `subtitle` combine.
4. **Material fallback:** `fallback.*` goes straight to the existing `Menu` item, and `description`
   falls back to `supportingText`. This is the only device renderer where icons and trailing text
   are drawable, and it's the one we control.
5. **Actions the OS menu owns** (a "Clear" row, a footer, "Add new…") are out of scope for
   `items`. Add an explicit `actions` list later only if a real need appears; it would map to
   non-selecting UIMenu actions on the OS menu and `Menu` items on the fallback, and has no web
   `<option>` equivalent, so web would hide it. Don't design it until then.
6. Capability reporting: export `nativeSelectCapabilities` (`{ web, menu, fallback }`, each a set of
   supported item keys) from binding-core, so docs and a dev-only warning (via `warnOnce`, like
   `MISSING_MENU_MESSAGE`) can say "`menu.image` is ignored on web".

## Plumbing

- `binding-core` owns the item type and `nativeSelectCapabilities`; React and Solid pass the extras
  to `<Option>` (only `title`/`lang`/`dir`); RN's `menuActions` and fallback `groups` build in
  `packages/react-native/src/native-select/native-select.tsx` map the other fields.
- Types are in binding-core, so the three bindings can't drift. Extend the existing
  `native-select.types.spec.ts` files with each renderer-only key.
- Tests: one component spec per renderer that an unsupported key is ignored and a supported one
  reaches the renderer (RN's fake `MenuView` already captures `actions`).

## Decisions needed

- Is `triggerLabel` worth it? It makes the web trigger differ from the option, which a native
  `<select>` can't do without replacing the select. Proposal: RN device only, and drop it from web.
- Ship `description` as a cross-renderer field, or only `menu.subtitle` and `fallback.supportingText`?
  Proposal: keep both explicit and add no alias until a user asks.
- V3 results decide which `menu.*` fields ship; do the types last.


## Suggested order

Types and the capability table after V3 device results; ship the Material-fallback and web fields
first, since those need no devices.
