export type Args = Record<string, unknown>;

/** The story's theme from the toolbar: the scheme (`undefined` follows the system), and a named
 *  theme from the config. */
export interface StoryTheme {
    readonly scheme?: "light" | "dark" | undefined;
    readonly name?: string | undefined;
}

/** A renderer's own decorator, from its binding's `storybook` hook: wraps the story in that
 *  renderer's elements (the provider first). Typed loosely: each binding names its own. */
export type RendererDecorator = (story: () => any, context: any) => any;

/** What a renderer draws a story with, besides its args. */
export interface MountContext {
    readonly theme: StoryTheme;
    readonly globals: Readonly<Record<string, unknown>>;
    /** The renderer hook's decorators, inner first. */
    readonly decorators: readonly RendererDecorator[];
}

/** Mounts one renderer's component into a story's element. */
export interface RendererAdapter<C = unknown> {
    name: "solid" | "react" | "native" | (string & {});
    /** The toolbar label. */
    title: string;
    mount(
        el: HTMLElement,
        component: C,
        args: Args,
        context: MountContext,
    ): MountHandle;
}

export interface MountHandle {
    /** Controls or globals changed: new props, no remount. */
    update(args: Args, context: MountContext): void;
    unmount(): void;
}
