// Just enough semver for the train check: compare versions, and test one against the ranges
// package.json files use (`^0.4`, `~1.2.3`, `>=1 <2`, `1.x`, `a || b`, `1.0.0 - 2.0.0`).
// Prereleases sort before their release and aren't excluded from ranges.

interface Version {
    readonly major: number;
    readonly minor: number;
    readonly patch: number;
    readonly pre: readonly (string | number)[];
}

const VERSION =
    /^v?(\d+)\.(\d+)\.(\d+)(?:-([0-9A-Za-z.-]+))?(?:\+[0-9A-Za-z.-]+)?$/;

const parse = (text: string): Version | undefined => {
    const match = VERSION.exec(text.trim());
    if (!match) return undefined;
    return {
        major: Number(match[1]),
        minor: Number(match[2]),
        patch: Number(match[3]),
        pre: match[4]
            ? match[4]
                  .split(".")
                  .map((part) => (/^\d+$/.test(part) ? Number(part) : part))
            : [],
    };
};

const comparePre = (
    a: readonly (string | number)[],
    b: readonly (string | number)[],
): number => {
    if (a.length === 0 || b.length === 0) return b.length - a.length;
    for (let i = 0; i < Math.max(a.length, b.length); i++) {
        const x = a[i];
        const y = b[i];
        if (x === undefined) return -1;
        if (y === undefined) return 1;
        if (x === y) continue;
        if (typeof x === "number" && typeof y === "number") return x - y;
        if (typeof x === "number") return -1;
        if (typeof y === "number") return 1;
        return x < y ? -1 : 1;
    }
    return 0;
};

const compareParsed = (a: Version, b: Version): number =>
    a.major - b.major ||
    a.minor - b.minor ||
    a.patch - b.patch ||
    comparePre(a.pre, b.pre);

/** Orders two versions: negative, zero, or positive. An invalid version sorts first. */
export const compareVersions = (a: string, b: string): number => {
    const x = parse(a);
    const y = parse(b);
    if (!x || !y) return x ? 1 : y ? -1 : 0;
    return compareParsed(x, y);
};

/** Whether a string is a valid version. */
export const isVersion = (text: string): boolean => parse(text) !== undefined;

type Bound = readonly [op: ">=" | ">" | "<" | "<=", version: Version];

const version = (
    major: number,
    minor = 0,
    patch = 0,
    pre: (string | number)[] = [],
): Version => ({
    major,
    minor,
    patch,
    pre,
});

// "1", "1.2", "1.2.3", "1.x", "*" and prereleases: the given parts, or undefined for a
// wildcard.
const PARTIAL =
    /^v?(\d+|[xX*])(?:\.(\d+|[xX*]))?(?:\.(\d+|[xX*]))?(?:-([0-9A-Za-z.-]+))?(?:\+[0-9A-Za-z.-]+)?$/;

interface PartialVersion {
    major: number | undefined;
    minor: number | undefined;
    patch: number | undefined;
    pre: (string | number)[];
}

const partial = (text: string): PartialVersion | undefined => {
    if (text === "" || text === "*" || text === "x" || text === "X") {
        return {
            major: undefined,
            minor: undefined,
            patch: undefined,
            pre: [],
        };
    }
    const match = PARTIAL.exec(text);
    if (!match) return undefined;
    const part = (value: string | undefined) =>
        value === undefined || /^[xX*]$/.test(value)
            ? undefined
            : Number(value);
    const major = part(match[1]);
    const minor = major === undefined ? undefined : part(match[2]);
    const patch = minor === undefined ? undefined : part(match[3]);
    return {
        major,
        minor,
        patch,
        pre:
            patch !== undefined && match[4]
                ? match[4]
                      .split(".")
                      .map((p) => (/^\d+$/.test(p) ? Number(p) : p))
                : [],
    };
};

const floor = (p: PartialVersion): Version => ({
    major: p.major ?? 0,
    minor: p.minor ?? 0,
    patch: p.patch ?? 0,
    pre: p.pre,
});

// The first version past a partial's wildcard: "1.2" → 1.3.0-0.
const ceiling = (p: PartialVersion): Version | undefined => {
    if (p.major === undefined) return undefined;
    if (p.minor === undefined) return version(p.major + 1, 0, 0, [0]);
    return version(p.major, p.minor + 1, 0, [0]);
};

const comparatorBounds = (text: string): Bound[] | undefined => {
    const match = /^(\^|~>?|>=|<=|>|<|=)?\s*(.*)$/.exec(text);
    if (!match) return undefined;
    const op = match[1] ?? "";
    const p = partial(match[2] ?? "");
    if (!p) return undefined;
    const low = floor(p);
    switch (op) {
        case "^": {
            if (p.major === undefined) return [];
            const high =
                p.major > 0 || p.minor === undefined
                    ? version(p.major + 1, 0, 0, [0])
                    : p.minor > 0 || p.patch === undefined
                      ? version(0, p.minor + 1, 0, [0])
                      : version(0, 0, p.patch + 1, [0]);
            return [
                [">=", low],
                ["<", high],
            ];
        }
        case "~":
        case "~>": {
            if (p.major === undefined) return [];
            const high =
                p.minor === undefined
                    ? version(p.major + 1, 0, 0, [0])
                    : version(p.major, p.minor + 1, 0, [0]);
            return [
                [">=", low],
                ["<", high],
            ];
        }
        case ">=":
            return [[">=", low]];
        case "<":
            return [["<", low]];
        case ">": {
            if (p.patch !== undefined) return [[">", low]];
            const high = ceiling(p);
            return high ? [[">=", high]] : [["<", version(0, 0, 0, [0])]];
        }
        case "<=": {
            if (p.patch !== undefined) return [["<=", low]];
            const high = ceiling(p);
            return high ? [["<", high]] : [];
        }
        default: {
            if (p.patch !== undefined) {
                return [
                    [">=", low],
                    ["<=", low],
                ];
            }
            const high = ceiling(p);
            return high
                ? [
                      [">=", low],
                      ["<", high],
                  ]
                : [];
        }
    }
};

const setBounds = (text: string): Bound[] | undefined => {
    const hyphen = /^(\S+)\s+-\s+(\S+)$/.exec(text);
    if (hyphen) {
        const from = comparatorBounds(`>=${hyphen[1]}`);
        const to = comparatorBounds(`<=${hyphen[2]}`);
        return from && to ? [...from, ...to] : undefined;
    }
    const bounds: Bound[] = [];
    // Join an operator to its version: ">= 1.2" → ">=1.2".
    const parts = text.replace(/(\^|~>?|>=|<=|>|<|=)\s+/g, "$1").split(/\s+/);
    for (const part of parts) {
        const found = comparatorBounds(part);
        if (!found) return undefined;
        bounds.push(...found);
    }
    return bounds;
};

const holds = ([op, bound]: Bound, value: Version): boolean => {
    const order = compareParsed(value, bound);
    switch (op) {
        case ">=":
            return order >= 0;
        case ">":
            return order > 0;
        case "<":
            return order < 0;
        case "<=":
            return order <= 0;
    }
};

/** Whether a version is in a range, or `undefined` when either isn't semver (`workspace:^`,
 *  `catalog:`, a URL, a tag). */
export const satisfies = (
    value: string,
    range: string,
): boolean | undefined => {
    const parsed = parse(value);
    if (!parsed) return undefined;
    const sets = range.split("||").map((set) => setBounds(set.trim()));
    if (sets.some((set) => set === undefined)) return undefined;
    return sets.some((set) => set!.every((bound) => holds(bound, parsed)));
};
