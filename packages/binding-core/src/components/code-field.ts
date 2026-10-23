// The code field's contract, shared by every binding: the props Root takes for itself, how they
// map onto the selection and Zag's pin input machine, what the ready-made component renders, and
// the value arithmetic React Native runs without Zag (a typed or pasted character's cells, and
// where focus goes next).
//
// A row of single-character cells for a verification code, a one-time code or a PIN; Material
// has none, so it's pureform's own (c9a).

import type {
    codeFieldAnatomy,
    PartName,
    TestIdOverride,
} from "@pureform/anatomy";
import type { InstanceTokens, Selection } from "@pureform/styling";

import type { Controllable } from "../controllable";
import type { Unstyled } from "../parts";
import type { VariantProp } from "./variants";

/** The code field's parts: `"root" | "label" | "control" | "input" | "supportingText"`. Each cell
 *  is an `input`. */
export type CodeFieldPart = PartName<typeof codeFieldAnatomy>;

/** The code field's variant groups and instance tokens. */
export interface CodeFieldVariantProps {
    readonly variant?: VariantProp<"codeField", "variant">;
    readonly color?: VariantProp<"codeField", "color">;
    readonly density?: VariantProp<"codeField", "density">;
    readonly tokens?: InstanceTokens<"codeField"> | undefined;
}

/** What a value change reports: a character per cell (empty for an empty cell) and the code they
 *  spell, as Zag's. */
export interface CodeFieldValueDetails {
    readonly value: string[];
    readonly valueAsString: string;
}

/** Which characters a cell takes. */
export type CodeFieldType = "numeric" | "alphanumeric" | "alphabetic";

/** What the pin input machine takes from Root's props. */
export interface CodeFieldBehaviorProps extends Controllable<
    "value",
    string[],
    CodeFieldValueDetails
> {
    /** How many cells. @default 4 */
    readonly length?: number | undefined;
    /** Which characters a cell takes. @default "numeric" */
    readonly type?: CodeFieldType | undefined;
    /** A one-time code: `autocomplete="one-time-code"`, so the platform offers the code it
     *  received. */
    readonly otp?: boolean | undefined;
    /** Hide each character, as a password field does: for a PIN. */
    readonly mask?: boolean | undefined;
    /** Called once every cell holds a character. */
    readonly onValueComplete?:
        | ((details: CodeFieldValueDetails) => void)
        | undefined;
    /** Leave the field once every cell holds a character. */
    readonly blurOnComplete?: boolean | undefined;
    /** Select a cell's character as it takes focus, so typing replaces it. */
    readonly selectOnFocus?: boolean | undefined;
    /** What an empty cell shows while it hasn't focus. @default "" */
    readonly placeholder?: string | undefined;
    readonly disabled?: boolean | undefined;
    /** Marks the cells invalid (`aria-invalid`), which the error look keys on. */
    readonly invalid?: boolean | undefined;
    /** An error message: marks the cells invalid and replaces the supporting text. */
    readonly error?: string | undefined;
    readonly required?: boolean | undefined;
    readonly readOnly?: boolean | undefined;
    /** The name the code submits under.
     *  @control none */
    readonly name?: string | undefined;
    /** The id of the form the code belongs to, for a field outside it.
     *  @control none */
    readonly form?: string | undefined;
    /** A cell's accessible name, from its index and the cell count.
     *  @default `pin code ${index + 1} of ${length}` */
    readonly cellLabel?:
        | ((index: number, length: number) => string)
        | undefined;
    /** The root element's id; the machine builds the other ids from it.
     *  @control none */
    readonly id?: string | undefined;
}

/** Everything Root takes for itself, besides the element's own props and `as`. */
export interface CodeFieldRootOwnProps
    extends CodeFieldVariantProps, CodeFieldBehaviorProps {
    /** A prefix for every part's test id (`otp` → `otp-input`), or ids by part. */
    readonly testId?: TestIdOverride<CodeFieldPart> | undefined;
    /** Every part, or some, without the registry's styles. */
    readonly unstyled?: Unstyled<CodeFieldPart> | undefined;
}

/** The keys of `CodeFieldRootOwnProps`, which Root keeps off its element. */
export const CODE_FIELD_ROOT_PROPS = [
    "variant",
    "color",
    "density",
    "tokens",
    "length",
    "type",
    "otp",
    "mask",
    "onValueComplete",
    "blurOnComplete",
    "selectOnFocus",
    "placeholder",
    "disabled",
    "invalid",
    "error",
    "required",
    "readOnly",
    "name",
    "form",
    "cellLabel",
    "id",
    "value",
    "defaultValue",
    "onValueChange",
    "testId",
    "unstyled",
] as const satisfies readonly (keyof CodeFieldRootOwnProps)[];

/** What the ready-made code field renders inside Root, in the framework's node type. */
export interface CodeFieldContentProps<Node> {
    /** The label above the cells. */
    readonly label?: Node;
    /** Helper text under the cells; an error message takes its place. */
    readonly supportingText?: Node;
}

/** The keys of `CodeFieldContentProps`. */
export const CODE_FIELD_CONTENT_PROPS = [
    "label",
    "supportingText",
] as const satisfies readonly (keyof CodeFieldContentProps<unknown>)[];

/** The default cell count. */
export const CODE_FIELD_LENGTH = 4;

/** The code field's registry selection from Root's props. */
export const codeFieldSelection = (
    props: CodeFieldVariantProps,
): Selection<"codeField"> => ({
    variant: props.variant,
    color: props.color,
    density: props.density,
    tokens: props.tokens,
});

/** The pin input machine's props from Root's, besides `id`, `dir`, and the controllable `value`
 *  (the binding's `useControllable`). An error marks the cells invalid. */
export const codeFieldMachineProps = (props: CodeFieldBehaviorProps) => ({
    count: props.length ?? CODE_FIELD_LENGTH,
    type: props.type ?? "numeric",
    otp: props.otp,
    mask: props.mask,
    onValueComplete: props.onValueComplete,
    blurOnComplete: props.blurOnComplete,
    selectOnFocus: props.selectOnFocus,
    placeholder: props.placeholder ?? "",
    disabled: props.disabled,
    invalid: props.error !== undefined ? true : props.invalid,
    required: props.required,
    readOnly: props.readOnly,
    name: props.name,
    form: props.form,
    translations: props.cellLabel ? { inputLabel: props.cellLabel } : undefined,
});

// React Native: no Zag machine, so the value arithmetic is here.

/** A cell's accessible name by default: Zag's. */
export const codeFieldCellLabel = (index: number, length: number): string =>
    `pin code ${index + 1} of ${length}`;

const PATTERNS: Record<CodeFieldType, RegExp> = {
    numeric: /^[0-9]$/,
    alphabetic: /^[a-z]$/i,
    alphanumeric: /^[a-z0-9]$/i,
};

/** Whether `char` belongs in a cell of `type`. */
export const codeFieldAccepts = (char: string, type: CodeFieldType): boolean =>
    PATTERNS[type].test(char);

/** `value` padded or cut to `length` cells. */
export const codeFieldCells = (
    value: readonly string[] | undefined,
    length: number,
): string[] => Array.from({ length }, (_, index) => value?.[index] ?? "");

/** The code the cells spell. */
export const codeFieldString = (cells: readonly string[]): string =>
    cells.join("");

/** Whether every cell holds a character. */
export const codeFieldComplete = (cells: readonly string[]): boolean =>
    cells.length > 0 && cells.every((cell) => cell !== "");

/** What typing (or pasting) `text` into cell `index` does: the cells after it, and the cell focus
 *  moves to. One character fills the cell and moves on; more (a pasted code) fill from that cell
 *  on, as far as they go. Characters the type doesn't take are dropped; text with none leaves
 *  the cells as they were. */
export const codeFieldEnter = (
    cells: readonly string[],
    index: number,
    text: string,
    type: CodeFieldType,
): { readonly cells: string[]; readonly focus: number } => {
    const chars = [...text].filter((char) => codeFieldAccepts(char, type));
    if (chars.length === 0) return { cells: [...cells], focus: index };
    // A whole code pasted into any cell fills from the first.
    const start = chars.length >= cells.length ? 0 : index;
    const next = [...cells];
    let at = start;
    for (const char of chars) {
        if (at >= next.length) break;
        next[at] = char;
        at++;
    }
    return { cells: next, focus: Math.min(at, next.length - 1) };
};

/** What Backspace in cell `index` does, as Zag's: removes its character, or the one before it
 *  when it's already empty (the characters after move up a cell), and moves focus back a cell. */
export const codeFieldBackspace = (
    cells: readonly string[],
    index: number,
): { readonly cells: string[]; readonly focus: number } => {
    const at = cells[index] !== "" ? index : Math.max(0, index - 1);
    const next = [...cells];
    next.splice(at, 1);
    next.push("");
    return { cells: next, focus: Math.max(0, index - 1) };
};
