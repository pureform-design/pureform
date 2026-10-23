// The file upload: Root on Zag's file upload machine, a drop zone (its icon, headline and
// supporting text, and the trigger button inside it), the list of files, and the ready-made
// FileUpload over them. A file is a ListItem (its preview, name, size, and a remove IconButton)
// with a LinearProgress under it while the app reports one; a rejected file shows why instead of
// its size. The drop zone is a drop target, not a button: the trigger inside it opens the file
// dialog and is what the keyboard reaches.

import { fileUploadAnatomy } from "@pureform/anatomy";
import {
    FILE_UPLOAD_ROOT_PROPS,
    fileUploadErrorText,
    fileUploadItemTestId,
    fileUploadMachineProps,
    fileUploadValueProps,
    fileUploadProgress,
    fileUploadSelection,
    isPresent,
    isPreviewable,
} from "@pureform/binding-core";
import type {
    FileUploadContentProps,
    FileUploadRootOwnProps,
    FileUploadValueDetails,
} from "@pureform/binding-core";
import { writeInputFiles } from "@pureform/binding-core/dom";
import type { MutableInteractionSource } from "@pureform/binding-core/interaction";
import * as fileUpload from "@pureform/machines/file-upload";
import { normalizeProps } from "@zag-js/react";
import type { PropTypes } from "@zag-js/react";
import {
    type ElementType,
    type ReactNode,
    useEffect,
    useId,
    useState,
} from "react";

import { Button } from "../button";
import { useControllable } from "../controllable";
import { useFieldsetDisabled, useFormReset } from "../form";
import { CloseIcon, FileIcon, UploadIcon } from "../glyphs";
import { IconButton } from "../icon-button";
import { useOwnInteractionSource } from "../interaction";
import { LinearProgress } from "../linear-progress";
import { ListItem } from "../list-item";
import { useMachine } from "../machine";
import { createPartContext } from "../part-context";
import { useComponent, useSlotProps } from "../parts";
import type { ComponentScope, SlotKeyedProps } from "../parts";
import { omitProps } from "../props";
import type { PartProps } from "../props";
import { useDirection } from "../provider";

type Anatomy = typeof fileUploadAnatomy;

/** What Root shares with its parts. */
interface FileUploadContextValue {
    readonly scope: ComponentScope<Anatomy>;
    readonly api: fileUpload.Api<PropTypes>;
    readonly source: MutableInteractionSource | undefined;
    readonly props: FileUploadRootOwnProps;
}

const context = createPartContext<FileUploadContextValue>("FileUpload");

/** Root's props: the variant and tokens, the machine's props (`value`, `accept`,
 *  `maxFiles`, …), `testId` and `unstyled` for every part, `as`, and the element's own props. */
export interface FileUploadRootProps
    extends
        Omit<PartProps, keyof FileUploadRootOwnProps>,
        FileUploadRootOwnProps {
    /** Another element or component to render instead of `<div>`. */
    readonly as?: ElementType | undefined;
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
export interface FileUploadItemProps extends Omit<
    FileUploadPartProps,
    "children"
> {
    readonly file: File;
    readonly type?: fileUpload.ItemType | undefined;
    readonly errors?: readonly string[] | undefined;
    readonly progress?: number | null | undefined;
    /** The file's icon when it isn't an image. @default a document */
    readonly icon?: ReactNode;
    /** The remove button's icon. @default a cross */
    readonly removeIcon?: ReactNode;
    readonly children?: ReactNode;
}

/** The file upload's root, a `<div>` around the label, the drop zone and the list, and the hidden
 *  file input. */
function Root(props: FileUploadRootProps): ReactNode {
    const id = useId();
    const dir = useDirection();
    const value = useControllable<"value", File[], FileUploadValueDetails>(
        "FileUpload",
        "value",
        props,
    );
    const [hidden, setHidden] = useState<HTMLInputElement | null>(null);
    const fieldsetDisabled = useFieldsetDisabled(hidden);
    const source = useOwnInteractionSource(props.interactionSource);
    const service = useMachine(fileUpload.machine, {
        id: props.id ?? id,
        dir,
        ...fileUploadMachineProps(props),
        // Zag reads a disabled fieldset only for its own form control state.
        disabled: props.disabled || fieldsetDisabled || undefined,
        ...fileUploadValueProps(value.machineProps),
    });
    const api = fileUpload.connect(service, normalizeProps);
    // Zag writes the files into the input when they change, not the default at mount.
    useEffect(() => {
        if (hidden) writeInputFiles(hidden, api.acceptedFiles);
    }, [hidden]);
    useFormReset(hidden, {
        // A file input has no default to write: the browser's reset empties it.
        resetsTo: "",
        writeDefault: () => {},
        onBeforeReset: value.beforeReset,
        onReset: () => {
            // Put back the files shown, then report the default; the input follows the files
            // once they change.
            if (hidden) writeInputFiles(hidden, api.acceptedFiles);
            value.reset(() => api.setFiles(value.defaultValue ?? []));
        },
    });
    const scope = useComponent(fileUploadAnatomy, {
        selection: fileUploadSelection(props),
        testId: props.testId,
        unstyled: props.unstyled,
    });
    const { as, children, ...rest } = omitProps(props, FILE_UPLOAD_ROOT_PROPS);
    return (
        <context.Provider value={{ scope, api, source, props }}>
            {scope.render("root", {
                element: "div",
                as,
                machine: api.getRootProps(),
                props: {
                    ...rest,
                    children: (
                        <>
                            {children}
                            <input
                                {...(api.getHiddenInputProps() as object)}
                                form={props.form}
                                ref={setHidden}
                            />
                        </>
                    ),
                },
            })}
        </context.Provider>
    );
}

/** The label above the drop zone: a `<label>` for the file input, so a press opens the dialog. */
function Label({ unstyled, ...props }: FileUploadPartProps): ReactNode {
    const { scope, api } = context.use("Label");
    return scope.render("label", {
        element: "label",
        machine: api.getLabelProps(),
        unstyled,
        props,
    });
}

/** The drop zone: files dropped on it are accepted or rejected. It holds the icon, the headline,
 *  the supporting text and the trigger. */
function Dropzone({ unstyled, ...props }: FileUploadPartProps): ReactNode {
    const { scope, api } = context.use("Dropzone");
    return scope.render("dropzone", {
        element: "div",
        // The trigger inside opens the dialog; the zone itself only takes drops.
        machine: api.getDropzoneProps({ disableClick: true }),
        states: { dragged: api.dragging },
        unstyled,
        props,
    });
}

/** The drop zone's icon. */
function Icon({ unstyled, mirror, ...props }: FileUploadIconProps): ReactNode {
    const { scope } = context.use("Icon");
    return scope.render("icon", {
        element: "span",
        machine: { "aria-hidden": "true" },
        states: { mirrored: mirror },
        unstyled,
        props,
    });
}

/** The drop zone's headline. */
function Headline({ unstyled, ...props }: FileUploadPartProps): ReactNode {
    const { scope } = context.use("Headline");
    return scope.render("headline", { element: "span", unstyled, props });
}

/** The drop zone's supporting text: the accepted types and limits. While Root has an `error`, it
 *  shows the error instead. */
function SupportingText({
    unstyled,
    ...props
}: FileUploadPartProps): ReactNode {
    const { scope, props: root } = context.use("SupportingText");
    return scope.render("supportingText", {
        element: "span",
        unstyled,
        props: { ...props, children: root.error ?? props.children },
    });
}

/** The trigger: a Button that opens the file dialog. Its props are the Button's. */
function Trigger(
    props: Omit<React.ComponentProps<typeof Button>, "onClick">,
): ReactNode {
    const { api } = context.use("Trigger");
    return <Button {...(api.getTriggerProps() as object)} {...props} />;
}

/** The list of files. */
function ItemGroup({ unstyled, ...props }: FileUploadPartProps): ReactNode {
    const { scope, api } = context.use("ItemGroup");
    return scope.render("itemGroup", {
        element: "ul",
        machine: api.getItemGroupProps(),
        unstyled,
        props,
    });
}

/** A rejected file's reason, as the drop zone's error color draws it. */
function ErrorText({ unstyled, ...props }: FileUploadPartProps): ReactNode {
    const { scope } = context.use("Error");
    return scope.render("error", { element: "span", unstyled, props });
}

// An image file's preview, once its object URL is made; revoked when it goes.
function Preview({
    file,
    type,
}: {
    readonly file: File;
    readonly type: fileUpload.ItemType;
}): ReactNode {
    const { api } = context.use("Item");
    const [url, setUrl] = useState<string | undefined>(undefined);
    useEffect(() => api.createFileUrl(file, setUrl), [file]);
    return url === undefined ? null : (
        <img
            {...(api.getItemPreviewImageProps({ file, type, url }) as object)}
            style={{ width: "100%", height: "100%", objectFit: "cover" }}
        />
    );
}

/** A file's row, an `<li>`: a list item with the file's preview, name and size (or the reasons
 *  it was rejected) and a remove button, and a progress bar under it while its `progress` is
 *  given. */
function Item({
    unstyled,
    file,
    type = "accepted",
    errors,
    progress,
    icon,
    removeIcon,
    children,
    ...props
}: FileUploadItemProps): ReactNode {
    const { scope, api, props: root } = context.use("Item");
    const item = { file, type };
    const rejected = type === "rejected";
    const image = !rejected && isPreviewable(file);
    const upload = fileUploadProgress(
        progress === undefined ? undefined : () => progress,
        file,
    );
    return scope.render("item", {
        element: "li",
        machine: api.getItemProps(item),
        unstyled,
        props: {
            ...props,
            children: children ?? (
                <>
                    <ListItem
                        leadingType={image ? "thumbnail" : "icon"}
                        testId={fileUploadItemTestId(root.testId)}
                        leading={
                            image ? (
                                <Preview file={file} type={type} />
                            ) : (
                                (icon ?? <FileIcon />)
                            )
                        }
                        headline={file.name}
                        supportingText={
                            rejected ? (
                                <ErrorText>
                                    {fileUploadErrorText(
                                        errors ?? [],
                                        file,
                                        root.errorMessage,
                                    )}
                                </ErrorText>
                            ) : (
                                api.getFileSize(file)
                            )
                        }
                        trailingControl
                        trailing={
                            <IconButton
                                {...(api.getItemDeleteTriggerProps(
                                    item,
                                ) as object)}
                                aria-label={
                                    root.removeLabel?.(file) ??
                                    `Remove ${file.name}`
                                }
                                icon={removeIcon ?? <CloseIcon />}
                            />
                        }
                        slotProps={
                            {
                                headline: api.getItemNameProps(item),
                                supportingText: api.getItemSizeTextProps(item),
                            } as object
                        }
                    />
                    {upload.shown ? (
                        <LinearProgress
                            value={upload.value}
                            aria-label={`Uploading ${file.name}`}
                        />
                    ) : null}
                </>
            ),
        },
    });
}

/** The ready-made file upload's props: Root's, with `className`, `style`, and `slotProps` keyed
 *  by part, and the content. */
export interface FileUploadProps
    extends
        Omit<FileUploadRootProps, keyof SlotKeyedProps<Anatomy> | "children">,
        SlotKeyedProps<Anatomy>,
        FileUploadContentProps<ReactNode> {}

// Inside Root, so it can read the files and whether an error shows.
function ReadyMadeContent({
    own,
}: {
    readonly own: FileUploadProps;
}): ReactNode {
    const { api, props } = context.use("Root");
    const slot = useSlotProps(own);
    const supporting =
        isPresent(own.supportingText) || props.error !== undefined;
    return (
        <>
            {isPresent(own.label) ? (
                <Label {...slot("label")}>{own.label}</Label>
            ) : null}
            <Dropzone {...slot("dropzone")}>
                <Icon {...slot("icon")}>{own.icon ?? <UploadIcon />}</Icon>
                <Headline {...slot("headline")}>
                    {own.headline ?? "Drop files here"}
                </Headline>
                {supporting ? (
                    <SupportingText {...slot("supportingText")}>
                        {own.supportingText}
                    </SupportingText>
                ) : null}
                {own.trigger === null ? null : (
                    <Trigger
                        variant="outlined"
                        label={own.trigger ?? "Choose files"}
                    />
                )}
            </Dropzone>
            {api.acceptedFiles.length + api.rejectedFiles.length > 0 ? (
                <ItemGroup {...slot("itemGroup")}>
                    {api.acceptedFiles.map((file, index) => (
                        <Item
                            key={`${index}-${file.name}-${file.size}`}
                            file={file}
                            progress={props.progress?.(file)}
                            icon={own.fileIcon?.(file)}
                            removeIcon={own.removeIcon}
                            {...slot("item")}
                        />
                    ))}
                    {api.rejectedFiles.map(({ file, errors }, index) => (
                        <Item
                            key={`rejected-${index}-${file.name}-${file.size}`}
                            file={file}
                            type="rejected"
                            errors={errors}
                            icon={own.fileIcon?.(file)}
                            removeIcon={own.removeIcon}
                            {...slot("item")}
                        />
                    ))}
                </ItemGroup>
            ) : null}
        </>
    );
}

/** The ready-made file upload: the label, the drop zone with its icon, headline, supporting text
 *  and trigger, and the list of files. */
function ReadyMade(props: FileUploadProps): ReactNode {
    const slot = useSlotProps(props);
    const {
        className: _className,
        style: _style,
        slotProps: _slotProps,
        label: _label,
        icon: _icon,
        headline: _headline,
        supportingText: _supportingText,
        trigger: _trigger,
        fileIcon: _fileIcon,
        removeIcon: _removeIcon,
        ...rootProps
    } = props;
    return (
        <Root {...rootProps} {...(slot("root") as object)}>
            <ReadyMadeContent own={props} />
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
