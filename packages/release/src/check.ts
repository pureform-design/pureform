import { CORE_TRAIN, type CogPackage } from "./cog";

export interface WorkspacePackage {
    /** The directory, relative to the repository root, with `/` separators. */
    path: string;
    name: string;
    version: string;
}

/** Workspace packages under this directory are released; apps and tests aren't. */
const RELEASED_DIR = "packages/";

/**
 * Checks that cog.toml and the workspace agree: every package under `packages/` is in
 * exactly one release group (the core train or its own cog package), every cog entry
 * names a real package, and the core train's packages share one version. Returns the
 * problems found, empty when there are none.
 */
export function checkRelease(
    cog: readonly CogPackage[],
    workspace: readonly WorkspacePackage[],
): string[] {
    const issues: string[] = [];
    const byPath = new Map(workspace.map((entry) => [entry.path, entry]));
    const train = cog.find((entry) => entry.name === CORE_TRAIN);
    if (!train) return [`cog.toml has no ${CORE_TRAIN} package`];

    const trainPaths = new Set<string>();
    for (const glob of train.include) {
        const path = /^(.+)\/\*\*$/.exec(glob)?.[1];
        if (!path)
            issues.push(
                `${CORE_TRAIN} includes "${glob}"; use "<package dir>/**"`,
            );
        else if (!byPath.has(path))
            issues.push(
                `${CORE_TRAIN} includes ${path}, which isn't a workspace package`,
            );
        else trainPaths.add(path);
    }

    const ownPaths = new Set<string>();
    for (const entry of cog) {
        if (entry.name === CORE_TRAIN) continue;
        const found = byPath.get(entry.path);
        if (!found) {
            issues.push(
                `cog.toml package ${entry.name} has path "${entry.path}", which isn't a workspace package`,
            );
            continue;
        }
        if (found.name !== entry.name) {
            issues.push(
                `cog.toml package ${entry.name} is named ${found.name} in ${entry.path}/package.json`,
            );
        }
        if (trainPaths.has(entry.path)) {
            issues.push(
                `${entry.name} is in the ${CORE_TRAIN} and has its own cog.toml package; keep one`,
            );
        }
        ownPaths.add(entry.path);
    }

    for (const entry of workspace) {
        if (
            entry.path.startsWith(RELEASED_DIR) &&
            !trainPaths.has(entry.path) &&
            !ownPaths.has(entry.path)
        ) {
            issues.push(
                `${entry.name} (${entry.path}) is in no release group; add it to the ${CORE_TRAIN} or give it a cog.toml package`,
            );
        }
    }

    const versions = new Map<string, string[]>();
    for (const path of trainPaths) {
        const entry = byPath.get(path);
        if (!entry) continue;
        versions.set(entry.version, [
            ...(versions.get(entry.version) ?? []),
            entry.name,
        ]);
    }
    if (versions.size > 1) {
        const listed = [...versions].map(
            ([version, names]) => `${version} (${names.join(", ")})`,
        );
        issues.push(
            `the ${CORE_TRAIN}'s packages differ in version: ${listed.join("; ")}`,
        );
    }

    return issues;
}
