// Writes `.pureform/` from `pureform.config.ts` with the Panda adapter's codegen, or checks it
// with `--check`, with the options the bundler plugin takes (`pureform.glue.ts`). Panda's
// codegen (the omni `prepare` task, which the tests need) reads `.pureform/panda.ts` without a
// bundler, so the omni `generate` task runs this first, until `pureform generate`
// (`@pureform/cli`) takes its place.

import { generate } from "@pureform/generate";
import type { PandaCodegenOptions } from "@pureform/panda-adapter/codegen";

import { glue } from "../pureform.glue.ts";

const check = process.argv.includes("--check");

const result = await generate<PandaCodegenOptions>({
    ...glue,
    root: new URL("..", import.meta.url).pathname,
    config: "pureform.config.ts",
    check,
});

for (const file of result.files) {
    if (file.status !== "unchanged")
        console.log(`${file.status}: ${file.path}`);
}
for (const hint of result.hints) console.log(hint);
if (!result.ok) {
    console.error(
        "pureform: .pureform/ is out of date. Run `node scripts/generate.ts`.",
    );
    process.exitCode = 1;
}
