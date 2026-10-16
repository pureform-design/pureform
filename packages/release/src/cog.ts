/** The cocogitto package that versions every core train package together. */
export const CORE_TRAIN = "core-train";

export interface CogPackage {
    name: string;
    path: string;
    include: string[];
}

const SECTION = /^\[monorepo\.packages\.(?:"([^"]+)"|([A-Za-z0-9_-]+))\]$/;

function stripComment(line: string): string {
    let quoted = false;
    for (let i = 0; i < line.length; i++) {
        const char = line[i];
        if (char === '"' && line[i - 1] !== "\\") quoted = !quoted;
        if (char === "#" && !quoted) return line.slice(0, i);
    }
    return line;
}

function strings(text: string): string[] {
    return [...text.matchAll(/"((?:[^"\\]|\\.)*)"/g)].map(
        (match) => match[1] ?? "",
    );
}

/**
 * Reads the `[monorepo.packages.*]` sections of a cog.toml: each package's name, `path`,
 * and `include` globs. Only the subset of TOML that cog.toml uses is understood.
 */
export function parseCogPackages(toml: string): CogPackage[] {
    const packages: CogPackage[] = [];
    let current: CogPackage | undefined;
    let arrayKey: string | undefined;
    let arrayText = "";

    for (const raw of toml.split("\n")) {
        const line = stripComment(raw).trim();

        if (arrayKey) {
            arrayText += ` ${line}`;
            if (line.endsWith("]")) {
                if (current && arrayKey === "include")
                    current.include = strings(arrayText);
                arrayKey = undefined;
            }
            continue;
        }
        if (line.startsWith("[")) {
            const match = SECTION.exec(line);
            current = match
                ? { name: match[1] ?? match[2] ?? "", path: "", include: [] }
                : undefined;
            if (current) packages.push(current);
            continue;
        }
        if (!current) continue;

        const assignment = /^([A-Za-z0-9_-]+)\s*=\s*(.*)$/.exec(line);
        if (!assignment) continue;
        const [, key, value = ""] = assignment;
        if (value.startsWith("[")) {
            if (value.endsWith("]")) {
                if (key === "include") current.include = strings(value);
            } else {
                arrayKey = key;
                arrayText = value;
            }
        } else if (key === "path") {
            current.path = strings(value)[0] ?? "";
        }
    }

    return packages;
}

/**
 * The directories of the core train's packages, from its `include` globs (each one
 * `<dir>/**`). Throws when a glob has another shape.
 */
export function trainPaths(packages: readonly CogPackage[]): string[] {
    const train = packages.find((entry) => entry.name === CORE_TRAIN);
    if (!train) throw new Error(`cog.toml has no ${CORE_TRAIN} package`);
    return train.include.map((glob) => {
        const match = /^(.+)\/\*\*$/.exec(glob);
        if (!match?.[1]) {
            throw new Error(
                `${CORE_TRAIN} includes "${glob}"; use "<package dir>/**"`,
            );
        }
        return match[1];
    });
}
