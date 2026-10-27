// The file upload's contract, shared by every binding: the props Root takes for itself, how they
// map onto the selection and Zag's file upload machine, and what the ready-made component renders.
// It's a drop zone (with a trigger button) over a list of files: each file is a list item, with a
// linear progress under it when the app reports one, and a rejected file shows why it was turned
// away. The machine keeps the accepted and rejected files; uploading them, and reporting how far
// it has got (`progress`), is the app's.

import type {
    fileUploadAnatomy,
    PartName,
    TestIdOverride,
} from "@pureform/anatomy";
import type { InstanceTokens, Selection } from "@pureform/styling";

import type { ItemInstance, Unstyled } from "../parts";
import type { InteractiveProps } from "./indication";
import type { VariantProp } from "./variants";

/** The file upload's parts: `"root" | "label" | "dropzone" | "icon" | "headline" |
 *  "supportingText" | "itemGroup" | "item" | "error"`. A file's row is a list item, its remove
 *  button an icon button, and the trigger a button: their parts take their own test ids. */
export type FileUploadPart = PartName<typeof fileUploadAnatomy>;

/** The file upload's variant group and instance tokens. `color` colors the drop zone while files
 *  are dragged over it. */
export interface FileUploadVariantProps {
    readonly color?: VariantProp<"fileUpload", "color">;
    readonly tokens?: InstanceTokens<"fileUpload"> | undefined;
}

/** A rejected file's reason, as Zag names it. Anything else is an app's own, from `validate`. */
export type FileUploadErrorCode =
    | "TOO_MANY_FILES"
    | "FILE_INVALID_TYPE"
    | "FILE_TOO_LARGE"
    | "FILE_TOO_SMALL"
    | "FILE_INVALID"
    | "FILE_EXISTS";

/** What the contract reads of a file: the web's `File` (`@pureform/binding-web`'s
 *  `FileUploadDom*` types), or a platform's own. */
export interface FileUploadItem {
    readonly name: string;
    /** The size in bytes. */
    readonly size: number;
    /** The MIME type. */
    readonly type: string;
}

/** What a change of the files reports: the accepted files as `value`, and the rejected ones with
 *  their reasons. */
export interface FileUploadValueDetails<
    F extends FileUploadItem = FileUploadItem,
> {
    readonly value: F[];
    readonly rejectedFiles: { file: F; errors: string[] }[];
}

/** What the file upload takes for itself and passes on to the machine. The accepted files are
 *  the `value` (Zag's `acceptedFiles`), with `defaultValue` and `onValueChange`. `F` is the
 *  platform's file. */
export interface FileUploadBehaviorProps<
    F extends FileUploadItem = FileUploadItem,
> {
    /** The accepted files, to control them. Leave it out and the machine keeps them. */
    readonly value?: F[] | undefined;
    /** @control none */
    readonly defaultValue?: F[] | undefined;
    /** Called with the accepted (`value`) and the rejected files when either changes. */
    readonly onValueChange?:
        | ((details: FileUploadValueDetails<F>) => void)
        | undefined;
    /** Called when files are accepted. */
    readonly onFileAccept?: ((details: { files: F[] }) => void) | undefined;
    /** Called when files are rejected, each with the reasons. */
    readonly onFileReject?:
        | ((details: { files: { file: F; errors: string[] }[] }) => void)
        | undefined;
    readonly disabled?: boolean | undefined;
    readonly readOnly?: boolean | undefined;
    readonly required?: boolean | undefined;
    /** Marks the drop zone invalid, which draws it in the error color. */
    readonly invalid?: boolean | undefined;
    /** An error message: marks the drop zone invalid and replaces its supporting text. */
    readonly error?: string | undefined;
    /** What files it takes: a MIME type, a list of them, or Zag's map from a type to its
     *  extensions (`{ "image/png": [".png"] }`).
     *  @control text */
    readonly accept?: string | string[] | Record<string, string[]> | undefined;
    /** The most files it holds. @default 1 */
    readonly maxFiles?: number | undefined;
    /** The largest file, in bytes. */
    readonly maxFileSize?: number | undefined;
    /** The smallest file, in bytes. */
    readonly minFileSize?: number | undefined;
    /** Whether files may be dropped on the drop zone. @default true */
    readonly allowDrop?: boolean | undefined;
    /** Take a folder: its files, in browsers that support it. */
    readonly directory?: boolean | undefined;
    /** The camera to capture media with, on devices that have one. */
    readonly capture?: "user" | "environment" | undefined;
    /** Rejects a file by returning the reasons. */
    readonly validate?: ((file: F) => string[] | null) | undefined;
    /** The name the files submit under. @control none */
    readonly name?: string | undefined;
    /** The id of the form the files belong to, for one outside it. @control none */
    readonly form?: string | undefined;
    /** A remove button's accessible name, from its file. @default `Remove ${file.name}` */
    readonly removeLabel?: ((file: F) => string) | undefined;
    /** How far a file's upload has got, from 0 to 100, as the app reports it: a progress bar
     *  under the file while this returns a number, an indeterminate one for `null`, none for
     *  `undefined`. */
    readonly progress?: ((file: F) => number | null | undefined) | undefined;
    /** A rejected file's message, from the reason. @default the messages below */
    readonly errorMessage?: ((code: string, file: F) => string) | undefined;
    /** The root element's id; the machine builds the other ids from it.
     *  @control none */
    readonly id?: string | undefined;
}

/** Everything Root takes for itself, besides the element's own props and `as`. */
export interface FileUploadRootOwnProps<
    F extends FileUploadItem = FileUploadItem,
>
    extends
        FileUploadVariantProps,
        FileUploadBehaviorProps<F>,
        InteractiveProps {
    /** A prefix for every part's test id (`files` → `files-root`), or ids by part. */
    readonly testId?: TestIdOverride<FileUploadPart> | undefined;
    /** Every part, or some, without the registry's styles. */
    readonly unstyled?: Unstyled<FileUploadPart> | undefined;
}

/** The keys of `FileUploadRootOwnProps`, which Root keeps off its element. */
export const FILE_UPLOAD_ROOT_PROPS = [
    "color",
    "tokens",
    "value",
    "defaultValue",
    "onValueChange",
    "onFileAccept",
    "onFileReject",
    "disabled",
    "readOnly",
    "required",
    "invalid",
    "error",
    "accept",
    "maxFiles",
    "maxFileSize",
    "minFileSize",
    "allowDrop",
    "directory",
    "capture",
    "validate",
    "name",
    "form",
    "removeLabel",
    "progress",
    "errorMessage",
    "id",
    "testId",
    "unstyled",
    "indication",
    "interactionSource",
] as const satisfies readonly (keyof FileUploadRootOwnProps)[];

/** What the ready-made file upload renders inside Root, in the framework's node type. */
export interface FileUploadContentProps<
    Node,
    F extends FileUploadItem = FileUploadItem,
> {
    /** The label above the drop zone. */
    readonly label?: Node;
    /** The drop zone's icon. @default an arrow pointing up */
    readonly icon?: Node;
    /** The drop zone's headline. @default "Drop files here" */
    readonly headline?: Node;
    /** Under the headline: the accepted types and limits, say. An error message replaces it. */
    readonly supportingText?: Node;
    /** The trigger button's label, which opens the file dialog. @default "Choose files"; `null`
     *  leaves the button out. */
    readonly trigger?: Node;
    /** A file's leading icon, from the file, when it has no image preview. @default a document */
    readonly fileIcon?: ((file: F) => Node) | undefined;
    /** The remove buttons' icon. @default a cross */
    readonly removeIcon?: Node;
}

/** The keys of `FileUploadContentProps`. */
export const FILE_UPLOAD_CONTENT_PROPS = [
    "label",
    "icon",
    "headline",
    "supportingText",
    "trigger",
    "fileIcon",
    "removeIcon",
] as const satisfies readonly (keyof FileUploadContentProps<unknown>)[];

/** The file upload's registry selection from Root's props. */
export const fileUploadSelection = (
    props: FileUploadVariantProps &
        Pick<FileUploadBehaviorProps, "invalid" | "error">,
): Selection<"fileUpload"> => ({
    color: props.color,
    error: props.invalid || props.error !== undefined || undefined,
    tokens: props.tokens,
});

/** The file upload machine's props from Root's, besides `id`, `dir` and the files (see
 *  `fileUploadValueProps`). An error marks the drop zone invalid. */

const ERROR_MESSAGES: Readonly<Record<string, string>> = {
    TOO_MANY_FILES: "Too many files",
    FILE_INVALID_TYPE: "This type of file isn't accepted",
    FILE_TOO_LARGE: "The file is too large",
    FILE_TOO_SMALL: "The file is too small",
    FILE_INVALID: "The file isn't valid",
    FILE_EXISTS: "The file is already added",
};

/** A rejected file's message: the app's `errorMessage` for each reason, else the default for
 *  Zag's reasons (a reason of the app's own is shown as it is), joined by a comma. */
export const fileUploadErrorText = <F>(
    errors: readonly string[],
    file: F,
    errorMessage?: (code: string, file: F) => string,
): string =>
    errors
        .map(
            (code) =>
                errorMessage?.(code, file) ?? ERROR_MESSAGES[code] ?? code,
        )
        .join(", ");

/** What a file's upload shows: whether there's a progress bar, and its value (`null` for
 *  indeterminate). */
export const fileUploadProgress = <F extends FileUploadItem>(
    progress: FileUploadBehaviorProps<F>["progress"],
    file: F,
): { readonly shown: boolean; readonly value: number | null } => {
    const value = progress?.(file);
    return { shown: value !== undefined, value: value ?? null };
};

/** Whether a file is an image the item can preview. */
export const isPreviewable = (file: Pick<FileUploadItem, "type">): boolean =>
    file.type.startsWith("image/");

/** The test id prefix of the item's list item parts, from Root's `testId`: `files` →
 *  `files-item`. */
export const fileUploadItemTestId = (
    testId: TestIdOverride<FileUploadPart> | undefined,
): string | undefined =>
    typeof testId === "string" ? `${testId}-item` : undefined;

/** A file the React Native file upload lists. React Native has no file dialog or drop to take
 *  files from: the app picks them (with the platform's picker), keeps the list, and says how each
 *  upload is going. */
export interface FileUploadEntry {
    readonly name: string;
    /** The size in bytes, shown beside the name. */
    readonly size?: number | undefined;
    /** The MIME type: an `image/…` file with a `uri` shows a preview. */
    readonly type?: string | undefined;
    readonly uri?: string | undefined;
    /** Why it was rejected: it shows them in place of its size, in the error color. */
    readonly errors?: readonly string[] | undefined;
    /** How far its upload has got, from 0 to 100, `null` for unknown, left out for no bar. */
    readonly progress?: number | null | undefined;
}

/** What a ready-made file upload's file row is, for a function of the copy in its `item` and
 *  `error` keys: `className={{ item: (row) => (row.type === "rejected" ? "bad" : undefined) }}`.
 *  `index` counts the rows in order (the accepted files, then the rejected ones); `item` is the
 *  file (the web's `File`, React Native's `FileUploadEntry`). */
export interface FileUploadItemInstance<F> extends ItemInstance<F> {
    /** Whether the file was accepted or rejected. */
    readonly type: "accepted" | "rejected";
}

/** The ready-made file upload's repeated parts, each to its copy. */
export interface FileUploadInstances<F> {
    readonly item: FileUploadItemInstance<F>;
    readonly error: FileUploadItemInstance<F>;
}

/** A size in bytes as the file list shows it: `1.5 KB`, `10 bytes`. */
export const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return `${bytes} ${bytes === 1 ? "byte" : "bytes"}`;
    const units = ["KB", "MB", "GB", "TB"];
    let value = bytes / 1024;
    let unit = 0;
    while (value >= 1024 && unit < units.length - 1) {
        value /= 1024;
        unit++;
    }
    return `${Number(value.toFixed(value < 10 ? 1 : 0))} ${units[unit]}`;
};
