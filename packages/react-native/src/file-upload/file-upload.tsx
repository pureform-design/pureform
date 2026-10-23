// The file upload: a label, a drop zone with its icon, headline, supporting text and a trigger
// button, and the list of files. React Native has no file dialog or drop to take files from, so
// the app does the picking: the trigger calls `onPick`, and the app keeps `files` and shows each
// upload's `progress`. A file is a list item (its preview, name and size, and a remove icon
// button) with a linear progress under it while it has one; a file with `errors` shows them in
// place of its size.

import { fileUploadAnatomy } from "@pureform/anatomy";
import type { TestIdOverride } from "@pureform/anatomy";
import {
    fileUploadErrorText,
    fileUploadItemTestId,
    fileUploadSelection,
    formatFileSize,
    isPresent,
} from "@pureform/binding-core";
import type {
    FileUploadBehaviorProps,
    FileUploadContentProps,
    FileUploadEntry,
    FileUploadPart,
    FileUploadVariantProps,
} from "@pureform/binding-core";
import type { ReactNode } from "react";
import { Image } from "react-native";

import { Button } from "../button";
import { IconButton } from "../icon-button";
import { IconSlot, iconSlot } from "../icon-style";
import { LinearProgress } from "../linear-progress";
import { ListItem } from "../list-item";
import { testIdOf, withEngine } from "../parts";
import { useComponentSlots } from "../styles";

export type { FileUploadEntry } from "@pureform/binding-core";

export interface FileUploadProps
    extends
        FileUploadVariantProps,
        Omit<FileUploadContentProps<ReactNode>, "fileIcon">,
        Pick<
            FileUploadBehaviorProps,
            "disabled" | "readOnly" | "invalid" | "error"
        > {
    /** The files listed, as the app keeps them. */
    readonly files?: readonly FileUploadEntry[] | undefined;
    /** Opens the app's file picker: the trigger calls it. Without it there's no trigger. */
    readonly onPick?: (() => void) | undefined;
    /** Removes a file from the list: the file's remove button calls it. */
    readonly onRemove?: ((file: FileUploadEntry) => void) | undefined;
    /** A rejected file's message, from the reason. @default the web's messages */
    readonly errorMessage?:
        | ((code: string, file: FileUploadEntry) => string)
        | undefined;
    /** A remove button's accessible name, from its file. @default `Remove ${file.name}` */
    readonly removeLabel?: ((file: FileUploadEntry) => string) | undefined;
    /** A file's leading icon, from the file, when it has no image preview. @default a document */
    readonly fileIcon?: ((file: FileUploadEntry) => ReactNode) | undefined;
    /** Draws the drop zone as files are dragged over it (the web's drag-over look), for a host
     *  that tells the app of one. */
    readonly dragging?: boolean | undefined;
    /** A prefix for every part's test id (`files` → `files-root`), or ids by part. */
    readonly testId?: TestIdOverride<FileUploadPart> | undefined;
}

function FileUploadImpl(props: FileUploadProps): ReactNode {
    const {
        styles: s,
        selected,
        views: v,
    } = useComponentSlots<FileUploadPart>(
        "fileUpload",
        fileUploadSelection(props),
        {
            disabled: props.disabled ?? false,
            ...(props.dragging ? { dragged: true } : {}),
        },
    );
    const id = (part: FileUploadPart) =>
        testIdOf(fileUploadAnatomy, part, props.testId);
    const files = props.files ?? [];
    const supporting = props.error ?? props.supportingText;
    const itemTestId = fileUploadItemTestId(props.testId);
    return (
        <v.root.View style={s.root} testID={id("root")}>
            {isPresent(props.label) ? (
                <v.label.Text
                    selectable={false}
                    style={s.label}
                    testID={id("label")}
                >
                    {props.label}
                </v.label.Text>
            ) : null}
            <v.dropzone.View style={s.dropzone} testID={id("dropzone")}>
                <v.icon.View
                    pointerEvents="none"
                    style={s.icon}
                    testID={id("icon")}
                >
                    <IconSlot {...iconSlot(selected, "icon")} motion={s.icon}>
                        {props.icon ?? "↑"}
                    </IconSlot>
                </v.icon.View>
                <v.headline.Text
                    selectable={false}
                    style={s.headline}
                    testID={id("headline")}
                >
                    {props.headline ?? "Drop files here"}
                </v.headline.Text>
                {isPresent(supporting) ? (
                    <v.supportingText.Text
                        selectable={false}
                        style={s.supportingText}
                        testID={id("supportingText")}
                    >
                        {supporting}
                    </v.supportingText.Text>
                ) : null}
                {props.onPick && props.trigger !== null ? (
                    <Button
                        variant="outlined"
                        label={props.trigger ?? "Choose files"}
                        disabled={props.disabled || props.readOnly}
                        onPress={props.onPick}
                    />
                ) : null}
            </v.dropzone.View>
            {files.length > 0 ? (
                <v.itemGroup.View style={s.itemGroup} testID={id("itemGroup")}>
                    {files.map((file, index) => {
                        const rejected = (file.errors?.length ?? 0) > 0;
                        const image =
                            !rejected &&
                            file.uri !== undefined &&
                            file.type?.startsWith("image/") === true;
                        const shown = file.progress !== undefined;
                        return (
                            <v.item.View
                                key={`${index}:${file.uri ?? file.name}`}
                                style={s.item}
                                testID={id("item")}
                            >
                                <ListItem
                                    leadingType={image ? "thumbnail" : "icon"}
                                    {...(itemTestId === undefined
                                        ? {}
                                        : { testId: itemTestId })}
                                    leading={
                                        image ? (
                                            <Image
                                                accessibilityIgnoresInvertColors
                                                alt=""
                                                resizeMode="cover"
                                                source={{ uri: file.uri! }}
                                                style={{
                                                    width: "100%",
                                                    height: "100%",
                                                }}
                                            />
                                        ) : (
                                            (props.fileIcon?.(file) ?? "▤")
                                        )
                                    }
                                    headline={file.name}
                                    supportingText={
                                        rejected ? (
                                            <v.error.Text
                                                selectable={false}
                                                style={s.error}
                                                testID={id("error")}
                                            >
                                                {fileUploadErrorText(
                                                    file.errors ?? [],
                                                    file,
                                                    props.errorMessage,
                                                )}
                                            </v.error.Text>
                                        ) : file.size !== undefined ? (
                                            formatFileSize(file.size)
                                        ) : undefined
                                    }
                                    trailing={
                                        props.onRemove ? (
                                            <IconButton
                                                aria-label={
                                                    props.removeLabel?.(file) ??
                                                    `Remove ${file.name}`
                                                }
                                                disabled={
                                                    props.disabled ||
                                                    props.readOnly
                                                }
                                                icon={props.removeIcon ?? "✕"}
                                                onPress={() =>
                                                    props.onRemove?.(file)
                                                }
                                            />
                                        ) : undefined
                                    }
                                />
                                {shown ? (
                                    <LinearProgress
                                        aria-label={`Uploading ${file.name}`}
                                        value={file.progress ?? null}
                                    />
                                ) : null}
                            </v.item.View>
                        );
                    })}
                </v.itemGroup.View>
            ) : null}
        </v.root.View>
    );
}

/** Pureform's file upload: `<FileUpload label="Attachments" files={files} onPick={pick}
 *  onRemove={remove} />`. The app picks the files (with the platform's picker), keeps `files`, and
 *  reports each upload's `progress`. */
export const FileUpload = withEngine(FileUploadImpl, "FileUpload");
