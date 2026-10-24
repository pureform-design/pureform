/** A tile of the grid list case's `tiles`: a picture, with a header and a footer when it has them. */
export interface SceneTile {
    readonly src: string;
    readonly header?: string;
    readonly footer?: string;
    readonly subhead?: string;
}

/** The label of the toast scenes' button, which adds a toast each press. */
export const ADD_TOAST_LABEL = "Add a toast";

const TOAST_TYPES = ["info", "success", "warning", "error"] as const;

/** The `count`th toast the scenes' button adds: each type in turn, closing on its own timer. */
export const addedToast = (count: number) => ({
    type: TOAST_TYPES[(count - 1) % TOAST_TYPES.length],
    title: `Toast ${count}`,
    description: "It closes on its own after a few seconds.",
});

/** The `count`th file React Native's file upload scene picks (its app's picker, as React Native
 *  leaves the picking to the app). */
export const pickedFile = (count: number) => ({
    name: `document-${count}.pdf`,
    size: 1024 * (40 + count),
    type: "application/pdf",
});
