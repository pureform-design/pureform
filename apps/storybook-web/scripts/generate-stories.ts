// Writes `src/stories/generated/<Component>.stories.ts` from `stories.config.ts`: one file per
// component, drawing it in every renderer through `composeStories`. A component with a
// hand-written story (`src/stories/*.stories.ts` with the same title) gets no generated file;
// hand-written files are never touched. Each hook module's `transformSource` edits the source
// before it's written. Run by the omni `generate` task: `node scripts/generate-stories.ts`.

import {
    existsSync,
    mkdirSync,
    readdirSync,
    readFileSync,
    rmSync,
    writeFileSync,
} from "node:fs";
import { dirname, join, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import { runnerImport } from "vite";

import type { StoriesConfig } from "../src/renderers/config.ts";
import type { TransformSource } from "../src/renderers/hooks.ts";

const APP = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const STORIES = join(APP, "src/stories");
const OUT = join(STORIES, "generated");

const kebab = (name: string) =>
    name.replace(/([a-z0-9])([A-Z])/g, "$1-$2").toLowerCase();

/** An import specifier from the generated folder to a module given relative to the app. */
const fromOut = (path: string) => {
    const rel = relative(OUT, join(APP, path)).replace(/\.tsx?$/, "");
    return rel.startsWith(".") ? rel : `./${rel}`;
};

/** Whether the binding exports `./<component>`. */
const exportsComponent = (pkg: string, component: string) => {
    const json = JSON.parse(
        readFileSync(join(APP, "node_modules", pkg, "package.json"), "utf8"),
    ) as { exports?: Record<string, unknown> };
    return `./${kebab(component)}` in (json.exports ?? {});
};

/** Titles the hand-written stories take. */
const handWritten = () =>
    new Set(
        readdirSync(STORIES)
            .filter((file) => file.endsWith(".stories.ts"))
            .flatMap((file) => {
                const source = readFileSync(join(STORIES, file), "utf8");
                const title = /\btitle:\s*["'`]([^"'`]+)["'`]/.exec(source);
                return title ? [title[1]!] : [];
            }),
    );

const storyName = (variant: string) =>
    variant.replace(/(^|-)(\w)/g, (_, __, c: string) => c.toUpperCase());

const load = async <T>(path: string) =>
    (await runnerImport<T>(path, { root: APP, configFile: false })).module;

const generate = async () => {
    const config = (
        await load<{ default: StoriesConfig }>(join(APP, "stories.config.ts"))
    ).default;
    const shared = config.hooks ?? [];
    const sharedModules = await Promise.all(
        shared.map((path) =>
            load<{ transformSource?: TransformSource }>(join(APP, path)),
        ),
    );
    const taken = handWritten();
    rmSync(OUT, { recursive: true, force: true });
    mkdirSync(OUT, { recursive: true });

    const written: string[] = [];
    for (const [component, options] of Object.entries(config.components)) {
        if (taken.has(component)) continue;
        const hooks = options.hooks ?? [];
        const imports = [
            `import type { Meta, StoryObj } from "@storybook/html-vite";`,
            "",
            `import { composeStories } from "${fromOut("src/renderers/compose.ts")}";`,
        ];
        const renderers: string[] = [];
        for (const [name, renderer] of Object.entries(config.renderers)) {
            const adapter = `${name}Adapter`;
            imports.push(
                `import { ${renderer.export}${renderer.export === adapter ? "" : ` as ${adapter}`} } from "${fromOut(renderer.adapter)}";`,
            );
            if (renderer.hooks) {
                imports.push(
                    `import * as ${name}Hooks from "${renderer.hooks}";`,
                );
            }
            const has = exportsComponent(renderer.package, component);
            if (has) {
                imports.push(
                    `import { ${component} as ${name}${component} } from "${renderer.package}/${kebab(component)}";`,
                );
            }
            renderers.push(
                `        ${name}: { adapter: ${name}Adapter, hooks: ${renderer.hooks ? `${name}Hooks` : "{}"}, component: ${has ? `${name}${component}` : "undefined"} },`,
            );
        }
        shared.forEach((path, i) =>
            imports.push(`import * as shared${i} from "${fromOut(path)}";`),
        );
        hooks.forEach((path, i) =>
            imports.push(`import * as hooks${i} from "${fromOut(path)}";`),
        );

        const variants = options.variants ?? [];
        const argTypes = {
            ...(variants.length
                ? { variant: { control: "inline-radio", options: variants } }
                : {}),
            ...options.argTypes,
        };
        const args = {
            ...(variants.length ? { variant: variants[0] } : {}),
            ...options.args,
        };
        const stories = [
            `export const Default = { ...stories.story("Default") } satisfies StoryObj;`,
            ...(options.schemes ?? []).map(
                (scheme) =>
                    `export const ${storyName(scheme)} = {\n    ...stories.story("${storyName(scheme)}", { globals: { scheme: ${JSON.stringify(scheme)} } }),\n} satisfies StoryObj;`,
            ),
            ...variants.map(
                (variant) =>
                    `export const ${storyName(variant)} = {\n    ...stories.story("${storyName(variant)}", { args: { variant: ${JSON.stringify(variant)} } }),\n} satisfies StoryObj;`,
            ),
        ];

        let source = [
            ...imports,
            "",
            "const stories = composeStories({",
            `    component: ${JSON.stringify(component)},`,
            "    renderers: {",
            ...renderers,
            "    },",
            `    shared: [${shared.map((_, i) => `shared${i}`).join(", ")}],`,
            `    hooks: [${hooks.map((_, i) => `hooks${i}`).join(", ")}],`,
            `    args: ${JSON.stringify(args)},`,
            `    argTypes: ${JSON.stringify(argTypes)},`,
            ...(options.scheme
                ? [`    scheme: ${JSON.stringify(options.scheme)},`]
                : []),
            "});",
            "",
            `export default { title: ${JSON.stringify(component)}, ...stories.meta } satisfies Meta;`,
            "",
            ...stories,
            "",
        ].join("\n");
        // Codegen hooks in the same order as the runtime ones: shared, then the component's.
        const componentModules = await Promise.all(
            hooks.map((path) =>
                load<{ transformSource?: TransformSource }>(join(APP, path)),
            ),
        );
        for (const hook of [...sharedModules, ...componentModules]) {
            source = hook.transformSource?.(component, source) ?? source;
        }
        writeFileSync(join(OUT, `${component}.stories.ts`), source);
        written.push(component);
    }
    const skipped = Object.keys(config.components).filter((c) => taken.has(c));
    console.log(
        `generate-stories: ${written.join(", ") || "none"}${skipped.length ? `; hand-written: ${skipped.join(", ")}` : ""}`,
    );
};

if (!existsSync(STORIES)) mkdirSync(STORIES, { recursive: true });
await generate();
