# c10: Plain form primitives

**Depends on:** c9. **Subphases:** c10a and c10b, parallel.

Standalone form pieces for apps that want Material's theme without Material's field design
(floating label, filled underline, notched outline). Each has one look and no variants, styled
by the theme's colour, shape, type, state layer and focus ring. The Material fields
(`TextField`, `Select`, the pickers) don't change and share nothing new with these. Each
follows the component recipe, in React, Solid and React Native, on the css, panda and tailwind
targets. Record in each context where the design is pureform's own.

## c10a: Field, Label, Input, Textarea, Description, ErrorText

- **Field:** connects the pieces inside it: label `for`, `aria-describedby` for the description
  and error, and the disabled, invalid and required states. Spacing only, no look.
- **Label:** the theme's type scale and colours; dims when disabled; a required mark.
- **Input** and **Textarea:** a plain box with the theme's shape, outline colour, focus ring and
  state layer; no floating label, no underline.
- **Input's date and time types** (`type="date" | "time" | "datetime-local"`): the browser's own
  pickers, styled like any Input (the indicator icon in the theme's colour). No new picker
  component; apps wanting Material's pickers use `DatePicker` and `TimePicker`. React Native has
  no native date input: record the choice made (the platform's dialog, or pointing to the
  Material pickers).
- **Description** and **ErrorText:** the supporting text styles, wired through Field.
- Own files: `field-primitives.ts` (or one file per piece), bindings.

## c10b: NativeSelect

- A styled native `<select>` (with `<optgroup>`), the same box as Input, and a chevron in the
  theme's colour. The platform draws the list. Works inside Field.
- React Native: the trigger is a pressable drawn like Input (the selected label and the
  chevron); the list is the platform's native menu through `@react-native-menu/menu` (UIMenu
  with a check on iOS, the popup menu on Android), an optional peer dependency. Without it
  installed, fall back to the Material Menu and warn in development. On the web, React Native
  renders a real `<select>`.
- Own files: `native-select.ts`, bindings.
