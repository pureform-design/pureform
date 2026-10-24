import { Button } from "@pureform/react-native/button";
import { FileUpload as NativeFileUpload } from "@pureform/react-native/file-upload";
import type { FileUploadEntry } from "@pureform/react-native/file-upload";
import { GridList as NativeGridList } from "@pureform/react-native/grid-list";
import { createToaster, Toaster } from "@pureform/react-native/toast";
import { createElement, useRef, useState } from "react";
import type { ReactNode } from "react";

import { gridListScene, toastScene } from "../react/scene-builders";
import { pickedFile } from "../renderers/scenes";

export const Toast = toastScene({
    createToaster,
    Toaster,
    Button,
    press: "onPress",
});
export const GridList = gridListScene(NativeGridList as never);

/** React Native's file upload leaves the picking to the app (its trigger calls `onPick`, and the
 *  app keeps `files`): the story is that app, whose picker adds a sample file each press, and
 *  whose remove buttons take one out. */
export function FileUpload(props: Record<string, unknown>): ReactNode {
    const [files, setFiles] = useState<readonly FileUploadEntry[]>(
        (props["files"] as readonly FileUploadEntry[] | undefined) ?? [],
    );
    const picked = useRef(0);
    return createElement(NativeFileUpload, {
        ...props,
        files,
        onPick: () => setFiles((all) => [...all, pickedFile(++picked.current)]),
        onRemove: (file: FileUploadEntry) =>
            setFiles((all) => all.filter((entry) => entry !== file)),
    });
}
