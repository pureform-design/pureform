import type { ReactElement, ReactNode } from "react";
import { beforeAll, describe, expect, it } from "vitest";

import { PureformProvider, useStyles, useTokens } from ".";
import type { Overrides } from ".";
import { presetRegistry } from "./testing/registry";
import type { TestRegistry } from "./testing/registry";
import { mount } from "./testing/render";

type Tokens = Record<string, string | number>;

let registry: TestRegistry;
let themes: Record<string, Tokens>;

beforeAll(async () => {
    registry = await presetRegistry(["button"], [], "themed");
    themes = registry.entry("button").factory.styles.themes as Record<
        string,
        Tokens
    >;
});

// What a theme changes from the base theme.
const changes = (theme: string, scheme = "light"): Tokens => {
    const base = themes[`base:${scheme}`]!;
    return Object.fromEntries(
        Object.entries(themes[`${theme}:${scheme}`]!).filter(
            ([token, value]) => base[token] !== value,
        ),
    );
};

// What a hook gives under nested providers, from the outermost (which takes the registry) in.
const under = async <T,>(
    hook: () => T,
    providers: readonly {
        theme?: string;
        overrides?: Overrides;
        scheme?: "light" | "dark";
    }[],
): Promise<T> => {
    let seen!: T;
    function Probe(): ReactNode {
        seen = hook();
        return null;
    }
    const tree = providers.reduceRight<ReactElement>(
        (inner, props, i) => (
            <PureformProvider {...props} {...(i === 0 ? { registry } : {})}>
                {inner}
            </PureformProvider>
        ),
        <Probe />,
    );
    await mount(tree);
    return seen;
};

const tokens = () => ({ ...useTokens() }) as Tokens;

describe("nested providers' themes", () => {
    it("leave a provider's own theme as it was", async () => {
        expect(await under(tokens, [{ theme: "teal" }])).toEqual(
            themes["teal:light"],
        );
        expect(
            await under(tokens, [{ theme: "teal", scheme: "dark" }]),
        ).toEqual(themes["teal:dark"]);
    });

    it("combine, each theme setting what it changes from the base", async () => {
        const sharp = changes("sharp");
        const compact = changes("compact");
        const teal = changes("teal");
        expect(Object.keys(sharp).length).toBeGreaterThan(0);
        expect(Object.keys(compact).length).toBeGreaterThan(0);
        expect(Object.keys(teal).length).toBeGreaterThan(0);
        const expected = {
            ...themes["base:light"],
            ...sharp,
            ...compact,
            ...teal,
        };
        expect(
            await under(tokens, [
                { theme: "sharp" },
                { theme: "compact" },
                { theme: "teal" },
            ]),
        ).toEqual(expected);
        // The same, nested the other way, where no two change the same token.
        expect(
            await under(tokens, [
                { theme: "teal" },
                { theme: "compact" },
                { theme: "sharp" },
            ]),
        ).toEqual(expected);
        const darkTeal = changes("teal", "dark");
        expect(
            await under(tokens, [
                { theme: "sharp", scheme: "dark" },
                { theme: "teal" },
            ]),
        ).toEqual({
            ...themes["base:dark"],
            ...changes("sharp", "dark"),
            ...darkTeal,
        });
    });

    it("style components with every theme around them", async () => {
        const root = () => useStyles("button", {}).root!.style;
        const sharp = await under(root, [{ theme: "sharp" }]);
        const teal = await under(root, [{ theme: "teal" }]);
        const both = await under(root, [{ theme: "sharp" }, { theme: "teal" }]);
        expect(sharp.borderRadius).not.toEqual(teal.borderRadius);
        expect(sharp.backgroundColor).not.toEqual(teal.backgroundColor);
        expect(both.borderRadius).toEqual(sharp.borderRadius);
        expect(both.backgroundColor).toEqual(teal.backgroundColor);
    });

    it("let an inner theme win over the outer provider's overrides of what it changes", async () => {
        const [primary] = Object.keys(changes("teal")).filter((token) =>
            token.startsWith("colors.primary"),
        );
        const seen = await under(tokens, [
            {
                overrides: {
                    [primary!]: "rgba(1, 2, 3, 1)",
                    "spacing.4": 99,
                },
            },
            { theme: "teal" },
        ]);
        expect(seen[primary!]).toBe(themes["teal:light"]![primary!]);
        expect(seen["spacing.4"]).toBe(99);
        // The inner provider's own overrides win over its theme.
        const own = await under(tokens, [
            { theme: "sharp" },
            { theme: "teal", overrides: { [primary!]: "rgba(4, 5, 6, 1)" } },
        ]);
        expect(own[primary!]).toBe("rgba(4, 5, 6, 1)");
    });
});
