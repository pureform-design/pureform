export type Args = Record<string, unknown>;

/** Mounts one renderer's component into a story's element. */
export interface RendererAdapter<C = unknown> {
    name: "solid" | "react" | "native" | (string & {});
    /** The toolbar label. */
    title: string;
    mount(el: HTMLElement, component: C, args: Args): MountHandle;
}

export interface MountHandle {
    /** Controls changed: new props, no remount. */
    update(args: Args): void;
    unmount(): void;
}
