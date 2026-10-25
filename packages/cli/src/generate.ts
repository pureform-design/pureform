// `pureform generate [--watch] [--check] [--prune]`: `generateTargets` from @pureform/generate once, checking
// instead of writing, or again on every change, with what it did printed.

import { watch } from "node:fs";
import type { FSWatcher } from "node:fs";
import { basename, dirname, relative, resolve, sep } from "node:path";

import {
    generateTargets,
    isGenerateError,
    watchGenerate,
} from "@pureform/generate";
import type {
    FileResult,
    GenerateTargetsResult as GenerateResult,
    GenerateWatcher,
} from "@pureform/generate";

import { CODEGEN_FILES, resolveCodegenOptions } from "./codegen-file";
import type { GenerateFlags, ResolvedCodegenOptions } from "./codegen-file";
import { CliError } from "./errors";
import { gitignoreHint } from "./gitignore";

/** Where the command reads and writes: the process's, or a test's. */
export interface CliIO {
    /** The directory relative paths are resolved against. */
    readonly cwd: string;
    /** Prints a line of results. */
    readonly stdout: (text: string) => void;
    /** Prints a line of errors, warnings, and hints. */
    readonly stderr: (text: string) => void;
    /** Stops `--watch`. Default: SIGINT or SIGTERM. */
    readonly signal?: AbortSignal;
}

const toPosix = (path: string): string => path.split(sep).join("/");

const counts = (files: readonly FileResult[]): string => {
    const byStatus = new Map<string, number>();
    for (const file of files) {
        byStatus.set(file.status, (byStatus.get(file.status) ?? 0) + 1);
    }
    return [...byStatus]
        .map(([status, count]) => `${count} ${status}`)
        .join(", ");
};

const fileLines = (files: readonly FileResult[]): string =>
    files.map((file) => `  ${file.status} ${file.path}`).join("\n");

/** A write lists the files it changed up to this many; past it, only their counts. */
const LISTED = 10;

/** Reports errors as one message: ours and `generate`'s as they are, others with their stack. */
export const describeError = (error: unknown): string =>
    error instanceof CliError || isGenerateError(error)
        ? error.message
        : `pureform: generating failed: ${error instanceof Error ? (error.stack ?? error.message) : String(error)}`;

const reporter = (io: CliIO) => {
    const shown = new Set<string>();
    const show = (path: string) => toPosix(relative(io.cwd, path)) || ".";
    const folderOf = (result: GenerateResult) => `${show(result.outDir)}/`;

    let gitChecked = false;

    /** Prints the hints, each once, and the `.gitignore` hint after the first write. */
    const hints = (result: GenerateResult) => {
        const all = [...result.hints];
        if (!gitChecked) {
            gitChecked = true;
            const gitignore = gitignoreHint(result.root, result.outDir, show);
            if (gitignore) all.push(gitignore);
        }
        for (const hint of all) {
            if (shown.has(hint)) continue;
            shown.add(hint);
            io.stderr(hint);
        }
    };

    /** Prints a write's result; `quiet` leaves out "up to date". */
    const written = (result: GenerateResult, quiet = false) => {
        const changed = result.files.filter(
            (file) => file.status !== "unchanged",
        );
        if (changed.length > 0) {
            io.stdout(
                `pureform: updated ${folderOf(result)} (${counts(changed)})${changed.length <= LISTED ? `\n${fileLines(changed)}` : ""}`,
            );
        } else if (!quiet) {
            io.stdout(`pureform: ${folderOf(result)} is up to date`);
        }
        hints(result);
    };

    /** Prints a check's result. */
    const checked = (result: GenerateResult) => {
        const changed = result.files.filter(
            (file) => file.status !== "unchanged",
        );
        if (result.ok) {
            io.stdout(`pureform: ${folderOf(result)} is up to date`);
        } else {
            io.stderr(
                `pureform: ${folderOf(result)} is out of date (${counts(changed)}). Run \`pureform generate\` to update it.\n${fileLines(changed)}`,
            );
        }
        for (const hint of result.hints) io.stderr(hint);
    };

    return { written, checked, show };
};

/** Runs `pureform generate` with these flags. Resolves to the exit code: 0, or 1 when it fails
 *  or `--check` finds the output out of date. With `--watch`, resolves when watching stops. */
export const runGenerate = async (
    flags: GenerateFlags,
    io: CliIO,
): Promise<number> => {
    if (flags.watch && flags.check) {
        io.stderr("pureform: --watch and --check don't go together.");
        return 2;
    }
    const report = reporter(io);
    if (flags.watch) return runWatch(flags, io, report);
    try {
        const { options, warnings } = await resolveCodegenOptions(
            flags,
            io.cwd,
        );
        for (const line of warnings) io.stderr(line);
        const result = await generateTargets(options);
        if (flags.check) report.checked(result);
        else report.written(result);
        return result.ok ? 0 : 1;
    } catch (error) {
        io.stderr(describeError(error));
        return 1;
    }
};

const runWatch = async (
    flags: GenerateFlags,
    io: CliIO,
    report: ReturnType<typeof reporter>,
): Promise<number> => {
    let resolved: ResolvedCodegenOptions;
    try {
        resolved = await resolveCodegenOptions(flags, io.cwd);
        for (const line of resolved.warnings) io.stderr(line);
    } catch (error) {
        io.stderr(describeError(error));
        return 1;
    }

    let watcher: GenerateWatcher | undefined;
    let codegenFileWatcher: FSWatcher | undefined;
    let reloading: ReturnType<typeof setTimeout> | undefined;
    let first = true;

    const start = (options: ResolvedCodegenOptions["options"]) => {
        watcher?.close();
        watcher = watchGenerate(options, {
            onResult: (result) => {
                report.written(result, !first);
                first = false;
            },
            onError: (error) => io.stderr(describeError(error)),
        });
        return watcher.ready;
    };

    // The codegen file isn't the config's dependency, so it's watched here: an edit starts over
    // with the new options, and a broken edit keeps the old ones. Without one, its folder is
    // watched for one being created.
    const codegenFile = resolved.file;
    const codegenNames: readonly string[] =
        codegenFile === undefined ? CODEGEN_FILES : [basename(codegenFile)];
    try {
        const folder =
            codegenFile === undefined
                ? resolve(io.cwd, flags.root ?? ".")
                : dirname(codegenFile);
        codegenFileWatcher = watch(folder, (_event, name) => {
            if (name && !codegenNames.includes(basename(name.toString())))
                return;
            clearTimeout(reloading);
            reloading = setTimeout(() => {
                resolveCodegenOptions(flags, io.cwd).then(
                    (next) => {
                        first = true;
                        void start(next.options);
                    },
                    (error: unknown) => io.stderr(describeError(error)),
                );
            }, 50);
        });
        codegenFileWatcher.on("error", () => undefined);
    } catch {
        // Watching the codegen file is a convenience; the config is still watched.
    }

    await start(resolved.options);
    const { config, root = io.cwd } = resolved.options;
    const configName =
        typeof config === "string"
            ? report.show(resolve(root, config))
            : "the config";
    io.stdout(
        `pureform: watching ${configName} and the files it imports${codegenFile ? `, and ${report.show(codegenFile)}` : ""} (Ctrl+C to stop)`,
    );

    return new Promise<number>((resolveExit) => {
        const stop = () => {
            clearTimeout(reloading);
            codegenFileWatcher?.close();
            watcher?.close();
            process.off("SIGINT", stop);
            process.off("SIGTERM", stop);
            resolveExit(0);
        };
        if (io.signal) {
            if (io.signal.aborted) return stop();
            io.signal.addEventListener("abort", stop, { once: true });
        } else {
            process.once("SIGINT", stop);
            process.once("SIGTERM", stop);
        }
    });
};
