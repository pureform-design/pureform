// A fixture app on the CSS target with the whole preset: its build ships only the components and
// variant values its source uses.

import {
    mkdirSync,
    mkdtempSync,
    readdirSync,
    readFileSync,
    symlinkSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";

import { build } from "vite";
import { describe, expect, it } from "vitest";

import { writeTree } from "../__fixtures__/app";
import { pureform } from "../plugin";

const PACKAGES = resolve(__dirname, "../../..");

const fixture = (): string => {
    const root = mkdtempSync(join(tmpdir(), "pureform-prune-"));
    mkdirSync(join(root, "node_modules/@pureform"), { recursive: true });
    for (const name of ["styling", "css-adapter", "preset"]) {
        symlinkSync(
            join(PACKAGES, name),
            join(root, "node_modules/@pureform", name),
        );
    }
    writeTree(root, {
        "pureform.config.ts": `import { pureform } from "@pureform/preset";\nexport default pureform();\n`,
        // The bundle reads the registry and the stylesheet; the page isn't bundled here (no JSX
        // compiler), but the scan reads it as it reads any source under the root.
        "main.ts": `import "./.pureform/styles.css";\nimport { registry } from "./.pureform";\nexport const names = registry.names;\n`,
        "src/page.tsx": [
            `import { useClasses } from "@pureform/solid";`,
            `import { Button } from "@pureform/solid/button";`,
            `import { Checkbox } from "@pureform/solid/checkbox";`,
            `export const Page = (props) => (`,
            `    <>`,
            `        <Button variant="text" size={props.big ? "large" : "small"} />`,
            `        <Checkbox color="error" density={props.density} />`,
            `    </>`,
            `);`,
            `export const title = () => useClasses("text", () => ({ style: "titleLarge" }));`,
        ].join("\n"),
    });
    return root;
};

const built = async (root: string, prune: boolean) => {
    const outDir = prune ? "pruned" : "full";
    await build({
        root,
        configFile: false,
        logLevel: "silent",
        plugins: [
            pureform.vite({
                target: "css",
                options: { classPrefix: "pf", prefix: "pf" },
                prune,
            }),
        ],
        build: {
            outDir,
            minify: false,
            cssMinify: false,
            lib: { entry: "main.ts", formats: ["es"], fileName: "main" },
        },
    });
    const files = readdirSync(join(root, outDir));
    const read = (extension: string) =>
        readFileSync(
            join(
                root,
                outDir,
                files.find((file) => file.endsWith(extension))!,
            ),
            "utf8",
        );
    const app = (await import(
        /* @vite-ignore */ join(root, outDir, "main.mjs")
    )) as { names: readonly string[] };
    return { names: app.names, js: read(".mjs"), css: read(".css") };
};

describe("a pruned build", () => {
    it(
        "ships only the components and variant values the app uses",
        { timeout: 120_000 },
        async () => {
            const root = fixture();
            const full = await built(root, false);
            const pruned = await built(root, true);

            // The registry: only the components drawn, and the ripple their indication's layer
            // is drawn with.
            expect(pruned.names).toEqual([
                "button",
                "checkbox",
                "ripple",
                "text",
            ]);
            expect(full.names).toContain("iconButton");
            expect(full.js).toContain("iconButton");
            expect(pruned.js).not.toContain("iconButton");

            // The stylesheet: the values used, the defaults, every value of a group set
            // dynamically, and nothing of the others.
            for (const used of [
                ".pf-button__root--variant_text",
                ".pf-button__root--variant_filled",
                ".pf-button__root--size_large",
                ".pf-button__root--size_small",
                ".pf-checkbox__root--color_error",
                ".pf-checkbox__root--density_-3",
                ".pf-text--style_titleLarge",
            ]) {
                expect(pruned.css, used).toContain(used);
            }
            for (const unused of [
                ".pf-button__root--variant_tonal",
                ".pf-button__root--color_secondary",
                ".pf-checkbox__root--color_secondary",
                ".pf-text--style_bodySmall",
                ".pf-chip",
                ".pf-iconButton",
            ]) {
                expect(full.css, unused).toContain(unused);
                expect(pruned.css, unused).not.toContain(unused);
            }
            expect(pruned.css.length).toBeLessThan(full.css.length / 2);
        },
    );
});
