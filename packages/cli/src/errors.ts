/** A problem with how the command was called, such as a missing target. Its message starts with
 *  `pureform: ` and is printed as it is. */
export class CliError extends Error {
    constructor(message: string, options?: { cause?: unknown }) {
        super(message, options);
        this.name = "CliError";
    }
}
