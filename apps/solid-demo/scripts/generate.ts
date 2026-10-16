// Writes `.pureform/` from `pureform.config.ts` with the Panda adapter's codegen, or checks it
// with `--check`. Until `pureform generate` (`@pureform/cli`) and the bundler plugin land, the
// omni `generate` task runs this before Panda's codegen.

import { generate } from "@pureform/generate";
import type { PandaCodegenOptions } from "@pureform/panda-adapter/codegen";

import { PREFIX } from "../panda.pureform";

const check = process.argv.includes("--check");

const result = await generate<PandaCodegenOptions>({
    root: new URL("..", import.meta.url).pathname,
    config: "pureform.config.ts",
    target: "panda",
    options: { prefix: PREFIX },
    check,
});

for (const file of result.files) {
    if (file.status !== "unchanged")
        console.log(`${file.status}: ${file.path}`);
}
for (const hint of result.hints) console.log(hint);
if (!result.ok) {
    console.error(
        "pureform: .pureform/ is out of date. Run `bun scripts/generate.ts`.",
    );
    process.exitCode = 1;
}
