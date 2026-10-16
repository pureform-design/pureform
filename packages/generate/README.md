# @pureform/generate

The build step that the bundler plugin (`@pureform/bundler`) and the `pureform` command
(`@pureform/cli`) share. It loads `pureform.config.ts`, asks the target's adapter for its
factory modules, and writes the `.pureform/` folder an app hands to `PureformProvider`.

This commit holds the adapter codegen interface only; the rest of the package follows.

## The adapter codegen interface

Each adapter (`@pureform/panda-adapter`, `css-adapter`, `tailwind-adapter`, `rn-adapter`)
exports a `codegen` object from its `/codegen` subpath:

```ts
import { defineCodegen } from "@pureform/generate";

export const codegen = defineCodegen<{ prefix?: string }>({
    name: "panda",
    platform: "web",
    codegen: (context) => ({
        components: context.components.map((name) => ({
            name,
            path: `web/${name}.ts`,
            contents: `export const ${name} = …;\n`,
        })),
        files: [
            { path: "panda.ts", contents: "export const staticCss = …;\n" },
        ],
    }),
});
```

See `src/adapter.ts` for every field.
