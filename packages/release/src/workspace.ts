import { existsSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";

import { checkRelease, type WorkspacePackage } from "./check";
import {
    CORE_PACKAGE,
    parseCogPackages,
    corePackagesPaths,
    type CogPackage,
} from "./cog";
import {
    readSourceVersion,
    setLockVersion,
    setManifestVersion,
    setSourceVersion,
    SOURCE_VERSION_FILE,
} from "./version";

/** The repository root: the nearest directory, from `from` up, holding a cog.toml. */
export function findRoot(from: string): string {
    let dir = from;
    while (!existsSync(join(dir, "cog.toml"))) {
        const parent = dirname(dir);
        if (parent === dir) throw new Error(`no cog.toml above ${from}`);
        dir = parent;
    }
    return dir;
}

export function readCog(root: string): CogPackage[] {
    return parseCogPackages(readFileSync(join(root, "cog.toml"), "utf8"));
}

/** The workspace's packages, from the root package.json's `<dir>/*` workspace globs. */
export function readWorkspace(root: string): WorkspacePackage[] {
    const manifest = JSON.parse(
        readFileSync(join(root, "package.json"), "utf8"),
    ) as {
        workspaces?: string[];
    };
    const packages: WorkspacePackage[] = [];
    for (const glob of manifest.workspaces ?? []) {
        const parent = /^(.+)\/\*$/.exec(glob)?.[1];
        if (!parent)
            throw new Error(`workspace glob "${glob}" isn't "<dir>/*"`);
        if (!existsSync(join(root, parent))) continue;
        for (const child of readdirSync(join(root, parent), {
            withFileTypes: true,
        })) {
            const file = join(root, parent, child.name, "package.json");
            if (!child.isDirectory() || !existsSync(file)) continue;
            const { name, version } = JSON.parse(
                readFileSync(file, "utf8"),
            ) as {
                name: string;
                version?: string;
            };
            const sourceFile = join(
                root,
                parent,
                child.name,
                SOURCE_VERSION_FILE,
            );
            const sourceVersion = existsSync(sourceFile)
                ? readSourceVersion(readFileSync(sourceFile, "utf8"))
                : undefined;
            packages.push({
                path: `${parent}/${child.name}`,
                name,
                version: version ?? "",
                ...(sourceVersion === undefined ? {} : { sourceVersion }),
            });
        }
    }
    return packages;
}

/** Checks the repository's cog.toml against its workspace; see `checkRelease`. */
export function checkRepository(root: string): string[] {
    return checkRelease(readCog(root), readWorkspace(root));
}

/** The package directories a cog.toml package versions: the core's, or its own path. */
export function releasePaths(
    cog: readonly CogPackage[],
    name: string,
): string[] {
    if (name === CORE_PACKAGE) return corePackagesPaths(cog);
    const entry = cog.find((candidate) => candidate.name === name);
    if (!entry) throw new Error(`cog.toml has no package ${name}`);
    return [entry.path];
}

/**
 * Sets the version of a cog.toml package (every core package for `core`) in each
 * package.json, each `src/package-version.ts`, and bun.lock. Returns the files it changed, relative to the root.
 */
export function setVersion(
    root: string,
    name: string,
    version: string,
    options: { dryRun?: boolean } = {},
): string[] {
    const changed: string[] = [];
    const lockFile = join(root, "bun.lock");
    let lock = existsSync(lockFile)
        ? readFileSync(lockFile, "utf8")
        : undefined;
    const before = lock;

    for (const path of releasePaths(readCog(root), name)) {
        const file = join(root, path, "package.json");
        const manifest = readFileSync(file, "utf8");
        const updated = setManifestVersion(manifest, version);
        if (updated !== manifest) {
            if (!options.dryRun) writeFileSync(file, updated);
            changed.push(`${path}/package.json`);
        }
        const sourceFile = join(root, path, SOURCE_VERSION_FILE);
        if (existsSync(sourceFile)) {
            const source = readFileSync(sourceFile, "utf8");
            const updatedSource = setSourceVersion(source, version);
            if (updatedSource !== source) {
                if (!options.dryRun) writeFileSync(sourceFile, updatedSource);
                changed.push(`${path}/${SOURCE_VERSION_FILE}`);
            }
        }
        if (lock !== undefined) lock = setLockVersion(lock, path, version);
    }

    if (lock !== undefined && lock !== before) {
        if (!options.dryRun) writeFileSync(lockFile, lock);
        changed.push("bun.lock");
    }
    return changed;
}
