// Writes `src/stories/generated/<Component>.stories.ts`: one file per component that has an
// anatomy (`@pureform/anatomy`) and a case (`@pureform/component-cases`), drawing it in every
// renderer through `composeStories`. The anatomy's variants give the controls; the case's `props`
// give `Default`, its `examples` a story each, and its `state` and keys the play tests.
// `stories.config.ts` only overrides: which components, skips, extra args, schemes, hooks. A component with a
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

import type { ComponentAnatomy } from "@pureform/anatomy";
import type { ComponentCase } from "@pureform/component-cases";
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

/** An export name for a story: `"toggle, selected"` is `ToggleSelected`. */
const exportName = (name: string) => {
    const words = name
        .replace(/[^A-Za-z0-9]+/g, " ")
        .trim()
        .split(" ")
        .map((w) => w[0]!.toUpperCase() + w.slice(1));
    const id = words.join("") || "Story";
    return /^[0-9]/.test(id) ? `Story${id}` : id;
};

/** A key's story name: `{Enter}` is `Enter`, `" "` is `Space`. */
const keyName = (key: string) =>
    key === " "
        ? "Space"
        : key.replace(/[{}]/g, "").replace(/^./, (c) => c.toUpperCase());

/** A control per variant from the anatomy: a boolean for `["true", "false"]`, else a select. */
const controlFor = (values: readonly string[]) =>
    values.length === 2 && values.includes("true") && values.includes("false")
        ? { control: "boolean" }
        : { control: "select", options: values };

/** Every component with a case, from the anatomy: the case whose root test id is the
 *  anatomy's root part's. */
const componentsFromAnatomy = (
    anatomy: Readonly<Record<string, ComponentAnatomy>>,
    cases: readonly ComponentCase[],
) =>
    Object.values(anatomy).flatMap((a) => {
        const root = (a.parts as ComponentAnatomy["parts"])[a.root]!.testId;
        const c = cases.find((x) => x.root === root);
        return c ? [{ anatomy: a, case: c }] : [];
    });

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
    const { anatomy } = await load<{
        anatomy: Record<string, ComponentAnatomy>;
    }>("@pureform/anatomy");
    const { COMPONENTS } = await load<{
        COMPONENTS: readonly ComponentCase[];
    }>("@pureform/component-cases");
    const include = config.include && new Set(config.include);
    const skip = new Set(config.skip ?? []);
    const found = componentsFromAnatomy(anatomy, COMPONENTS).filter(
        ({ case: c }) =>
            (!include || include.has(c.component)) && !skip.has(c.component),
    );
    const taken = handWritten();
    rmSync(OUT, { recursive: true, force: true });
    mkdirSync(OUT, { recursive: true });

    const written: string[] = [];
    for (const { anatomy: a, case: c } of found) {
        const component = c.component;
        const options = config.components?.[component] ?? {};
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
                `        ${name}: { adapter: ${name}Adapter, hooks: ${renderer.hooks ? `${name}Hooks` : "{}"}, component: ${has ? `${name}${component}` : "undefined"}${renderer.casePlays === false ? ", casePlays: false" : ""} },`,
            );
        }
        shared.forEach((path, i) =>
            imports.push(`import * as shared${i} from "${fromOut(path)}";`),
        );
        hooks.forEach((path, i) =>
            imports.push(`import * as hooks${i} from "${fromOut(path)}";`),
        );

        const exclude = new Set(options.controls?.exclude ?? []);
        const argTypes = {
            ...Object.fromEntries(
                Object.entries(a.variants ?? {})
                    .filter(([variant]) => !exclude.has(variant))
                    .map(([variant, values]) => [variant, controlFor(values)]),
            ),
            ...options.argTypes,
        };
        const args = options.args ?? {};
        const used = new Set<string>();
        const unique = (name: string) => {
            let id = exportName(name);
            while (used.has(id)) id += "_";
            used.add(id);
            return id;
        };
        const story = (name: string, base: object, play?: string) => {
            const id = unique(name);
            base = { ...base, ...options.stories?.[id] };
            return `export const ${id} = {\n    ...stories.story(${JSON.stringify(id)}, ${JSON.stringify(base)}${play ? `, ${play}` : ""}),\n} satisfies StoryObj;`;
        };
        const stories = [
            // The case's `props`, and the same pinned to each scheme, with the state's play.
            story("Default", {}),
            ...(options.schemes ?? []).map((scheme) =>
                story(
                    scheme,
                    { globals: { scheme } },
                    c.state ? `"state"` : undefined,
                ),
            ),
            // One story per example.
            ...Object.entries(c.examples).map(([name, example]) =>
                story(name, { name, args: example }),
            ),
            // One story per key, with its play.
            ...(c.keyboard?.keys ?? []).map((key, index) =>
                story(
                    `Key ${keyName(key.key)}`,
                    { name: `Key: ${keyName(key.key)}` },
                    `{ key: ${index} }`,
                ),
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
    const skipped = found
        .map(({ case: c }) => c.component)
        .filter((c) => taken.has(c));
    console.log(
        `generate-stories: ${written.join(", ") || "none"}${skipped.length ? `; hand-written: ${skipped.join(", ")}` : ""}`,
    );
};

if (!existsSync(STORIES)) mkdirSync(STORIES, { recursive: true });
await generate();
