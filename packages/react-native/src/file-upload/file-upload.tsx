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
    FileUploadInstances,
    FileUploadPart,
    FileUploadVariantProps,
} from "@pureform/binding-core";
import type { ReactNode } from "react";
import { Image } from "react-native";

import { Button } from "../button";
import type { ButtonProps } from "../button/button";
import { IconButton } from "../icon-button";
import type { IconButtonProps } from "../icon-button/icon-button";
import { IconSlot, iconSlot } from "../icon-style";
import { LinearProgress } from "../linear-progress";
import { ListItem } from "../list-item";
import type { ListItemProps } from "../list-item/list-item";
import { testIdOf, withEngine } from "../parts";
import type { LinearProgressProps } from "../progress";
import { useNativeSlotReader } from "../slot-props";
import type { InnerPropsOf, NativeSlotProps } from "../slot-props";
import { useComponentSlots } from "../styles";

export type { FileUploadEntry } from "@pureform/binding-core";

/** What each part renders as, for its keyed `style` and `slotProps`. */
export interface FileUploadHosts {
    readonly root: "View";
    readonly label: "Text";
    readonly dropzone: "View";
    readonly icon: "View";
    readonly headline: "Text";
    readonly supportingText: "Text";
    readonly itemGroup: "View";
    readonly item: "View";
    readonly error: "Text";
}

/** The file upload's props; a file's `item` and `error` are also keyed by file,
 *  `FileUploadItemInstance`. */
export interface FileUploadProps
    extends
        FileUploadVariantProps,
        Omit<FileUploadContentProps<ReactNode>, "fileIcon">,
        Pick<
            FileUploadBehaviorProps,
            "disabled" | "readOnly" | "invalid" | "error"
        >,
        NativeSlotProps<FileUploadHosts, FileUploadInstances<FileUploadEntry>> {
    /** Every upload's progress bar's `style`, `slotProps`, `tokens` and `testId`. */
    readonly linearProgressProps?:
        | InnerPropsOf<LinearProgressProps>
        | undefined;
    /** Every remove button's `style`, `slotProps`, `tokens` and `testId`. */
    readonly iconButtonProps?: InnerPropsOf<IconButtonProps> | undefined;
    /** Every file's list item's `style`, `slotProps`, `tokens` and `testId`. */
    readonly listItemProps?: InnerPropsOf<ListItemProps> | undefined;
    /** The choose button's `style`, `slotProps`, `tokens` and `testId`. */
    readonly buttonProps?: InnerPropsOf<ButtonProps> | undefined;
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
    const nativeSlots = useNativeSlotReader("fileUpload");
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
    const slot = nativeSlots(props);
    const files = props.files ?? [];
    const supporting = props.error ?? props.supportingText;
    const itemTestId = fileUploadItemTestId(props.testId);
    const each = slot.each("item") || slot.each("error");
    return (
        <v.root.View
            {...slot.props("root")}
            style={slot.style("root", s.root)}
            testID={id("root")}
        >
            {isPresent(props.label) ? (
                <v.label.Text
                    {...slot.props("label")}
                    selectable={false}
                    style={slot.style("label", s.label)}
                    testID={id("label")}
                >
                    {props.label}
                </v.label.Text>
            ) : null}
            <v.dropzone.View
                {...slot.props("dropzone")}
                style={slot.style("dropzone", s.dropzone)}
                testID={id("dropzone")}
            >
                <v.icon.View
                    {...slot.props("icon")}
                    pointerEvents="none"
                    style={slot.style("icon", s.icon)}
                    testID={id("icon")}
                >
                    <IconSlot {...iconSlot(selected, "icon")} motion={s.icon}>
                        {props.icon ?? "↑"}
                    </IconSlot>
                </v.icon.View>
                <v.headline.Text
                    {...slot.props("headline")}
                    selectable={false}
                    style={slot.style("headline", s.headline)}
                    testID={id("headline")}
                >
                    {props.headline ?? "Drop files here"}
                </v.headline.Text>
                {isPresent(supporting) ? (
                    <v.supportingText.Text
                        {...slot.props("supportingText")}
                        selectable={false}
                        style={slot.style("supportingText", s.supportingText)}
                        testID={id("supportingText")}
                    >
                        {supporting}
                    </v.supportingText.Text>
                ) : null}
                {props.onPick && props.trigger !== null ? (
                    <Button
                        {...props.buttonProps}
                        variant="outlined"
                        label={props.trigger ?? "Choose files"}
                        disabled={props.disabled || props.readOnly}
                        onPress={props.onPick}
                    />
                ) : null}
            </v.dropzone.View>
            {files.length > 0 ? (
                <v.itemGroup.View
                    {...slot.props("itemGroup")}
                    role="list"
                    style={slot.style("itemGroup", s.itemGroup)}
                    testID={id("itemGroup")}
                >
                    {files.map((file, index) => {
                        const rejected = (file.errors?.length ?? 0) > 0;
                        const image =
                            !rejected &&
                            file.uri !== undefined &&
                            file.type?.startsWith("image/") === true;
                        const shown = file.progress !== undefined;
                        const row = each
                            ? {
                                  index,
                                  item: file,
                                  type: rejected
                                      ? ("rejected" as const)
                                      : ("accepted" as const),
                              }
                            : undefined;
                        return (
                            <v.item.View
                                {...slot.props("item", row)}
                                key={`${index}:${file.uri ?? file.name}`}
                                style={slot.style("item", s.item, row)}
                                testID={id("item")}
                            >
                                <ListItem
                                    {...props.listItemProps}
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
                                                {...slot.props("error", row)}
                                                selectable={false}
                                                style={slot.style(
                                                    "error",
                                                    s.error,
                                                    row,
                                                )}
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
                                                {...props.iconButtonProps}
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
                                        {...props.linearProgressProps}
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
