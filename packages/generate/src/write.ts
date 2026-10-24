// Writing `.pureform/`: each file only when its contents change, so watchers and bundlers don't
// rebuild for nothing, and generated files that are no longer wanted are removed. In check mode
// nothing is written; each file is compared instead.

import {
    mkdir,
    readdir,
    readFile,
    rename,
    rm,
    rmdir,
    writeFile,
} from "node:fs/promises";
import { dirname, join, relative, sep } from "node:path";

import { headerHash, isGenerated } from "./hash";

/** A file to write, with its header, relative to `outDir`. */
export interface PlannedFile {
    readonly path: string;
    readonly contents: string;
    /** Whether the contents carry the header (and its hash). */
    readonly header: boolean;
}

export type FileStatus =
    /** Write mode: written, because it was missing or differed. */
    | "written"
    /** Both modes: already as it should be. */
    | "unchanged"
    /** Write mode: a generated file no longer wanted, removed. */
    | "removed"
    /** Check mode: missing. */
    | "missing"
    /** Check mode: its header's hash differs, so it was made from other inputs. */
    | "stale"
    /** Check mode: the hash matches, but the contents differ (edited by hand, or made by a
     *  different adapter build). */
    | "modified"
    /** Check mode: a generated file no longer wanted. */
    | "extra";

export interface FileResult {
    /** Relative to `outDir`, with `/` separators. */
    readonly path: string;
    readonly status: FileStatus;
}

const toPosix = (path: string): string => path.split(sep).join("/");

const readText = (path: string): Promise<string | undefined> =>
    readFile(path, "utf8").catch(() => undefined);

/** Every file under a folder, relative to it, with `/` separators. */
export const listFiles = async (dir: string): Promise<string[]> => {
    const entries = await readdir(dir, {
        recursive: true,
        withFileTypes: true,
    }).catch(() => []);
    return entries
        .filter((entry) => entry.isFile())
        .map((entry) =>
            toPosix(relative(dir, join(entry.parentPath, entry.name))),
        )
        .sort();
};

/** The generated files under `outDir` (those with the header), with their hashes. */
export const readGenerated = async (
    outDir: string,
): Promise<{ path: string; hash: string | undefined }[]> => {
    const found: { path: string; hash: string | undefined }[] = [];
    for (const path of await listFiles(outDir)) {
        if (path.endsWith(TEMP_SUFFIX)) continue;
        const contents = await readText(join(outDir, path));
        if (contents !== undefined && isGenerated(contents)) {
            found.push({ path, hash: headerHash(contents) });
        }
    }
    return found;
};

const TEMP_SUFFIX = ".pureform-tmp";

// Write through a temporary file and a rename, so a run overlapping another never reads (or
// bundles) a half-written file.
const writeAtomic = async (path: string, contents: string): Promise<void> => {
    const temp = `${path}.${process.pid}.${Math.random().toString(36).slice(2)}${TEMP_SUFFIX}`;
    await writeFile(temp, contents);
    await rename(temp, path);
};

// Top-level entries last, so they never point at folder files not written yet.
const entriesLast = (planned: readonly PlannedFile[]): PlannedFile[] => [
    ...planned.filter((file) => file.path.includes("/")),
    ...planned.filter((file) => !file.path.includes("/")),
];

// Generated files under `outDir` that aren't planned.
const unwanted = async (
    outDir: string,
    planned: readonly PlannedFile[],
    keep: (path: string) => boolean = () => false,
): Promise<string[]> => {
    const wanted = new Set(planned.map((file) => file.path));
    return (await readGenerated(outDir))
        .map((file) => file.path)
        .filter((path) => !wanted.has(path) && !keep(path));
};

// Remove a file's folders up to `outDir` while they're empty.
const pruneFolders = async (outDir: string, path: string): Promise<void> => {
    let dir = dirname(join(outDir, path));
    while (dir.startsWith(`${outDir}${sep}`)) {
        try {
            await rmdir(dir);
        } catch {
            return;
        }
        dir = dirname(dir);
    }
};

/** Writes each planned file whose contents differ, and removes generated files that aren't
 *  planned, besides those `keep` names (relative paths). Files without the header are the
 *  app's, and are left alone. */
export const writeFiles = async (
    outDir: string,
    planned: readonly PlannedFile[],
    keep?: (path: string) => boolean,
): Promise<FileResult[]> => {
    const results: FileResult[] = [];
    for (const file of entriesLast(planned)) {
        const target = join(outDir, file.path);
        if ((await readText(target)) === file.contents) {
            results.push({ path: file.path, status: "unchanged" });
            continue;
        }
        await mkdir(dirname(target), { recursive: true });
        await writeAtomic(target, file.contents);
        results.push({ path: file.path, status: "written" });
    }
    for (const path of await unwanted(outDir, planned, keep)) {
        await rm(join(outDir, path), { force: true });
        await pruneFolders(outDir, path);
        results.push({ path, status: "removed" });
    }
    return results;
};

/** Compares each planned file with what's on disk, writing nothing. */
export const compareFiles = async (
    outDir: string,
    planned: readonly PlannedFile[],
    hash: string,
    keep?: (path: string) => boolean,
): Promise<FileResult[]> => {
    const results: FileResult[] = [];
    for (const file of planned) {
        const current = await readText(join(outDir, file.path));
        const status: FileStatus =
            current === undefined
                ? "missing"
                : file.header && headerHash(current) !== hash
                  ? "stale"
                  : current === file.contents
                    ? "unchanged"
                    : "modified";
        results.push({ path: file.path, status });
    }
    for (const path of await unwanted(outDir, planned, keep)) {
        results.push({ path, status: "extra" });
    }
    return results;
};
