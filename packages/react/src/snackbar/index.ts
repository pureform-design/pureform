"use client";

// `@pureform/react/snackbar`: the snackbar, ready-made and as compound parts, and its queue.

export { Snackbar } from "./snackbar";
export type {
    SnackbarPartProps,
    SnackbarProps,
    SnackbarRootProps,
} from "./snackbar";
export { createSnackbarQueue, SnackbarHost } from "./queue";
export type {
    SnackbarHostProps,
    SnackbarOptions,
    SnackbarQueue,
} from "./queue";
