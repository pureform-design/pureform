// The build-time core-train check: every installed train package must carry one version, and
// every installed binding's peer range must include it. A mismatch is what breaks builds, so
// `generate` fails with the packages and the versions to install.

import { existsSync, readFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";

import { compareVersions, isVersion, satisfies } from "./semver";

/** The core train: the packages released in lockstep at one version. Kept in step with
 *  `cog.toml`'s `core` by a test. */
export const CORE_PACKAGES = [
    "@pureform/anatomy",
    "@pureform/binding-core",
    "@pureform/binding-web",
    "@pureform/bundler",
    "@pureform/cli",
    "@pureform/component-cases",
    "@pureform/core",
    "@pureform/css-adapter",
    "@pureform/css-lowering",
    "@pureform/generate",
    "@pureform/js-effects",
    "@pureform/machines",
    "@pureform/material",
    "@pureform/panda-adapter",
    "@pureform/preset",
    "@pureform/rn-adapter",
    "@pureform/styling",
    "@pureform/styling-web",
    "@pureform/tailwind-adapter",
    "@pureform/theme",
    "@pureform/type-utils",
    "@pureform/utils",
    "@pureform/web-contracts",
] as const;

/** The bindings: versioned on their own, each peering on the core with a range. */
export const BINDING_PACKAGES = [
    "@pureform/solid",
    "@pureform/react",
    "@pureform/react-native",
] as const;

const CORE = new Set<string>(CORE_PACKAGES);

/** A package as installed for the app. */
export interface InstalledPackage {
    readonly name: string;
    readonly version: string;
    /** Its directory, absolute. */
    readonly dir: string;
    readonly peerDependencies?: Readonly<Record<string, string>>;
}

/** The installed packages among `names`, found as Node finds them from `root`: the nearest
 *  `node_modules/<name>` from `root` up. Packages that aren't installed are left out. */
export const findInstalled = (
    root: string,
    names: readonly string[] = [...CORE_PACKAGES, ...BINDING_PACKAGES],
): InstalledPackage[] => {
    const found: InstalledPackage[] = [];
    for (const name of names) {
        let dir = resolve(root);
        for (;;) {
            const manifest = join(dir, "node_modules", name, "package.json");
            if (existsSync(manifest)) {
                const json = JSON.parse(readFileSync(manifest, "utf8")) as {
                    version?: string;
                    peerDependencies?: Record<string, string>;
                };
                found.push({
                    name,
                    version: json.version ?? "",
                    dir: dirname(manifest),
                    ...(json.peerDependencies
                        ? { peerDependencies: json.peerDependencies }
                        : {}),
                });
                break;
            }
            const parent = dirname(dir);
            if (parent === dir) break;
            dir = parent;
        }
    }
    return found;
};

/** One problem the train check found. */
export type VersionProblem =
    | {
          readonly kind: "version";
          /** A train package not at the train's version. */
          readonly name: string;
          readonly version: string;
          /** The version to install it at. */
          readonly expected: string;
      }
    | {
          readonly kind: "peer";
          /** The binding. */
          readonly name: string;
          readonly version: string;
          /** The train package it peers on, and its range. */
          readonly peer: string;
          readonly range: string;
          /** The train's version, outside the range. */
          readonly installed: string;
      };

export interface VersionCheck {
    /** The train's version: the newest installed train package's, or `undefined` when none is
     *  installed. */
    readonly version: string | undefined;
    readonly problems: readonly VersionProblem[];
    /** The problems as one message naming the versions to install, or `undefined` when
     *  there are none. */
    readonly message: string | undefined;
}

/** Checks installed packages: train packages behind the newest one's version, and bindings
 *  whose peer range on a train package excludes that version. Ranges that aren't semver
 *  (`workspace:^`) pass. */
export const checkVersions = (
    installed: readonly InstalledPackage[],
): VersionCheck => {
    const train = installed.filter(
        (entry) => CORE.has(entry.name) && isVersion(entry.version),
    );
    const version = train
        .map((entry) => entry.version)
        .sort(compareVersions)
        .at(-1);
    if (version === undefined) {
        return { version, problems: [], message: undefined };
    }

    const problems: VersionProblem[] = [];
    for (const entry of train) {
        if (entry.version !== version) {
            problems.push({
                kind: "version",
                name: entry.name,
                version: entry.version,
                expected: version,
            });
        }
    }
    for (const entry of installed) {
        if (CORE.has(entry.name)) continue;
        for (const [peer, range] of Object.entries(
            entry.peerDependencies ?? {},
        )) {
            if (!CORE.has(peer)) continue;
            if (satisfies(version, range) === false) {
                problems.push({
                    kind: "peer",
                    name: entry.name,
                    version: entry.version,
                    peer,
                    range,
                    installed: version,
                });
            }
        }
    }
    return {
        version,
        problems,
        message: versionProblemMessage(version, problems),
    };
};

const versionProblemMessage = (
    version: string,
    problems: readonly VersionProblem[],
): string | undefined => {
    if (problems.length === 0) return undefined;
    const lines = [
        `pureform: the installed pureform packages don't match the core train, ${version}.`,
    ];
    const behind = problems.filter((problem) => problem.kind === "version");
    if (behind.length > 0) {
        lines.push(
            "Core-train packages share one version, and these differ:",
            ...behind.map((problem) => `  ${problem.name} ${problem.version}`),
            `Install them at ${version}:`,
            `  ${behind.map((problem) => `${problem.name}@${version}`).join(" ")}`,
        );
    }
    for (const problem of problems) {
        if (problem.kind !== "peer") continue;
        lines.push(
            `${problem.name} ${problem.version} works with ${problem.peer} ${problem.range}, not ${problem.installed}.`,
            `Install a ${problem.name} release made for core-train ${problem.installed} (${problem.name}@latest), or install the core train at a version in ${problem.range}.`,
        );
    }
    return lines.join("\n");
};
