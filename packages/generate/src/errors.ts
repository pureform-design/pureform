// The errors `generate` raises, each with a code a caller can branch on, and a message written
// for the person running the build.

export type GenerateErrorCode =
    /** The config file doesn't exist. */
    | "config-not-found"
    /** Importing the config threw. */
    | "config-load"
    /** The config's default export isn't a config. */
    | "config-export"
    /** The config, or a file it imports, breaks the import rules. */
    | "config-imports"
    /** The target's adapter isn't installed, or has no `/codegen` subpath. */
    | "adapter-not-found"
    /** The adapter's `/codegen` export isn't a `CodegenAdapter`. */
    | "adapter-invalid"
    /** The adapter returned modules or files `generate` can't write. */
    | "adapter-output"
    /** The `components` or `lazy` option names a component the config doesn't have. */
    | "components"
    /** Installed core-train packages differ in version, or a binding's peer range excludes
     *  the train. */
    | "train-mismatch"
    /** `.pureform/` hasn't been generated. */
    | "missing-output";

export class GenerateError extends Error {
    readonly code: GenerateErrorCode;

    constructor(
        code: GenerateErrorCode,
        message: string,
        options?: { cause?: unknown },
    ) {
        super(message, options);
        this.name = "GenerateError";
        this.code = code;
    }
}

/** Whether a value is a `GenerateError`, optionally with this code. */
export const isGenerateError = (
    error: unknown,
    code?: GenerateErrorCode,
): error is GenerateError =>
    error instanceof GenerateError &&
    (code === undefined || error.code === code);
