import { BottomSheet as NativeBottomSheet } from "@pureform/react-native/bottom-sheet";
import { Button } from "@pureform/react-native/button";
import { FileUpload as NativeFileUpload } from "@pureform/react-native/file-upload";
import type { FileUploadEntry } from "@pureform/react-native/file-upload";
import { GridList as NativeGridList } from "@pureform/react-native/grid-list";
import { SideSheet as NativeSideSheet } from "@pureform/react-native/side-sheet";
import { createToaster, Toaster } from "@pureform/react-native/toast";
import { createElement, useRef, useState } from "react";
import type { ReactNode } from "react";
import { View } from "react-native";

import { gridListScene, toastScene } from "../react/scene-builders";
import { OVERLAY_HEIGHT, pickedFile } from "../renderers/scenes";

const ToastScene = toastScene({
    createToaster,
    Toaster,
    Button,
    press: "onPress",
});
/** The toaster draws against the bottom of its nearest view, as against an app's screen: in the
 *  screen's height, not the button's row. */
export function Toast(props: Record<string, unknown>): ReactNode {
    return createElement(
        View,
        { style: { minHeight: OVERLAY_HEIGHT } },
        createElement(ToastScene, props),
    );
}
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

/** A standard sheet is part of the app's layout in React Native: it sits where it's drawn, not at
 *  the screen's edge as the web's positioner puts it. Its scenes are an app's screen of the
 *  canvas's height, which the sheet's trigger sits at the start of and the sheet at the end of. */
const screen = (direction: "row" | "column", ...children: ReactNode[]) =>
    createElement(
        View,
        {
            style: {
                flexDirection: direction,
                justifyContent: "space-between",
                alignItems: direction === "row" ? "flex-start" : "stretch",
                minHeight: OVERLAY_HEIGHT,
            },
        },
        ...children,
    );

/** The bottom sheet's standard sheet keeps its own open state and draws its trigger itself; the
 *  scene puts the two at either end of the screen. */
export function BottomSheet(props: Record<string, unknown>): ReactNode {
    const sheet = createElement(NativeBottomSheet as never, props);
    return props["modal"] === false ? screen("column", sheet) : sheet;
}

/** The side sheet's standard sheet is shown by the app, which also closes it from its close
 *  button: the scene is that app, with a button that opens it. */
export function SideSheet(props: Record<string, unknown>): ReactNode {
    const { defaultOpen, open, onOpenChange, trigger, ...rest } = props as {
        defaultOpen?: boolean;
        open?: boolean;
        onOpenChange?: (details: { open: boolean }) => void;
        trigger?: string;
    } & Record<string, unknown>;
    const [shown, setShown] = useState(defaultOpen ?? false);
    if (props["modal"] !== false)
        return createElement(NativeSideSheet as never, props);
    return screen(
        "row",
        trigger === undefined
            ? null
            : createElement(Button, {
                  label: trigger,
                  onPress: () => setShown(true),
              }),
        createElement(NativeSideSheet as never, {
            ...rest,
            open: open ?? shown,
            onOpenChange: (details: { open: boolean }) => {
                setShown(details.open);
                onOpenChange?.(details);
            },
        }),
    );
}
