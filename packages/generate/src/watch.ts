// Watching without a bundler, for `pureform generate --watch` and Metro: generate, then
// generate again whenever the config or a file it imports changes. Folders are watched rather
// than files, since editors often save by replacing a file, which ends a watch on the file.

import { watch } from "node:fs";
import type { FSWatcher } from "node:fs";
import { basename, dirname, join } from "node:path";

import type { GenerateOptions, GenerateResult } from "./generate";
import { createGlueRunner } from "./runner";
import type { GlueRunner } from "./runner";

export interface WatchGlueOptions {
    /** Called after every successful run, the first included. */
    readonly onResult?: (result: GenerateResult) => void;
    /** Called when a run fails. Watching goes on: fixing the file runs it again. */
    readonly onError?: (error: unknown) => void;
    /** How long to wait after a change for more, in milliseconds. Default 50. */
    readonly delay?: number;
    /** Let the process exit while watching (Node's `unref`), for tools that end on their own,
     *  such as a Metro bundle. Default `false`. */
    readonly unref?: boolean;
}

export interface GlueWatcher {
    /** The runner behind the watcher. */
    readonly runner: GlueRunner;
    /** Settles after the first run: its result, or `undefined` when it failed. */
    readonly ready: Promise<GenerateResult | undefined>;
    /** Stops watching. */
    close(): void;
}

/** Generates now and again on every change to the config or a file it imports. */
export const watchGlue = <Options = Record<string, unknown>>(
    options: GenerateOptions<Options>,
    watching: WatchGlueOptions = {},
): GlueWatcher => {
    const runner = createGlueRunner(options);
    const watchers = new Map<string, FSWatcher>();
    let timer: ReturnType<typeof setTimeout> | undefined;
    let closed = false;

    const run = async (): Promise<GenerateResult | undefined> => {
        try {
            const result = await runner.run();
            if (!closed) watching.onResult?.(result);
            return result;
        } catch (error) {
            if (!closed) watching.onError?.(error);
            return undefined;
        } finally {
            if (!closed) follow();
        }
    };

    const changed = () => {
        clearTimeout(timer);
        timer = setTimeout(() => void run(), watching.delay ?? 50);
        if (watching.unref) timer.unref();
    };

    // Watches the folder of every dependency, and only those.
    const follow = () => {
        const folders = new Set(
            runner.dependencies.map((file) => dirname(file)),
        );
        for (const [folder, watcher] of watchers) {
            if (folders.has(folder)) continue;
            watcher.close();
            watchers.delete(folder);
        }
        for (const folder of folders) {
            if (watchers.has(folder)) continue;
            try {
                const watcher = watch(folder, (_event, name) => {
                    if (!name) return changed();
                    if (runner.affects(join(folder, basename(name.toString()))))
                        changed();
                });
                watcher.on("error", () => undefined);
                if (watching.unref) watcher.unref();
                watchers.set(folder, watcher);
            } catch {
                // The folder is gone; the next run's dependencies say what to watch.
            }
        }
    };

    const ready = run();
    return {
        runner,
        ready,
        close: () => {
            closed = true;
            clearTimeout(timer);
            for (const watcher of watchers.values()) watcher.close();
            watchers.clear();
        },
    };
};
