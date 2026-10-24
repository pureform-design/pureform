// The file upload: Root on Zag's file upload machine, a drop zone (its icon, headline and
// supporting text, and the trigger button inside it), the list of files, and the ready-made
// FileUpload over them. A file is a ListItem (its preview, name, size, and a remove IconButton)
// with a LinearProgress under it while the app reports one; a rejected file shows why instead of
// its size. The drop zone is a drop target, not a button: the trigger inside it opens the file
// dialog and is what the keyboard reaches.

import { fileUploadAnatomy } from "@pureform/anatomy";
import type {
    buttonAnatomy,
    iconButtonAnatomy,
    linearProgressAnatomy,
    listItemAnatomy,
    PartName,
} from "@pureform/anatomy";
import {
    FILE_UPLOAD_CONTENT_PROPS,
    FILE_UPLOAD_ROOT_PROPS,
    fileUploadErrorText,
    fileUploadItemTestId,
    fileUploadMachineProps,
    fileUploadValueProps,
    fileUploadProgress,
    fileUploadSelection,
    isPresent,
    isPreviewable,
    overDefaults,
} from "@pureform/binding-core";
import type { FileUploadInstances } from "@pureform/binding-core";
import type {
    FileUploadDomContentProps,
    FileUploadDomRootOwnProps,
    FileUploadDomValueDetails,
} from "@pureform/binding-dom";
import { writeInputFiles } from "@pureform/binding-dom";
import * as fileUpload from "@pureform/machines/file-upload";
import type { JSX, ValidComponent } from "@solidjs/web";
import {
    type Accessor,
    createEffect,
    createMemo,
    createSignal,
    createUniqueId,
    For,
    merge,
    omit,
    Show,
    untrack,
} from "solid-js";

import { Button } from "../button";
import type { ButtonProps } from "../button";
import { useControllable } from "../controllable";
import { renderErrorSupportingText } from "../error-supporting-text";
import { useFieldsetDisabled, useFormReset } from "../form";
import { CloseIcon, FileIcon, UploadIcon } from "../glyphs";
import { IconButton } from "../icon-button";
import { normalizeProps, useMachine } from "../internal/zag";
import type { PropTypes } from "../internal/zag";
import { LinearProgress } from "../linear-progress";
import { ListItem } from "../list-item";
import { createPartContext } from "../part-context";
import { createSlotProps, useComponent } from "../parts";
import type {
    ComponentScope,
    InnerPropsOf,
    SlotKeyedProps,
    SlotPropsOf,
} from "../parts";
import type { PartProps } from "../props";
import { useDirection } from "../provider";

type Anatomy = typeof fileUploadAnatomy;
type Instances = FileUploadInstances<File>;

/** What Root shares with its parts. */
interface FileUploadContextValue {
    readonly scope: ComponentScope<Anatomy>;
    readonly api: Accessor<fileUpload.Api<PropTypes>>;
    readonly props: FileUploadDomRootOwnProps;
}

const context = createPartContext<FileUploadContextValue>("FileUpload");

/** Root's props: the variant and tokens, the machine's props (`value`, `accept`,
 *  `maxFiles`, …), `testId` and `unstyled` for every part, `as`, and the element's own props. */
export interface FileUploadRootProps
    extends
        Omit<PartProps, keyof FileUploadDomRootOwnProps>,
        FileUploadDomRootOwnProps {
    /** Another element or component to render instead of `<div>`. */
    readonly as?: ValidComponent | undefined;
}

/** A part's props: the element's own, and the part's `unstyled`. */
export interface FileUploadPartProps extends PartProps {
    readonly unstyled?: boolean | undefined;
}

/** The icon's props: a part's, and `mirror` to flip a pointing icon under `rtl`. */
export interface FileUploadIconProps extends FileUploadPartProps {
    readonly mirror?: boolean | undefined;
}

/** An item's props: its file, whether it's accepted or rejected (with the reasons), what its
 *  upload has done (`progress`: a number from 0 to 100, `null` for unknown, left out for none),
 *  and the content of its list item. Without children, it renders the file's row. */
export interface FileUploadItemProps extends FileUploadPartProps {
    readonly file: File;
    readonly type?: fileUpload.ItemType | undefined;
    readonly errors?: readonly string[] | undefined;
    readonly progress?: number | null | undefined;
    /** The file's icon when it isn't an image. @default a document */
    readonly icon?: JSX.Element;
    /** The remove button's icon. @default a cross */
    readonly removeIcon?: JSX.Element;
    /** The error part's props, while the file is rejected. */
    readonly errorProps?: FileUploadPartProps | undefined;
    /** The list item drawn for the file, keyed by its parts. */
    readonly listItemProps?: InnerPropsOf<typeof listItemAnatomy> | undefined;
    /** The remove button. */
    readonly iconButtonProps?:
        | InnerPropsOf<typeof iconButtonAnatomy>
        | undefined;
    /** The upload's progress bar. */
    readonly linearProgressProps?:
        | InnerPropsOf<typeof linearProgressAnatomy>
        | undefined;
}

/** The file upload's root, a `<div>` around the label, the drop zone and the list, and the hidden
 *  file input. */
function Root(props: FileUploadRootProps): JSX.Element {
    const id = createUniqueId();
    const dir = useDirection();
    const value = useControllable<"value", File[], FileUploadDomValueDetails>(
        "FileUpload",
        "value",
        props,
    );
    const [hidden, setHidden] = createSignal<HTMLInputElement | undefined>(
        undefined,
        { ownedWrite: true },
    );
    const fieldsetDisabled = useFieldsetDisabled(hidden);
    const service = useMachine(fileUpload.machine, () => ({
        id: props.id ?? id,
        dir: dir(),
        ...fileUploadMachineProps(props),
        // Zag reads a disabled fieldset only for its own form control state.
        disabled: props.disabled || fieldsetDisabled() || undefined,
        ...fileUploadValueProps(value.machineProps()),
    }));
    const api = createMemo(() => fileUpload.connect(service, normalizeProps));
    // Zag writes the files into the input when they change, not the default at mount.
    createEffect(hidden, (input) => {
        if (input)
            writeInputFiles(
                input,
                untrack(() => api().acceptedFiles),
            );
    });
    useFormReset(hidden, {
        // A file input has no default to write: the browser's reset empties it.
        resetsTo: () => "",
        writeDefault: () => {},
        onBeforeReset: value.beforeReset,
        onReset: () => {
            // Put back the files shown, then report the default; the input follows the files
            // once they change.
            const input = hidden();
            if (input) writeInputFiles(input, api().acceptedFiles);
            value.reset(() => api().setFiles(value.defaultValue ?? []));
        },
    });
    const scope = useComponent(fileUploadAnatomy, {
        selection: () => fileUploadSelection(props),
        testId: () => props.testId,
        unstyled: () => props.unstyled,
    });
    return (
        <context.Provider value={{ scope, api, props }}>
            {scope.render("root", {
                element: "div",
                as: () => props.as,
                machine: () => api().getRootProps(),
                props: merge(omit(props, "as", ...FILE_UPLOAD_ROOT_PROPS), {
                    get children() {
                        return (
                            <>
                                {props.children}
                                <input
                                    {...api().getHiddenInputProps()}
                                    form={props.form}
                                    ref={setHidden}
                                />
                            </>
                        );
                    },
                }),
            })}
        </context.Provider>
    );
}

/** The label above the drop zone: a `<label>` for the file input, so a press opens the dialog. */
function Label(props: FileUploadPartProps): JSX.Element {
    const { scope, api } = context.use("Label");
    return scope.render("label", {
        element: "label",
        machine: () => api().getLabelProps(),
        unstyled: () => props.unstyled,
        props: omit(props, "unstyled"),
    });
}

/** The drop zone: files dropped on it are accepted or rejected. It holds the icon, the headline,
 *  the supporting text and the trigger. */
function Dropzone(props: FileUploadPartProps): JSX.Element {
    const { scope, api } = context.use("Dropzone");
    return scope.render("dropzone", {
        element: "div",
        // The trigger inside opens the dialog; the zone itself only takes drops.
        machine: () => api().getDropzoneProps({ disableClick: true }),
        states: () => ({ dragged: api().dragging }),
        unstyled: () => props.unstyled,
        props: omit(props, "unstyled"),
    });
}

/** The drop zone's icon. */
function Icon(props: FileUploadIconProps): JSX.Element {
    const { scope } = context.use("Icon");
    return scope.render("icon", {
        element: "span",
        machine: () => ({ "aria-hidden": "true" }),
        states: () => ({ mirrored: props.mirror }),
        unstyled: () => props.unstyled,
        props: omit(props, "unstyled", "mirror"),
    });
}

/** The drop zone's headline. */
function Headline(props: FileUploadPartProps): JSX.Element {
    const { scope } = context.use("Headline");
    return scope.render("headline", {
        element: "span",
        unstyled: () => props.unstyled,
        props: omit(props, "unstyled"),
    });
}

/** The drop zone's supporting text: the accepted types and limits. While Root has an `error`, it
 *  shows the error instead. */
function SupportingText(props: FileUploadPartProps): JSX.Element {
    const { scope, props: root } = context.use("SupportingText");
    return renderErrorSupportingText(scope, () => root.error, props);
}

/** The trigger: a Button that opens the file dialog. Its props are the Button's. */
function Trigger(props: Omit<ButtonProps, "onClick">): JSX.Element {
    const { api } = context.use("Trigger");
    return <Button {...(api().getTriggerProps() as object)} {...props} />;
}

/** The list of files. */
function ItemGroup(props: FileUploadPartProps): JSX.Element {
    const { scope, api } = context.use("ItemGroup");
    return scope.render("itemGroup", {
        element: "ul",
        machine: () => api().getItemGroupProps(),
        unstyled: () => props.unstyled,
        props: omit(props, "unstyled"),
    });
}

/** A rejected file's reason, as the drop zone's error color draws it. */
function ErrorText(props: FileUploadPartProps): JSX.Element {
    const { scope } = context.use("Error");
    return scope.render("error", {
        element: "span",
        unstyled: () => props.unstyled,
        props: omit(props, "unstyled"),
    });
}

// An image file's preview, once its object URL is made; revoked when it goes.
function Preview(props: {
    readonly file: File;
    readonly type: fileUpload.ItemType;
}): JSX.Element {
    const { api } = context.use("Item");
    const [url, setUrl] = createSignal<string | undefined>(undefined);
    createEffect(
        () => props.file,
        (file) => api().createFileUrl(file, setUrl),
    );
    return (
        <Show when={url()}>
            {(source) => (
                <img
                    {...(api().getItemPreviewImageProps({
                        file: props.file,
                        type: props.type,
                        url: source(),
                    }) as object)}
                    style={{
                        width: "100%",
                        height: "100%",
                        "object-fit": "cover",
                    }}
                />
            )}
        </Show>
    );
}

// The list item's test id prefix, when Root's `testId` gives one.
const itemTestId = (testId: FileUploadDomRootOwnProps["testId"]) => {
    const prefix = fileUploadItemTestId(testId);
    return prefix === undefined ? {} : { testId: prefix };
};

/** A file's row, an `<li>`: a list item with the file's preview, name and size (or the reasons
 *  it was rejected) and a remove button, and a progress bar under it while its `progress` is
 *  given. */
function Item(props: FileUploadItemProps): JSX.Element {
    const { scope, api, props: root } = context.use("Item");
    const item = () => ({
        file: props.file,
        type: props.type ?? ("accepted" as const),
    });
    const rejected = () => item().type === "rejected";
    const image = () => !rejected() && isPreviewable(props.file);
    const upload = () =>
        fileUploadProgress(
            props.progress === undefined ? undefined : () => props.progress,
            props.file,
        );
    return scope.render("item", {
        element: "li",
        machine: () => api().getItemProps(item()),
        unstyled: () => props.unstyled,
        props: merge(
            omit(
                props,
                "unstyled",
                "file",
                "type",
                "errors",
                "progress",
                "icon",
                "removeIcon",
                "children",
                "errorProps",
                "listItemProps",
                "iconButtonProps",
                "linearProgressProps",
            ),
            {
                get children() {
                    return (
                        props.children ?? (
                            <>
                                <ListItem
                                    {...overDefaults<
                                        InnerPropsOf<typeof listItemAnatomy>
                                    >(
                                        {
                                            ...itemTestId(root.testId),
                                            slotProps: {
                                                headline:
                                                    api().getItemNameProps(
                                                        item(),
                                                    ),
                                                supportingText:
                                                    api().getItemSizeTextProps(
                                                        item(),
                                                    ),
                                            } as object,
                                        },
                                        props.listItemProps ?? {},
                                    )}
                                    leadingType={image() ? "thumbnail" : "icon"}
                                    leading={
                                        image() ? (
                                            <Preview
                                                file={props.file}
                                                type={item().type}
                                            />
                                        ) : (
                                            (props.icon ?? <FileIcon />)
                                        )
                                    }
                                    headline={props.file.name}
                                    supportingText={
                                        rejected() ? (
                                            <ErrorText {...props.errorProps}>
                                                {fileUploadErrorText(
                                                    props.errors ?? [],
                                                    props.file,
                                                    root.errorMessage,
                                                )}
                                            </ErrorText>
                                        ) : (
                                            api().getFileSize(props.file)
                                        )
                                    }
                                    trailingControl
                                    trailing={
                                        <IconButton
                                            {...props.iconButtonProps}
                                            {...(api().getItemDeleteTriggerProps(
                                                item(),
                                            ) as object)}
                                            aria-label={
                                                root.removeLabel?.(
                                                    props.file,
                                                ) ?? `Remove ${props.file.name}`
                                            }
                                            icon={
                                                props.removeIcon ?? (
                                                    <CloseIcon />
                                                )
                                            }
                                        />
                                    }
                                />
                                <Show when={upload().shown}>
                                    <LinearProgress
                                        {...props.linearProgressProps}
                                        value={upload().value}
                                        aria-label={`Uploading ${props.file.name}`}
                                    />
                                </Show>
                            </>
                        )
                    );
                },
            },
        ),
    });
}

/** The ready-made file upload's props: Root's, with `class`, `style`, and `slotProps` keyed by
 *  part (a file's `item` and `error` also by file, `FileUploadItemInstance`), and the content. */
export interface FileUploadProps
    extends
        Omit<FileUploadRootProps, keyof SlotKeyedProps<Anatomy> | "children">,
        SlotKeyedProps<Anatomy, never, Instances>,
        FileUploadDomContentProps<JSX.Element> {
    /** The trigger, drawn as a button. */
    readonly buttonProps?: InnerPropsOf<typeof buttonAnatomy> | undefined;
    /** Every file's list item, keyed by its parts. */
    readonly listItemProps?: FileUploadItemProps["listItemProps"];
    /** Every file's remove button. */
    readonly iconButtonProps?: FileUploadItemProps["iconButtonProps"];
    /** Every upload's progress bar. */
    readonly linearProgressProps?: FileUploadItemProps["linearProgressProps"];
}

const READY_MADE_PROPS = [
    "class",
    "style",
    "slotProps",
    "buttonProps",
    "listItemProps",
    "iconButtonProps",
    "linearProgressProps",
    ...FILE_UPLOAD_CONTENT_PROPS,
] as const;

// Inside Root, so it can read the files and whether an error shows.
function Content(props: {
    readonly own: FileUploadProps;
    readonly slots: SlotPropsOf<PartName<Anatomy>, Instances>;
}): JSX.Element {
    const { api, props: root } = context.use("Root");
    const own = props.own;
    const slots = props.slots;
    return (
        <>
            <Show when={isPresent(own.label)}>
                <Label {...slots("label")}>{own.label}</Label>
            </Show>
            <Dropzone {...slots("dropzone")}>
                <Icon {...slots("icon")}>{own.icon ?? <UploadIcon />}</Icon>
                <Headline {...slots("headline")}>
                    {own.headline ?? "Drop files here"}
                </Headline>
                <Show
                    when={
                        isPresent(own.supportingText) ||
                        root.error !== undefined
                    }
                >
                    <SupportingText {...slots("supportingText")}>
                        {own.supportingText}
                    </SupportingText>
                </Show>
                <Show when={own.trigger !== null}>
                    <Trigger
                        {...own.buttonProps}
                        variant="outlined"
                        label={own.trigger ?? "Choose files"}
                    />
                </Show>
            </Dropzone>
            <Show
                when={
                    api().acceptedFiles.length + api().rejectedFiles.length > 0
                }
            >
                <ItemGroup {...slots("itemGroup")}>
                    <For each={api().acceptedFiles}>
                        {(file, index) => (
                            <Item
                                file={file}
                                progress={root.progress?.(file)}
                                icon={own.fileIcon?.(file)}
                                removeIcon={own.removeIcon}
                                listItemProps={own.listItemProps}
                                iconButtonProps={own.iconButtonProps}
                                linearProgressProps={own.linearProgressProps}
                                {...slots("item", () => ({
                                    index: index(),
                                    item: file,
                                    type: "accepted",
                                }))}
                            />
                        )}
                    </For>
                    <For each={api().rejectedFiles}>
                        {(rejected, index) => {
                            const row = () => ({
                                index: api().acceptedFiles.length + index(),
                                item: rejected.file,
                                type: "rejected" as const,
                            });
                            return (
                                <Item
                                    file={rejected.file}
                                    type="rejected"
                                    errors={rejected.errors}
                                    icon={own.fileIcon?.(rejected.file)}
                                    removeIcon={own.removeIcon}
                                    errorProps={slots("error", row)}
                                    listItemProps={own.listItemProps}
                                    iconButtonProps={own.iconButtonProps}
                                    linearProgressProps={
                                        own.linearProgressProps
                                    }
                                    {...slots("item", row)}
                                />
                            );
                        }}
                    </For>
                </ItemGroup>
            </Show>
        </>
    );
}

/** The ready-made file upload: the label, the drop zone with its icon, headline, supporting text
 *  and trigger, and the list of files. */
function ReadyMade(props: FileUploadProps): JSX.Element {
    const slots = createSlotProps<Anatomy, never, Instances>(props);
    const own = omit(props, ...READY_MADE_PROPS) as FileUploadRootProps;
    // The root's slot props are an element's, whose `id` also takes `false`.
    const root = slots("root") as object;
    return (
        <Root {...own} {...root}>
            <Content own={props} slots={slots} />
        </Root>
    );
}

/** Pureform's file upload. Use it ready-made, `<FileUpload label="Attachments" accept="image/*"
 *  maxFiles={3} />`, or compose its parts under `FileUpload.Root`: `Label`, a `Dropzone` holding
 *  `Icon`, `Headline`, `SupportingText` and the `Trigger`, and an `ItemGroup` of `Item`s. */
export const FileUpload = Object.assign(ReadyMade, {
    Root,
    Label,
    Dropzone,
    Icon,
    Headline,
    SupportingText,
    Trigger,
    ItemGroup,
    Item,
    Error: ErrorText,
});
