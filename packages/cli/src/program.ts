// The `pureform` command line: commands and flags, parsed with Node's `parseArgs`. Generation
// itself is @pureform/generate's, the same step the bundler plugin runs.

import { parseArgs } from "node:util";

import { TARGETS } from "./codegen-file";
import type { GenerateFlags } from "./codegen-file";
import { CliError } from "./errors";
import { runGenerate } from "./generate";
import type { CliIO } from "./generate";
import { VERSION } from "./package-version";

export const USAGE = `Usage: pureform <command> [options]

Commands:
  generate    Write the generated registry to .pureform/ (the style registry's modules
              and declarations) from pureform.config.ts, without a bundler.

Options:
  -h, --help     Show this help, or a command's with \`pureform <command> --help\`.
  -v, --version  Show the version.`;

export const GENERATE_USAGE = `Usage: pureform generate [options]

Writes the generated registry to .pureform/ from pureform.config.ts with the target's
adapter, as the bundler plugin does when dev or build starts. The options come from the
codegen file's \`codegen\` export (pureform.codegen.ts), with these flags over them.

Options:
  --check              Compare .pureform/ with what would be written, write nothing,
                       and exit 1 when it differs (for a committed registry in CI).
  --watch              Generate again whenever the config or a file it imports changes.
  --root <dir>         The app's root (default: the working directory).
  --config <file>      The config, relative to the root
                       (default: the first pureform.config.{ts,mts,cts,js,mjs,cjs}).
  --codegen <file>     The module exporting the options as \`codegen\` or by default
                       (default: the first pureform.codegen.{ts,mts,cts,js,mjs,cjs} in the root).
  --target <target>    The adapter to generate with: ${TARGETS.join(", ")}.
  --options <json>     The adapter's options as a JSON object, over the codegen file's.
  --components <names> The components to generate, comma-separated (default: all).
  --lazy <names>       The components whose registry entries load on demand.
  --out-dir <dir>      The folder to write, relative to the root (default: .pureform).
  --no-train-check     Skip checking that the installed pureform packages share a version.
  -h, --help           Show this help.`;

const defaultIO = (): CliIO => ({
    cwd: process.cwd(),
    stdout: (text) => process.stdout.write(`${text}\n`),
    stderr: (text) => process.stderr.write(`${text}\n`),
});

/** Parses `pureform generate`'s flags (the arguments after `generate`). */
export const parseGenerateFlags = (
    args: readonly string[],
): GenerateFlags & { readonly help?: boolean } => {
    let parsed;
    try {
        parsed = parseArgs({
            args: [...args],
            strict: true,
            allowPositionals: false,
            allowNegative: true,
            options: {
                check: { type: "boolean" },
                watch: { type: "boolean" },
                root: { type: "string" },
                config: { type: "string" },
                codegen: { type: "string" },
                target: { type: "string" },
                options: { type: "string" },
                components: { type: "string" },
                lazy: { type: "string" },
                "out-dir": { type: "string" },
                "train-check": { type: "boolean" },
                help: { type: "boolean", short: "h" },
            },
        });
    } catch (error) {
        throw new CliError(
            `pureform: ${error instanceof Error ? error.message : String(error)}\nRun \`pureform generate --help\` for the options.`,
        );
    }
    const {
        "out-dir": outDir,
        "train-check": trainCheck,
        target,
        ...rest
    } = parsed.values;
    if (
        target !== undefined &&
        !(TARGETS as readonly string[]).includes(target)
    ) {
        throw new CliError(
            `pureform: --target ${target} isn't a target. Use one of ${TARGETS.join(", ")}.`,
        );
    }
    if (rest.watch && rest.check) {
        throw new CliError("pureform: --watch and --check don't go together.");
    }
    return {
        ...rest,
        ...(outDir === undefined ? {} : { outDir }),
        ...(trainCheck === undefined ? {} : { trainCheck }),
        ...(target === undefined
            ? {}
            : { target: target as (typeof TARGETS)[number] }),
    };
};

/** Runs the command line with these arguments (without `node` and the script). Resolves to the
 *  exit code: 0, 1 when the command fails, 2 when it's called wrong. */
export const main = async (
    args: readonly string[],
    io: Partial<CliIO> = {},
): Promise<number> => {
    const settled = { ...defaultIO(), ...io };
    const [command, ...rest] = args;

    if (command === undefined || command === "--help" || command === "-h") {
        (command === undefined ? settled.stderr : settled.stdout)(USAGE);
        return command === undefined ? 2 : 0;
    }
    if (command === "--version" || command === "-v") {
        settled.stdout(VERSION);
        return 0;
    }
    if (command !== "generate") {
        settled.stderr(
            `pureform: unknown command ${command}. Run \`pureform --help\` for the commands.`,
        );
        return 2;
    }

    let flags: ReturnType<typeof parseGenerateFlags>;
    try {
        flags = parseGenerateFlags(rest);
    } catch (error) {
        settled.stderr(error instanceof Error ? error.message : String(error));
        return 2;
    }
    if (flags.help) {
        settled.stdout(GENERATE_USAGE);
        return 0;
    }
    return runGenerate(flags, settled);
};
