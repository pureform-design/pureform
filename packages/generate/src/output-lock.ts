// A generation owns its output through publication and pruning, including across processes.
// Keep the lock beside the output so pruning can never remove it.
import { mkdir, rmdir } from "node:fs/promises";
import { dirname } from "node:path";
import { setTimeout } from "node:timers/promises";

import { GenerateError } from "./errors";

export const withOutputLock = async <T>(
    outDir: string,
    run: () => Promise<T>,
): Promise<T> => {
    const lock = `${outDir}.pureform-lock`;
    await mkdir(dirname(lock), { recursive: true });
    const deadline = Date.now() + 30_000;
    for (;;) {
        try {
            await mkdir(lock);
            break;
        } catch (error) {
            if ((error as NodeJS.ErrnoException).code !== "EEXIST") throw error;
            if (Date.now() >= deadline) {
                throw new GenerateError(
                    "output-lock",
                    `pureform: timed out waiting for output lock "${lock}". If a generator was interrupted, remove this empty directory only after confirming no generator is running.`,
                );
            }
            await setTimeout(20);
        }
    }
    try {
        return await run();
    } finally {
        await rmdir(lock);
    }
};
