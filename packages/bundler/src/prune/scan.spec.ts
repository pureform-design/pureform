import { mkdirSync, mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";

import { describe, expect, it } from "vitest";

import { scanUsage } from "./scan";

const app = (files: Record<string, string>): string => {
    const root = mkdtempSync(join(tmpdir(), "pureform-scan-"));
    for (const [path, contents] of Object.entries(files)) {
        const file = join(root, path);
        mkdirSync(dirname(file), { recursive: true });
        writeFileSync(file, contents);
    }
    return root;
};

const scan = (files: Record<string, string>, include?: string[]) => {
    const root = app(files);
    return scanUsage({
        root,
        outDir: join(root, ".pureform"),
        ...(include ? { include } : {}),
    });
};

describe("scanUsage", () => {
    it("reads the components imported and the variant values their JSX sets", () => {
        const result = scan({
            "src/app.tsx": `
                import { Button } from "@pureform/solid/button";
                import { Checkbox } from "@pureform/solid/checkbox";
                import * as Chip from "@pureform/react/chip";
                export const App = () => (
                    <>
                        <Button variant="filled" size={wide ? "large" : "small"} />
                        <Button.Root variant="text" color={props.color}><Button.Label /></Button.Root>
                        <Checkbox />
                        <Chip.Chip variant={\`assist\`} density={undefined} />
                    </>
                );
            `,
        });
        expect(result.warnings).toEqual([]);
        expect(result.usage).toEqual({
            components: ["button", "checkbox", "chip", "ripple"],
            variants: {
                button: {
                    variant: ["filled", "text"],
                    size: ["large", "small"],
                    density: [],
                },
                checkbox: { color: [], density: [] },
                chip: { variant: ["assist"], color: [], density: [] },
            },
        });
    });

    it("keeps every value of a component rendered with props it can't see", () => {
        const result = scan({
            "src/app.tsx": `
                import { Button } from "@pureform/solid/button";
                import { Fab } from "@pureform/solid/fab";
                import { IconButton } from "@pureform/solid/icon-button";
                import { Dialog } from "@pureform/solid/dialog";
                import { Dynamic } from "@solidjs/web";
                export const App = (props) => (
                    <>
                        <Fab {...props} />
                        <Dynamic component={IconButton} />
                        <Dialog.Trigger as={Button} variant="text" />
                    </>
                );
            `,
        });
        expect(result.usage).toEqual({
            components: [
                "button",
                "dialog",
                "fab",
                "iconButton",
                "ripple",
                "scrim",
            ],
            variants: {},
        });
    });

    it("maps a prop to the group it sets, and draws every entry a component draws", () => {
        const result = scan({
            "src/app.tsx": `
                import { Text } from "@pureform/solid/text";
                import { Select } from "@pureform/solid/select";
                export const App = () => (
                    <>
                        <Text textStyle="bodyMedium" />
                        <Select color="secondary" variant="filled" leadingIcon={<i />} />
                    </>
                );
            `,
        });
        expect(result.usage).toEqual({
            components: ["menu", "ripple", "select", "text"],
            variants: {
                menu: { color: ["secondary"], density: [] },
                select: {
                    variant: ["filled"],
                    color: ["secondary"],
                    density: [],
                },
                text: { style: ["bodyMedium"] },
            },
        });
    });

    it("reads the registry hooks' names and selections", () => {
        const result = scan({
            "src/app.tsx": `
                import { useClasses, useClassFactory } from "@pureform/solid";
                import * as pf from "@pureform/react";
                import { useComponent } from "@pureform/solid";
                import { avatarAnatomy } from "@pureform/anatomy";
                const a = useClasses("card", () => ({ variant: "elevated", tokens: {} }));
                const b = pf.useClasses("text", { style: props.style });
                const c = useClassFactory("fab");
                const d = useClasses("media", () => {
                    return { aspect: "landscape" } as const;
                });
                const e = useClasses("switchControl", () => ({ ...rest }));
                const f = useComponent(avatarAnatomy, { selection: () => ({ size: "large" }) });
            `,
        });
        expect(result.usage).toEqual({
            components: [
                "avatar",
                "card",
                "fab",
                "media",
                "switchControl",
                "text",
            ],
            variants: {
                avatar: { size: ["large"], "*": [] },
                card: { variant: ["elevated"], "*": [] },
                media: { aspect: ["landscape"], "*": [] },
                text: { style: ["*"], "*": [] },
            },
        });
    });

    it("adds the values the provider's defaults set, and keeps every value when it can't read them", () => {
        const files = (defaults: string) => ({
            "src/app.tsx": `
                import { PureformProvider } from "@pureform/solid";
                import { Button } from "@pureform/solid/button";
                export const App = () => (
                    <PureformProvider registry={registry} defaults={${defaults}}>
                        <Button />
                    </PureformProvider>
                );
            `,
        });
        expect(
            scan(
                files(
                    `{ button: { variant: "tonal" }, chip: { variant: "x" } }`,
                ),
            ).usage,
        ).toEqual({
            components: ["button", "ripple"],
            variants: {
                button: {
                    variant: ["tonal"],
                    color: [],
                    size: [],
                    density: [],
                },
            },
        });
        expect(scan(files("defaults")).usage).toEqual({
            components: ["button", "ripple"],
            variants: {},
        });
    });

    it("drops the ripple only when every provider and component passes an indication with no layer", () => {
        const files = (provider: string, button = "") => ({
            "src/app.tsx": `
                import { PureformProvider, noIndication, materialIndication, defineIndication, useIndication } from "@pureform/solid";
                import { Button } from "@pureform/solid/button";
                export const App = () => (
                    <PureformProvider registry={registry} ${provider}>
                        <Button ${button} />
                    </PureformProvider>
                );
            `,
        });
        const components = (provider: string, button?: string) =>
            scan(files(provider, button)).usage?.components;
        expect(components("indication={noIndication}")).toEqual(["button"]);
        expect(
            components("indication={materialIndication({ ripple: false })}"),
        ).toEqual(["button"]);
        expect(
            components(
                'indication={defineIndication({ name: "flat", tokens: {} })}',
            ),
        ).toEqual(["button"]);
        expect(
            components('indication={{ name: "flat", layer: false }}'),
        ).toEqual(["button"]);
        expect(components("")).toEqual(["button", "ripple"]);
        expect(components("indication={materialIndication()}")).toEqual([
            "button",
            "ripple",
        ]);
        expect(
            components(
                'indication={defineIndication({ name: "ink", layer: true })}',
            ),
        ).toEqual(["button", "ripple"]);
        expect(components("indication={props.indication}")).toEqual([
            "button",
            "ripple",
        ]);
        expect(
            components(
                "indication={noIndication}",
                "indication={materialIndication()}",
            ),
        ).toEqual(["button", "ripple"]);
        expect(
            components(
                "indication={noIndication}",
                "indication={noIndication}",
            ),
        ).toEqual(["button"]);
    });

    it("keeps the ripple for an app's own surface or anatomy that shows indication", () => {
        expect(
            scan({
                "src/app.tsx": `
                    import { useIndication } from "@pureform/react";
                    const surface = useIndication(source);
                `,
            }).usage?.components,
        ).toEqual(["ripple"]);
        expect(
            scan({
                "src/app.tsx": `
                    import { useComponent } from "@pureform/solid";
                    import { chipAnatomy } from "@pureform/anatomy";
                    const scope = useComponent(chipAnatomy, { selection: () => ({}) });
                `,
            }).usage?.components,
        ).toEqual(["chip", "ripple"]);
    });

    it("reads the registry imported from the output folder", () => {
        const result = scan({
            "src/app.tsx": `
                import { registry } from "../.pureform";
                import { registry as again } from "virtual:pureform/registry";
                registry.entry("ripple");
                again.preload("scrim");
                export const names = registry.names;
            `,
            "src/direct.ts": `import { snackbar } from "../.pureform/web/snackbar";`,
        });
        expect(result.usage).toEqual({
            components: ["ripple", "scrim", "snackbar"],
            variants: {},
        });
    });

    it("follows relative imports out of the folders it scans, and skips tests, the generated registry, and dependencies", () => {
        const result = scan(
            {
                "src/app.tsx": `import "../shared/ui"; import "./missing";`,
                "src/app.spec.tsx": `import { Button } from "@pureform/solid/button";`,
                "shared/ui.tsx": `import { Chip } from "@pureform/solid/chip"; <Chip />;`,
                "other/unused.tsx": `import { Fab } from "@pureform/solid/fab";`,
                "src/node_modules/x/index.ts": `import { Tabs } from "@pureform/solid/tabs";`,
                ".pureform/index.ts": `import { Text } from "@pureform/solid/text";`,
            },
            ["src"],
        );
        expect(result.usage?.components).toEqual(["chip", "ripple"]);
        expect(
            result.files
                .map((file) => file.split("/").slice(-2).join("/"))
                .sort(),
        ).toEqual(["shared/ui.tsx", "src/app.tsx"]);
    });

    it("ignores type-only imports and the bindings' internals", () => {
        const result = scan({
            "src/app.ts": `
                import type { ButtonProps } from "@pureform/solid/button";
                import { type ChipProps } from "@pureform/solid/chip";
                import { normalizeProps } from "@pureform/solid/internal/zag";
                const a: typeof Fab = 1;
            `,
        });
        expect(result.usage).toEqual({ components: [], variants: {} });
    });

    it.each([
        [
            "a hook's name it can't read",
            `import { useClasses } from "@pureform/solid"; useClasses(name);`,
            "calls useClasses with a component name the scan can't read",
        ],
        [
            "a factory hook's name it can't read",
            `import { useClassFactory } from "@pureform/react"; useClassFactory(\`\${x}\`);`,
            "calls useClassFactory with a component name",
        ],
        [
            "the registry read by a name it can't read",
            `import { registry } from "../.pureform"; registry.names.map((n) => registry.entry(n));`,
            "reads the registry with a component name the scan can't read",
        ],
        [
            "the registry hooks re-exported",
            `export { useClasses } from "@pureform/solid";`,
            "re-exports @pureform/solid's registry hooks",
        ],
        [
            "a component it doesn't know",
            `import { Carousel } from "@pureform/solid/carousel";`,
            "imports @pureform/solid/carousel, which pruning doesn't know",
        ],
        [
            "an anatomy it can't name",
            `import { useComponent } from "@pureform/solid"; useComponent(mine, {});`,
            "calls useComponent with an anatomy the scan can't name",
        ],
        ["a file that doesn't parse", `const = ;`, "doesn't parse"],
    ])("keeps everything on %s", (_, source, warning) => {
        const result = scan({ "src/app.tsx": source });
        expect(result.usage).toBeUndefined();
        expect(result.warnings.join("\n")).toContain(warning);
    });
});
